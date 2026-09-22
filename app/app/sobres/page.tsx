"use client";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import { FamilyBox } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/format";

export default function Page() {
  return <AuthGate>{() => <Sobres />}</AuthGate>;
}

type E = { id: string; name: string; owner_id: string | null; family: string; rule: string; amount: number | null; period_months: number;
  percent: number | null; daily_rate: number | null; flexible: boolean; rollover: string; color: string; tint: string };

const ROLL: Record<string, string> = { reset: "", keep: " · se acumula", to_hucha: " · lo que sobre, a la hucha", credit: " · lo que sobre, descuenta el mes siguiente" };

function ruleText(e: E) {
  const base =
    e.rule === "fixed" ? (e.period_months > 1 ? `${eur(Number(e.amount))} cada ${e.period_months} meses` : `${eur(Number(e.amount))} al mes`)
    : e.rule === "percent" ? `${Number(e.percent)} %`
    : e.rule === "daily" ? `${eur(Number(e.daily_rate))} por día laborable`
    : e.rule === "shared_split" ? "Tu parte de lo compartido"
    : "Lo que queda";
  return base + (e.flexible ? " · se puede recortar" : "") + (ROLL[e.rollover] ?? "");
}

function Sobres() {
  const [items, setItems] = useState<E[] | null>(null);
  useEffect(() => {
    supabase.from("envelopes").select("*, color_families(color, tint)").eq("active", true).order("owner_id", { nullsFirst: false }).order("priority")
      .then(({ data }) => setItems((data ?? []).map((x: any) => ({ ...x, color: x.color_families?.color, tint: x.color_families?.tint }))));
  }, []);

  const mine = (items ?? []).filter((e) => e.owner_id !== null);
  const casa = (items ?? []).filter((e) => e.owner_id === null);

  return (
    <div className="screen">
      <main className="content">
        <h1>Sobres</h1>
        {items === null && <p className="muted">Cargando…</p>}
        {items !== null && [["Tuyos", mine], ["Casa (compartidos)", casa]].map(([title, list]) => (
          <section key={title as string}>
            <h2 style={{ fontSize: "1.0625rem", marginBottom: 4 }}>{title as string}</h2>
            {(list as E[]).map((e) => (
              <div key={e.id} className="row">
                <FamilyBox family={e.family} color={e.color} tint={e.tint} size={40} />
                <div className="grow" style={{ gap: 0 }}><span className="name">{e.name}</span><span className="small">{ruleText(e)}</span></div>
              </div>
            ))}
          </section>
        ))}
        <p className="small">Editar sobres desde aquí llega en la próxima versión. Mientras, los cambios los hago yo en la base de datos y quedan en el historial.</p>
      </main>
      <TabBar />
    </div>
  );
}
