# Production operations

## Deployment configuration

Copy `.env.example` to an untracked `.env.production` and set the real values through the host's secret manager. Compose requires `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `POSTGRES_ADMIN_USER`, `POSTGRES_ADMIN_PASSWORD`, `CORS_ORIGIN`, `TELEGRAM_BOT_TOKEN`, and `JWT_ACCESS_SECRET`. The internal API port is fixed at 3000; `DB_PORT` defaults to 5432 and `LOG_LEVEL` to `info`. Never use the CI-only credentials in production. Set `CORS_ORIGIN` to the exact HTTPS frontend origin(s), comma-separated. Point DNS at the host and obtain a certificate before starting `proxy`; update both `server_name` entries in `deploy/nginx/default.conf` and install the certificate as `certs/fullchain.pem` and `certs/privkey.pem`.

The PostGIS Compose service uses the PostgreSQL 18 data mount `/var/lib/postgresql` and a named volume. This volume is separate from a host PostgreSQL installation. Never attach a volume containing a different PostgreSQL major version to this image. The init script runs only when PostgreSQL initializes an empty volume: it enables PostGIS and creates a login role without superuser or database-creation rights. That role receives `CREATE` on `public` so the existing migration set can create and alter its own objects. For an already initialized database, provision equivalent grants with an administrator; do not remove the database or volume to rerun initialization.

## First start

With the domain, certificate and secret values configured, build the API image and initialize the database in order:

```powershell
docker compose --env-file .env.production build api
docker compose --env-file .env.production up -d db
docker compose --env-file .env.production run --rm api npm run db:migrate:prod
docker compose --env-file .env.production up -d api proxy
```

This keeps the API behind the proxy until the migration step succeeds. The named database volume persists across container replacement and restart.

## Controlled deployment and migrations

The CI workflow checks lint, strict TypeScript, migrations and tests in a disposable PostGIS database, builds the app, and builds the production image. It does not deploy. Configure a protected GitHub `production` environment with required reviewers and environment secrets before connecting a deployment provider. Deployment remains a manual, reviewed operation until the hosting target and credentials are configured.

For a deployment, first take a verified backup, build and inspect the new image, then run the one-way migrations as a separate release step before routing traffic to the new API: `docker compose --env-file .env.production run --rm api npm run db:migrate:prod`. Confirm migration completion and API readiness, then replace the running API. The image includes compiled migration runner and migration files. A migration rollback is not automatically safe: inspect its `down` migration and data effects first, take another backup, then use `docker compose --env-file .env.production run --rm api npm run db:rollback:prod` only when the schema change is reversible and the previous app version is compatible. Otherwise restore a backup into a separate recovery database and use a forward fix.

## Backups and restore checks

Create a custom-format backup without printing credentials (PowerShell): first run `New-Item -ItemType Directory -Force backups`, then `docker compose --env-file .env.production exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/gameclubfinder-$(Get-Date -Format yyyyMMdd-HHmmss).dump`. Store backup files outside the repository in encrypted, access-controlled storage and define retention/alerting with the hosting provider. A Docker volume is persistence, not a backup.

Verify restoration periodically into a newly created, isolated recovery database or disposable PostgreSQL 18 + PostGIS environment. Restore with `pg_restore --exit-on-error --dbname=<empty-recovery-db> <backup.dump>`, then run read-only checks for `PostGIS_Version()`, `pgmigrations`, expected table counts, and a small API/readiness check pointed at that recovery database. Record the backup timestamp, restore duration, and check result. Never use a production database as the restore target. This change verified pg_dump/pg_restore in an isolated Compose DB and separate recovery DB (PostGIS 3.6, 16 migrations, 5 seeded games); run another drill against the hosting provider's encrypted backup destination before launch.

## Runtime checks and response

The API container healthcheck calls `GET /api/health`, which checks the database and serves as readiness. SIGINT/SIGTERM closes the HTTP server and PostgreSQL pool. Nginx redirects HTTP to HTTPS, accepts TLS 1.2/1.3, limits uploads to the API's 8 MiB cap, and forwards the original host/client/protocol headers. Helmet and module-specific rate limits are enabled in the app. Docker's local log driver rotates each service's logs at 10 MiB per file with five files retained; export them to the platform log service for centralized access and longer retention. Pino emits structured application logs to stdout. Rotate Telegram bot tokens in BotFather and the runtime secret store; after rotation, restart/redeploy and verify Telegram login. Configure platform monitoring/error tracking for container restarts, health failures, CPU/memory/disk, PostgreSQL availability, backup age, and TLS expiry. Never log secrets or request authorization headers.

## Remaining environment-specific verification

The repository does not contain a real domain, TLS certificate, production secret store, deployment target, monitoring account, or backup destination. Configure these externally and perform a production-like startup, TLS check, and restore drill before declaring production acceptance complete.
