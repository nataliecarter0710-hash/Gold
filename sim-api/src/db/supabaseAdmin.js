import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serverSecret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

if (!supabaseUrl || !serverSecret) {
  throw new Error('Missing SUPABASE_URL or server secret. Set SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the service environment.');
}

let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch {
  throw new Error('SUPABASE_URL must be a valid HTTPS URL.');
}
if (parsedUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
  throw new Error('SUPABASE_URL must use HTTPS in production.');
}

// Server-only administrative client. Do not import this module into browser/client code.
export const supabaseAdmin = createClient(supabaseUrl, serverSecret, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
