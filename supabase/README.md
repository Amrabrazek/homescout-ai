# Supabase Project

This is a Supabase self-hosted project running on Docker for a real estate application.

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Git

### Setup Instructions

1. Clone this repository
2. Create a `.env` file based on the `.env.example` file:
   ```
   cp .env.example .env
   ```
3. Modify the `.env` file with your own secure values for:

   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `DASHBOARD_PASSWORD`
   - `SECRET_KEY_BASE`
   - `VAULT_ENC_KEY`
   - Any other settings you want to customize

4. Start the Supabase stack:

   ```
   docker compose up -d
   ```

5. Access the Supabase Studio at `http://localhost:8000`

### Important Notes

- Default login for the dashboard is:

  - Username: `supabase`
  - Password: whatever you set in `DASHBOARD_PASSWORD`

- To reset the database and start fresh:
  ```
  ./reset.sh
  ```

## Real Estate Database Schema

This project includes a comprehensive real estate database schema in the public schema with the following entities:

- **Developers**: Real estate development companies (15 sample developers)
- **Projects**: Real estate projects created by developers (150+ sample projects)
- **Units**: Individual units (apartments, houses, etc.) in projects (~400 sample units)
- **Images**: Images associated with units (50+ sample images)
- **Amenities**: Features that units can have (10 sample amenities)

There's also a dedicated storage bucket called `property-images` for storing unit images.

### Entity Relationships

1. **Developer**

   - `id`: UUID primary key
   - `name`: Company name
   - `created_at`, `updated_at`: Timestamps
   - Relations:
     - One-to-many: `projects`

2. **Project**

   - `id`: UUID primary key
   - `name`: Project name
   - `developer_id`: Foreign key to Developer
   - `created_at`, `updated_at`: Timestamps
   - Relations:
     - Many-to-one: `developer`
     - One-to-many: `units`

3. **Unit**

   - `id`: UUID primary key
   - `name`: Unit type (e.g., "Studio Apartment", "Three Bedroom Penthouse")
   - `number`: Complex unit identifier (e.g., "Tower-3-12A")
   - `floor`: Floor number
   - `rooms`: Number of rooms (1-5)
   - `bathrooms`: Number of bathrooms (1-4)
   - `floor_area`: Area in square meters
   - `description`: Rich HTML description of the unit
   - `price`: Unit price
   - `project_id`: Foreign key to Project
   - `created_at`, `updated_at`: Timestamps
   - Relations:
     - Many-to-one: `project`
     - Many-to-many: `amenities` via `unit_amenities`
     - Many-to-many: `images` via `unit_images`

4. **Image**

   - `id`: UUID primary key
   - `url`: Image URL
   - `alt_text`: Descriptive text for accessibility
   - `created_at`: Timestamp
   - Relations:
     - Many-to-many: `units` via `unit_images`

5. **Amenity**

   - `id`: UUID primary key
   - `name`: Amenity name (e.g., "Swimming Pool", "Gym")
   - `icon`: Icon identifier
   - `created_at`: Timestamp
   - Relations:
     - Many-to-many: `units` via `unit_amenities`

6. **Junction Tables**
   - `unit_amenities`: Links units to amenities (many-to-many)
   - `unit_images`: Links units to images with ordering (many-to-many)

### Seed Data

The database is pre-populated with realistic sample data:

- **Developers**: 15 major real estate developers
- **Projects**: 150+ projects across different developers
- **Units**: ~400 units with varied characteristics:
  - Different unit types (Studios to Villas)
  - Various floor plans and sizes (35m² to 500m²)
  - Price range from $250,000 to $10,000,000
  - Complex unit numbering system with building/tower indicators
  - Rich HTML descriptions with formatted features and highlights
- **Images**: 50+ sample property images from Unsplash
- **Amenities**: 10 common property amenities with icons

Each unit is assigned:

- 3-8 random images
- 3-9 random amenities
- A project association

## Additional Documentation

For more information on self-hosting Supabase, see the [official documentation](https://supabase.com/docs/guides/self-hosting).

## Data Modeling

The schema uses PostgreSQL's powerful features:

- UUIDs for primary keys
- Timestamp tracking for all entities
- Foreign key constraints with cascading deletes
- Junction tables for many-to-many relationships
- Trigger functions for automatic timestamp updates
