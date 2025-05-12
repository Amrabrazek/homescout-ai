# Event-Driven Architecture & AI Embeddings

This document describes the event-driven architecture implemented in the Nawy application, specifically focusing on the automatic generation of embeddings for unit similarity search.

## Overview

The Nawy application uses an event-driven architecture to handle asynchronous processing tasks, such as generating AI embeddings for units. This approach decouples the main request flow from potentially time-consuming operations, providing better performance and scalability.

## Event System Architecture

### Event Types

The system defines several event types in `src/common/events/unit.events.ts`:

```typescript
export enum UnitEventType {
  CREATED = 'unit.created',
  UPDATED = 'unit.updated',
  DELETED = 'unit.deleted',
}

export class UnitCreatedEvent {
  constructor(public readonly unit: Unit) {}
}

export class UnitUpdatedEvent {
  constructor(public readonly unit: Unit) {}
}

export class UnitDeletedEvent {
  constructor(public readonly unit: Unit) {}
}
```

### Event Emitters

Events are emitted in the service layer when units are created, updated, or deleted:

```typescript
// In unit.service.ts
@Injectable()
export class UnitService {
  constructor(
    // Other dependencies...
    private eventEmitter: EventEmitter2
  ) {}

  async create(createUnitInput: CreateUnitInput): Promise<Unit> {
    // Create unit logic...

    // Emit event after successful creation
    this.eventEmitter.emit(
      UnitEventType.CREATED,
      new UnitCreatedEvent(createdUnit)
    );

    return createdUnit;
  }
}
```

### Event Listeners

Listeners subscribe to specific events and perform actions in response:

```typescript
// In unit-embedding.listener.ts
@Injectable()
export class UnitEmbeddingListener {
  constructor(private readonly unitService: UnitService) {}

  @OnEvent(UnitEventType.CREATED)
  async handleUnitCreatedEvent(event: UnitCreatedEvent) {
    try {
      console.log(`Generating embedding for new unit: ${event.unit.id}`);
      await this.unitService.updateUnitEmbedding(event.unit.id);
    } catch (error) {
      console.error(
        `Error generating embedding for unit ${event.unit.id}:`,
        error.message
      );
    }
  }

  @OnEvent(UnitEventType.UPDATED)
  async handleUnitUpdatedEvent(event: UnitUpdatedEvent) {
    try {
      console.log(`Updating embedding for unit: ${event.unit.id}`);
      await this.unitService.updateUnitEmbedding(event.unit.id);
    } catch (error) {
      console.error(
        `Error updating embedding for unit ${event.unit.id}:`,
        error.message
      );
    }
  }
}
```

## AI Embeddings for Unit Similarity

The system uses OpenAI's text embedding model to create vector representations of units for similarity search.

### Database Schema

The PostgreSQL database uses the `vector` extension to store and query embeddings:

```sql
-- In initial_schema.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.units (
  -- Other fields...
  embedding vector,
  -- Other fields...
);

-- Function to find similar units
CREATE OR REPLACE FUNCTION match_similar_units(
  unit_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  -- Implementation details...
$$;
```

### Embedding Generation Process

1. **Text Representation**: When a unit is created or updated, its features are converted to a text representation:

```typescript
private getUnitTextForEmbedding(unit: Unit): string {
  const parts = [
    `Name: ${unit.name}`,
    `Number: ${unit.number}`,
    `Floor: ${unit.floor}`,
    `Rooms: ${unit.rooms}`,
    `Bathrooms: ${unit.bathrooms}`,
    `Floor Area: ${unit.floorArea} square meters`,
    `Price: ${unit.price}`,
  ];

  if (unit.description) {
    parts.push(`Description: ${unit.description}`);
  }

  if (unit.project?.name) {
    parts.push(`Project: ${unit.project.name}`);
  }

  if (unit.amenities && unit.amenities.length > 0) {
    const amenitiesText = unit.amenities
      .map((amenity) => amenity.name)
      .join(', ');
    parts.push(`Amenities: ${amenitiesText}`);
  }

  return parts.join(' ');
}
```

2. **OpenAI API Call**: The text is sent to OpenAI's API to generate embeddings:

```typescript
private async generateUnitEmbedding(unit: Unit): Promise<number[] | null> {
  try {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      console.warn('OpenAI API key not configured. Skipping embedding generation.');
      return null;
    }

    const unitText = this.getUnitTextForEmbedding(unit);
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-ada-002',
        input: unitText,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    return null;
  }
}
```

3. **Storage in Database**: The embedding is saved to the database for later similarity queries:

```typescript
async updateUnitEmbedding(unitId: string): Promise<Unit> {
  const unit = await this.findOne(unitId);

  // Load related entities for embedding generation
  unit.project = await this.projectService.findOne(unit.projectId);
  unit.amenities = await this.getUnitAmenities(unitId);

  // Generate embedding
  unit.embedding = await this.generateUnitEmbedding(unit);

  // Save embedding in the correct format for PostgreSQL vector type
  if (unit.embedding) {
    try {
      const formattedEmbedding = `[${unit.embedding.join(',')}]`;

      await this.dataSource.query(
        `UPDATE units SET embedding = $1::vector WHERE id = $2`,
        [formattedEmbedding, unitId]
      );

      return this.findOne(unitId);
    } catch (error) {
      console.error(`Error updating embedding for unit ${unitId}:`, error.message);
      return unit;
    }
  }

  return this.unitRepository.save(unit);
}
```

### Similar Units Query

The API provides a `similarUnits` GraphQL query that uses the PostgreSQL function to find similar units:

```graphql
query {
  similarUnits(unitId: "unit-id", limit: 5) {
    id
    name
    price
    rooms
    images {
      url
    }
    project {
      name
    }
  }
}
```

The implementation in the resolver:

```typescript
@Query(() => [Unit])
async similarUnits(
  @Args('unitId') unitId: string,
  @Args('limit', { defaultValue: 5 }) limit: number
): Promise<Unit[]> {
  return this.unitService.findSimilarUnits(unitId, limit);
}
```

And the service method:

```typescript
async findSimilarUnits(unitId: string, limit = 5): Promise<Unit[]> {
  // Call PostgreSQL function to find similar units
  const similarUnits = await this.dataSource.query(
    `
    SELECT u.*
    FROM units u
    INNER JOIN LATERAL match_similar_units($1, 0.0, $2) as similar
    ON u.id = similar.id
    ORDER BY similar.similarity DESC
    `,
    [unitId, limit]
  );

  // Load related entities
  for (const unit of similarUnits) {
    unit.project = await this.projectService.findOne(unit.project_id);
    unit.images = await this.getUnitImages(unit.id);
  }

  return similarUnits;
}
```

## Configuration

To enable embedding generation, add your OpenAI API key to the `.env` file:

```
OPENAI_API_KEY=your-api-key-here
```

Without a valid API key, the system will log a warning and skip embedding generation, falling back to random recommendations.
