-- ==============================================================
-- CLOCKED CLIENT DATES & SYSTEM RESILIENCE SCHEMA MIGRATIONS
-- Run this entire block inside your Supabase SQL Editor
-- ==============================================================

-- 1. Add joining_date field to client records (Clients Table)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT '2025-11-01';

-- 2. Add exit_date field to client records (Clients Table)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS exit_date DATE DEFAULT NULL;

-- 3. Backfill any existing clients with NULL joining_date to '2025-11-01'
UPDATE public.clients SET joining_date = '2025-11-01' WHERE joining_date IS NULL;

-- 4. Create indexes on client date fields for fast querying
CREATE INDEX IF NOT EXISTS idx_clients_joining_date ON public.clients(joining_date);
CREATE INDEX IF NOT EXISTS idx_clients_exit_date ON public.clients(exit_date);

-- 5. Create the helper RPC function to allow cache reloading and custom sql execution
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- 6. Trigger schema cache reload immediately
NOTIFY pgrst, 'reload schema';
