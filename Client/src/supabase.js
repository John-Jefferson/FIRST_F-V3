/**
 * @file supabase.js
 * @description Supabase client initialization and authentication configuration helper.
 */

import { createClient } from '@supabase/supabase-js';

// Retrieve secure environment variables injected by Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Validates whether Supabase environment credentials are fully provided.
 */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * Global Supabase client instance configured with automatic token refresh,
 * session persistence, and URL redirect detection.
 */
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,   // Automatically refresh expired authentication tokens
        persistSession: true,     // Keep user session active across browser refreshes
        detectSessionInUrl: true, // Handle OAuth and auth callback redirects
      },
    })
  : null;
