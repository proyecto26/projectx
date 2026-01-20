# Infrastructure & Deployment

## Docker Environment

### Services
- **Apps**: `auth`, `order`, `product`, `web`
- **Infrastructure**:
  - `db`: PostgreSQL 12 (+ PostGIS)
  - `temporal`: Workflow Engine
  - `elasticsearch`: Search attributes support
  - `maildev`: Local email testing

### Commands
- **Start All**: `docker compose up -d`
- **Rebuild**: `docker compose up -d --build`
- **Logs**: `docker compose logs -f [service_name]`

## Deployment Scripts

### Temporal Setup
Located in `deployment/scripts/temporal/`:
1. `setup-postgres-es.sh`: Inits DB schema and ElasticSearch index.
2. `create-namespace.sh`: Creates default namespace.
3. `search-attributes.sh`: Registers custom Temporal search attributes (`OrderId`, `Email`, etc.).

### Configuration
- **Dynamic Config**: `deployment/config/dynamicconfig/development.yaml` controls Temporal server limits.
- **Environment**: `.env` file at root drives all service config.

## Best Practices
- **Persistence**: Database volumes are persistent. Use `docker compose down -v` to reset.
- **Health Checks**: All services implement Docker health checks. Dependent services wait for `service_healthy` condition.
- **Restart Policy**: `on-failure` or `unless-stopped` recommended for stability.
