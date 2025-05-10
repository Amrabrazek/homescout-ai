# Nawy Apartment Listing App

A full-stack application for listing and browsing apartment units, complete with filtering capabilities and a detailed view of each property.

## 🧱 Tech Stack

- **Frontend**: Next.js (App Router, TypeScript, Tailwind, Shadcn, React Hook Form, Zod)
- **Backend**: NestJS (GraphQL, TypeScript)
- **Database & Storage**: PostgreSQL and Object Storage via Supabase
- **Containerization**: Docker & Docker Compose

## 📁 Project Structure

```
/
├─ backend/                 # NestJS GraphQL API
│  ├─ src/
│  │  ├─ common/            # Shared resources (entities, interfaces, utilities)
│  │  ├─ modules/           # Feature modules (developer, project, unit, etc.)
│  │  ├─ storage/           # Storage module for Supabase integration
│  │  ├─ app.module.ts      # Root module
│  │  ├─ main.ts            # Application entry point
│  │  └─ seed.ts            # Database seeder
│  ├─ .env                  # Backend-specific environment variables
│  ├─ .env.example          # Example backend environment variables
│  └─ Dockerfile            # Backend container configuration
├─ frontend/                # Next.js frontend
│  ├─ src/
│  │  ├─ app/               # App router pages and layouts
│  │  ├─ components/        # UI components
│  │  ├─ hooks/             # Custom React hooks
│  │  ├─ lib/               # Library code and providers
│  │  └─ utils/             # Utility functions
│  ├─ .env                  # Frontend-specific environment variables
│  ├─ .env.example          # Example frontend environment variables
│  └─ Dockerfile            # Frontend container configuration
├─ supabase/                # Supabase local development
│  ├─ volumes/              # Local storage volumes
├─ .env                     # Root environment variables for Docker Compose
├─ .env.example             # Example root environment variables
└─ docker-compose.yml       # Docker composition
```

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)

### Setup with Docker

1. Clone the repository

   ```bash
   git clone https://github.com/Amrabrazek/nawy-task.git
   cd nawy-task
   ```

2. Create `.env` file with required environment variables

   ```bash
   cp .env.example .env
   ```

3. Start the development environment

   ```bash
   docker compose up
   ```

4. Access the application:
   - Frontend: http://localhost:3000
   - GraphQL Playground: http://localhost:3001/graphql
   - Supabase Studio: http://localhost:8000

### Local Development (without Docker)

#### Supabase Setup

1. Start Supabase locally

   ```bash
   docker-compose up db auth rest realtime storage kong
   ```

2. Access Supabase Studio at http://localhost:8000

#### Backend Setup

1. Navigate to the backend directory

   ```bash
   cd backend
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env` file with database connection and Supabase details (copy from `.env.example`)

   ```
   cp .env.example .env
   ```

   Then update the values:

   ```
   NODE_ENV=development
   PORT=3001

   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=supabase_admin
   DB_PASSWORD=your-super-secret-and-long-postgres-password
   DB_NAME=postgres

   # Supabase
   SUPABASE_URL=http://localhost:8000
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   SUPABASE_JWT_SECRET=your-jwt-secret
   ```

4. Start the backend server

   ```bash
   npm run start:dev
   ```

5. Seed the database (first time only)
   ```bash
   npm run seed
   ```

#### Frontend Setup

1. Navigate to the frontend directory

   ```bash
   cd frontend
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Update the `.env` file with the necessary values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:3001/graphql
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

## 🔒 Environment Variables

The application uses multiple environment files:

### Root `.env` (for Docker Compose)

Contains all environment variables shared between services and used by Docker Compose:

- Database credentials
- JWT secrets
- Supabase configuration
- API keys

### Backend `.env`

Backend-specific environment variables:

- Node environment
- Database connection details
- JWT configuration
- Supabase connection details

### Frontend `.env`

Frontend-specific environment variables:

- Public API endpoints
- Supabase public URL and anon key
- GraphQL endpoint

### Best Practices

- Never commit actual `.env` files containing secrets to git
- Use `.env.example` files as templates
- For production, use environment variables directly in your deployment platform

## 📸 File Storage with Supabase

The application uses Supabase Storage for managing property images:

1. Images are uploaded directly to Supabase from the frontend using the `FileUpload` component
2. The backend provides a REST API for file uploads at `/upload/image`
3. Files are stored in the `images` bucket within Supabase Storage
4. The application handles image preview, deletion, and public URL generation

## 🔨 API Examples

### GraphQL Queries

#### Get All Units

```graphql
query {
  units {
    id
    name
    floor
    rooms
    bathrooms
    floorArea
    price
    project {
      name
      developer {
        name
      }
    }
  }
}
```

#### Get Unit with Filters

```graphql
query {
  units(
    filter: {
      minRooms: 2
      maxPrice: 2000000
      amenityIds: ["amenity-id-1", "amenity-id-2"]
    }
  ) {
    id
    name
    price
    rooms
  }
}
```

#### Get Unit Details

```graphql
query {
  unit(id: "unit-id-here") {
    id
    name
    number
    floor
    rooms
    bathrooms
    floorArea
    price
    description
    project {
      name
      developer {
        name
      }
    }
    amenities {
      name
      icon
    }
    images {
      url
      altText
    }
  }
}
```

### GraphQL Mutations

#### Create Unit

```graphql
mutation {
  createUnit(
    createUnitInput: {
      name: "Luxury Apartment"
      number: "A123"
      floor: 5
      rooms: 3
      bathrooms: 2
      floorArea: 120.5
      price: 1500000
      description: "Beautiful luxury apartment with sea view"
      projectId: "project-id-here"
      amenityIds: ["amenity-id-1", "amenity-id-2"]
      imageIds: ["image-id-1", "image-id-2"]
    }
  ) {
    id
    name
  }
}
```

## 🔍 Features

- **Unit Listing**: Browse all available units with filtering capabilities
- **Unit Details**: View detailed information about a specific unit
- **Admin Panel**: Create and manage units, projects, and developers
- **Image Upload**: Upload and manage property images via Supabase Storage
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🧪 Future Improvements

1. Authentication and authorization for admin panel
2. Advanced search with Typesense or pgvector
3. Unit favoriting and comparison functionality
4. Interactive maps for property locations
5. Performance optimizations for image loading
6. Comprehensive test coverage

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details
