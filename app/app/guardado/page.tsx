"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import Icon from "@/components/Icon";
import Compensar from "@/components/Compensar";
import { supabase } from "@/lib/supabase";
import { refreshBadge } from "@/lib/hooks/useCycle";
import { daysLeft, eur, pct } from "@/lib/format";
import type { EnvelopeStatus } from "@/lib/types";

export default function Page() {
  return <AuthGate>{() => <Suspense><Guardado /></Suspense>}</AuthGate>;
}

// Pantalla teñida del color de la familia: refuerza la asociación color ↔ gasto
function Guardado() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [tx, setTx] = useState<{ amount: number; cycle_id: string; envelope_id: string } | null>(null);
  const [st, setSt] = useState<EnvelopeStatus | null>(null);
  const [endsOn, setEndsOn] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: t } = await supabase.from("transactions").select("amount, cycle_id, envelope_id").eq("id", id).single();
      if (!t) return;
      setTx({ ...t, amount: Number(t.amount) });
      const { data: s } = await supabase.from("v_envelope_status").select("*").eq("cycle_id", t.cycle_id).eq("envelope_id", t.envelope_id).single();
      if (s) setSt({ ...(s as EnvelopeStatus), available: Number(s.available), allocated: Number(s.allocated), carried_in: Number(s.carried_in), moved: Number(s.moved ?? 0), spent: Number(s.spent) });
      const { data: c } = await supabase.from("cycles").select("ends_on").eq("id", t.cycle_id).single();
      setEndsOn(c?.ends_on ?? null);
      refreshBadge();
    })();
  }, [id, tick]);

  async function undo() {
    if (!id) return;
    await supabase.from("transactions").delete().eq("id", id);
    refreshBadge();
    router.replace("/apunte");
  }

  if (!tx || !st) return <main className="center muted">Guardando…</main>;
  const total = st.allocated + st.carried_in + st.moved;
  const perDay = endsOn ? Math.max(0, st.available) / daysLeft(endsOn) : 0;

  return (
    <main className="screen" style={{ background: st.tint }}>
      <div className="content" style={{ justifyContent: "center", gap: 28 }}>
        <div role="status" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <span style={{ width: 96, height: 96, borderRadius: 48, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={st.family} color={st.color} size={48} />
          </span>
          <span className="num" style={{ fontSize: "3.25rem", fontWeight: 700 }}>{eur(tx.amount)}</span>
          <span style={{ fontSize: "1.5rem", fontWeight: 700, color: st.color }}>en {st.name}</span>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span>Te quedan</span><strong className="num" style={{ fontSize: "1.625rem" }}>{eur(st.available)}</strong>
          </div>
          <div className="bar" style={{ height: 12 }}><span style={{ width: pct(st.available, total), background: st.color }} /></div>
          <span className="small" style={{ color: "#374151" }}>de {eur(total)}{endsOn ? ` · unos ${eur(Math.floor(perDay * 100) / 100)} al día` : ""}</span>
        </div>
        {st.available < 0 && (
          <Compensar envelopeId={st.envelope_id} name={st.name} deficit={-st.available} onDone={() => setTick((t) => t + 1)} />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="secondary" type="button" onClick={undo}><Icon name="undo" size={22} />Deshacer</button>
          <Link className="primary" href="/">Listo</Link>
        </div>
      </div>
    </main>
  );
}
