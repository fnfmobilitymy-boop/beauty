# Multi-file coding workspace

The default homepage action now creates a coding workspace and starts a tool-using task. `/studio` also provides direct project access. The previous HTML generator remains available via “快速单页”. This is a first Node.js coding workflow, not full Codex feature parity.

## Implemented

Each authenticated account can create up to 10 workspaces. A workspace contains up to 80 text files / 500 KB, version snapshots, task history and command logs. Owners can edit/create/delete files, restore up to 20 file snapshots, export a standard ZIP, submit AI tasks, execute commands, stop tasks, and view a static HTML preview. Existing account, admin and recharge logic remain in place. Admin project counts include coding workspaces.

The model receives project source plus five tools: list_files, read_file, write_files, delete_file and run_command. It can observe failures, edit and retry. A task allows at most 6 model rounds / 12 tool calls; an individual AI request times out at 90 seconds. The last executed command must pass after the last model file edit for the task to be marked completed. Unverified or unsuccessful tasks show needs_attention rather than implying all tests passed. Source and tool output are treated as untrusted data in the model instruction.

A workspace is locked while a task is active, and the server admits at most two coding jobs at once. Users can cancel tasks; the local container is stopped and the task is marked cancelled. Requests are polled; closing a browser does not discard a running task. Restarted tasks are marked interrupted and their saved changes retained. Histories and jobs persist in ignored data/coding-workspaces.json; back it up with all other application state.

## Execution boundary

Commands run in disposable Node 24 containers, with a non-root user, no host filesystem mounts, no platform credentials, no network, read-only image files, dropped capabilities and no-new-privileges. Source and temporary output use size-limited tmpfs. Each command has 256 MB memory, one CPU, 64 processes and a 25-second command deadline (35-second outer cleanup deadline). Output is truncated; symlink files are not imported into the project. Containers do not receive a Docker socket. Explicit daemon arguments prevent an inherited Docker context redirect.

The service controlling Docker is privileged infrastructure and must be separated from public web/financial services for production. Containers alone are not a production multi-tenant security certification. A stronger dedicated VM/microVM boundary, resource accounting, abuse controls, durable task workers, transactional storage and crash reconciliation remain required for public paid execution. No production deployment was performed.

Third-party package installation is currently unavailable: the execution network is disabled and npm is offline. Node built-ins, shell commands and node --test work. Python and arbitrary language environments are not included. Arbitrary long-running backend servers, database provisioning, external integrations, GitHub sync and one-click customer-site deployment are not yet supported.

## Running locally in the managed environment

Use Node >=24.5 and a working local Docker daemon. Preserve inherited proxy/CA settings when preparing the official image. Pull node:24-bookworm-slim during trusted setup, before handling user commands. User jobs use --pull=never. Start `npm start` in /workspace/beauty. Local CLI execution uses only unix:///var/run/docker.sock and does not pass application credentials into job containers.

Optional KD_CODING_MODEL chooses the coding model; otherwise KD_AI_MODEL/default gpt-4.1-mini is used. Existing KD_AI_API_KEY is used through the main server's configured HTTPS proxy. If Credits billing is enabled, agent tasks reserve the existing generation/revision cost and refund non-completed tasks; manual commands are free. This provisional flat coding cost is not yet production-cost validated; billing remains off by default.

## Remote runner

The public Web Docker image deliberately does not include a Docker socket or local Docker CLI. For hosted use, configure KD_RUNNER_URL to an HTTPS endpoint on a dedicated worker, and KD_RUNNER_TOKEN through secure deployment settings on both sides. Never send the token to browsers or generated code. The raw worker token must have at least 32 characters; do not paste it in chat. Loopback HTTP is allowed only for local integration tests. Other plaintext remote URLs are rejected.

