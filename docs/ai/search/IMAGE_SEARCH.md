# Image Search Platform Architecture

```mermaid
%%{init: {'theme':'dark', 'themeVariables': { 'fontSize': '16px', 'fontFamily': 'Roboto' }}}%%
graph TD
   %% Define styles first
    classDef agentStyle fill:#42A5F5,stroke:#1E88E5,stroke-width:2px,color:#FFFFFF
    classDef brainStyle fill:#AB47BC,stroke:#8E24AA,stroke-width:2px,color:#FFFFFF
    classDef bodyStyle fill:#FFA726,stroke:#FB8C00,stroke-width:2px,color:#FFFFFF
    classDef toolsStyle fill:#EC407A,stroke:#D81B60,stroke-width:2px,color:#FFFFFF
    classDef subgraphStyle fill:none,stroke:#B0BEC5,stroke-width:2px,color:#FFFFFF
    linkStyle default stroke:#FFFFFF,stroke-width:2px

    subgraph Agent["Agente de IA"]
        Brain[Cerebro: Modelo]
        Body[Cuerpo: Capacidades y Herramientas]
    end

    subgraph Tools["Herramientas Disponibles"]
        Vision[Visión]
        Search[Búsqueda]
    end

    %% Apply styles to nodes
    class Brain brainStyle
    class Body bodyStyle
    class Vision,Search toolsStyle
    class Agent agentStyle

    %% Define relationships
    Brain --> Body
    Body --> Vision
    Body --> Search
```

## Overview

This document outlines the architecture and data flow for the image search platform using the Wolt Food CLIP-ViT-B-32 embeddings dataset. The platform will provide fast and accurate image search capabilities using vector similarity in PostgreSQL.

## High Level Architecture

```mermaid
%%{init: {'theme':'dark', 'themeVariables': { 'fontSize': '16px', 'fontFamily': 'Roboto' }}}%%
graph TB
    %% Define styles first
    classDef clientStyle fill:#42A5F5,stroke:#1E88E5,stroke-width:2px,color:#FFFFFF
    classDef searchStyle fill:#AB47BC,stroke:#8E24AA,stroke-width:2px,color:#FFFFFF
    classDef processingStyle fill:#FFA726,stroke:#FB8C00,stroke-width:2px,color:#FFFFFF
    classDef storageStyle fill:#EC407A,stroke:#D81B60,stroke-width:2px,color:#FFFFFF
    classDef externalStyle fill:#7E57C2,stroke:#5E35B1,stroke-width:2px,color:#FFFFFF
    classDef subgraphStyle fill:none,stroke:#B0BEC5,stroke-width:2px,color:#FFFFFF
    linkStyle default stroke:#FFFFFF,stroke-width:2px

    subgraph Frontend["Frontend Layer"]
        WebApp[React Web App]
    end

    subgraph SearchService["Search Service (NestJS)"]
        SearchAPI[Search API]
        TextProcessor[Text Processing]
        ImageProcessor[Image Processing]
        URLScraper[URL Scraping Service]
    end

    subgraph WorkflowLayer["Temporal Workflow Layer"]
        direction TB
        Temporal[Temporal Server]
        ImportWorkflow[Dataset Import Workflow]
        SearchWorkflow[Search Processing Workflow]
        BatchProcessor[Batch Processing Activities]
        EmbeddingService[Embedding Activities]
    end

    subgraph StorageLayer["Storage Layer"]
        S3[(AWS S3)]
        PostgreSQL[(PostgreSQL + pgvector)]
        Redis[(Redis Cache)]
    end

    subgraph ExternalServices["External Services"]
        CLIP[CLIP API Service]
        Dataset[Wolt Food Dataset]
    end

    %% Frontend to Service Connections
    WebApp --> SearchAPI

    %% Search Service Internal Connections
    SearchAPI --> TextProcessor
    SearchAPI --> ImageProcessor
    SearchAPI --> URLScraper
    SearchAPI --> SearchWorkflow
    
    %% Workflow Connections
    Dataset --> ImportWorkflow
    ImportWorkflow --> BatchProcessor
    BatchProcessor --> EmbeddingService
    SearchWorkflow --> EmbeddingService
    
    %% Storage Connections
    EmbeddingService --> PostgreSQL
    EmbeddingService --> S3
    BatchProcessor --> S3
    SearchAPI --> Redis
    
    %% External Service Connections
    EmbeddingService --> CLIP

    %% Apply styles to nodes
    class WebApp clientStyle
    class SearchAPI,TextProcessor,ImageProcessor,URLScraper searchStyle
    class Temporal,ImportWorkflow,SearchWorkflow,BatchProcessor,EmbeddingService processingStyle
    class S3,PostgreSQL,Redis storageStyle
    class CLIP,Dataset externalStyle
    class Frontend,SearchService,WorkflowLayer,StorageLayer,ExternalServices subgraphStyle
```

