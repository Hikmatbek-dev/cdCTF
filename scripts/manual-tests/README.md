# Manual API tests

Throwaway end-to-end checks used while building the session layer and fixing the
lesson-test bypass. They are plain curl + psql — no test runner is set up in this
repo yet, so these are run by hand.

**Never point these at a database you care about.** They create users, seed
lessons, and mutate `users.points` directly.

## Running

```bash
# 1. Throwaway database
createdb cp_test
export DATABASE_URL="postgresql:///cp_test?host=/var/run/postgresql"
pnpm --filter @workspace/db run push

# 2. Server against it
cd artifacts/api-server && pnpm run build
DATABASE_URL="$DATABASE_URL" JWT_SECRET="test_secret_at_least_32_chars_long_xxxx" \
  PORT=8099 NODE_ENV=development node ./dist/index.mjs &

# 3. Tests
bash scripts/manual-tests/auth-sessions.sh
bash scripts/manual-tests/lesson-test-exploit.sh   # seeds lesson id=1
bash scripts/manual-tests/lesson-test-honest.sh    # expects lesson id=1 to exist

# 4. Cleanup
dropdb cp_test
```

## What each covers

| Script | Covers |
|---|---|
| `auth-sessions.sh` | jti in token, session list, device labels, login history, logout revocation, revoke-all, blocked user rejected immediately, role read fresh from DB, password change revokes other sessions |
| `lesson-test-exploit.sh` | The scoring bypass: duplicate answers, repeated answers, foreign question ids, blocked user submitting. All must be rejected. |
| `lesson-test-honest.sh` | The fix must not break the feature: 5/5 passes, 4/5 (0.8) passes at the threshold, 3/5 fails, points awarded exactly once. |

`lesson-test-honest.sh` assumes `lesson-test-exploit.sh` ran first (it seeds the
lesson). Both assume a fresh database — the 3-attempt cap will otherwise make
later cases fail for reasons that have nothing to do with the code.
</content>
