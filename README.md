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

### Checking/Freeing Required Ports

Before starting, ensure that the following ports are not in use:

- 3000: Frontend
- 3001: Backend
- 5432: PostgreSQL
- 8000: Supabase Studio
- 9000: MinIO S3 (if using S3 storage)
- 9001: MinIO Console (if using S3 storage)

To check if ports are in use:

```bash
# macOS/Linux
sudo lsof -i :3000,3001,5432,8000,9000,9001

# Windows
netstat -ano | findstr "3000 3001 5432 8000 9000 9001"
```

To stop all running Docker containers:

```bash
docker stop $(docker ps -q)
```

## Setup Options

You can choose to run the entire stack in Docker, or run services in Docker and develop locally.

### Option 1: Full Docker Setup

This option runs everything in Docker containers (frontend, backend, and all Supabase services).

#### For Linux/Windows

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

#### For macOS (S3 Storage)

Due to limitations with Docker bind mounts on macOS that can affect local file storage, it's recommended to use the S3 storage backend:

1. Clone the repository

   ```bash
   git clone https://github.com/Amrabrazek/nawy-task.git
   cd nawy-task
   ```

2. Create `.env` file with required environment variables

   ```bash
   cp .env.example .env
   ```

3. Start the development environment with the S3 storage configuration:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.s3.yml up
   ```

   This configuration uses MinIO as an S3-compatible storage backend instead of the local filesystem.

### Option 2: Hybrid Setup (Recommended for Development)

This approach runs Supabase services in Docker while allowing you to develop the frontend and backend locally.

#### Step 1: Start the Supabase Services

##### For Linux/Windows

1. Modify the docker-compose.yml file to expose the database to your local network:

   ```bash
   # In docker-compose.yml, find the db service and uncomment these lines:
   # ports:
   #   - 5432:5432
   ```

2. Start only the Supabase services:

   ```bash
   docker compose up db auth rest realtime storage kong studio meta functions analytics imgproxy
   ```

##### For macOS (S3 Storage)

1. Modify both docker-compose.yml and docker-compose.s3.yml files:

   ```bash
   # In docker-compose.yml, find the db service and uncomment these lines:
   # ports:
   #   - 5432:5432
   ```

2. Start only the Supabase services with S3 storage:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.s3.yml up db auth rest realtime storage kong studio meta functions analytics imgproxy minio minio-createbucket
   ```

#### Step 2: Set up Backend Locally

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local `.env` file

   ```bash
   cp .env.example .env
   ```

   Make sure to use the same DB_PASSWORD that you specified in your root `.env` file.

4. Start the backend server:

   ```bash
   npm run start:dev
   ```

#### Step 3: Set up Frontend Locally

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a local `.env` file:

   ```bash
   cp .env.example .env
   ```

4 Start the development server:

```bash
npm run dev
```

### Access Credentials

Once the application is running, you can access:

- **Frontend**: http://localhost:3000
- **GraphQL Playground**: http://localhost:3001/graphql
- **Supabase Studio**: http://localhost:8000
  - Username: `supabase`
  - Password: `this_password_is_insecure_and_should_be_updated` (or your custom value from DASHBOARD_PASSWORD in .env)
- **MinIO Console** (S3 storage option): http://localhost:9001
  - Username: `supa-storage`
  - Password: `secret1234`

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

### Storage Configuration in Docker

The application supports two storage backends for Supabase:

#### 1. Local File Storage (default)

- Uses the local filesystem for storing files
- Default configuration in `docker-compose.yml`
- Works well on Linux and Windows
- May have permission issues with Docker on macOS due to file system limitations

#### 2. S3-Compatible Storage

- Uses MinIO as an S3-compatible storage server
- Configured in `docker-compose.s3.yml`
- Recommended for macOS users to avoid file system permission issues
- Can be activated with: `docker compose -f docker-compose.yml -f docker-compose.s3.yml up`

When using S3 storage:

- Files are stored in a MinIO container instead of the local filesystem
- Storage is still persistent between restarts (data is stored in volumes)
- The MinIO console is available at http://localhost:9001 for browsing/managing files
  - Username: `supa-storage`
  - Password: `secret1234`

### Troubleshooting Supabase Storage in Docker

If you're experiencing issues with file uploads while running in Docker, especially on macOS, try these solutions:

#### Issues with Local File Storage on macOS

macOS has limitations with Docker bind mounts that can cause permission issues with Supabase's local storage. Common symptoms:

- Files appear to upload but aren't accessible
- Storage permission errors in logs
- Storage works when running Supabase standalone but fails when running with the full application

**Solution 1: Use S3 Storage Backend (Recommended for macOS)**

```bash
# Stop any running containers first
docker stop $(docker ps -q)

# Then start with S3 configuration
docker compose -f docker-compose.yml -f docker-compose.s3.yml up
```

**Solution 2: Check Container Networks**
If storage works in a standalone Supabase setup but not in the full application, ensure:

1. All containers are on the same Docker network
2. The frontend is configured with correct URLs for the Supabase API
3. The storage service can communicate with the MinIO service (for S3 storage)

**Solution 3: Check Container URLs**
When using S3 storage, make sure the MinIO endpoint in `docker-compose.s3.yml` is set correctly:

```yaml
GLOBAL_S3_ENDPOINT: http://minio:9000 # Uses the container name
```

**Solution 4: Update Image Versions**
Sometimes, compatibility issues can be fixed by using matching versions of all Supabase services. Check the standalone working setup for the exact versions and update your integrated setup accordingly.

**Solution 5: Port Conflicts**
If you're experiencing "port already in use" errors:

```bash
# Find processes using conflicting ports
sudo lsof -i :3000,3001,5432,8000,9000,9001

# Then kill the specific process
kill -9 <PID>

# Or stop all Docker containers
docker stop $(docker ps -q)
```

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
