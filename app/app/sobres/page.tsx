"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import Icon, { FamilyBox } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/format";
import { monthlyOf, ruleText, type EnvelopeDraft } from "@/lib/config";

export default function Page() {
  return <AuthGate>{(s) => <Sobres userId={s.user.id} />}</AuthGate>;
}

type E = EnvelopeDraft & { id: string; owner_id: string | null; priority: number; active: boolean; color: string; tint: string };

function Sobres({ userId }: { userId: string }) {
  const [items, setItems] = useState<E[] | null>(null);
  const [tab, setTab] = useState<"mio" | "casa">("mio");
  const [ordering, setOrdering] = useState(false);
  const [income, setIncome] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const [{ data }, { data: me }] = await Promise.all([
      supabase.from("envelopes").select("*, color_families(color, tint)").order("priority").order("sort_order"),
      supabase.from("members").select("expected_income").eq("id", userId).single(),
    ]);
    setItems((data ?? []).map((x: any) => ({ ...x, amount: x.amount == null ? null : Number(x.amount), percent: x.percent == null ? null : Number(x.percent),
      daily_rate: x.daily_rate == null ? null : Number(x.daily_rate), color: x.color_families?.color, tint: x.color_families?.tint })));
    setIncome(me?.expected_income == null ? null : Number(me.expected_income));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const shared = tab === "casa";
  const all = (items ?? []).filter((e) => (shared ? e.owner_id === null : e.owner_id === userId));
  const list = all.filter((e) => e.active);
  const archived = all.filter((e) => !e.active);
  const casaAll = (items ?? []).filter((e) => e.owner_id === null && e.active);
  const casaSub = casaAll.filter((e) => e.rule !== "percent").reduce((a, e) => a + monthlyOf(e), 0);
  const casaTotal = casaSub + casaAll.filter((e) => e.rule === "percent").reduce((a, e) => a + monthlyOf(e, casaSub), 0);

  function amountOf(e: E) {
    if (e.rule === "shared_split") return casaTotal / 2;
    if (e.rule === "remainder") return null;
    return monthlyOf(e, shared ? casaSub : income ?? 0);
  }
  const used = list.reduce((a, e) => a + (amountOf(e) ?? 0), 0);

  async function move(i: number, dir: -1 | 1) {
    const movable = list.filter((e) => e.rule !== "remainder");
    const j = i + dir;
    if (j < 0 || j >= movable.length) return;
    const ids = movable.map((e) => e.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    // orden optimista
    setItems((prev) => prev && prev.map((e) => { const k = ids.indexOf(e.id); return k >= 0 ? { ...e, priority: (k + 1) * 10 } : e; }).sort((a, b) => a.priority - b.priority));
    await supabase.rpc("reorder_envelopes", { p_ids: ids });
  }

  async function restore(e: E) {
    const { error } = await supabase.from("envelopes").update({ active: true }).eq("id", e.id);
    setMsg(null);
    if (error) setMsg(error.message.includes("remainder") ? "Ya tienes un sobre de lo que queda activo." : "No se ha podido recuperar.");
    load();
  }

  return (
    <div className="screen">
      <main className="content">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Sobres</h1>
          <Link href="/ajustes" className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--ink)" }}>
            <Icon name="sliders" size={20} /> Ajustes
          </Link>
        </header>

        <div className="seg" role="group" aria-label="De quién">
          <button type="button" aria-pressed={!shared} onClick={() => { setTab("mio"); setOrdering(false); }}>Tuyos</button>
          <button type="button" aria-pressed={shared} onClick={() => { setTab("casa"); setOrdering(false); }}>Casa</button>
        </div>

        {items === null ? <p className="muted">Cargando…</p> : (
          <section aria-label={shared ? "Sobres de Casa" : "Tus sobres"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span className="small">{shared ? "Los veis y cambiáis los dos" : "En orden de reparto: primero se llena el de arriba"}</span>
              {list.length > 2 && <button type="button" className="chip" style={{ minHeight: 36 }} aria-pressed={ordering} onClick={() => setOrdering(!ordering)}>{ordering ? "Hecho" : "Ordenar"}</button>}
            </div>
            {list.map((e) => {
              const movIdx = list.filter((x) => x.rule !== "remainder").indexOf(e);
              const amt = amountOf(e);
              const body = (
                <>
                  <FamilyBox family={e.family} color={e.color} tint={e.tint} size={40} />
                  <div className="grow" style={{ gap: 0 }}><span className="name">{e.name}</span><span className="small">{ruleText(e, shared)}</span></div>
                  {amt != null && !ordering && <span className="num" style={{ fontWeight: 700 }}>{eur(amt)}</span>}
                </>
              );
              return ordering ? (
                <div key={e.id} className="row">
                  {body}
                  {e.rule !== "remainder" && (
                    <span style={{ display: "flex", gap: 4 }}>
                      <button type="button" className="iconbtn" aria-label={`Subir ${e.name}`} disabled={movIdx === 0} onClick={() => move(movIdx, -1)}><span style={{ transform: "rotate(-90deg)", display: "inline-flex" }}><Icon name="chevron" /></span></button>
                      <button type="button" className="iconbtn" aria-label={`Bajar ${e.name}`} onClick={() => move(movIdx, 1)}><span style={{ transform: "rotate(90deg)", display: "inline-flex" }}><Icon name="chevron" /></span></button>
                    </span>
                  )}
                </div>
              ) : (
                <Link key={e.id} href={`/sobres/editar?id=${e.id}`} className="row" style={{ textDecoration: "none", color: "inherit" }}>
                  {body}
                  <Icon name="chevron" size={20} color="var(--muted)" />
                </Link>
              );
            })}
            <table className="tbl" style={{ marginTop: 8 }}>
              <tbody>
                {shared ? (
                  <tr className="total"><td>Total Casa al mes</td><td>{eur(casaTotal)}</td></tr>
                ) : (
                  <>
                    <tr><td>Sobres (sin Libre)</td><td>{eur(used)}</td></tr>
                    {income != null && <tr className="total"><td>Libre con {eur(income)} de nómina</td><td style={{ color: income - used < 0 ? "#B91C1C" : undefined }}>{eur(income - used)}</td></tr>}
                  </>
                )}
              </tbody>
            </table>
            {!shared && income != null && income - used < 0 && (
              <p className="small" style={{ color: "var(--ink)" }}><strong>No cuadra: faltan {eur(used - income)}.</strong> Baja algún importe o marca sobres como recortables.</p>
            )}
          </section>
        )}

        <Link href={`/sobres/editar?nuevo=${tab}`} className="secondary"><Icon name="plus" /> Nuevo sobre {shared ? "de Casa" : "tuyo"}</Link>
        <p className="small" style={{ margin: 0 }}>Los cambios valen desde el próximo reparto. El mes en curso sigue con lo que repartiste (para moverlo, usa Compensar).</p>

        {msg && <p role="alert" className="error"><Icon name="alert" />{msg}</p>}
        {archived.length > 0 && (
          <section>
            <button type="button" className="chip" aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}>Archivados ({archived.length})</button>
            {showArchived && archived.map((e) => (
              <div key={e.id} className="row">
                <FamilyBox family={e.family} color={e.color} tint={e.tint} size={36} />
                <div className="grow" style={{ gap: 0 }}><span className="name">{e.name}</span><span className="small">{ruleText(e, shared)}</span></div>
                <button type="button" className="chip" style={{ minHeight: 40 }} onClick={() => restore(e)}>Recuperar</button>
              </div>
            ))}
          </section>
        )}
      </main>
      <TabBar />
    </div>
  );
}
