import { createClient } from "@supabase/supabase-js";

// Cliente de navegador. La sesión se guarda en el almacenamiento de la PWA:
// en el iPhone hay que iniciar sesión una vez dentro de la app instalada.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
