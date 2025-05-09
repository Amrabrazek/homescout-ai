-- Insert example amenities (only if table is empty)
INSERT INTO public.amenities (name, icon)
SELECT a.name, a.icon
FROM (VALUES
  ('Balcony', 'balcony-icon'),
  ('Central AC', 'ac-icon'),
  ('Swimming Pool', 'pool-icon'),
  ('Covered Parking', 'parking-icon'),
  ('24/7 Security', 'security-icon'),
  ('Gym', 'gym-icon'),
  ('Pet Friendly', 'pet-icon'),
  ('Elevator', 'elevator-icon'),
  ('Smart Home', 'smart-home-icon'),
  ('Playground', 'playground-icon')
) as a(name, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.amenities LIMIT 1);

-- Insert example developers (only if table is empty)
INSERT INTO public.developers (name)
SELECT d.name
FROM (VALUES
  ('Talaat Moustafa Group (TMG)'),
  ('Palm Hills Developments'),
  ('Emaar Misr'),
  ('SODIC'),
  ('Orascom Development Egypt'),
  ('Mountain View'),
  ('Hassan Allam Properties'),
  ('City Edge Developments'),
  ('Misr Italia Properties'),
  ('Hyde Park Developments'),
  ('Al Marasem Development'),
  ('Tatweer Misr'),
  ('New Giza'),
  ('The Land Developers'),
  ('Inertia Egypt')
) as d(name)
WHERE NOT EXISTS (SELECT 1 FROM public.developers LIMIT 1);

-- Insert example projects (only if table is empty)
DO $$
DECLARE
  tmg_id UUID;
  palm_hills_id UUID;
  emaar_id UUID;
  sodic_id UUID;
  orascom_id UUID;
  mountain_view_id UUID;
  new_giza_id UUID;
  misr_italia_id UUID;
  hyde_park_id UUID;
  inertia_id UUID;
  tatweer_id UUID;
  hassan_allam_id UUID;
  city_edge_id UUID;
  al_marasem_id UUID;
  land_developers_id UUID;
