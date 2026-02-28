import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qnpnisokvcsiysiakayr.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucG5pc29rdmNzaXlzaWFrYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTk1MDQsImV4cCI6MjA4Nzg3NTUwNH0.3CsuSvYu-1_B-O9xJuaG82O1j3KtaX30bKLDdsCOKuU';

// All inventory tables live in the ibgsc schema
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'ibgsc' },
});
