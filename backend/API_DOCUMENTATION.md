# Nawy GraphQL API Documentation

This document provides a comprehensive guide to using the Nawy GraphQL API.

## Overview

The API provides endpoints for managing real estate data including units, projects, developers, amenities, and images. It's built with NestJS and GraphQL.

## Base URL

```
http://localhost:3001/graphql
```

## Authentication

Currently, the API does not require authentication.

## Schema Types

### Unit

Represents a real estate unit (apartment, house, etc.)

| Field       | Type        | Description                     |
| ----------- | ----------- | ------------------------------- |
| id          | ID          | Unique identifier               |
| name        | String      | Unit name                       |
| number      | String      | Unit number within a project    |
| description | String      | Optional description            |
| price       | Float       | Unit price                      |
| rooms       | Int         | Number of rooms                 |
| bathrooms   | Int         | Number of bathrooms             |
| floor       | Int         | Floor number                    |
| floorArea   | Float       | Floor area in square meters     |
| projectId   | String      | Reference to the parent project |
| project     | Project     | Parent project details          |
| amenities   | [Amenity]   | List of amenities available     |
| images      | [Image]     | List of unit images             |
| unitImages  | [UnitImage] | Images with order information   |
| createdAt   | DateTime    | Creation timestamp              |
| updatedAt   | DateTime    | Last update timestamp           |

### Project

Represents a real estate development project.

| Field       | Type      | Description                  |
| ----------- | --------- | ---------------------------- |
| id          | ID        | Unique identifier            |
| name        | String    | Project name                 |
| developerId | String    | Reference to the developer   |
| developer   | Developer | Developer details            |
| units       | [Unit]    | List of units in the project |

### Developer

Represents a real estate developer company.

| Field    | Type      | Description                  |
| -------- | --------- | ---------------------------- |
| id       | ID        | Unique identifier            |
| name     | String    | Developer name               |
| projects | [Project] | List of developer's projects |

### Amenity

Represents facilities or features available in units.

| Field | Type   | Description             |
| ----- | ------ | ----------------------- |
| id    | ID     | Unique identifier       |
| name  | String | Amenity name            |
| icon  | String | Optional icon reference |
| units | [Unit] | Units with this amenity |

### Image

Represents images for units.

| Field   | Type   | Description               |
| ------- | ------ | ------------------------- |
| id      | ID     | Unique identifier         |
| url     | String | Image URL                 |
| altText | String | Optional alternative text |
| units   | [Unit] | Units using this image    |

## Queries

### units

Fetch units with filtering, sorting, and pagination.

```graphql
query {
  units(
    filter: {
      projectIds: ["project-id"]
      minPrice: 1000000
      maxPrice: 5000000
      minRooms: 2
      maxRooms: 4
      minFloorArea: 100
      maxFloorArea: 250
      amenityIds: ["amenity-id"]
      searchTerm: "corner"
    }
    sort: { field: PRICE, direction: ASC }
    limit: 10
    offset: 0
  ) {
    items {
      id
      name
      price
      rooms
      bathrooms
      floorArea
    }
    total
  }
}
```

### unit

Fetch a single unit by ID.

```graphql
query {
  unit(id: "unit-id") {
    id
    name
    price
    rooms
    bathrooms
    floorArea
    project {
      name
    }
    amenities {
      name
    }
    images {
      url
    }
  }
}
```

### projects

Fetch projects with optional filtering and pagination.

```graphql
query {
  projects(
    developerId: "developer-id"
    searchTerm: "heights"
    limit: 10
    offset: 0
  ) {
    id
    name
    developer {
      name
    }
  }
}
```

### project

Fetch a single project by ID.

```graphql
query {
  project(id: "project-id") {
    id
    name
    developer {
      name
    }
    units {
      id
      name
    }
  }
}
```

### developers

Fetch all developers.

```graphql
query {
  developers {
    id
    name
  }
}
```

### developer

Fetch a single developer by ID.

```graphql
query {
  developer(id: "developer-id") {
    id
    name
    projects {
      id
      name
    }
  }
}
```

### amenities

Fetch all amenities.

```graphql
query {
  amenities {
    id
    name
    icon
  }
}
```

### amenity

Fetch a single amenity by ID.

```graphql
query {
  amenity(id: "amenity-id") {
    id
    name
    units {
      id
      name
    }
  }
}
```

### images

Fetch all images.

```graphql
query {
  images {
    id
    url
    altText
  }
}
```

### image

Fetch a single image by ID.

```graphql
query {
  image(id: "image-id") {
    id
    url
    altText
  }
}
```

## Mutations

### createUnit

Create a new unit.

```graphql
mutation {
  createUnit(
    createUnitInput: {
      name: "Luxury Apartment"
      number: "A101"
      description: "Spacious apartment with a view"
      price: 2500000
      rooms: 3
      bathrooms: 2
      floor: 10
      floorArea: 150
      projectId: "project-id"
      amenityIds: ["amenity-id1", "amenity-id2"]
      imageIds: ["image-id1", "image-id2"]
    }
  ) {
    id
    name
  }
}
```

### updateUnit

Update an existing unit.

```graphql
mutation {
  updateUnit(
    updateUnitInput: {
      id: "unit-id"
      price: 2600000
      description: "Updated description"
    }
  ) {
    id
    price
    description
  }
}
```

### deleteUnit

Delete a unit.

```graphql
mutation {
  deleteUnit(id: "unit-id") {
    id
    name
  }
}
```

### createProject

Create a new project.

```graphql
mutation {
  createProject(
    createProjectInput: {
      name: "Mountain View Residences"
      developerId: "developer-id"
    }
  ) {
    id
    name
  }
}
```

### createDeveloper

Create a new developer.

```graphql
mutation {
  createDeveloper(createDeveloperInput: { name: "Premium Developers Ltd." }) {
    id
    name
  }
}
```

### createAmenity

Create a new amenity.

```graphql
mutation {
  createAmenity(createAmenityInput: { name: "Swimming Pool", icon: "pool" }) {
    id
    name
  }
}
```

### createImage

Create a new image.

```graphql
mutation {
  createImage(
    createImageInput: {
      url: "https://example.com/images/property.jpg"
      alt_text: "Property view from balcony"
    }
  ) {
    id
    url
  }
}
```

## Sorting Units

Units can be sorted using the following fields:

- `CREATED_AT`: Sort by creation date
- `NAME`: Sort by unit name

Directions can be:

- `ASC`: Ascending order
- `DESC`: Descending order (default)

## Filtering Units

Units can be filtered using these parameters:

- `projectIds`: List of project IDs to include
- `minPrice`/`maxPrice`: Price range
- `minRooms`/`maxRooms`: Room count range
- `minFloorArea`/`maxFloorArea`: Floor area range
- `amenityIds`: List of amenity IDs to include
- `searchTerm`: Text to search in unit name or number

## Pagination

Queries that return lists support pagination through:

- `limit`: Maximum number of items to return
- `offset`: Number of items to skip

## Error Handling

The API follows standard GraphQL error handling patterns, with error objects containing:

- `message`: Error description
- `locations`: Error location in the query
- `path`: Path to the field causing the error
- `extensions`: Additional error details
