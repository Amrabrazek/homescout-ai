# HomeScout AI

A full-stack application for listing and browsing apartment units, complete with filtering capabilities, a detailed view of each property, and AI-powered similar unit recommendations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [File Storage](#file-storage)
- [AI Features](#ai-features)
- [Typesense Integration](#typesense-integration)
- [Future Enhancements](#future-enhancements)
- [License](#license)

## Overview

HomeScout AI is a modern real estate platform that lets users browse, filter, and view detailed information about apartment units. The application provides a complete solution for real estate agencies to manage their property listings with an intuitive interface for both customers and administrators.

## Features

### Core Functionality

- **Unit Listing**: Browse all available units with powerful filtering and sorting capabilities
- **Unit Details**: View comprehensive information about each property with image galleries
- **CRUD Operations**: Create, read, update, and delete units, projects, and developers
- **Image Management**: Upload and manage property images via Supabase Storage
- **Responsive Design**: Optimized for both desktop and mobile devices
- **AI-Powered Recommendations**: Get similar unit recommendations based on property features using OpenAI embeddings

### User Flows

1. **Browsing Properties**: Users can view all available properties with filtering options
2. **Property Details**: Access detailed property information with images and specifications
3. **Content Management**: Add new units, projects, or developers to the system
4. **Content Updates**: Modify existing property information and images
5. **Content Removal**: Remove properties or related data from the system
6. **Similar Units**: View AI-generated similar unit recommendations based on property features

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
- **AI**: OpenAI Embeddings for similar unit recommendations
- **Search**: Typesense for fast and typo-tolerant search

### DevOps

- **Containerization**: Docker & Docker Compose
- **Development Environment**: Fully dockerized setup

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- OpenAI API Key (optional, for AI-powered similarity features)

### Quick Start

1. Clone the repository:

```bash
# Using HTTPS
git clone https://github.com/Amrabrazek/homescout-ai.git
cd homescout-ai

# Or using SSH
git clone git@github.com:Amrabrazek/homescout-ai.git
cd homescout-ai
```

2. Create environment variables:

```bash
cp .env.example .env
```

3. (Optional) Add your OpenAI API key if you want AI-powered unit recommendations:

```bash
# Edit both .env files to add your OpenAI API key
# In root .env and backend/.env:
OPENAI_API_KEY=your-openai-api-key
```

4. Start the application based on your operating system:

#### For Linux/Windows:

```bash
# Start with standard Docker Compose setup
docker compose up
```

#### For macOS:

```bash
# Start with S3 storage configuration to avoid filesystem issues
docker compose -f docker-compose.yml -f docker-compose.s3.yml up
```

5. Access the application:
   - Frontend: http://localhost:3000
   - GraphQL Playground: http://localhost:3001/graphql

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

   # Add your OpenAI API key to the .env file
   # OPENAI_API_KEY=your-api-key-here

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
│  │  │  ├─ events/         # Event definitions for event-driven architecture
│  │  ├─ modules/           # Feature modules (developer, project, unit, etc.)
│  │  │  ├─ unit/           # Unit module with embedding functionality
│  │  │  │  ├─ unit-embedding.listener.ts  # Event listener for embedding generation
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
│  ├─ migrations/           # Database migrations including vector storage
├─ docker-compose.yml       # Docker composition
```

## AI Features

The application uses OpenAI's embedding models to provide intelligent unit recommendations:

### Vector Embeddings

- Units are automatically converted to vector embeddings when created or updated
- Each property's features (rooms, size, price, amenities, etc.) are encoded into a high-dimensional vector
- PostgreSQL's vector extension enables efficient similarity searches

### Similar Unit Recommendations

- The system can find similar units based on property characteristics, not just simple filters
- Units with similar features are displayed in the "Similar Units" section
- The recommendation quality depends on the embedding model and available property data

### Setting Up OpenAI Integration

To enable AI-powered recommendations:

1. Obtain an OpenAI API key from [OpenAI Platform](https://platform.openai.com)
2. Add your key to both `.env` files:

   ```
   # In root .env
   OPENAI_API_KEY=your-api-key-here

   # In backend/.env
   OPENAI_API_KEY=your-api-key-here
   ```

3. Restart the application if it's already running

### Fallback Behavior

**Important**: Without a valid OpenAI API key, the application will not be able to generate meaningful embeddings. In this case:

- New units will have null embedding values
- The `similarUnits` query will fall back to returning random units from the same project
- You will see console warnings about missing API keys or embedding generation failures

This fallback ensures the application remains functional even without AI capabilities, but recommendation quality will be significantly reduced.

### Troubleshooting Embedding Issues

If you encounter errors related to the embedding field such as "column Unit.embedding does not exist":

1. First, check if the vector extension is enabled in PostgreSQL:

```bash
docker compose exec db psql -U supabase_admin -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

2. Make sure the embedding column exists in the units table:

```bash
docker compose exec db psql -U supabase_admin -d postgres -c "ALTER TABLE units ADD COLUMN IF NOT EXISTS embedding vector;"
```

3. Rebuild and restart the backend to update GraphQL schema:

```bash
cd backend
npm run build
cd ..
docker compose restart backend
```

4. If issues persist, you may need to reset the database completely (see [Resetting the Database](#resetting-the-database)).

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

## Typesense Integration

This project includes integration with Typesense for fast and typo-tolerant search of unit listings. Typesense provides several advantages over direct database queries:

- Extremely fast search results
- Typo-tolerance for better user experience
- Advanced filtering and faceting capabilities
- Reduced database load for listing queries

### Setup

1. Make sure to add the following environment variables to your `.env` file:

```
TYPESENSE_API_KEY=your-api-key
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
USE_TYPESENSE=true
```

2. Start the application with Docker Compose:

```
docker-compose up -d
```

3. After the application is running, populate Typesense with existing units:

```
docker compose exec backend npm run typesense:populate
```

### How It Works

The integration works as follows:

1. When units are created, updated, or deleted, the changes are automatically synchronized to Typesense.
2. The unit listings API uses Typesense for searching, filtering, and sorting units.
3. If Typesense is unavailable, the system falls back to direct database queries.

### Disabling Typesense

If you want to disable Typesense and use only database queries, set `USE_TYPESENSE=false` in your environment variables.

## Future Enhancements

Planned improvements for the application:

1. **Redis Caching**: Add Redis to cache frequently accessed data, reducing database load and improving response times
2. **Advanced Search with Typesense**: Implement Typesense for ultra-fast, typo-tolerant search functionality with faceted filtering
3. **Enhanced AI Features**: More sophisticated recommendation algorithms and personalized suggestions based on user behavior

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

### Resetting the Database

If you need to completely reset the database and start fresh:

```bash
# Navigate to the supabase directory
cd supabase

# Run the reset script (requires bash)
./reset.sh

# Start everything again from the project root
cd ..
docker compose up
# OR for macOS
docker compose -f docker-compose.yml -f docker-compose.s3.yml up
```

This will:

- Remove all containers and their data
- Clean up bind-mounted directories
- Reset the `.env` file to the example defaults
- Allow you to start with a fresh database

**Note:** This action cannot be undone and will remove all data. Make sure to back up any important information first.
