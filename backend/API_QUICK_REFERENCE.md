# Nawy GraphQL API Quick Reference

## Endpoint

```
http://localhost:3001/graphql
```

## Available Queries

| Query        | Description                | Parameters                                     |
| ------------ | -------------------------- | ---------------------------------------------- |
| `units`      | List units with pagination | `filter`, `sort`, `limit`, `offset`            |
| `unit`       | Get single unit            | `id` (required)                                |
| `projects`   | List projects              | `developerId`, `searchTerm`, `limit`, `offset` |
| `project`    | Get single project         | `id` (required)                                |
| `developers` | List developers            | None                                           |
| `developer`  | Get single developer       | `id` (required)                                |
| `amenities`  | List amenities             | None                                           |
| `amenity`    | Get single amenity         | `id` (required)                                |
| `images`     | List images                | None                                           |
| `image`      | Get single image           | `id` (required)                                |

## Available Mutations

| Mutation          | Description        | Input                  |
| ----------------- | ------------------ | ---------------------- |
| `createUnit`      | Create a unit      | `createUnitInput`      |
| `updateUnit`      | Update a unit      | `updateUnitInput`      |
| `deleteUnit`      | Delete a unit      | `id` (required)        |
| `createProject`   | Create a project   | `createProjectInput`   |
| `createDeveloper` | Create a developer | `createDeveloperInput` |
| `createAmenity`   | Create an amenity  | `createAmenityInput`   |
| `createImage`     | Create an image    | `createImageInput`     |

## Unit Filtering Options

```graphql
filter: {
  projectIds: [String],
  minPrice: Float,
  maxPrice: Float,
  minRooms: Int,
  maxRooms: Int,
  minFloorArea: Float,
  maxFloorArea: Float,
  amenityIds: [String],
  searchTerm: String
}
```

## Unit Sorting Options

```graphql
sort: {
  field: CREATED_AT | NAME,
  direction: ASC | DESC
}
```

## Common Input Types

### CreateUnitInput

```graphql
{
  name: String!
  number: String!
  description: String
  price: Float!
  rooms: Int!
  bathrooms: Int!
  floor: Int!
  floorArea: Float!
  projectId: String!
  amenityIds: [String!]
  imageIds: [String!]
}
```

### UpdateUnitInput

```graphql
{
  id: ID
  name: String
  number: String
  description: String
  price: Float
  rooms: Int
  bathrooms: Int
  floor: Int
  floorArea: Float
  projectId: String
  amenityIds: [String!]
  imageIds: [String!]
}
```

### CreateProjectInput

```graphql
{
  name: String!
  developerId: String!
}
```

### CreateDeveloperInput

```graphql
{
  name: String!
}
```

### CreateAmenityInput

```graphql
{
  name: String!
  icon: String
}
```

### CreateImageInput

```graphql
{
  url: String!
  alt_text: String
}
```

## Sample Query

```graphql
query {
  units(filter: { minPrice: 1000000, maxRooms: 3 }, limit: 10, offset: 0) {
    items {
      id
      name
      price
      rooms
      project {
        name
        developer {
          name
        }
      }
    }
    total
  }
}
```

## Sample Mutation

```graphql
mutation {
  createUnit(
    createUnitInput: {
      name: "Deluxe Suite"
      number: "B205"
      price: 3500000
      rooms: 3
      bathrooms: 2
      floor: 2
      floorArea: 180
      projectId: "project-id"
    }
  ) {
    id
    name
  }
}
```
