# Manual API tests

End-to-end checks for authentication: sessions, roles, 2FA, API tokens, OAuth,
passkeys, and the lesson-test scoring fix. Plain curl + psql — there is no test
runner in this repo yet, so these are run by hand.

**Never point these at a database you care about.** They create users, seed
lessons, mutate roles, and write `users.points` directly.

## Running

```bash
bash scripts/manual-tests/run-all.sh
```

That creates a throwaway database, pushes the schema, builds the server, runs
every suite, and drops the database again. Requires a local Postgres reachable
over the unix socket and `createdb`/`dropdb` rights.

To run one suite by hand, export `DATABASE_URL` and `API_PORT`, start the server
on that port, and run the script directly — but see the notes below.

`run-all.sh` picks a free port rather than a fixed one. A hardcoded port meant a
server from an unrelated project was already listening, answered every request,
and the whole suite failed for reasons that had nothing to do with this code.
It now aborts loudly on `EADDRINUSE` instead of testing someone else's server.

## What each covers

| Script | Covers |
|---|---|
| `lesson-test-exploit.sh` | The scoring bypass: duplicate answers, a repeated answer, foreign question ids, and a blocked attempt. All must be rejected, and the attacker must earn nothing. |
| `lesson-test-honest.sh` | The fix must not break the feature: 5/5 passes, 4/5 passes at the 0.8 threshold, 3/5 fails, and a completed lesson cannot be restarted to farm points again. |
| `auth-sessions.sh` | `jti` in the token, session list, device labels, login history, logout revocation, revoke-all, blocked user rejected immediately, role read fresh from the DB, password change revoking other sessions. |
| `roles-permissions.sh` | The full matrix for user / author / moderator / admin: what each may do and — more importantly — what each must not. Includes author drafts staying out of the public list and authors not being able to raise their own points or publish themselves. |
| `two-factor.sh` | TOTP enrolment, the login handshake, replay protection, and backup codes. Generates real codes from the enrolment secret with otplib, the way a phone would. Also asserts the secret is encrypted at rest, the backup codes are stored hashed, and an `mfaToken` cannot be used as a session. |
| `api-tokens.sh` | What a personal access token may do, and — the point — what it may not: no staff route even when minted by an admin, no credential or session changes. Also that attaching a scope to a public route did not quietly close it. |
| `oauth.sh` | Provider wiring and the CSRF boundary: a missing, mismatched or unsigned `state` is refused, and a valid one proceeds far enough to fail at the exchange. |
| `passkeys.sh` | Challenge handling: absent, unsigned, another user's, and reused challenges are all refused, as is an unknown credential. Plus list/delete ownership. |

## Two suites stop short of the happy path, deliberately

`oauth.sh` cannot complete a sign-in — that needs real Google credentials and a
browser round-trip. `passkeys.sh` cannot produce a WebAuthn signature — that
needs an authenticator. Both cover the checks that decide whether a response is
trustworthy, which is where the account-takeover bugs in these flows live. What
is left uncovered is the cryptography inside `@simplewebauthn` and the
provider's own token endpoint.

The passkey options endpoints were separately checked in a real browser against
`PublicKeyCredential.parseCreationOptionsFromJSON` and
`parseRequestOptionsFromJSON`, so the platform confirms the shape.

## Traps worth knowing

**The auth rate limiter is 20 requests / 15 min / IP, and it lives in memory.**
Running the suites back-to-back from one IP exhausts it; every login then 429s
and the suites fail with 401s that have nothing to do with the code. `run-all.sh`
restarts the server between suites, which resets the buckets. If you run a suite
by hand and see a wall of 401s, check for a 429 first.

**Order matters.** `lesson-test-honest.sh` reuses the lesson that
`lesson-test-exploit.sh` seeds. Both assume a fresh database — the 3-attempt cap
will otherwise fail later cases for reasons unrelated to what they assert.

**`two-factor.sh` sleeps twice, ~30s each, and that is not padding.** A TOTP code
is pinned to a 30-second step, and the replay guard rejects any step at or before
the last accepted one. Enrolling consumes the current step, so the next code the
test needs genuinely does not exist yet. A real user's next login is minutes
later; the test has to wait the window out.

The suites also assume `DATABASE_URL` points at a database reachable by `psql`
with the same credentials — several assertions read the database directly to
check what was *stored* (that the TOTP secret is ciphertext, that backup codes
are hashes), which is the part an HTTP response cannot show you.
