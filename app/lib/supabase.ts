import { createClient } from "@supabase/supabase-js";

// Valores públicos del proyecto app-casa (la clave publicable está pensada para ir en la app;
// los datos los protege la seguridad por filas de Supabase). Las variables de entorno, si existen, mandan.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ensyvopajknublwcyijz.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_qF11MRn7PESbHe3zE30qkg_t7fs9SF2";

// Cliente de navegador. La sesión se guarda en el almacenamiento de la PWA:
// en el iPhone hay que iniciar sesión una vez dentro de la app instalada.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
