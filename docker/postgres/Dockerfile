# PostgreSQL 17 + PostGIS 3.6 + pgvector, used by docker compose and CI.
# Same Postgres major as before, so existing data volumes keep working.
FROM postgis/postgis:17-3.6

# pgvector 0.8+ is required for iterative index scans (filtered vector search)
ARG PGVECTOR_VERSION=0.8.7-1.pgdg13+2
RUN apt-get update \
  && apt-get install -y --no-install-recommends "postgresql-17-pgvector=${PGVECTOR_VERSION}" \
  && rm -rf /var/lib/apt/lists/*
