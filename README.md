# K.D WEB

AI web-development workspace with a Chinese customer site, a separate operations dashboard, and manually verified Malaysian recharge packages. This is an implemented development platform, not a full Codex/Lovable replacement or an already-hosted public service.

## Current features

- Accounts, password changes, session revocation, private projects and administrator role binding by immutable user ID.
- Multi-file coding workspaces, tool-using AI edits, isolated shell execution, failure-to-fix loops, task cancellation, logs, revisions, static preview and ZIP export.
- Fixed-version React / React DOM / Vite / Express runtime dependencies, provided read-only without arbitrary runtime network access.
- Fifteen-minute HTTP front/back-end previews with logs and stop controls. Browser preview remains sandboxed, does not forward platform cookies and does not accept backend Set-Cookie headers.
- The previous quick single-page HTML generator remains an optional mode.
- Hong Leong Bank, TNG eWallet, USDT TRC20 and the supplied Stripe Payment Link; package-first quoted deposits, administrator settlement verification, idempotent Credits grants, private balances and audit entries.
- Independent `/admin` dashboard for counters, users, balances, ledger, review and uniform exchange quotes. Original logo and TNG QR assets remain pending.

## Run

Requires Node >=24.5, a working local Docker daemon and trusted setup access to official image/npm registries. The main server has no third-party npm dependencies; generated-project dependencies are installed into the approved image using runtime/package-lock.json, TLS verification and --ignore-scripts.

Build the workload image once:

```sh
docker build -f Dockerfile.sandbox -t kd-runtime:local .
```

In the managed cloud environment use the saved install script, which preserves the session proxy and CA trust and passes a public CA bundle via a BuildKit secret. Do not disable verification.

Start in /workspace/beauty:

```sh
npm start
```

Default port is 3000. Customer site is `/`, coding studio `/studio`, administration `/admin`, health endpoint `/api/health`. These paths do not establish a public hosting URL.

## Configuration

- KD_AI_API_KEY: securely configured provider key. KD_AI_MODEL defaults gpt-4.1-mini; KD_CODING_MODEL optionally overrides it for coding.
- KD_ADMIN_USER_IDS: comma-separated existing account IDs. Requested owner email is hello@kennystudio.cfd; no password is created for the owner. Register first, then bind the actual ID. Do not assign by email string or registration order.
- KD_CREDITS_BILLING: defaults disabled. Enable only after funding/admin setup and cost checks. Coding task pricing is provisional; incomplete/failed tasks refund reserved Credits. Manual commands and editing are currently free.
- KD_PUBLIC_ORIGIN: actual HTTPS application origin when behind a reverse proxy, for preview CSP and request-origin checks.
- KD_SECURE_COOKIES=enabled for HTTPS hosting (Docker default).
- KD_DATA_DIR: persistent data directory, default data/.
- KD_SANDBOX_IMAGE: override approved workload image name; defaults kd-runtime:local. Custom images must honor the approved dependency contract.
- Hosted Web containers use KD_RUNNER_URL (HTTPS) or KD_RUNNER_SOCKET (the private socket used by deploy/compose.yml), and a securely supplied KD_RUNNER_TOKEN matching the dedicated worker. Token minimum is 32 characters. Never expose it to browsers, generated code or chat.

## Storage and backup

Platform records now live in data/platform.sqlite using WAL and synchronous commits. Existing JSON records are imported on first access, preserving IDs and balances; original JSON files are retained and no longer receive updates. Do not switch back to older JSON-only code after migration. Only one app writer is admitted per data directory by a renewable SQLite lease. A hard crash can delay restart for up to 45 seconds while its lease expires. An experimental SQLite warning on supported Node versions is expected.

Create a consistent online backup without overwriting existing files:

```sh
node scripts/backup.mjs /secure/location/snapshot.sqlite
```

The destination directory must already exist. Backups use restrictive permissions and omit the running-instance lease. Test restoration in an isolated directory. Do not copy only a live main SQLite file while ignoring its WAL; use the backup command. Protect backups because they contain account hashes, customer source and payment records. Persistent storage must survive hosting restarts.

