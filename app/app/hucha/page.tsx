"use client";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import Icon from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { eur, pct } from "@/lib/format";

export default function Page() {
  return <AuthGate>{() => <Hucha />}</AuthGate>;
}

type Goal = { id: string; name: string; target: number | null; balance: number; is_default: boolean };

function Hucha() {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  useEffect(() => {
    supabase.from("v_goal_balances").select("id, name, target, balance, is_default").eq("active", true).order("sort_order")
      .then(({ data }) => setGoals((data ?? []).map((g: any) => ({ ...g, target: g.target === null ? null : Number(g.target), balance: Number(g.balance) }))));
  }, []);
  const total = (goals ?? []).reduce((a, g) => a + g.balance, 0);

  return (
    <div className="screen">
      <main className="content">
        <h1>Hucha</h1>
        <section className="hero" style={{ background: "#DCFCE7" }} aria-label="Total">
          <span className="label" style={{ color: "#15803D" }}><Icon name="ahorro" color="#15803D" size={22} />Guardado de lo que sobra</span>
          <span className="big num" style={{ fontSize: "3.25rem" }}>{eur(total)}</span>
          <span>Aparte de tu ahorro mensual, que no se toca</span>
        </section>
        {goals?.map((g) => (
          <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{g.name}</strong>
              <strong className="num">{g.target ? `${eur(g.balance)} de ${eur(g.target)}` : eur(g.balance)}</strong>
            </div>
            {g.target ? <div className="bar"><span style={{ width: pct(g.balance, g.target), background: "#15803D" }} /></div> : null}
            {g.is_default && <span className="small">Lo que sobra de tus sobres entra aquí al cerrar el mes.</span>}
          </div>
        ))}
        <p className="small">Mover dinero entre objetivos y sacar de la hucha llega en la próxima versión.</p>
      </main>
      <TabBar />
    </div>
  );
}
