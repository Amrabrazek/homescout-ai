# GraphQL Playground Examples

This document contains ready-to-use examples that you can copy and paste directly into the GraphQL Playground interface to test the API.

## How to Use

1. Start your backend server
2. Navigate to http://localhost:3001/graphql
3. Copy the queries or mutations from this document
4. Paste them into the left panel of GraphQL Playground
5. Click the "Play" button to execute

## Common Workflow Examples

Here are complete examples for common workflows:

### Workflow: Adding a New Property

1. First, create a developer (if not exists):

```graphql
mutation CreateNewDeveloper {
  createDeveloper(createDeveloperInput: { name: "Skyline Development Group" }) {
    id
    name
  }
}
```

2. Create a project under the developer:

```graphql
mutation CreateNewProject {
  createProject(
    createProjectInput: {
      name: "Garden Heights"
      developerId: "developer-id-from-step-1"
    }
  ) {
    id
    name
  }
}
```

3. Create amenities (if not exist):

```graphql
mutation CreateAmenities {
  pool: createAmenity(
    createAmenityInput: { name: "Swimming Pool", icon: "pool" }
  ) {
    id
  }
  gym: createAmenity(
    createAmenityInput: { name: "Fitness Center", icon: "fitness_center" }
  ) {
    id
  }
}
```

4. Create images for the unit:

```graphql
mutation CreateImages {
  livingRoom: createImage(
    createImageInput: {
      url: "https://example.com/living-room.jpg"
      alt_text: "Spacious living room"
    }
  ) {
    id
  }
  bedroom: createImage(
    createImageInput: {
      url: "https://example.com/bedroom.jpg"
      alt_text: "Master bedroom"
    }
  ) {
    id
  }
}
```

5. Finally, create the unit with references:

```graphql
mutation CreateNewUnit {
  createUnit(
    createUnitInput: {
      name: "Luxury Garden Apartment"
      number: "A105"
      description: "Beautiful apartment with garden views"
      price: 3200000
      rooms: 3
      bathrooms: 2
      floor: 1
      floorArea: 175
      projectId: "project-id-from-step-2"
      amenityIds: ["pool-id-from-step-3", "gym-id-from-step-3"]
      imageIds: ["livingroom-id-from-step-4", "bedroom-id-from-step-4"]
    }
  ) {
    id
    name
    price
    amenities {
      name
    }
    images {
      url
    }
  }
}
```

### Workflow: Updating Property Details

1. First, get the current unit details:

```graphql
query GetUnitToUpdate {
  unit(id: "unit-id-to-update") {
    id
    name
    number
    description
    price
    rooms
    bathrooms
    floor
    floorArea
    projectId
    amenities {
      id
      name
    }
    images {
      id
      url
    }
  }
}
```

2. Update the unit with new details:

```graphql
mutation UpdateExistingUnit {
  updateUnit(
    updateUnitInput: {
      id: "unit-id-to-update"
      price: 3400000
      description: "Newly renovated luxury apartment with garden views"
      amenityIds: [
        "existing-amenity-id-1"
        "existing-amenity-id-2"
        "new-amenity-id"
      ]
      imageIds: ["existing-image-id-1", "existing-image-id-2", "new-image-id"]
    }
  ) {
    id
    name
    price
    description
    amenities {
      name
    }
    images {
      url
    }
  }
}
```

### Workflow: Removing a Property

```graphql
mutation DeleteExistingUnit {
  deleteUnit(id: "unit-id-to-delete") {
    id
    name
  }
}
```

## Queries

### List Units (with filtering and pagination)

```graphql
query GetUnits {
  units(
    filter: { minPrice: 1000000, maxPrice: 5000000, minRooms: 2 }
    sort: { field: CREATED_AT, direction: DESC }
    limit: 10
    offset: 0
  ) {
    items {
      id
      name
      number
      price
      rooms
      bathrooms
      floor
      floorArea
      project {
        name
      }
      amenities {
        name
      }
    }
    total
  }
}
```

### Get Single Unit

```graphql
query GetUnit($unitId: String!) {
  unit(id: $unitId) {
    id
    name
    number
    description
    price
    rooms
    bathrooms
    floor
    floorArea
    project {
      id
      name
      developer {
        id
        name
      }
    }
    amenities {
      id
      name
      icon
    }
    images {
      id
      url
      altText
    }
    createdAt
    updatedAt
  }
}

# Variables to include:
{
  "unitId": "your-unit-id"
}
```

