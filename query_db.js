import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://qnpnisokvcsiysiakayr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucG5pc29rdmNzaXlzaWFrYXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTk1MDQsImV4cCI6MjA4Nzg3NTUwNH0.3CsuSvYu-1_B-O9xJuaG82O1j3KtaX30bKLDdsCOKuU';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { db: { schema: 'ibgsc' } });
async function run() {
  const { data: q1, error: e1 } = await sb.rpc('get_table_names');
  console.log(q1, e1);
}
run();