### Key Workflows

1. **Image Search Workflow**
```ts
interface SearchWorkflowInput {
  type: 'text' | 'image' | 'url';
  query: string;
  limit?: number;
  similarity?: number;
}

async function imageSearchWorkflow(input: SearchWorkflowInput) {
  // 1. Generate embedding based on input type
  let embedding: number[];
  
  switch(input.type) {
    case 'text':
      embedding = await activities.generateTextEmbedding(input.query);
      break;
    case 'image':
      embedding = await activities.generateImageEmbedding(input.query);
      break;
    case 'url':
      // For product pages, first extract main image
      const imageUrl = await activities.scrapeMainImage(input.query);
      embedding = await activities.generateImageEmbedding(imageUrl);
      break;
  }

  // 2. Search similar images in PostgreSQL using pgvector
  const results = await activities.findSimilarImages({
    embedding,
    limit: input.limit || 10,
    minSimilarity: input.similarity || 0.7
  });

  // 3. Generate presigned URLs if images are in S3
  const withPresignedUrls = await activities.generatePresignedUrls(results);

  return withPresignedUrls;
}
```

2. **New Image Upload Workflow**
```ts
interface UploadWorkflowInput {
  type: 'url' | 'file';
  source: string;
  metadata?: Record<string, any>;
}

async function imageUploadWorkflow(input: UploadWorkflowInput) {
  try {
    // 1. Get image buffer (either from URL or file)
    const imageBuffer = input.type === 'url' 
      ? await activities.downloadImage(input.source)
      : await activities.readFileBuffer(input.source);

    // 2. Generate a unique name
    const fileName = await activities.generateUniqueFileName(input.source);

    // 3. Upload to storage and get URL
    const imageUrl = await activities.uploadImage(imageBuffer, fileName);

    // 4. Generate embedding
    const embedding = await activities.generateImageEmbedding(imageBuffer);

    // 5. Store in PostgreSQL
    const image = await activities.storeImage({
      name: fileName,
      imageUrl,
      externalUrl: input.type === 'url' ? input.source : null,
      embedding,
      metadata: input.metadata
    });

    return image;
  } catch (error) {
    // Cleanup any partial uploads
    await activities.cleanupFailedUpload(fileName);
    throw error;
  }
}
```

### SQL Queries for Vector Search

```sql
-- Basic similarity search
SELECT id, name, image_url, 
       1 - (embedding <=> $1) as similarity
FROM image
WHERE 1 - (embedding <=> $1) > $2  -- $2 is minimum similarity threshold
ORDER BY similarity DESC
LIMIT $3;

-- Combined text and vector search
SELECT id, name, image_url,
       1 - (embedding <=> $1) as similarity
FROM image
WHERE name ILIKE $2  -- Text search
  AND 1 - (embedding <=> $1) > $3  -- Vector similarity
ORDER BY similarity DESC
LIMIT $4;
```

### Key Benefits of This Architecture

1. **Reliability**:
   - Temporal handles retries and failure recovery
   - `externalId` prevents duplicate processing
   - Batch processing with individual error handling

2. **Scalability**:
   - Parallel processing within safe batch sizes
   - pgvector's IVFFLAT index for fast similarity search
   - S3 for reliable image storage

3. **Maintainability**:
   - Clear separation of concerns in workflows
   - Activity-based architecture for easy testing
   - Structured error handling and logging

4. **Performance**:
   - Batch processing for efficient imports
   - Indexed vector searches
   - Caching opportunities with Redis (optional)

## Database Schema

