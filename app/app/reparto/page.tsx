"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import Icon, { FamilyBox } from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { eur, isoDay } from "@/lib/format";

export default function Page() {
  return <AuthGate>{(s) => <Reparto userId={s.user.id} />}</AuthGate>;
}

type Row = { envelope_id: string; name: string; rule: string; proposed: number; warning: string | null };
type Env = { id: string; flexible: boolean; family: string; color: string; tint: string };
type Commitment = { id: string; title: string; amount: number; due_on: string };

const RULE_TEXT: Record<string, string> = {
  fixed: "Fijo", percent: "Porcentaje", daily: "Por día laborable", shared_split: "Tu parte de Casa", remainder: "Lo que queda",
};

function Steps({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/" aria-label="Salir del reparto" className="iconbtn" style={{ background: "transparent", marginLeft: -12 }}><Icon name="back" /></Link>
        <span className="muted">Paso {n} de 3 · {label}</span>
      </div>
      <div className="step">{[1, 2, 3].map((i) => <span key={i} className={i <= n ? "on" : ""} />)}</div>
    </div>
  );
}

function Reparto({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [income, setIncome] = useState("");
  const [paidOn, setPaidOn] = useState(isoDay());
  const [prevCycle, setPrevCycle] = useState<{ id: string; ends_on: string } | null>(null);
  const [hasCash, setHasCash] = useState(false);
  const [cash, setCash] = useState("");
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [envs, setEnvs] = useState<Record<string, Env>>({});
  const [over, setOver] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paso 1: lo que hay que cerrar del mes anterior
  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("cycles").select("id, ends_on, income, status").eq("member_id", userId)
        .order("period", { ascending: false }).limit(1);
      const last = c?.[0];
      if (last?.income) setIncome(String(Number(last.income)).replace(".", ","));
      if (last && last.status === "distributed") {
        setPrevCycle({ id: last.id, ends_on: last.ends_on });
        const { data: cashEnv } = await supabase.from("envelopes").select("id").eq("owner_id", userId).eq("kind", "cash").eq("active", true);
        setHasCash((cashEnv ?? []).length > 0);
        const { data: cm } = await supabase.from("commitments").select("id, title, amount, due_on").eq("status", "pending").lte("due_on", last.ends_on);
        setCommitments((cm ?? []).map((x) => ({ ...x, amount: Number(x.amount) })));
      }
      const { data: e } = await supabase.from("envelopes").select("id, flexible, family, color_families(color, tint)").eq("owner_id", userId);
      const map: Record<string, Env> = {};
      (e ?? []).forEach((x: any) => { map[x.id] = { id: x.id, flexible: x.flexible, family: x.family, color: x.color_families?.color, tint: x.color_families?.tint }; });
      setEnvs(map);
    })();
  }, [userId]);

  const incomeN = parseFloat(income.replace(/\./g, "").replace(",", ".")) || 0;

  async function resolve(c: Commitment, paid: boolean) {
    const { error } = await supabase.rpc("resolve_commitment", { p_id: c.id, p_paid: paid, p_amount: null });
    if (!error) setCommitments((xs) => xs.filter((x) => x.id !== c.id));
  }

  async function propose() {
    setBusy(true); setError(null);
    const { data, error } = await supabase.rpc("propose_distribution", { p_income: incomeN, p_paid_on: paidOn });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setRows((data as Row[]).map((r) => ({ ...r, proposed: Number(r.proposed) })));
    setOver({});
    setStep(2);
  }

  const amounts = useMemo(() => {
    const res: Record<string, number> = {};
    let sum = 0;
    rows.forEach((r) => { if (r.rule !== "remainder") { res[r.envelope_id] = over[r.envelope_id] ?? r.proposed; sum += res[r.envelope_id]; } });
    rows.forEach((r) => { if (r.rule === "remainder") res[r.envelope_id] = Math.round((incomeN - sum) * 100) / 100; });
    return res;
  }, [rows, over, incomeN]);
  const libreRow = rows.find((r) => r.rule === "remainder");
  const libre = libreRow ? amounts[libreRow.envelope_id] : 0;

  function bump(id: string, delta: number) {
    setOver((o) => ({ ...o, [id]: Math.max(0, (o[id] ?? rows.find((r) => r.envelope_id === id)!.proposed) + delta) }));
  }

  async function confirm() {
    setBusy(true); setError(null);
    const overrides: Record<string, number> = {};
    Object.entries(over).forEach(([k, v]) => { overrides[k] = v; });
    const cashN = cash.trim() === "" ? null : parseFloat(cash.replace(",", ".")) || 0;
    const { error } = await supabase.rpc("confirm_distribution", {
      p_income: incomeN, p_paid_on: paidOn, p_overrides: overrides, p_cash_counted: hasCash && prevCycle ? cashN : null,
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.replace("/transferencias");
  }

  if (step === 1) {
    return (
      <div className="screen">
        <main className="content">
          <Steps n={1} label={prevCycle ? "Cerrar el mes y cobrar" : "Cobrar"} />
          <h1>{prevCycle ? "Antes de repartir, cerramos el mes" : "Primer reparto"}</h1>

          {commitments.length > 0 && (
            <section className="card" aria-labelledby="c1">
              <h2 id="c1" style={{ fontSize: "1.125rem" }}>¿Pagaste esto?</h2>
              {commitments.map((c) => (
                <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div><strong>{c.title}</strong> <span className="muted num">· {eur(c.amount)}</span></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button className="primary" type="button" onClick={() => resolve(c, true)}>Sí, lo pagué</button>
                    <button className="secondary" type="button" onClick={() => resolve(c, false)}>No</button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {prevCycle && hasCash && (
            <section className="card">
              <div className="field">
                <label htmlFor="cash">¿Cuánto efectivo te queda en la mano?</label>
                <div className="input"><input id="cash" inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" /><strong>€</strong></div>
                <span className="small">Lo que falte respecto a tus apuntes se guarda como «efectivo sin registrar».</span>
              </div>
            </section>
          )}

          <div className="field">
            <label htmlFor="nomina" style={{ fontSize: "1.25rem" }}>¿Cuánto has cobrado?</label>
            <div className="input"><input id="nomina" inputMode="decimal" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="1350" /><strong>€</strong></div>
          </div>
          <div className="field">
            <label htmlFor="fecha">Día de cobro</label>
            <div className="input plain"><input id="fecha" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
          </div>
          {error && <p role="alert" className="error"><Icon name="alert" />{error}</p>}
        </main>
        <div className="sticky">
          <button className="primary" type="button" onClick={propose} disabled={busy || incomeN <= 0 || commitments.length > 0}>
            {commitments.length > 0 ? "Responde primero lo de arriba" : busy ? "Calculando…" : "Siguiente"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <main className="content" style={{ gap: 16 }}>
        <Steps n={2} label="Repartir" />
        <h1>{eur(incomeN)} repartidos así</h1>
        <div className="stackbar" role="img" aria-label="Reparto de la nómina por colores">
          {rows.map((r) => (
            <span key={r.envelope_id} style={{ width: `${(Math.max(0, amounts[r.envelope_id]) / Math.max(incomeN, 1)) * 100}%`, background: envs[r.envelope_id]?.color }} />
          ))}
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.filter((r) => r.rule !== "remainder").map((r) => {
            const e = envs[r.envelope_id];
            return (
              <li key={r.envelope_id} className="row">
                {e && <FamilyBox family={e.family} color={e.color} tint={e.tint} size={40} />}
                <div className="grow" style={{ gap: 0 }}>
                  <span className="name">{r.name}</span>
                  <span className="small">{r.warning ?? RULE_TEXT[r.rule]}</span>
                </div>
                {e?.flexible && <button type="button" className="iconbtn" aria-label={`Menos en ${r.name}`} onClick={() => bump(r.envelope_id, -5)}><Icon name="minus" size={20} /></button>}
                <span className="num" style={{ minWidth: 70, textAlign: "right", fontWeight: 700, fontSize: "1.125rem" }}>{eur(amounts[r.envelope_id])}</span>
                {e?.flexible && <button type="button" className="iconbtn" aria-label={`Más en ${r.name}`} onClick={() => bump(r.envelope_id, 5)}><Icon name="plus" size={20} /></button>}
              </li>
            );
          })}
        </ul>
        {error && <p role="alert" className="error"><Icon name="alert" />{error}</p>}
      </main>
      <div className="sticky" style={{ background: "var(--libre-tint)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <strong style={{ color: "var(--libre)" }}>Libre este mes</strong>
          <strong className="num" style={{ fontSize: "2rem" }}>{eur(libre)}</strong>
        </div>
        {libre < 0 && <p className="error" style={{ margin: 0 }}><Icon name="alert" />No llega: baja algún sobre con el botón −.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 }}>
          <button className="secondary" type="button" style={{ width: 64 }} aria-label="Volver" onClick={() => setStep(1)}><Icon name="back" /></button>
          <button className="primary" type="button" onClick={confirm} disabled={busy || libre < 0}>{busy ? "Guardando…" : "Confirmar reparto"}</button>
        </div>
      </div>
    </div>
  );
}