## Execution and preview limits

Commands and previews run in disposable non-root containers with network disabled, read-only image files, no host mounts or application secrets, bounded memory/CPU/processes/tmpfs and a deadline. Dependency preparation selects pinned approved packages; arbitrary npm/pip installs are not supported. Preview app state (including project-local SQLite databases) lasts only for that preview container, at most 15 minutes. Customer production database hosting is not implemented.

Preview supports ordinary HTTP and classic/module browser assets. WebSockets, cookie-authenticated apps, persistent browser storage and arbitrary framework routing are not fully supported in the opaque-origin sandbox. Vite apps should disable HMR, use cacheDir /tmp/vite-cache and allow /work, /opt/deps and /tmp/vite-cache in server.fs.allow. Use configFile:false for middleware or --configLoader runner. Source changes require restarting a preview.

Use a dedicated hardened execution host for public deployments. Do not expose the worker API unauthenticated or attach a Docker socket to the public Web container. Container isolation and these tests are not a production security certification.

## Payments

Packages: RM39/100 Credits, RM99/300 Credits, RM199/700 Credits. A server-issued quote locks amount, currency, rate and Credits for 30 minutes. Administrators set USDT/USD MYR-per-unit quotes; unset currencies cannot be quoted. Submitted deposits retain their rate even after a change. Admin verifies real settlement, then confirms once to grant Credits. Password unlock lasts 10 minutes. Duplicate reference/quote/review actions cannot grant twice.

The supplied Stripe link is fixed externally: its checkout amount/currency must match the quote, or users must choose another method. No provider webhook or automatic settlement verification is connected. Review declarations are not proof of payment. AI billing is not automatically enabled by approving a deposit.

## Verification

```sh
npm run check
npm test
KD_SANDBOX_TESTS=1 npm test
npm run test:studio
npm run test:browser
```

Browser scripts need Chromium/Chrome; set CHROME_PATH if necessary. Full sandbox tests need the prepared workload image. Tests use isolated accounts, synthetic payments and synthetic AI transports unless explicitly described as a live model check; they never credit real customers. Browser failure screenshots are stored under ignored test-results/.

GitHub Actions run syntax, API/business, container, workload and browser checks. Manual image publication prepares Web, worker and runtime images; it does not provision hosting or produce a public URL. Source and workflows have been pushed to the repository main branch. A public host has not yet been provisioned, and remote Actions completion has not been verified. See docs/server-setup-zh.md for server and GitHub Secrets setup.

## Still external or incomplete

GitHub OAuth/synchronization, email verification and password recovery, customer production database/site hosting, arbitrary language/dependency support, and public app/worker provisioning remain incomplete. See docs/deployment.md and docs/coding-workspaces.md; newer sections describing SQLite, approved dependencies and live previews supersede their older prototype notes. Do not claim full Codex feature parity or public paid-production readiness.

Administrator roles can also be stored by the offline admin-cli.mjs helper after the owner registers; see docs/server-setup-zh.md. Never bind by signup order or create the owner password on their behalf. Automatic deployment is authorized, but blocked until the owner opens a server and configures GitHub deployment secrets. No public URLs have been issued.

## Windows local testing — no server purchase

Download/extract the repository ZIP, install/start Docker Desktop in Linux-container mode, then double-click Start-Local.cmd. Stop-Local.cmd preserves the local data volumes. Register your own account before running Local-Admin.cmd to explicitly choose and confirm an administrator. No password is generated for you. The local profile binds only 127.0.0.1 and uses data volumes separate from a later public deployment.

A free built-in sample is available in the studio and runs without any AI key. Real AI calls still need your own securely configured provider key and may incur provider charges. Local setup never copies the managed cloud's key or proxy placeholder into your computer. See docs/windows-local-zh.md for the complete steps, optional key setup and port changes. Windows launchers require first validation on the actual Windows/Docker Desktop machine; their underlying Compose workflow and setup logic are tested separately.

Automatic remote deployment now requires KD_ENABLE_AUTO_DEPLOY=true in repository variables; it is off by default while the owner tests locally. Manual deployment remains available for a later explicit choice.