```sql
-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the images table
CREATE TABLE image (
    id SERIAL PRIMARY KEY,
    external_id TEXT,                    -- External ID from dataset
    name TEXT,                           -- Image name/title
    description TEXT,                    -- Image description
    image_url TEXT NOT NULL,             -- URL to image
    external_url TEXT,                   -- Original external URL
    embedding vector(512),               -- CLIP-ViT-B-32 embedding (512 dimensions)
    metadata JSONB,                      -- Additional metadata
    tags TEXT[],                         -- Array of tags
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX ix_image_name ON image(name);
CREATE INDEX ix_image_tags ON image USING GIN(tags);
-- ivfflat: vectors are divided in clusters
-- vector_cosine_ops: cosine similarity (used for vector search)
-- lists: number of clusters to balance between speed and accuracy
CREATE INDEX ix_image_embedding ON image USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## Data Flow

### 1. Dataset Import Process

```mermaid
sequenceDiagram
    participant DS as Dataset Service
    participant IP as Image Processor
    participant S3 as S3 Service
    participant ES as Embedding Service
    participant DB as PostgreSQL
    participant TW as Temporal Worker

    DS->>TW: Start Import Workflow
    loop For each batch of images
        TW->>DS: Fetch Batch
        DS->>IP: Process Images
        IP->>S3: Upload to S3
        IP->>ES: Generate/Get Embeddings
        ES->>DB: Store Data
    end
    TW->>DS: Complete Import
```

### 2. Search Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Search API
    participant ES as Embedding Service
    participant DB as PostgreSQL
    participant S3 as S3

    C->>API: Search Request (text/image)
    alt Text Search
        API->>ES: Generate Text Embedding
    else Image Search
        API->>ES: Generate Image Embedding
    end
    ES->>DB: Vector Similarity Search
    DB->>API: Similar Images
    API->>S3: Get Image URLs
    API->>C: Search Results
```

## Implementation Strategy

### 1. Dataset Import Process

1. **Initial Setup**
   - Create S3 bucket for image storage
   - Set up PostgreSQL with pgvector extension
   - Create database schema and indices

2. **Batch Processing**
   - Use Temporal workflows for reliable batch processing
   - Process images in batches of 1000
   - Implement retry mechanisms and error handling
   - Track progress and enable resume capability

3. **Data Transformation**
   - Download images from original URLs
   - Upload to S3 with optimized format/size
   - Store embeddings and metadata in PostgreSQL

### 2. Search Implementation

1. **API Endpoints**
   ```typescript
   @Post('search/text')
   async searchByText(@Body() dto: TextSearchDto) {
     // Generate text embedding
     // Perform vector similarity search
     // Return results with presigned S3 URLs
   }

   @Post('search/image')
   async searchByImage(@Body() dto: ImageSearchDto) {
     // Generate image embedding
     // Perform vector similarity search
     // Return results with presigned S3 URLs
   }

   @Post('search/url')
   async searchByUrl(@Body() dto: UrlSearchDto) {
     // Scrape image from URL
     // Generate image embedding
     // Perform vector similarity search
     // Return results with presigned S3 URLs
   }
   ```

2. **Vector Search Query**
   ```sql
   SELECT id, name, description, s3_path, 
          1 - (embedding <=> $1) as similarity
   FROM images
   WHERE 1 - (embedding <=> $1) > 0.7
   ORDER BY similarity DESC
   LIMIT 10;
   ```

## Performance Considerations

1. **Database Optimization**
   - Use appropriate index strategy (IVFFlat for large datasets)
   - Partition data if needed
   - Monitor and optimize query performance

2. **Caching Strategy**
   - Cache common search results
   - Cache S3 presigned URLs
   - Cache embeddings for frequently accessed items

3. **Batch Processing**
   - Process dataset imports in parallel
   - Use connection pooling
   - Implement backpressure mechanisms

## Monitoring and Metrics

1. **Key Metrics**
   - Search latency
   - Import process progress
   - Vector search accuracy
   - S3 storage usage
   - Database performance

2. **Logging**
   - Search queries and results
   - Import process status
   - Error rates and types
   - Performance bottlenecks

## Next Steps

1. Set up the initial infrastructure:
   - Create S3 bucket
   - Configure PostgreSQL with pgvector
   - Set up Temporal workflows

2. Implement core services:
   - Dataset import service
   - Image processing service
   - Search API endpoints

3. Create monitoring and logging:
   - Set up metrics collection
   - Configure alerting
   - Implement logging strategy

4. Test and optimize:
   - Load testing
   - Performance tuning
   - Query optimization 