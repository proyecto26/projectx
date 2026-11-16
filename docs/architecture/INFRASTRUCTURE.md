# Infrastructure & Deployment

## Docker Environment

### Services
- **Apps**: `auth`, `order`, `product`, `web`
- **Infrastructure**:
  - `db`: PostgreSQL 17 + PostGIS 3.6 + pgvector, built from `docker/postgres/Dockerfile`
  - `storage`: S3-compatible object store (RustFS) for product images and 3D assets; `storage-setup` creates the bucket (public `assets/`, private `staging/` and `query/` with expiry rules) and exits
  - `temporal`: Workflow Engine
  - `elasticsearch`: Search attributes support
  - `maildev`: Local email testing

### Commands
- **Start All**: `docker compose up -d`
- **Rebuild**: `docker compose up -d --build`
- **Logs**: `docker compose logs -f [service_name]`

### Upgrading an existing checkout to pgvector and storage
The data volume is kept (same Postgres major), but three steps are needed:
1. Copy the `OBJECT STORAGE SETTINGS` block from `.env.example` into `.env`. Compose refuses to resolve any service without `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`.
2. `docker compose build db && docker compose up -d db storage storage-setup`
3. Apply the migrations: `docker compose up builder` (the migration owner), or `POSTGRES_HOST=localhost pnpm prisma:migrate` from the host. Restarting `db` only installs the extension binaries; the migration creates `pg_trgm` and `vector`.

The base image is amd64 only, so compose pins `platform: linux/amd64` (emulated on Apple Silicon).

## Deployment Scripts

### Temporal Setup
Located in `deployment/scripts/temporal/`:
1. `setup-postgres-es.sh`: Inits DB schema and ElasticSearch index.
2. `create-namespace.sh`: Creates default namespace.
3. `search-attributes.sh`: Registers custom Temporal search attributes (`OrderId`, `Email`, etc.).

### Storage Setup
`deployment/scripts/storage/setup-bucket.sh` runs in the `storage-setup` container (AWS CLI). It only uses the S3 API, so it works against any S3-compatible store, and it is safe to run again.

### Configuration
- **Dynamic Config**: `deployment/config/dynamicconfig/development.yaml` controls Temporal server limits.
- **Environment**: `.env` file at root drives all service config.

## Best Practices
- **Persistence**: Database volumes are persistent. Use `docker compose down -v` to reset.
- **Health Checks**: All services implement Docker health checks. Dependent services wait for `service_healthy` condition.
- **Restart Policy**: `on-failure` or `unless-stopped` recommended for stability.
