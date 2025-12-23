import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and Anon Key
// In a real project, use import.meta.env.VITE_SUPABASE_URL or process.env
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);