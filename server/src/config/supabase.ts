import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Force refreshes the PostgREST schema cache so newly added columns/tables 
 * are immediately recognized by Supabase without restarting.
 */
export const reloadSchemaCache = async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: "NOTIFY pgrst, 'reload schema';" });
    if (error) {
      console.warn('Schema cache reload via RPC warning:', error.message);
      return false;
    }
    console.log('✅ Supabase PostgREST schema cache reloaded successfully!');
    return true;
  } catch (err: any) {
    console.warn('Schema cache reload failed:', err.message);
    return false;
  }
};
