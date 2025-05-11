import { createClient } from '@supabase/supabase-js';

// Check for environment variables
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a client for client-side usage
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// For server-side operations where available (still exported from another file)
export const createServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabase; // Fall back to anon key if service key is not available
};