### List Projects

```graphql
query GetProjects($searchTerm: String, $limit: Int, $offset: Int) {
  projects(searchTerm: $searchTerm, limit: $limit, offset: $offset) {
    id
    name
    developer {
      id
      name
    }
  }
}

# Variables to include:
{
  "searchTerm": "Heights",
  "limit": 10,
  "offset": 0
}
```

### Get Single Project with Units

```graphql
query GetProject($projectId: String!) {
  project(id: $projectId) {
    id
    name
    developer {
      id
      name
    }
    units {
      id
      name
      price
      rooms
    }
  }
}

# Variables to include:
{
  "projectId": "your-project-id"
}
```

### List Developers

```graphql
query GetDevelopers {
  developers {
    id
    name
    projects {
      id
      name
    }
  }
}
```

### List Amenities

```graphql
query GetAmenities {
  amenities {
    id
    name
    icon
  }
}
```

### List Images

```graphql
query GetImages {
  images {
    id
    url
    altText
  }
}
```

## Mutations

### Create a Unit

```graphql
mutation CreateUnit($input: CreateUnitInput!) {
  createUnit(createUnitInput: $input) {
    id
    name
    number
    price
    project {
      name
    }
  }
}

# Variables to include:
{
  "input": {
    "name": "Luxury Penthouse",
    "number": "PH501",
    "description": "Premium penthouse with panoramic views",
    "price": 7500000,
    "rooms": 4,
    "bathrooms": 3,
    "floor": 50,
    "floorArea": 250,
    "projectId": "your-project-id",
    "amenityIds": ["amenity-id-1", "amenity-id-2"],
    "imageIds": ["image-id-1", "image-id-2"]
  }
}
```

### Update a Unit

```graphql
mutation UpdateUnit($input: UpdateUnitInput!) {
  updateUnit(updateUnitInput: $input) {
    id
    name
    price
    description
  }
}

# Variables to include:
{
  "input": {
    "id": "your-unit-id",
    "price": 7800000,
    "description": "Premium penthouse with panoramic views and private elevator"
  }
}
```

### Delete a Unit

```graphql
mutation DeleteUnit($id: String!) {
  deleteUnit(id: $id) {
    id
    name
  }
}

# Variables to include:
{
  "id": "your-unit-id"
}
```

### Create a Project

```graphql
mutation CreateProject($input: CreateProjectInput!) {
  createProject(createProjectInput: $input) {
    id
    name
    developer {
      name
    }
  }
}

# Variables to include:
{
  "input": {
    "name": "Skyline Towers",
    "developerId": "your-developer-id"
  }
}
```

### Create a Developer

```graphql
mutation CreateDeveloper($input: CreateDeveloperInput!) {
  createDeveloper(createDeveloperInput: $input) {
    id
    name
  }
}

# Variables to include:
{
  "input": {
    "name": "Elite Developers Group"
  }
}
```

### Create an Amenity

```graphql
mutation CreateAmenity($input: CreateAmenityInput!) {
  createAmenity(createAmenityInput: $input) {
    id
    name
    icon
  }
}

# Variables to include:
{
  "input": {
    "name": "Private Cinema",
    "icon": "movie"
  }
}
```

### Create an Image

```graphql
mutation CreateImage($input: CreateImageInput!) {
  createImage(createImageInput: $input) {
    id
    url
    altText
  }
}

# Variables to include:
{
  "input": {
    "url": "https://example.com/images/property-1.jpg",
    "alt_text": "Living room with floor-to-ceiling windows"
  }
}
```

## Complex Query Example: Units with Related Data

```graphql
query ComplexUnitsQuery($projectIds: [String!], $amenityIds: [String!]) {
  units(
    filter: {
      projectIds: $projectIds,
      amenityIds: $amenityIds,
      minPrice: 2000000,
      maxPrice: 8000000
    },
    limit: 5,
    offset: 0
  ) {
    items {
      id
      name
      number
      price
      rooms
      bathrooms
      floor
      floorArea
      project {
        id
        name
        developer {
          id
          name
        }
      }
      amenities {
        id
        name
        icon
      }
      images {
        id
        url
      }
    }
    total
  }
}

# Variables to include:
{
  "projectIds": ["project-id-1", "project-id-2"],
  "amenityIds": ["amenity-id-1", "amenity-id-2"]
}
```
