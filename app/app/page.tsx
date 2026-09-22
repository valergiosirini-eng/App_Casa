"use client";
import Link from "next/link";
import { useEffect } from "react";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import Icon, { FamilyBox } from "@/components/Icon";
import { useCycle, refreshBadge } from "@/lib/hooks/useCycle";
import { daysLeft, eur, monthName, pct } from "@/lib/format";
import { AUTOMATIC_KINDS, budgetOf } from "@/lib/types";

export default function Page() {
  return <AuthGate>{(s) => <Inicio userId={s.user.id} />}</AuthGate>;
}

function Inicio({ userId }: { userId: string }) {
  const d = useCycle(userId);
  useEffect(() => { if (!d.loading) refreshBadge(); }, [d.loading, d.mine]);

  if (d.loading) return <main className="center muted">Cargando…</main>;

  const libre = d.mine.find((s) => s.kind === "free");
  const left = d.cycle ? daysLeft(d.cycle.ends_on) : 0;
  const perDay = libre ? Math.max(0, libre.available) / Math.max(left, 1) : 0;
  const attention = d.mine.filter((s) => !AUTOMATIC_KINDS.includes(s.kind) && s.kind !== "free");
  const automatic = d.mine.filter((s) => AUTOMATIC_KINDS.includes(s.kind));
  const casaTotal = d.casa.reduce((a, s) => a + budgetOf(s), 0);
  const over = [...d.mine, ...d.casa].filter((s) => s.available < 0).sort((a, b) => a.available - b.available)[0];
  const casaLeft = d.casa.reduce((a, s) => a + s.available, 0);

  // Un solo aviso a la vez, por prioridad
  let notice: { href: string; title: string; sub: string } | null = null;
  if (d.needsReparto) notice = { href: "/reparto", title: "Toca repartir la nómina", sub: "Antes de gastar nada: son 30 segundos" };
  else if (over)
    notice = { href: `/compensar?e=${over.envelope_id}`, title: `Te has pasado ${eur(-over.available)} en ${over.name}`, sub: "Toca para compensarlo con un sobre que vaya holgado" };
  else if (d.pendingTransfers.length)
    notice = {
      href: "/transferencias",
      title: d.pendingTransfers.length === 1 ? "Te falta 1 transferencia" : `Te faltan ${d.pendingTransfers.length} transferencias`,
      sub: d.pendingTransfers.map((t) => `${eur(t.amount)} a ${t.account}`).join(" · "),
    };

  return (
    <div className="screen">
      <main className="content">
        <header>
          <h1>{d.cycle ? monthName(d.cycle.period) : "Hola"}</h1>
          <p className="sub">{d.cycle ? `Quedan ${left} días hasta el próximo cobro` : "Aún no has hecho ningún reparto"}</p>
        </header>

        {libre && (
          <section className="hero" aria-label="Dinero libre">
            <span className="label"><Icon name="libre" color="var(--libre)" size={22} />Libre para gastar</span>
            <span className="big num">{eur(Math.floor(Math.max(0, libre.available)))}</span>
            <span>≈ <strong className="num">{eur(Math.floor(perDay * 100) / 100)} al día</strong> hasta el {Number(d.cycle!.ends_on.slice(8, 10))}</span>
          </section>
        )}

        {notice && (
          <Link href={notice.href} className="notice">
            <Icon name="alert" />
            <span style={{ flex: 1 }}><strong>{notice.title}</strong><span className="small">{notice.sub}</span></span>
            <Icon name="chevron" size={22} />
          </Link>
        )}

        {attention.length > 0 && (
          <section aria-labelledby="t-sobres">
            <h2 id="t-sobres" style={{ marginBottom: 8 }}>Tus sobres</h2>
            {attention.map((s) => {
              const total = budgetOf(s);
              return (
                <div className="row" key={s.envelope_id}>
                  <FamilyBox family={s.family} color={s.color} tint={s.tint} />
                  <div className="grow">
                    <div className="top"><span className="name">{s.name}</span><span className="amt num">{eur(s.available)}</span></div>
                    <div className="bar"><span style={{ width: pct(s.available, total), background: s.color }} /></div>
                    <span className="small">
                      de {eur(total)}{s.committed > 0 ? ` · ${eur(s.committed)} reservados` : ""}{s.available < 0 ? " · te has pasado" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
            {automatic.length > 0 && (
              <div className="row" style={{ borderBottom: "none" }}>
                <span className="famBox" style={{ width: 44, height: 44, background: "var(--line)" }}><Icon name="check" color="var(--muted)" size={22} /></span>
                <div className="grow" style={{ gap: 0 }}>
                  <span className="name">Ya apartado</span>
                  <span className="small">{automatic.map((s) => s.name.toLowerCase()).join(", ")}</span>
                </div>
                <span className="small num">{eur(automatic.reduce((a, s) => a + s.allocated, 0))}</span>
              </div>
            )}
          </section>
        )}

        {d.casa.length > 0 && (
          <Link href="/casa" className="notice" style={{ border: "none", background: "#DBEAFE" }}>
            <Icon name="casa" color="#1D4ED8" size={26} />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="top" style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ color: "#1D4ED8" }}>Casa (compartido)</strong><strong className="num">{eur(Math.round(casaLeft))}</strong>
              </span>
              <span className="bar" style={{ background: "#fff" }}><span style={{ width: pct(casaLeft, casaTotal), background: "#1D4ED8" }} /></span>
              <span className="small" style={{ color: "#1E3A8A" }}>quedan de {eur(Math.round(casaTotal))} · lo veis los dos</span>
            </span>
          </Link>
        )}
      </main>
      {d.cycle && (
        <div className="sticky">
          <Link href="/apunte" className="primary"><Icon name="plus" color="#fff" stroke={2.6} />Apuntar gasto</Link>
        </div>
      )}
      <TabBar />
    </div>
  );
}
