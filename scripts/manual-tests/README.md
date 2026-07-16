# Manual API tests

End-to-end checks for the session layer, the role/permission matrix, and the
lesson-test scoring fix. They are plain curl + psql — there is no test runner in
this repo yet, so these are run by hand.

**Never point these at a database you care about.** They create users, seed
lessons, mutate roles, and write `users.points` directly.

## Running

```bash
bash scripts/manual-tests/run-all.sh
```

That creates a throwaway database, pushes the schema, builds the server, runs
every suite, and drops the database again. Requires a local Postgres reachable
over the unix socket and `createdb`/`dropdb` rights.

To run one suite by hand, export `DATABASE_URL`, start the server on port 8099,
and run the script directly — but see the rate-limit note below.

## What each covers

| Script | Covers |
|---|---|
| `lesson-test-exploit.sh` | The scoring bypass: duplicate answers, a repeated answer, foreign question ids, and a blocked attempt. All must be rejected, and the attacker must earn nothing. |
| `lesson-test-honest.sh` | The fix must not break the feature: 5/5 passes, 4/5 passes at the 0.8 threshold, 3/5 fails, and a completed lesson cannot be restarted to farm points again. |
| `auth-sessions.sh` | `jti` in the token, session list, device labels, login history, logout revocation, revoke-all, blocked user rejected immediately, role read fresh from the DB, password change revoking other sessions. |
| `roles-permissions.sh` | The full matrix for user / author / moderator / admin: what each may do and — more importantly — what each must not. Includes author drafts staying out of the public list and authors not being able to raise their own points or publish themselves. |

## Two traps worth knowing

**The auth rate limiter is 20 requests / 15 min / IP, and it lives in memory.**
Running the suites back-to-back from one IP exhausts it; every login then 429s
and the suites fail with 401s that have nothing to do with the code. `run-all.sh`
restarts the server between suites, which resets the buckets. If you run a suite
by hand and see a wall of 401s, check for a 429 first.

**Order matters.** `lesson-test-honest.sh` reuses the lesson that
`lesson-test-exploit.sh` seeds. Both assume a fresh database — the 3-attempt cap
will otherwise fail later cases for reasons unrelated to what they assert.
</content>
