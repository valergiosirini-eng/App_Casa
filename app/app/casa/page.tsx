"use client";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import BudgetList from "@/components/BudgetList";
import Icon from "@/components/Icon";
import { useCycle } from "@/lib/hooks/useCycle";
import { daysLeft, eur } from "@/lib/format";
import { budgetOf } from "@/lib/types";

export default function Page() {
  return <AuthGate>{(s) => <Casa userId={s.user.id} />}</AuthGate>;
}

function Casa({ userId }: { userId: string }) {
  const d = useCycle(userId);
  if (d.loading) return <main className="center muted">Cargando…</main>;

  const c = d.shared;
  const pace = c ? 1 - (daysLeft(c.ends_on) - 1) / Math.max(1, daysLeft(c.ends_on, c.starts_on)) : undefined;
  const total = d.casa.reduce((a, s) => a + budgetOf(s), 0);
  const left = d.casa.reduce((a, s) => a + s.available, 0);

  return (
    <div className="screen">
      <main className="content">
        <header>
          <h1>Casa</h1>
          <p className="sub">Lo compartido: lo previsto, lo gastado y lo que queda. Lo veis los dos.</p>
        </header>
        {!c ? <p className="muted">Todavía no hay reparto este mes.</p> : (
          <>
            <section className="hero" style={{ background: "#DBEAFE" }} aria-label="Queda en Casa">
              <span className="label" style={{ color: "#1D4ED8" }}><Icon name="casa" color="#1D4ED8" size={22} />Queda en Casa</span>
              <span className="big num" style={{ fontSize: "3.25rem" }}>{eur(Math.round(left))}</span>
              <span>de {eur(Math.round(total))} previstos{Number(c.credit_in ?? 0) !== 0 ? ` · el mes pasado sobraron ${eur(c.credit_in)}` : ""}</span>
            </section>
            <BudgetList rows={d.casa} pace={pace} />
            <Link className="secondary" href="/historial?ver=casa">Ver los gastos uno a uno</Link>
          </>
        )}
      </main>
      <TabBar />
    </div>
  );
}
