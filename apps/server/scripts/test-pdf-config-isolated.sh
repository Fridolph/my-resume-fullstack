#!/usr/bin/env bash
set -euo pipefail
resume_repo_dir="$(cd "$(dirname "$0")/../../.." && pwd)"
resume_test_dir="$(mktemp -d /tmp/resume-pdf-config.XXXXXX)"
resume_server_pid=''
cleanup() {
 if [[ -n "$resume_server_pid" ]]; then kill "$resume_server_pid" 2>/dev/null || true; for _ in {1..12}; do kill -0 "$resume_server_pid" 2>/dev/null || break; sleep 0.25; done; kill -KILL "$resume_server_pid" 2>/dev/null || true; wait "$resume_server_pid" 2>/dev/null || true; fi
 pg_ctl -D "$resume_test_dir/data" stop -m fast >/dev/null 2>&1 || true
 rm -rf "$resume_test_dir"
}
trap cleanup EXIT
trap 'exit 130' INT TERM
cd "$resume_repo_dir"
node --input-type=module <<'JS'
import net from 'node:net'
for(const port of [55439,4159]){const server=net.createServer();await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok)});await new Promise(ok=>server.close(ok))}
JS
initdb -D "$resume_test_dir/data" -U resume_pdf_test --auth-local=trust --auth-host=trust >/dev/null
pg_ctl -D "$resume_test_dir/data" -l "$resume_test_dir/postgres.log" -o "-h 127.0.0.1 -p 55439 -k $resume_test_dir" start >/dev/null
DOTENV_CONFIG_PATH="$resume_test_dir/no-env" DATABASE_URL='postgresql://resume_pdf_test@127.0.0.1:55439/postgres' pnpm --filter @rs/server db:migrate:deploy
(
 cd "$resume_test_dir"
 NODE_ENV=test LOG_LEVEL=error LOG_FILE_ENABLED=false DATABASE_URL='postgresql://resume_pdf_test@127.0.0.1:55439/postgres' JWT_SECRET='isolated-pdf-config-test-secret-only' PORT=4159 exec node "$resume_repo_dir/apps/server/dist/main.js"
) >"$resume_test_dir/server.log" 2>&1 &
resume_server_pid=$!
resume_ready=false
for _ in {1..40}; do
 kill -0 "$resume_server_pid" 2>/dev/null || { cat "$resume_test_dir/server.log"; exit 1; }
 if curl --silent --fail http://127.0.0.1:4159/api/health >/dev/null; then resume_ready=true; break; fi
 sleep 0.25
done
[[ "$resume_ready" == true ]] || { cat "$resume_test_dir/server.log"; exit 1; }
RESUME_TEST_DATABASE_URL='postgresql://resume_pdf_test@127.0.0.1:55439/postgres' node apps/server/scripts/pdf-config-http.mjs