BEGIN
  -- Only proceed if projects table is empty
  IF NOT EXISTS (SELECT 1 FROM public.projects LIMIT 1) THEN
    SELECT id INTO tmg_id FROM public.developers WHERE name = 'Talaat Moustafa Group (TMG)';
    SELECT id INTO palm_hills_id FROM public.developers WHERE name = 'Palm Hills Developments';
    SELECT id INTO emaar_id FROM public.developers WHERE name = 'Emaar Misr';
    SELECT id INTO sodic_id FROM public.developers WHERE name = 'SODIC';
    SELECT id INTO orascom_id FROM public.developers WHERE name = 'Orascom Development Egypt';
    SELECT id INTO mountain_view_id FROM public.developers WHERE name = 'Mountain View';
    SELECT id INTO new_giza_id FROM public.developers WHERE name = 'New Giza';
    SELECT id INTO misr_italia_id FROM public.developers WHERE name = 'Misr Italia Properties';
    SELECT id INTO hyde_park_id FROM public.developers WHERE name = 'Hyde Park Developments';
    SELECT id INTO inertia_id FROM public.developers WHERE name = 'Inertia Egypt';
    SELECT id INTO tatweer_id FROM public.developers WHERE name = 'Tatweer Misr';
    SELECT id INTO hassan_allam_id FROM public.developers WHERE name = 'Hassan Allam Properties';
    SELECT id INTO city_edge_id FROM public.developers WHERE name = 'City Edge Developments';
    SELECT id INTO al_marasem_id FROM public.developers WHERE name = 'Al Marasem Development';
    SELECT id INTO land_developers_id FROM public.developers WHERE name = 'The Land Developers';

    -- Insert projects
    INSERT INTO public.projects (name, developer_id) VALUES
      -- Talaat Moustafa Group (TMG)
      ('Madinaty', tmg_id),
      ('Al Rehab City', tmg_id),
      ('Celia', tmg_id),
      ('Four Seasons Sharm El Sheikh', tmg_id),
      ('Noor City', tmg_id),
      ('May Fair', tmg_id),
      ('Privado', tmg_id),
      ('The Ridge', tmg_id),
      ('La Vie', tmg_id),
      ('Royal Gardens', tmg_id),
      
      -- Palm Hills Developments
      ('Palm Hills October', palm_hills_id),
      ('Palm Hills Katameya', palm_hills_id),
      ('Palm Hills Alexandria', palm_hills_id),
      ('Badya', palm_hills_id),
      ('Hacienda Bay', palm_hills_id),
      ('Golf Extension', palm_hills_id),
      
      -- Emaar Misr
      ('Marassi', emaar_id),
      ('Uptown Cairo', emaar_id),
      ('Mivida', emaar_id),
      ('Cairo Gate', emaar_id),
      ('Belle Vie', emaar_id),
      ('Tahrir Square Towers', emaar_id),
      ('Emaar Beach Front', emaar_id),
      ('Downtown New Cairo', emaar_id),
      ('The Nile Residences', emaar_id),
      ('South Bay', emaar_id),
      
      -- SODIC
      ('SODIC West (Beverly Hills)', sodic_id),
      ('October Plaza', sodic_id),
      ('The Estates', sodic_id),
      
      -- Orascom Development Egypt
      ('Makadi Heights', orascom_id),
      ('El Gouna', orascom_id),
      ('O West', orascom_id),
      ('Byoum', orascom_id),
      ('Ayia Napa Marina', orascom_id),
      ('Jebal Sifah', orascom_id),
      ('Luštica Bay', orascom_id),
      
      -- Mountain View
      ('Mountain View iCity', mountain_view_id),
      ('Mountain View October Park', mountain_view_id),
      ('Mountain View Executive Residence', mountain_view_id),
      ('Mountain View Chill Out Park', mountain_view_id),
      ('Mountain View Ras El Hikma', mountain_view_id),
      ('Mountain View Hyde Park', mountain_view_id),
      ('Mountain View Diplomats', mountain_view_id),
      ('Mountain View Giza Plateau', mountain_view_id),
      
      -- New Giza
      ('New Giza', new_giza_id),
      ('New Giza Skyline', new_giza_id),
      ('New Giza Gardens', new_giza_id),
      ('New Giza Heights', new_giza_id),
      ('New Giza Sports Club', new_giza_id),
      ('New Giza Residences', new_giza_id),
      
      -- Misr Italia Properties
      ('Il Bosco', misr_italia_id),
      ('Vinci', misr_italia_id),
      ('La Nuova Vista', misr_italia_id),
      
      -- Hyde Park Developments
      ('Hyde Park New Cairo', hyde_park_id),
      ('Coast 82', hyde_park_id),
      ('Park Corner', hyde_park_id),
      ('Hyde Park Schools', hyde_park_id),
      
      -- Inertia Egypt
      ('Jefaira', inertia_id),
      ('Joulz', inertia_id),
      ('Soleya', inertia_id),
      
      -- Tatweer Misr
      ('Fouka Bay', tatweer_id),
      ('Il Monte Galala', tatweer_id),
      ('Bloomfields', tatweer_id),
      ('D-Bay', tatweer_id),
      ('Elysian', tatweer_id),
      ('Tatweer Gardens', tatweer_id),
      
      -- Hassan Allam Properties
      ('Swan Lake Residences', hassan_allam_id),
      ('Haptown', hassan_allam_id),
      ('Seashell North Coast', hassan_allam_id),
      ('Éclat de Vie', hassan_allam_id),
      ('Blues Tanneries', hassan_allam_id),
      ('The Estates North Coast', hassan_allam_id),
      ('Anchor Residences', hassan_allam_id),
      ('The Crescent Sokhna', hassan_allam_id),
      ('The Address East', hassan_allam_id),
      ('Seasons', hassan_allam_id),
      
      -- City Edge Developments
      ('New Alamein Towers', city_edge_id),
      ('New Mansoura', city_edge_id),
      ('Downtown New Alamein', city_edge_id),
      ('Al Maqsad', city_edge_id),
      ('Etapa Square', city_edge_id),
      ('Bay Residence', city_edge_id),
      
      -- Al Marasem Development
      ('Fifth Square', al_marasem_id),
      ('The Hive', al_marasem_id),
      ('The Collective', al_marasem_id),
      
      -- The Land Developers
      ('Armonia', land_developers_id),
      ('Gaia', land_developers_id),
      ('Scenario', land_developers_id),
      ('The Enclave', land_developers_id),
      ('Polygon', land_developers_id),
      ('Evora', land_developers_id);
  END IF;
