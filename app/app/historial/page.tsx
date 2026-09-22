"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import Icon, { FamilyBox } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/format";

export default function Page() {
  return <AuthGate>{(s) => <Suspense><Historial userId={s.user.id} /></Suspense>}</AuthGate>;
}

type Tx = { id: string; amount: number; note: string | null; occurred_at: string; name: string; family: string; color: string; tint: string; fam_name: string };

function Historial({ userId }: { userId: string }) {
  const [ver, setVer] = useState<"mio" | "casa">(useSearchParams().get("ver") === "casa" ? "casa" : "mio");
  const [txs, setTxs] = useState<Tx[] | null>(null);

  useEffect(() => {
    (async () => {
      setTxs(null);
      const { data: c } = await supabase.from("cycles").select("id, period").eq("member_id", userId).order("period", { ascending: false }).limit(1);
      if (!c?.[0]) { setTxs([]); return; }
      let cycleId = c[0].id;
      if (ver === "casa") {
        const { data: s } = await supabase.from("cycles").select("id").is("member_id", null).eq("period", c[0].period).maybeSingle();
        if (!s) { setTxs([]); return; }
        cycleId = s.id;
      }
      const { data } = await supabase.from("transactions")
        .select("id, amount, note, occurred_at, envelopes(name, family, color_families(name, color, tint))")
        .eq("cycle_id", cycleId).order("occurred_at", { ascending: false });
      setTxs((data ?? []).map((x: any) => ({
        id: x.id, amount: Number(x.amount), note: x.note, occurred_at: x.occurred_at,
        name: x.envelopes?.name, family: x.envelopes?.family,
        color: x.envelopes?.color_families?.color, tint: x.envelopes?.color_families?.tint, fam_name: x.envelopes?.color_families?.name,
      })));
    })();
  }, [userId, ver]);

  const total = (txs ?? []).reduce((a, t) => a + t.amount, 0);
  const byFam = Object.values((txs ?? []).reduce<Record<string, { name: string; color: string; family: string; amount: number }>>((acc, t) => {
    acc[t.family] = acc[t.family] ?? { name: t.fam_name, color: t.color, family: t.family, amount: 0 };
    acc[t.family].amount += t.amount;
    return acc;
  }, {})).sort((a, b) => b.amount - a.amount);

  const days = (txs ?? []).reduce<Record<string, Tx[]>>((acc, t) => {
    const k = new Date(t.occurred_at).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    (acc[k] = acc[k] ?? []).push(t);
    return acc;
  }, {});

  return (
    <div className="screen">
      <main className="content">
        <header><h1>¿En qué se me fue?</h1><p className="sub">Este ciclo</p></header>
        <div role="group" aria-label="Ver" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, background: "var(--line)", borderRadius: 14 }}>
          {(["mio", "casa"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={ver === v} onClick={() => setVer(v)}
              style={{ minHeight: 44, border: "none", borderRadius: 10, background: ver === v ? "#fff" : "transparent", fontWeight: ver === v ? 700 : 400 }}>
              {v === "mio" ? "Mío" : "Casa"}
            </button>
          ))}
        </div>
        {txs === null ? <p className="muted">Cargando…</p> : txs.length === 0 ? <p className="muted">Aún no hay gastos apuntados.</p> : (
          <>
            <div className="num" style={{ fontSize: "2.5rem", fontWeight: 700 }}>{eur(total)} <span className="muted" style={{ fontSize: "1.125rem", fontWeight: 400 }}>gastados</span></div>
            <div className="stackbar" role="img" aria-label="Gasto por color" style={{ height: 24 }}>
              {byFam.map((f) => <span key={f.family} style={{ width: `${(f.amount / total) * 100}%`, background: f.color }} />)}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {byFam.map((f) => (
                <li key={f.family} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name={f.family} color={f.color} size={22} />
                  <span style={{ flex: 1, fontWeight: 700, color: f.color }}>{f.name}</span>
                  <span className="num">{eur(f.amount)}</span>
                  <span className="small num" style={{ width: 44, textAlign: "right" }}>{Math.round((f.amount / total) * 100)} %</span>
                </li>
              ))}
            </ul>
            {Object.entries(days).map(([day, list]) => (
              <section key={day}>
                <h2 className="muted" style={{ fontSize: "0.9375rem", marginBottom: 4 }}>{day}</h2>
                {list.map((t) => (
                  <div key={t.id} className="row">
                    <FamilyBox family={t.family} color={t.color} tint={t.tint} size={40} />
                    <div className="grow" style={{ gap: 0 }}><span className="name">{t.name}</span>{t.note && <span className="small">{t.note}</span>}</div>
                    <strong className="num">{eur(t.amount)}</strong>
                  </div>
                ))}
              </section>
            ))}
          </>
        )}
      </main>
      <TabBar />
    </div>
  );
}
