# Nawy Apartment Listing App

A full-stack application for listing and browsing apartment units, complete with filtering capabilities and a detailed view of each property.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [File Storage](#file-storage)
- [Future Enhancements](#future-enhancements)
- [License](#license)

## Overview

Nawy Apartment Listing App is a modern real estate platform that lets users browse, filter, and view detailed information about apartment units. The application provides a complete solution for real estate agencies to manage their property listings with an intuitive interface for both customers and administrators.

## Features

### Core Functionality

- **Unit Listing**: Browse all available units with powerful filtering and sorting capabilities
- **Unit Details**: View comprehensive information about each property with image galleries
- **CRUD Operations**: Create, read, update, and delete units, projects, and developers
- **Image Management**: Upload and manage property images via Supabase Storage
- **Responsive Design**: Optimized for both desktop and mobile devices

### User Flows

1. **Browsing Properties**: Users can view all available properties with filtering options
2. **Property Details**: Access detailed property information with images and specifications
3. **Content Management**: Add new units, projects, or developers to the system
4. **Content Updates**: Modify existing property information and images
5. **Content Removal**: Remove properties or related data from the system

## Tech Stack

### Frontend

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **Form Handling**: React Hook Form, Zod

### Backend

- **Framework**: NestJS with GraphQL
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Storage**: Supabase Object Storage

### DevOps

- **Containerization**: Docker & Docker Compose
- **Development Environment**: Fully dockerized setup

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Amrabrazek/nawy-task.git
cd nawy-task
```

or

```bash
# Clone with SSH
git clone git@github.com:Amrabrazek/nawy-task.git
cd nawy-task
```

```bash
# Create environment variables
cp .env.example .env

# Start with Docker Compose
docker compose up
```

### Access Points

Once running, the application is available at:

- **Frontend**: http://localhost:3000
- **GraphQL Playground**: http://localhost:3001/graphql
- **Supabase Studio**: http://localhost:8000
  - Username: `supabase`
  - Password: `this_password_is_insecure_and_should_be_updated` (or your custom value from DASHBOARD_PASSWORD in .env)
- **MinIO Console** (S3 storage option): http://localhost:9001
  - Username: `supa-storage`
  - Password: `secret1234`

### Setup Options

#### Option 1: Full Docker Setup

##### For Linux/Windows:

Run the entire stack in Docker containers:

```bash
docker compose up
```

##### For macOS:

Due to filesystem limitations with Docker on macOS, it's recommended to use the S3 storage backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.s3.yml up
```

#### Option 2: Hybrid Development Setup

##### For Linux/Windows:

1. Modify docker-compose.yml to expose the database:

   ```bash
   # In docker-compose.yml, find the db service and uncomment these lines:
   # ports:
   #   - 5432:5432
   ```

2. Start Supabase services:
   ```bash
   docker compose up db auth rest realtime storage kong studio meta functions analytics imgproxy
   ```

##### For macOS:

1. Modify both docker-compose.yml and docker-compose.s3.yml:

   ```bash
   # In docker-compose.yml, find the db service and uncomment these lines:
   # ports:
   #   - 5432:5432
   ```

2. Start Supabase services with S3 storage:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.s3.yml up db auth rest realtime storage kong studio meta functions analytics imgproxy minio minio-createbucket
   ```

##### Then for all platforms:

3. Set up backend:

   ```bash
   cd backend
   npm install
   cp .env.example .env  # Make sure to use the same DB_PASSWORD as in root .env
   npm run start:dev
   ```

4. Set up frontend:
   ```bash
   cd frontend
   npm install
   cp .env.example .env
   npm run dev
   ```

For detailed setup instructions, including troubleshooting and port configuration, see the [Setup Details](#setup-options) section below.

## Project Structure

```txt
/
├─ backend/                 # NestJS GraphQL API
│  ├─ src/
│  │  ├─ common/            # Shared resources (entities, interfaces, utilities)
│  │  ├─ modules/           # Feature modules (developer, project, unit, etc.)
│  │  ├─ storage/           # Storage module for Supabase integration
│  │  ├─ app.module.ts      # Root module
│  │  ├─ main.ts            # Application entry point
│  │  └─ seed.ts            # Database seeder
│  ├─ test/                 # E2E and unit tests
├─ frontend/                # Next.js frontend
│  ├─ src/
│  │  ├─ app/               # App router pages and layouts
│  │  ├─ components/        # UI components
│  │  ├─ hooks/             # Custom React hooks
│  │  ├─ lib/               # Library code and providers
│  │  └─ utils/             # Utility functions
├─ supabase/                # Supabase local development
├─ docker-compose.yml       # Docker composition
```

## API Documentation

The backend GraphQL API is comprehensively documented to facilitate integration and development:

### Documentation Files

- **API_DOCUMENTATION.md**: Complete schema types, queries, mutations, and error handling details
- **API_QUICK_REFERENCE.md**: Concise reference guide for available operations
- **GRAPHQL_PLAYGROUND_EXAMPLES.md**: Ready-to-use examples for common workflows

### Interactive Exploration

The API can be explored at http://localhost:3001/graphql using GraphQL Playground, allowing developers to:

- Browse the complete schema documentation
- Test queries and mutations with real-time validation
- Use the documented examples for rapid testing

## Testing

The project includes a robust end-to-end testing suite for the backend API:

### Testing Approach

Tests use an in-memory data store that:

- Isolates resolver testing from the database
- Uses JavaScript Maps for test data storage
- Mocks the service layer
- Validates the complete request/response flow

### Running Tests

```bash
# Run all tests with setup
npm run test:e2e:full

# Run tests without setup
npm run test:e2e
```

## File Storage

The application uses Supabase Storage for managing property images:

### Storage Options

Two storage backends are supported:

1. **Local File Storage** (default)

   - Uses the local filesystem
   - Works well on Linux and Windows

2. **S3-Compatible Storage** (recommended for macOS)
   - Uses MinIO as an S3-compatible storage server
   - Avoids permission issues on macOS
   - Activate with: `docker compose -f docker-compose.yml -f docker-compose.s3.yml up`

### Image Management

- Direct upload from the frontend using the `FileUpload` component
- REST API for file uploads at `/upload/image`
- Automatic preview generation and URL handling

## Future Enhancements

Planned improvements for the application:

1. **Redis Caching**: Add Redis to cache frequently accessed data, reducing database load and improving response times
2. **Advanced Search with Typesense**: Implement Typesense for ultra-fast, typo-tolerant search functionality with faceted filtering

## License

This project is licensed under the MIT License - see the LICENSE file for details.

<!-- Detailed Sections -->

## Setup Options

### Checking Required Ports

Before starting, ensure that the following ports are available:

- 3000: Frontend
- 3001: Backend
- 5432: PostgreSQL
- 8000: Supabase Studio
- 9000: MinIO S3 (if using S3 storage)
- 9001: MinIO Console (if using S3 storage)

```bash
# Check ports on macOS/Linux
sudo lsof -i :3000,3001,5432,8000,9000,9001

# Check ports on Windows
netstat -ano | findstr "3000 3001 5432 8000 9000 9001"

# Stop all Docker containers if needed
docker stop $(docker ps -q)
```

### Troubleshooting Supabase Storage

If you experience issues with file uploads:

**For macOS Users:**

```bash
# Use S3 storage configuration
docker compose -f docker-compose.yml -f docker-compose.s3.yml up
```

**Check Container Networks:**
Ensure all containers are on the same Docker network and the frontend is configured with correct Supabase API URLs.

**Check MinIO Configuration:**
For S3 storage, verify the endpoint in `docker-compose.s3.yml`:

```yaml
GLOBAL_S3_ENDPOINT: http://minio:9000
```

**Resolve Port Conflicts:**

```bash
# Find processes using specific ports
sudo lsof -i :3000,3001,5432,8000,9000,9001

# Kill a specific process
kill -9 <PID>
```
