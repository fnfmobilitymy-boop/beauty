# Deploy and validate K.D WEB

## What is prepared

- The user website is `/`; the separate administrator application is `/admin`.
- `.github/workflows/ci.yml` checks JavaScript, runs API/ledger tests and a Chromium workflow, packages source without data/secrets, builds a container and probes `/api/health`.
- `.github/workflows/publish-image.yml` is manual only. It checks the code and publishes an image to GitHub Container Registry when the repository owner deliberately runs it. It does not create a hosting service or a public URL.
- `Dockerfile` starts a non-root Node 24 application with a health check and production Secure cookies. Data lives in `/app/data`.

These files were created locally. GitHub Actions and GHCR publication have not been run. Repository files must be committed/pushed to GitHub before Actions can see them; environment snapshot publication does not push commits.

## Temporary HTTPS hosting

Choose a Docker-capable host with HTTPS, a temporary subdomain and a persistent disk (for example Render or Railway). Attach persistent storage at `/app/data`, use a single replica/writer, expose port 3000 and use `/api/health` as the health endpoint. A free ephemeral filesystem is unsuitable for accounts and paid Credits. A paid hosting plan may be necessary for persistent storage; no hosting purchase or service creation was performed.

Required hosting settings:

- `KD_AI_API_KEY`: real raw provider key stored securely by the host. A cloud proxy placeholder cannot be copied to a different host and treated as a real key.
- `KD_AI_MODEL`: optional, default gpt-4.1-mini.
- `KD_ADMIN_USER_IDS`: bind the owner's existing immutable account ID after owner registration. Requested email: hello@kennystudio.cfd. Do not assign the first registrant or an email string as administrator.
- `KD_CREDITS_BILLING`: initially disabled. Enable only after admin binding and settlement review are operational.
- `KD_SECURE_COOKIES=enabled`: requires HTTPS for real browser authentication.
- `KD_DATA_DIR=/app/data`, `PORT=3000`.

Bank/TNG/Stripe/USDT payments remain manually verified; the system only performs bookkeeping after administrator confirmation. Set real USDT/USD quotations in the admin UI before accepting those quoted payments. Keep all five data JSON files together in backups. Back up while the single server is stopped to avoid inconsistent cross-file snapshots; test restoration into an isolated directory before enabling real payments. Do not run multiple replicas against the same files.

## Current evidence

- Five API/business test cases passed, including account and project isolation, deposit replay prevention, admin review, balances, quote snapshots and reservations/refunds.
- `npm run test:browser` passed the complete simulated flow: login, MYR package declaration, admin password unlock and approval, recipient balance, synthetic AI generation and debit, project saves, history restore and a 390-pixel mobile viewport.
- Separate admin-browser checks passed user denial, admin login, counts, approval, user balance, ledger, rate update and logout clearing data.
- Docker build passed. Isolated container checks passed health, registration, Secure cookies and account persistence after restart. The image is not published.
- Source archive checks excluded data, environment files and Git metadata.

Browser AI responses and payments in these tests are synthetic; they do not establish live payment settlement or an externally hosted deployment. Current image code may need rebuilding when later edits occur.

## Not yet a complete Lovable replacement

This version generates self-contained HTML sites and supports editing, projects, histories and the manual recharge business flow. It does not yet generate arbitrary multi-file backend applications, provision customer databases, sync generated projects with GitHub, publish customer sites, verify email, recover forgotten passwords, or implement fully automatic payment reconciliation. Original logo/QR assets are still pending. The single-process JSON ledger needs transactional storage and crash reconciliation before a high-volume real-money rollout. A complete production-ready replica cannot be claimed from the current tests.

## Updated deployment contract

There are now three images: the public Web application (Dockerfile), the trusted worker (Dockerfile.runner), and an approved workload image (Dockerfile.sandbox). Build/pull the workload on the worker daemon and configure KD_SANDBOX_IMAGE if using its registry name. The public Web application must not mount the daemon socket. Configure KD_RUNNER_URL over HTTPS and the matching securely supplied token, and set KD_PUBLIC_ORIGIN to the actual HTTPS Web origin. Only the worker should control its dedicated daemon. The live-preview proxy does not publish container ports on that host.

Persistent platform storage now uses platform.sqlite with WAL. Use scripts/backup.mjs for an online consistent snapshot; do not rely on stale retained JSON files or a lone hot copy of platform.sqlite. A single app writer is enforced with a lease. Keep the persistent disk mounted across app replacements. Original JSON files are automatically imported and retained during migration.

CI now builds the approved image from a locked dependency graph before real sandbox and browser tests. Standard public GitHub runners do not need the managed session's CA; managed cloud builds mount the public CA as a BuildKit secret. No checksum/TLS checks are disabled and dependency install scripts are ignored. Manual publication includes all three images but has not been triggered.

The owner selected local engineering first; external connections and public hosting are deferred. Do not automatically create services or publish images. Current local runtime preparation builds Dockerfile.sandbox as kd-runtime:local, rather than merely pulling the plain Node image. Managed builds mount the public session CA through a BuildKit secret. Backups and SQLite databases are excluded from Git, Docker context and source artifacts.
