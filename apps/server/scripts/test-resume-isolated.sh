#!/usr/bin/env bash
set -euo pipefail

resume_repo_dir="$(cd "$(dirname "$0")/../../.." && pwd)"
resume_test_dir="$(mktemp -d /tmp/resume-dao028.XXXXXX)"
resume_server_pid=''
resume_test_database_url='postgresql://resume_test@127.0.0.1:55433/postgres'

cleanup() {
  if [[ -n "$resume_server_pid" ]]; then
    kill "$resume_server_pid" 2>/dev/null || true
    wait "$resume_server_pid" 2>/dev/null || true
  fi
  pg_ctl -D "$resume_test_dir/data" stop -m fast >/dev/null 2>&1 || true
  rm -rf "$resume_test_dir"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

for resume_command in initdb pg_ctl pnpm curl node; do
  command -v "$resume_command" >/dev/null || { printf 'Missing command: %s\n' "$resume_command"; exit 1; }
done

cd "$resume_repo_dir"
node --input-type=module <<'NODE'
import net from 'node:net'
for (const port of [55433, 4059]) {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', resolve)
  }).catch(() => { throw new Error(`Isolated test port ${port} is already in use; refusing to continue`) })
  await new Promise(resolve => server.close(resolve))
}
NODE
pnpm --filter @rs/common build
pnpm --filter @rs/server build
initdb -D "$resume_test_dir/data" -U resume_test --auth-local=trust --auth-host=trust >/dev/null
pg_ctl -D "$resume_test_dir/data" -l "$resume_test_dir/postgres.log" -o "-h 127.0.0.1 -p 55433 -k $resume_test_dir" start >/dev/null
DOTENV_CONFIG_PATH="$resume_test_dir/no-env" DATABASE_URL="$resume_test_database_url" pnpm --filter @rs/server db:migrate:deploy
(
  cd "$resume_test_dir"
  NODE_ENV=test DATABASE_URL="$resume_test_database_url" JWT_SECRET=dao028-isolated-test-secret PORT=4059 exec node "$resume_repo_dir/apps/server/dist/main.js"
) >"$resume_test_dir/server.log" 2>&1 &
resume_server_pid=$!
resume_server_ready=false
for resume_attempt in {1..40}; do
  kill -0 "$resume_server_pid" 2>/dev/null || { printf 'Isolated server failed to start\n'; exit 1; }
  if curl --silent --fail http://127.0.0.1:4059/api/health >/dev/null; then resume_server_ready=true; break; fi
  sleep 0.25
done
[[ "$resume_server_ready" == true ]] || { printf 'Isolated server startup timed out\n'; exit 1; }
RESUME_TEST_DATABASE_URL="$resume_test_database_url" RESUME_TEST_API_BASE=http://127.0.0.1:4059/api pnpm --filter @rs/server test:resume:http