`node runner-service.mjs` starts the authenticated runner API (default KD_RUNNER_PORT=4000). `/run` requires bearer authentication and validates the same file/command limits. `/health` is an unauthenticated liveness probe, not image-readiness proof. The worker Dockerfile includes the CLI; only the trusted worker, not the public web application or job containers, should receive access to a dedicated daemon. Configure TLS/private ingress and pre-pull the allowed Node image on that worker. Web image and runner image building is included in CI; remote provisioning, certificates and secret bindings remain external setup.

## Preview and export

Static preview inlines local CSS and classic script files into a sandboxed iframe, without same-origin privileges and with CSP disabling network/forms. It is not a long-running full-stack preview, ES-module bundler or React development server. Use terminal tests to verify backend code. ZIP export preserves project file paths and UTF-8 text and can be opened with standard ZIP tools.

## Validation evidence

- `KD_SANDBOX_TESTS=1 npm test`: nine tests passed, none skipped. They cover owners/revisions/locks, model failure-to-fix behavior with a synthetic provider, real Docker tests and isolation, cancellation, remote-runner authentication/execution, plus the existing account/payment business checks.
- `npm run test:studio`: browser login, creation, AI tool fixture, real container tests, intentional failure, restore/rerun, static preview, ZIP export, mobile layout, cancellation and the default homepage coding entry passed.
- `npm run test:browser`: the existing single-page/recharge/admin workflow passed after the mode change.
- One real model task created add.mjs and add.test.mjs and executed two passing tests in a real isolated container. This was not a synthetic provider test and did not modify real customer accounts or payment state.
- Both Docker images built. The runner image's copied CLI was executed successfully. No image was pushed and no public host was deployed.

## Current runtime/preview/storage update

The approved workload image is now kd-runtime:local (Dockerfile.sandbox), with exact React 19.3.1, React DOM 19.3.1, Vite 8.3.5 and Express 5.3.0 versions and the complete npm integrity lockfile. get_runtime_info and install_dependencies prepare these packages without executing user install scripts or granting network. This supersedes the original built-ins-only limitation; other packages/languages remain unsupported.

POST /api/workspaces/:id/preview starts a 15-minute HTTP service snapshot in a separate offline container; preview-logs and preview-stop provide controls. A random capability URL proxies bounded requests into the container without host port publication, platform cookies or backend Set-Cookie. Preview documents have sandbox CSP, opaque origins and limited asset/connect sources; root-relative assets/fetch calls are mapped into the capability path. Each account has at most one active preview; at most two previews per runner. Request concurrency is queued and bounded. This is a constrained preview, not production customer-site hosting. WebSocket/cookie-based apps remain limited.

Platform source, jobs, account and payment state now use SQLite documents with WAL, not writable JSON files. Original JSON migration sources remain intact. A database lease blocks simultaneous app writers; scripts/backup.mjs uses the SQLite backup API and removes the copied lease before producing a non-overwriting private backup. Preview filesystem/database state remains ephemeral and distinct from the platform database.

## Local engineering completion checks

Workspace rename/delete, ZIP import (stored/deflate UTF-8 text), and bounded code diffs are implemented. ZIP imports validate paths, CRCs and uncompressed size without writing to the host filesystem. Imports keep a recoverable source snapshot; workspace deletion is explicitly confirmed and removes that workspace's history/logs. Polling returns metadata for history rather than retransmitting every historical source file, and stored event output is bounded. Coding requests include the last three task summaries for conversational continuity.

React development preview was separately verified through a real browser: React rendered an Express API response through the sandbox proxy. Large dev dependency resources have a bounded 8 MB response allowance; unsupported automatic Vite HMR client injection is removed. No WebSocket support or cookie-based preview authentication is claimed. Basic Node preview checks also verify platform cookies are not forwarded, backend Set-Cookie is not relayed and the preview cannot read the parent document.

Final local validation: fourteen automatic tests passed with KD_SANDBOX_TESTS=1 and no skips; the complete studio browser script passed (including import, rename/delete, diff and React/Express); the existing customer/admin/recharge browser script passed. Web and worker images plus the approved runtime image built. External GitHub, email and public deployment were explicitly postponed by the owner.
