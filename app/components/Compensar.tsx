"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/format";

type Sug = { envelope_id: string; name: string; family: string; color: string; tint: string; available: number; slack: number; suggested: number };

// Aviso de exceso + sobres que van más holgados según el ritmo del mes. Un toque = traspaso auditado.
export default function Compensar({ envelopeId, name, deficit, onDone }: { envelopeId: string; name: string; deficit: number; onDone: () => void }) {
  const [sugs, setSugs] = useState<Sug[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc("suggest_compensation", { p_envelope: envelopeId }).then(({ data }) =>
      setSugs(((data ?? []) as Sug[]).map((s) => ({ ...s, available: Number(s.available), slack: Number(s.slack), suggested: Number(s.suggested) }))));
  }, [envelopeId, deficit]);

  async function cover(s: Sug) {
    setBusy(s.envelope_id); setError(null);
    const { error } = await supabase.rpc("move_budget", { p_from: s.envelope_id, p_to: envelopeId, p_amount: s.suggested, p_reason: `Compensar exceso de ${name}` });
    setBusy(null);
    if (error) setError(error.message); else onDone();
  }

  return (
    <section className="alert" role="alert" aria-live="assertive">
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Icon name="alert" />
        <div>
          <strong>Te has pasado {eur(deficit)} en {name}</strong>
          <p className="small" style={{ margin: "4px 0 0" }}>Tápalo con un sobre que vaya holgado para el punto del mes en el que estás (primero los que van por debajo de su ritmo).</p>
        </div>
      </div>
      {sugs === null && <span className="small">Buscando de dónde sacarlo…</span>}
      {sugs?.length === 0 && <span className="small">Ningún sobre va holgado ahora mismo. Saldrá del Libre o de la hucha.</span>}
      {sugs?.slice(0, 3).map((s, i) => (
        <button key={s.envelope_id} type="button" className={i === 0 ? "primary" : "secondary"} disabled={busy !== null} onClick={() => cover(s)}
          style={{ justifyContent: "space-between", padding: "0 16px", fontSize: "1rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name={s.family} color={i === 0 ? "#fff" : s.color} size={22} />
            Cubrir {eur(s.suggested)} con {s.name}
          </span>
          <span className="num" style={{ fontWeight: 400, fontSize: "0.875rem" }}>{busy === s.envelope_id ? "…" : s.slack > 0 ? `le sobran ${eur(s.slack)}` : `tiene ${eur(s.available)}`}</span>
        </button>
      ))}
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </section>
  );
}
