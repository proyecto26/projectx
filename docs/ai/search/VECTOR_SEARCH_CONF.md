# Vector Search Configuration

## Available Operators
- `vector_cosine_ops`: Cosine similarity, best for normalized embeddings (range -1 to 1)
- `vector_l2_ops`: Euclidean distance, best for measuring absolute distances
- `vector_ip_ops`: Inner product, best for comparing raw embedding vectors

## HNSW Parameters

### Index Creation Parameters
- `m`: Number of connections per node (16-64 range, higher = better accuracy, more RAM)
- `ef_construction`: Exploration factor during index build (64-200 range, higher = better accuracy, slower build)

### Runtime Parameters
- `ef`: Dynamic exploration factor for queries (32-64 range, higher = better accuracy, slower search)
  - Set at query time using: `SET hnsw.ef = 32;`

## Scalability Strategy

### 1. Initial Phase (Up to 1M records)
Using HNSW (Hierarchical Navigable Small World) for:
- Fastest search speed (<10ms for top-k queries)
- Best accuracy (95-99% recall)
- Ideal for immutable datasets

Requirements:
- RAM: ~4-8x the size of embeddings
- For 100k records: ~2GB RAM overhead

Configuration example:
```sql
-- Create index with build-time parameters
CREATE INDEX "ix_image_embedding" ON "image" 
USING hnsw (embedding vector_cosine_ops)
WITH (
    m = 16,               -- Number of connections per node
    ef_construction = 64  -- Build-time exploration factor
);

-- Set runtime parameters before queries
SET hnsw.ef = 32;  -- Query-time exploration factor
```

### 2. Mid-Scale Phase (1M-10M records)
Options when memory pressure increases:

- a. Partition by date/category and keep HNSW
- b. Switch to IVFFlat if RAM cost becomes prohibitive:

```sql
CREATE INDEX "ix_image_embedding" ON "image" 
USING ivfflat (embedding vector_cosine_ops)
WITH (
    lists = 100         -- Number of clusters (sqrt(N) to N/1000, where N is number of records)
);
```

### 3. Large-Scale Phase (10M+ records)
Consider implementing:

a) Sharding by embedding similarity clusters:
```sql
CREATE TABLE image_shard_1 PARTITION OF image
  FOR VALUES FROM (0.0) TO (0.33)
  USING hnsw (embedding vector_cosine_ops)
  WITH (
    m = 32,              -- Higher m for better accuracy in larger datasets
    ef_construction = 100, -- Increased for better index quality
    ef = 50              -- Higher ef for better search quality
  );
```

b) Hybrid search with materialized views for text+vector:
```sql
CREATE MATERIALIZED VIEW image_search_mv AS
SELECT id, name, description, embedding, 
       to_tsvector('english', name || ' ' || COALESCE(description, '')) as text_search
FROM image;

CREATE INDEX ix_image_search_mv_text ON image_search_mv USING GIN (text_search);
CREATE INDEX ix_image_search_mv_embedding ON image_search_mv 
USING hnsw (embedding vector_cosine_ops)
WITH (
    m = 32,
    ef_construction = 100,
    ef = 50
);
```

c) Cache table for popular searches:
```sql
CREATE TABLE image_search_cache (
    query_hash TEXT PRIMARY KEY,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    hits INTEGER DEFAULT 1
);
```

d) Read replica configuration:
```sql
-- In postgresql.conf for replica:
hot_standby = on
max_standby_streaming_delay = 30s
max_standby_archive_delay = 30s
```
