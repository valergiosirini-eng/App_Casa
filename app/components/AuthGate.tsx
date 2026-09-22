"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

let setupOk = false; // ya comprobado en esta sesión del navegador

// Envuelve las pantallas privadas: sin sesión → /login; sin configurar → /bienvenida
export default function AuthGate({ children, setup = false }: { children: (s: Session) => ReactNode; setup?: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [ready, setReady] = useState(setup || setupOk);

  useEffect(() => {
    async function check(s: Session | null) {
      setSession(s);
      if (!s) { router.replace("/login"); return; }
      if (setup || setupOk) { setReady(true); return; }
      const { data } = await supabase.from("members").select("onboarded_at").eq("id", s.user.id).maybeSingle();
      if (!data || !data.onboarded_at) { router.replace("/bienvenida"); return; }
      setupOk = true;
      setReady(true);
    }
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (!s) { setupOk = false; router.replace("/login"); } });
    return () => sub.subscription.unsubscribe();
  }, [router, setup]);

  if (!session || !ready) return <main className="center muted">Cargando…</main>;
  return <>{children(session)}</>;
}

export function markSetupDone() { setupOk = true; }
