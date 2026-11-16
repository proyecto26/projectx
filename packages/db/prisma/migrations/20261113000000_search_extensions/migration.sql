-- Extensions for search: trigram matching on product text and vector similarity.
-- pg_trgm used to come only from the docker init script; vector needs the
-- pgvector package (docker/postgres/Dockerfile).
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";
