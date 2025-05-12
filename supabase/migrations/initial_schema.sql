-- We'll use the public schema directly (no schema creation needed)

-- Create vector extension
CREATE EXTENSION IF NOT EXISTS vector;


-- Create developers table
CREATE TABLE IF NOT EXISTS public.developers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    developer_id UUID NOT NULL REFERENCES public.developers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create images table
CREATE TABLE IF NOT EXISTS public.images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    alt_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create amenities table
CREATE TABLE IF NOT EXISTS public.amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create units table
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    number TEXT,
    floor INTEGER,
    rooms INTEGER,
    bathrooms INTEGER,
    floor_area NUMERIC(10, 2),
    description TEXT,
    price NUMERIC(14, 2),
    embedding vector,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create junction table for units and amenities
CREATE TABLE IF NOT EXISTS public.unit_amenities (
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES public.amenities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (unit_id, amenity_id)
);

-- Create junction table for units and images with order
CREATE TABLE IF NOT EXISTS public.unit_images (
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    image_id UUID REFERENCES public.images(id) ON DELETE CASCADE,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (unit_id, image_id)
);

-- Create trigger functions to update updated_at automatically
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables
DROP TRIGGER IF EXISTS set_timestamp ON public.developers;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.developers
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON public.projects;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON public.images;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.images
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON public.amenities;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.amenities
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp ON public.units;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();

-- Create RLS policies for the tables
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_images ENABLE ROW LEVEL SECURITY;

-- Check if auth schema exists before creating policies that depend on it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN

    -- Allow public read access
    DROP POLICY IF EXISTS "Allow public read access" ON public.developers;
    CREATE POLICY "Allow public read access" ON public.developers FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow authenticated insert" ON public.developers;
    CREATE POLICY "Allow authenticated insert" ON public.developers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated update" ON public.developers;
    CREATE POLICY "Allow authenticated update" ON public.developers FOR UPDATE USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated delete" ON public.developers;
    CREATE POLICY "Allow authenticated delete" ON public.developers FOR DELETE USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Allow public read access" ON public.projects;
    CREATE POLICY "Allow public read access" ON public.projects FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow authenticated insert" ON public.projects;
    CREATE POLICY "Allow authenticated insert" ON public.projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated update" ON public.projects;
    CREATE POLICY "Allow authenticated update" ON public.projects FOR UPDATE USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated delete" ON public.projects;
    CREATE POLICY "Allow authenticated delete" ON public.projects FOR DELETE USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Allow public read access" ON public.units;
    CREATE POLICY "Allow public read access" ON public.units FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow authenticated insert" ON public.units;
    CREATE POLICY "Allow authenticated insert" ON public.units FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated update" ON public.units;
    CREATE POLICY "Allow authenticated update" ON public.units FOR UPDATE USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated delete" ON public.units;
    CREATE POLICY "Allow authenticated delete" ON public.units FOR DELETE USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Allow public read access" ON public.images;
    CREATE POLICY "Allow public read access" ON public.images FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow authenticated insert" ON public.images;
    CREATE POLICY "Allow authenticated insert" ON public.images FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated update" ON public.images;
    CREATE POLICY "Allow authenticated update" ON public.images FOR UPDATE USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated delete" ON public.images;
    CREATE POLICY "Allow authenticated delete" ON public.images FOR DELETE USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Allow public read access" ON public.amenities;
    CREATE POLICY "Allow public read access" ON public.amenities FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow authenticated insert" ON public.amenities;
    CREATE POLICY "Allow authenticated insert" ON public.amenities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated update" ON public.amenities;
    CREATE POLICY "Allow authenticated update" ON public.amenities FOR UPDATE USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated delete" ON public.amenities;
    CREATE POLICY "Allow authenticated delete" ON public.amenities FOR DELETE USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Allow public read access" ON public.unit_amenities;
    CREATE POLICY "Allow public read access" ON public.unit_amenities FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow authenticated insert" ON public.unit_amenities;
    CREATE POLICY "Allow authenticated insert" ON public.unit_amenities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated update" ON public.unit_amenities;
    CREATE POLICY "Allow authenticated update" ON public.unit_amenities FOR UPDATE USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated delete" ON public.unit_amenities;
    CREATE POLICY "Allow authenticated delete" ON public.unit_amenities FOR DELETE USING (auth.role() = 'authenticated');

    DROP POLICY IF EXISTS "Allow public read access" ON public.unit_images;
    CREATE POLICY "Allow public read access" ON public.unit_images FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Allow authenticated insert" ON public.unit_images;
    CREATE POLICY "Allow authenticated insert" ON public.unit_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated update" ON public.unit_images;
    CREATE POLICY "Allow authenticated update" ON public.unit_images FOR UPDATE USING (auth.role() = 'authenticated');
    DROP POLICY IF EXISTS "Allow authenticated delete" ON public.unit_images;
    CREATE POLICY "Allow authenticated delete" ON public.unit_images FOR DELETE USING (auth.role() = 'authenticated');
  ELSE
    RAISE NOTICE 'Auth schema does not exist yet. Skipping RLS policies that depend on auth.';
    
    -- Add simplified policies without auth dependency
    DROP POLICY IF EXISTS "Allow public access" ON public.developers;
    CREATE POLICY "Allow public access" ON public.developers USING (true);
    
    DROP POLICY IF EXISTS "Allow public access" ON public.projects;
    CREATE POLICY "Allow public access" ON public.projects USING (true);
    
    DROP POLICY IF EXISTS "Allow public access" ON public.units;
    CREATE POLICY "Allow public access" ON public.units USING (true);
    
    DROP POLICY IF EXISTS "Allow public access" ON public.images;
    CREATE POLICY "Allow public access" ON public.images USING (true);
    
    DROP POLICY IF EXISTS "Allow public access" ON public.amenities;
    CREATE POLICY "Allow public access" ON public.amenities USING (true);
    
    DROP POLICY IF EXISTS "Allow public access" ON public.unit_amenities;
    CREATE POLICY "Allow public access" ON public.unit_amenities USING (true);
    
    DROP POLICY IF EXISTS "Allow public access" ON public.unit_images;
    CREATE POLICY "Allow public access" ON public.unit_images USING (true);
  END IF;