END;
$$;


-- Insert example images (only if table is empty)
INSERT INTO public.images (url, alt_text)
SELECT i.url, i.alt_text
FROM (VALUES
  ('https://images.unsplash.com/photo-1600585154340-be6161a56a0c', 'Modern luxury home exterior with pool'),
  ('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c', 'Contemporary kitchen with island'),
  ('https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea', 'Spacious living room with large windows'),
  ('https://images.unsplash.com/photo-1600585153490-76fb20a32601', 'Master bedroom with en-suite bathroom'),
  ('https://images.unsplash.com/photo-1600566752355-35792bedcfea', 'Modern bathroom with walk-in shower'),
  ('https://images.unsplash.com/photo-1600210492493-0946911123ea', 'Outdoor patio with dining space'),
  ('https://images.unsplash.com/photo-1592928302636-c83cf1e1c887', 'Apartment building exterior'),
  ('https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 'Luxury villa with ocean view'),
  ('https://images.unsplash.com/photo-1574362848149-11496d93a7c7', 'Penthouse balcony with city view'),
  ('https://images.unsplash.com/photo-1560448204-603b3fc33ddc', 'Modern office space'),
  ('https://images.unsplash.com/photo-1600210491892-03d54c0aaf87', 'Cozy reading nook with bookshelf'),
  ('https://images.unsplash.com/photo-1600607688960-5e39fa8f6f26', 'Gourmet kitchen with stainless appliances'),
  ('https://images.unsplash.com/photo-1540518614846-7eded433c457', 'Swimming pool with lounge chairs'),
  ('https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf', 'Fitness center with modern equipment'),
  ('https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6', 'Outdoor garden and landscaping'),
  ('https://images.unsplash.com/photo-1600566753104-685f4f24cb4d', 'Home office with desk and chair'),
  ('https://images.unsplash.com/photo-1600607687920-4e2a09cf159d', 'Elegant dining room'),
  ('https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf', 'Apartment complex with amenities'),
  ('https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde', 'Kitchen with breakfast bar'),
  ('https://images.unsplash.com/photo-1600563440091-ab11f30e01d3', 'Living room with fireplace'),
  ('https://images.unsplash.com/photo-1628744448840-6b8843b2c8f1', 'Luxury condo building facade'),
  ('https://images.unsplash.com/photo-1600607687710-3cad7cc74635', 'Bedroom with walk-in closet'),
  ('https://images.unsplash.com/photo-1501183638710-841dd1904471', 'Waterfront luxury property'),
  ('https://images.unsplash.com/photo-1523217582562-09d0def993a6', 'Modern urban apartment building'),
  ('https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6', 'Desert villa with swimming pool'),
  ('https://images.unsplash.com/photo-1580587771525-78b9dba3b914', 'Minimalist home exterior'),
  ('https://images.unsplash.com/photo-1493809842364-78817add7ffb', 'Penthouse living room with panoramic view'),
  ('https://images.unsplash.com/photo-1560184897-67f4a3f9a7fa', 'Luxury building lobby with chandelier'),
  ('https://images.unsplash.com/photo-1600210491369-e753d80a41f3', 'Childrens playground in residential complex'),
  ('https://images.unsplash.com/photo-1569152811536-fb47aced8409', 'Rooftop terrace with seating area'),
  ('https://images.unsplash.com/photo-1600375104627-c94c416deefa', 'Beachfront residential apartments'),
  ('https://images.unsplash.com/photo-1560185007-5f0bb1866cab', 'Luxury spa facilities'),
  ('https://images.unsplash.com/photo-1624204386084-dd8c05e32226', 'Gated community entrance'),
  ('https://images.unsplash.com/photo-1581404917879-53e19259fdda', 'Residential tower with modern architecture'),
  ('https://images.unsplash.com/photo-1623298317883-6b70254edf31', 'Resort-style swimming pool'),
  ('https://images.unsplash.com/photo-1523755231516-e43fd2e8dca5', 'Luxury walk-in closet'),
  ('https://images.unsplash.com/photo-1524758631624-e2822e304c36', 'Co-working space in residential building'),
  ('https://images.unsplash.com/photo-1613490493576-7fde63acd811', 'Tennis court in residential compound'),
  ('https://images.unsplash.com/photo-1600121848594-d8644e57abab', 'Indoor garden with water feature'),
  ('https://images.unsplash.com/photo-1544457070-4cd773b4d71e', 'Luxury condominium lobby'),
  ('https://images.unsplash.com/photo-1563720223185-11003d516935', 'Yoga and meditation space'),
  ('https://images.unsplash.com/photo-1502672260266-1c1ef2d93688', 'Private garden with outdoor kitchen')
) as i(url, alt_text)
WHERE NOT EXISTS (SELECT 1 FROM public.images LIMIT 1);

-- Insert example units with random project assignments (only if table is empty)
DO $$
DECLARE
  project_ids UUID[];
  image_ids UUID[];
  amenity_ids UUID[];
  current_project_id UUID;
  unit_id UUID;
  num_projects INT;
  num_images INT;
  num_amenities INT;
  floor_area_options NUMERIC[] := ARRAY[35.50, 45.75, 60.25, 75.50, 90.75, 105.25, 120.50, 135.75, 150.25, 165.50, 180.75, 200.25, 220.50, 250.75, 300.25, 350.50, 400.75, 450.25, 500.50];
  price_options NUMERIC[] := ARRAY[250000, 350000, 450000, 550000, 650000, 750000, 850000, 950000, 1050000, 1250000, 1450000, 1650000, 1850000, 2000000, 2250000, 2500000, 2750000, 3000000, 3500000, 4000000, 4500000, 5000000, 6000000, 7000000, 8000000, 10000000];
  unit_names TEXT[] := ARRAY[
    'Studio Apartment', 'Compact Studio', 'Deluxe Studio', 
    'One Bedroom', 'One Bedroom Deluxe', 'One Bedroom Suite', 'One Bedroom Loft',
    'Two Bedroom', 'Two Bedroom Corner', 'Two Bedroom Deluxe', 'Two Bedroom Executive', 'Two Bedroom Duplex',
    'Three Bedroom', 'Three Bedroom Penthouse', 'Three Bedroom Executive', 'Three Bedroom Townhouse',
    'Four Bedroom', 'Four Bedroom Villa', 'Four Bedroom Penthouse', 'Four Bedroom Executive',
    'Penthouse', 'Super Penthouse', 'Presidential Penthouse', 
    'Duplex', 'Triplex', 'Townhouse', 'Garden Townhouse',
    'Loft', 'Luxury Loft', 'Artist Loft', 
    'Garden Apartment', 'Garden Suite', 'Terrace Apartment',
    'Villa', 'Executive Villa', 'Luxury Villa', 'Beachfront Villa', 'Mountain View Villa',
    'Sky Villa', 'Premium Sky Villa'
  ];
  descriptions TEXT[] := ARRAY[
    '<h3>Cozy Studio Apartment</h3><p>Experience modern urban living in this well-designed studio featuring <strong>premium finishes</strong> and breathtaking city views.</p><ul><li>Modern kitchen with stainless steel appliances</li><li>Custom lighting fixtures</li><li>Built-in storage solutions</li></ul>',
    
    '<h3>Elegant Designer Studio</h3><p>This <em>sophisticated</em> studio showcases <strong>high-end appliances</strong> and dramatic floor-to-ceiling windows that flood the space with natural light.</p><ul><li>Quartz countertops</li><li>Custom cabinetry</li><li>Smart home integration</li></ul>',
    
    '<h3>Spacious One Bedroom</h3><p>Enjoy exceptional comfort in this <strong>generously proportioned</strong> one-bedroom unit with stunning <em>high ceilings</em> and abundant natural light throughout the day.</p><ul><li>Open-concept living area</li><li>Chef-inspired kitchen</li><li>Large bedroom with walk-in closet</li></ul>',
    
    '<h3>Luxurious One Bedroom Suite</h3><p>This <strong>premium</strong> one-bedroom residence features a <em>gourmet kitchen</em> with top-of-the-line appliances and a generous balcony perfect for outdoor dining and relaxation.</p><ul><li>Marble kitchen island</li><li>Custom lighting fixtures</li><li>Spa-inspired bathroom</li></ul>',
    
    '<h3>Beautiful Two Bedroom Apartment</h3><p>Discover contemporary living in this <strong>stylish</strong> two-bedroom apartment featuring an <em>open floor plan</em> and fully updated kitchen with premium fixtures.</p><ul><li>Spacious living and dining areas</li><li>Two well-appointed bedrooms</li><li>Designer bathroom with soaking tub</li></ul>',
    
    '<h3>Corner Two Bedroom Unit</h3><p>This <strong>exceptional</strong> corner unit offers a <em>wrap-around balcony</em> with panoramic views and abundant natural light from multiple exposures.</p><ul><li>Dual-aspect living area</li><li>Primary bedroom with en-suite bathroom</li><li>Guest bedroom with built-in desk</li></ul>',
    
    '<h3>Luxurious Three Bedroom Residence</h3><p>Indulge in premium living in this <strong>spacious</strong> three-bedroom unit complete with <em>en-suite bathrooms</em> and generous walk-in closets in each bedroom.</p><ul><li>Gourmet kitchen with island</li><li>Formal dining area</li><li>Expansive living room</li></ul>',
    
    '<h3>Executive Three Bedroom Apartment</h3><p>This <strong>sophisticated</strong> three-bedroom residence features a dedicated <em>home office</em> and entertainment area perfect for both work and leisure.</p><ul><li>Primary suite with luxury bathroom</li><li>Two additional well-appointed bedrooms</li><li>Chef''s kitchen with premium appliances</li></ul>',
    
    '<h3>Stunning Penthouse Residence</h3><p>Experience <strong>elevated living</strong> in this exceptional penthouse featuring <em>panoramic views</em> and premium fixtures throughout.</p><ul><li>Expansive open-concept living area</li><li>Gourmet kitchen with top-tier appliances</li><li>Luxurious primary suite</li></ul>',
    
    '<h3>Full-Floor Penthouse</h3><p>This <strong>extraordinary</strong> full-floor penthouse offers <em>360-degree views</em> and private elevator access for unparalleled exclusivity.</p><ul><li>Multiple living and entertaining spaces</li><li>Chef''s kitchen with butler''s pantry</li><li>Lavish primary suite with sitting area</li></ul>',
    
    '<h3>Elegant Duplex Residence</h3><p>This <strong>distinctive</strong> duplex features a dramatic <em>spiral staircase</em> and multiple balconies offering different views and outdoor experiences.</p><ul><li>Two-story living room with fireplace</li><li>Gourmet kitchen with breakfast nook</li><li>Upper-level bedrooms for privacy</li></ul>',
    
    '<h3>Designer Two-Story Duplex</h3><p>This <strong>spectacular</strong> two-story residence showcases <em>designer finishes</em> and a private rooftop terrace perfect for entertaining.</p><ul><li>Dramatic entry foyer</li><li>Open-concept main level</li><li>Luxurious bedrooms on upper level</li></ul>',
    
    '<h3>Modern Industrial Loft</h3><p>This <strong>unique</strong> loft space features <em>industrial finishes</em> and a flexible open layout that can be customized to suit your lifestyle.</p><ul><li>Exposed concrete elements</li><li>Oversized windows</li><li>Chef-inspired kitchen</li></ul>',
    
    '<h3>Artist''s Loft with Character</h3><p>Inspire creativity in this <strong>exceptional</strong> artist''s loft featuring <em>double-height ceilings</em> and abundant natural light throughout the day.</p><ul><li>Open studio space</li><li>Industrial-chic kitchen</li><li>Custom track lighting</li></ul>',
    
    '<h3>Charming Garden Apartment</h3><p>This <strong>inviting</strong> garden apartment offers a <em>private outdoor space</em> creating a peaceful urban retreat.</p><ul><li>Seamless indoor-outdoor living</li><li>Updated kitchen with breakfast bar</li><li>Spacious bedroom with garden views</li></ul>',
    
    '<h3>Garden Oasis Unit</h3><p>Enjoy <strong>resort-style</strong> living in this exceptional residence with an <em>expansive patio</em> and professionally landscaped surroundings.</p><ul><li>Open-concept living area</li><li>Gourmet kitchen with premium appliances</li><li>Spacious bedrooms with garden views</li></ul>',
    
    '<h3>Multi-Level Townhouse</h3><p>This <strong>spacious</strong> townhouse offers multiple levels of living space and a <em>private entrance</em> for the ultimate in convenience and privacy.</p><ul><li>Open-concept main floor</li><li>Well-appointed bedrooms on upper levels</li><li>Finished basement for additional living space</li></ul>',
    
    '<h3>Executive Townhouse</h3><p>This <strong>premium</strong> townhouse residence features a <em>private garage</em> and exclusive rooftop deck with panoramic views.</p><ul><li>Sophisticated interior finishes</li><li>Gourmet kitchen with island</li><li>Luxurious primary suite</li></ul>',
    
    '<h3>Luxurious Private Villa</h3><p>Experience <strong>resort-style</strong> living in this exceptional villa featuring a <em>private pool</em> and meticulously landscaped garden.</p><ul><li>Open-concept great room</li><li>Chef''s kitchen with high-end appliances</li><li>Luxurious bedroom suites</li></ul>',
    
    '<h3>Exclusive Beachfront Villa</h3><p>This <strong>extraordinary</strong> beachfront residence offers <em>direct ocean access</em> and panoramic sea views from multiple vantage points.</p><ul><li>Open living spaces oriented toward the view</li><li>Gourmet kitchen with butler''s pantry</li><li>Luxurious bedroom suites</li></ul>',
    
    '<h3>Family-Friendly Apartment</h3><p>This <strong>thoughtfully designed</strong> residence offers convenient access to <em>children''s playgrounds</em> and recreational areas perfect for active families.</p><ul><li>Open layout for family gatherings</li><li>Spacious bedrooms with ample storage</li><li>Family-sized kitchen with breakfast area</li></ul>',
    
    '<h3>Sunset-Facing Luxury Unit</h3><p>Enjoy <strong>spectacular sunsets</strong> through <em>floor-to-ceiling windows</em> in this premium residence with western exposure.</p><ul><li>Open living space designed for the view</li><li>Chef-inspired kitchen</li><li>Luxurious bedroom suite</li></ul>',
    
    '<h3>Recently Renovated Smart Home</h3><p>This <strong>modern</strong> apartment features the latest in <em>smart home technology</em> and contemporary amenities for effortless living.</p><ul><li>Voice-controlled lighting and climate</li><li>Smart appliances in the kitchen</li><li>Programmable shower systems</li></ul>',
    
    '<h3>Eco-Friendly Sustainable Unit</h3><p>This <strong>forward-thinking</strong> residence features <em>energy-efficient appliances</em> and sustainable design elements throughout.</p><ul><li>Solar-optimized exposure</li><li>Water-saving fixtures</li><li>Energy-efficient HVAC system</li></ul>',
    
    '<h3>Pet-Friendly Apartment</h3><p>This <strong>welcoming</strong> residence offers <em>easy access</em> to dog park and pet amenities making it perfect for animal lovers.</p><ul><li>Durable flooring throughout</li><li>Built-in pet feeding station</li><li>Nearby pet washing facilities</li></ul>',
    
    '<h3>Premium Corner Unit</h3><p>This <strong>sought-after</strong> corner residence offers <em>dual-aspect views</em> and excellent natural ventilation from multiple exposures.</p><ul><li>Abundant natural light throughout the day</li><li>Wrap-around windows in main living area</li><li>Multiple exposures for cross-breeze</li></ul>',
    
    '<h3>Luxury Finishes Throughout</h3><p>This <strong>exceptional</strong> residence features <em>premium materials</em> including marble countertops and hardwood flooring in every room.</p><ul><li>Designer kitchen with waterfall island</li><li>Spa-inspired bathrooms</li><li>Custom millwork throughout</li></ul>',
    
    '<h3>Exclusive Top-Floor Residence</h3><p>This <strong>prestigious</strong> top-floor unit includes <em>private rooftop access</em> for the ultimate in exclusive outdoor living.</p><ul><li>Panoramic views from the main living space</li><li>Premium interior finishes</li><li>Private roof deck with entertaining area</li></ul>',
    
    '<h3>Fully Furnished Designer Apartment</h3><p>This <strong>turn-key</strong> residence comes complete with <em>curated artwork</em> and designer furnishings selected by interior design professionals.</p><ul><li>Custom furniture package</li><li>Coordinated decor elements</li><li>Integrated technology</li></ul>',
    
    '<h3>Turn-Key Luxury Residence</h3><p>This <strong>impeccable</strong> residence showcases <em>high-end finishes</em> and ingenious built-in storage solutions throughout every room.</p><ul><li>Custom closet systems</li><li>Integrated kitchen storage</li><li>Hidden organizational features</li></ul>',
    
    '<h3>Resort-Style Community Living</h3><p>This <strong>premium</strong> residence offers <em>direct access</em> to an exceptional array of community amenities for a complete lifestyle experience.</p><ul><li>Designer interior finishes</li><li>Open-concept living space</li><li>Prime location within the community</li></ul>',
    
    '<h3>Architecturally Unique Space</h3><p>This <strong>one-of-a-kind</strong> residence features <em>custom details</em> and distinctive architectural elements not found elsewhere.</p><ul><li>Signature design features</li><li>Custom built-ins and millwork</li><li>Unique spatial arrangements</li></ul>',
    
    '<h3>Premium Waterfront Property</h3><p>This <strong>exceptional</strong> waterfront residence features a <em>private dock</em> and unobstructed water views from principal rooms.</p><ul><li>Open floor plan oriented to the water</li><li>Floor-to-ceiling windows</li><li>Indoor-outdoor living spaces</li></ul>',
    
    '<h3>Mountain View Retreat</h3><p>This <strong>cozy</strong> mountain residence features a <em>stone fireplace</em> and panoramic natural vistas from expansive windows.</p><ul><li>Open-concept great room</li><li>Chef''s kitchen with breakfast bar</li><li>Luxury bedroom suites</li></ul>',
    
    '<h3>Urban Oasis Apartment</h3><p>This <strong>peaceful</strong> city residence features <em>soundproof windows</em> and contemporary design elements for a serene urban living experience.</p><ul><li>Open floor plan</li><li>Designer kitchen with integrated appliances</li><li>Spa-inspired bathroom</li></ul>',
    
    '<h3>Meticulously Maintained Residence</h3><p>This <strong>impeccable</strong> home features <em>recent updates</em> and modern conveniences throughout for effortless contemporary living.</p><ul><li>Updated kitchen with new appliances</li><li>Refreshed bathrooms</li><li>New flooring throughout</li></ul>',
    
    '<h3>Full-Service Luxury Living</h3><p>This <strong>premium</strong> residence offers <em>24/7 concierge</em> service and white-glove amenities for the ultimate in carefree living.</p><ul><li>Designer interior finishes</li><li>Open-concept floor plan</li><li>Premium building services</li></ul>',
    
    '<h3>Entertainment-Ready Residence</h3><p>Perfect for hosting, this <strong>spacious</strong> home features an <em>open concept layout</em> and dedicated wet bar area for seamless entertaining.</p><ul><li>Flowing floor plan</li><li>Gourmet kitchen with large island</li><li>Dedicated bar area with wine storage</li></ul>',
    
    '<h3>Tranquil Garden Setting</h3><p>This <strong>peaceful</strong> residence is nestled in <em>lush landscaping</em> with serene water features creating a private nature retreat.</p><ul><li>Garden views from principal rooms</li><li>Outdoor living spaces</li><li>Nature-inspired interior palette</li></ul>',
    
    '<h3>Historic Character with Modern Updates</h3><p>This <strong>unique</strong> residence features <em>preserved architectural details</em> alongside thoughtful modern updates for contemporary living.</p><ul><li>Original character elements</li><li>Updated systems throughout</li><li>Modern kitchen and bathrooms</li></ul>'
  ];
  unit_numbers TEXT[] := ARRAY[
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'U', 'V'
  ];
  unit_prefixes TEXT[] := ARRAY[
    '', 'North-', 'South-', 'East-', 'West-', 'NE-', 'NW-', 'SE-', 'SW-', 'Tower-', 'Block-', 'Phase-'
  ];
  
  unit_suffixes TEXT[] := ARRAY[
    '', 'X', 'Plus', 'Premium', 'Deluxe', 'Suite', 'Loft', 'View', 'Garden', 'Sky', 'Elite'
  ];
  i INT;
  random_index INT;
  random_project_index INT;
  random_image_count INT;
  random_amenity_count INT;
  units_per_project INT;
  total_floors INT;
  current_floor INT;
BEGIN
  -- Only proceed if units table is empty
  IF NOT EXISTS (SELECT 1 FROM public.units LIMIT 1) THEN
    -- Get all project IDs
    SELECT ARRAY(SELECT id FROM public.projects ORDER BY id) INTO project_ids;
    -- Get all image IDs
    SELECT ARRAY(SELECT id FROM public.images ORDER BY id) INTO image_ids;
    -- Get all amenity IDs
    SELECT ARRAY(SELECT id FROM public.amenities ORDER BY id) INTO amenity_ids;
    
    num_projects := array_length(project_ids, 1);
    num_images := array_length(image_ids, 1);
    num_amenities := array_length(amenity_ids, 1);
    
    -- For each project, create varying number of units
    FOR i IN 1..num_projects LOOP
      current_project_id := project_ids[i];
      
      -- Cap the total number of units at approximately 400
      -- Calculate units per project to distribute evenly across all projects
      units_per_project := ceil(400.0 / num_projects);
      
      -- Add some randomness but keep total around 400
      units_per_project := floor(units_per_project * (0.7 + random() * 0.6));
      
      -- Set a maximum floor count for this project
      total_floors := floor(random() * (40-5+1) + 5);
      
      -- Create units for this project
      FOR j IN 1..units_per_project LOOP
        -- Randomly select floor and unit details
        current_floor := floor(random() * total_floors + 1);
        
        -- Insert a unit
        INSERT INTO public.units (
          name, 
          number, 
          floor, 
          rooms, 
          bathrooms, 
          floor_area, 
          description, 
          price, 
          project_id
        ) VALUES (
          unit_names[floor(random() * array_length(unit_names, 1) + 1)], 
          CONCAT(
            unit_prefixes[floor(random() * array_length(unit_prefixes, 1) + 1)],
            floor(random() * 9 + 1)::text, 
            current_floor::text, 
            unit_numbers[floor(random() * array_length(unit_numbers, 1) + 1)],
            CASE WHEN random() < 0.3 THEN CONCAT('-', unit_suffixes[floor(random() * array_length(unit_suffixes, 1) + 1)]) ELSE '' END
          ),
          current_floor, 
          floor(random() * 5 + 1), 
          floor(random() * 4 + 1), 
          floor_area_options[floor(random() * array_length(floor_area_options, 1) + 1)], 
          descriptions[floor(random() * array_length(descriptions, 1) + 1)],
          price_options[floor(random() * array_length(price_options, 1) + 1)], 
          current_project_id
        ) RETURNING id INTO unit_id;
        
        -- Assign random images to unit (between 3 and 8 images)
        random_image_count := floor(random() * (8-3+1) + 3);
        FOR k IN 1..random_image_count LOOP
          INSERT INTO public.unit_images (unit_id, image_id, "order")
          VALUES (
            unit_id, 
            image_ids[floor(random() * num_images + 1)],
            k
          )
          ON CONFLICT DO NOTHING;
        END LOOP;
        
        -- Assign random amenities to unit (between 3 and 9 amenities)
        random_amenity_count := floor(random() * (9-3+1) + 3);
        FOR k IN 1..random_amenity_count LOOP
          INSERT INTO public.unit_amenities (unit_id, amenity_id)
          VALUES (
            unit_id, 
            amenity_ids[floor(random() * num_amenities + 1)]
          )
          ON CONFLICT DO NOTHING;
        END LOOP;
      END LOOP;
    END LOOP;
  END IF;
END;
$$;
