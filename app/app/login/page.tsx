"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/Icon";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError("No hemos podido entrar. Revisa el email y la contraseña.");
    else router.replace("/");
  }

  return (
    <main className="screen">
      <form className="content" onSubmit={submit} style={{ justifyContent: "center" }}>
        <div>
          <h1>App Casa</h1>
          <p className="sub">Entra una vez y la sesión se queda abierta.</p>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <div className="input plain">
            <input id="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pw">Contraseña</label>
          <div className="input plain">
            <input id="pw" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        {error && (
          <p role="alert" className="error"><Icon name="alert" /><span>{error}</span></p>
        )}
        <button className="primary" type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