END;
$$; 

-------------------------------------------------------------------------------- 
-- Storage
--------------------------------------------------------------------------------
-- Create storage bucket for images
insert into storage.buckets
  (id, name)
values
  ('images', 'images');


CREATE POLICY "Public read access" ON storage.objects FOR SELECT TO anon, authenticated, service_role  USING (bucket_id = 'images');

-- TODO: Uncomment this when we have a way to handle the file upload
CREATE POLICY "Public write access" ON storage.objects FOR INSERT TO anon, authenticated, service_role WITH CHECK (bucket_id = 'images'); 


-- Create function to match similar units
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
  WITH target_unit AS (
    SELECT embedding, project_id FROM units WHERE id = unit_id
  ),
  similar_units AS (
    SELECT
      units.id,
      1 - (units.embedding <=> (SELECT embedding FROM target_unit)) AS similarity
    FROM units, target_unit
    WHERE 
      units.id != unit_id
      AND units.embedding IS NOT NULL
      AND (SELECT embedding FROM target_unit) IS NOT NULL
      AND 1 - (units.embedding <=> (SELECT embedding FROM target_unit)) > match_threshold
    ORDER BY units.embedding <=> (SELECT embedding FROM target_unit)
    LIMIT match_count
  ),
  similar_count AS (
    SELECT COUNT(*) as count FROM similar_units
  ),
  random_units AS (
    SELECT
      units.id,
      0 AS similarity
    FROM units, target_unit
    WHERE 
      units.id != unit_id
      AND units.id NOT IN (SELECT id FROM similar_units)
      AND units.project_id = (SELECT project_id FROM target_unit)
    ORDER BY RANDOM()
    LIMIT (
      SELECT 
        CASE 
          WHEN count < match_count THEN match_count - count
          ELSE 0
        END
      FROM similar_count
    )
  )
  SELECT id, similarity FROM similar_units
  UNION ALL
  SELECT id, similarity FROM random_units;
$$;
