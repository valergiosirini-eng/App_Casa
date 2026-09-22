"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate, { markSetupDone } from "@/components/AuthGate";
import Icon, { FamilyBox } from "@/components/Icon";
import EnvelopeFields, { NumInput } from "@/components/EnvelopeFields";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/format";
import { EXAMPLES, GOAL_EXAMPLES, ROLES, monthlyOf, ruleText, type AccountDraft, type EnvelopeDraft, type Family, type Role } from "@/lib/config";

export default function Page() {
  return <AuthGate setup>{(s) => <Wizard userId={s.user.id} email={s.user.email ?? ""} />}</AuthGate>;
}

type Item = EnvelopeDraft & { uid: number; open?: boolean };
type Goal = { name: string; target: number | null };
const STEPS = ["Tú", "Cuentas", "Gastos", "Casa y hucha", "Resumen"];
let uidSeq = 1;

function Wizard({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<{ display_name: string; onboarded_at: string | null } | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [casa, setCasa] = useState<{ total: number; members: number; hasShared: boolean }>({ total: 0, members: 2, hasShared: false });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos del asistente
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [payFrom, setPayFrom] = useState<number | null>(27);
  const [payTo, setPayTo] = useState<number | null>(29);
  const [income, setIncome] = useState<number | null>(null);
  const [workdays, setWorkdays] = useState(5);
  const [accounts, setAccounts] = useState<AccountDraft[]>([{ key: "main", name: "Cuenta nómina", bank: "", role: "spending", is_main: true }]);
  const [items, setItems] = useState<Item[]>([]);
  const [contribution, setContribution] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([{ name: "Sin asignar", target: null }]);

  async function load() {
    const [{ data: m }, { data: fam }] = await Promise.all([
      supabase.from("members").select("display_name, onboarded_at").eq("id", userId).maybeSingle(),
      supabase.from("color_families").select("key, name, color, tint").order("sort_order"),
    ]);
    setFamilies((fam ?? []) as Family[]);
    setMember(m as any);
    if (m?.onboarded_at) { markSetupDone(); router.replace("/"); return; }
    if (m) {
      setName(m.display_name === "Pareja" ? "" : m.display_name);
      const [{ data: env }, { data: acc }, { data: h }] = await Promise.all([
        supabase.from("envelopes").select("rule, amount, period_months, percent, daily_rate").is("owner_id", null).eq("active", true),
        supabase.from("accounts").select("id").is("owner_id", null).eq("role", "shared").eq("active", true),
        supabase.from("households").select("expected_members").single(),
      ]);
      const rows = (env ?? []) as EnvelopeDraft[];
      const sub = rows.filter((r) => r.rule !== "percent").reduce((a, r) => a + monthlyOf(r), 0);
      const total = sub + rows.filter((r) => r.rule === "percent").reduce((a, r) => a + monthlyOf(r, sub), 0);
      setCasa({ total, members: Number(h?.expected_members ?? 2), hasShared: (acc ?? []).length > 0 });
      setStep(1);
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  async function join() {
    setBusy(true); setError(null);
    const { error } = await supabase.rpc("join_household", { p_code: code.trim(), p_display_name: name.trim() || email.split("@")[0] });
    setBusy(false);
    if (error) setError(error.message.includes("válido") ? "Ese código no existe. Pídeselo a quien creó la casa." : error.message);
    else { setLoading(true); load(); }
  }

  const casaShare = contribution && casa.hasShared ? casa.total / Math.max(1, casa.members) : 0;
  const spent = items.reduce((a, e) => a + monthlyOf(e, income ?? 0, workdays * 4.2), 0);
  const libre = (income ?? 0) - spent - casaShare;
  const accOptions = accounts.map((a) => ({ value: a.key, name: a.name || "Sin nombre" }));
  const fam = (k: string) => families.find((f) => f.key === k) ?? { color: "#111827", tint: "#F3F4F6", key: k, name: k };

  // ---------------- acciones de gastos
  const selected = (n: string) => items.find((i) => i.name === n);
  function toggleExample(e: EnvelopeDraft) {
    const cur = selected(e.name);
    if (cur) setItems(items.filter((i) => i !== cur));
    else {
      const savingsAcc = accounts.find((a) => a.role === "savings")?.key;
      const cashAcc = accounts.find((a) => a.role === "cash")?.key;
      const account_key = e.kind === "savings" && savingsAcc ? savingsAcc : e.kind === "cash" && cashAcc ? cashAcc : "main";
      setItems([...items, { ...e, uid: uidSeq++, account_key }]);
    }
  }
  const update = (uid: number, e: EnvelopeDraft) => setItems(items.map((i) => (i.uid === uid ? { ...i, ...e } : i)));

  // ---------------- guardar
  async function finish() {
    setBusy(true); setError(null);
    const keys = new Set(accounts.map((a) => a.key));
    const payload = {
      display_name: name.trim(),
      payday_from: payFrom, payday_to: payTo ?? payFrom, reminder_day: Math.min(28, (payTo ?? payFrom ?? 27) + 1),
      workdays_per_week: workdays, expected_income: income,
      accounts: accounts.map(({ key, name, bank, role, is_main }) => ({ key, name: name.trim() || "Cuenta", bank, role, is_main })),
      envelopes: items.filter((i) => i.name.trim()).map(({ uid, open, account_key, ...e }) => ({ ...e, account_key: account_key && keys.has(account_key) ? account_key : "main" })),
      contribution,
      goals: goals.filter((g) => g.name.trim()),
      hucha_account_key: accounts.find((a) => a.role === "hucha")?.key ?? accounts.find((a) => a.role === "savings")?.key ?? "main",
    };
    const { error } = await supabase.rpc("complete_onboarding", { p_setup: payload });
    setBusy(false);
    if (error) { setError(error.message); return; }
    markSetupDone();
    router.replace("/");
  }

  const canNext =
    step === 1 ? name.trim().length > 0 && payFrom != null && payFrom >= 1 && payFrom <= 31 && (income ?? 0) > 0
    : step === 2 ? accounts.every((a) => a.name.trim()) && accounts.filter((a) => a.is_main).length === 1
    : step === 3 ? items.every((i) => i.name.trim() && monthlyOf(i, income ?? 0) >= 0)
    : true;

  if (loading) return <main className="center muted">Cargando…</main>;

  // ---------------- paso 0: unirse a la casa
  if (!member) {
    return (
      <main className="screen">
        <div className="content">
          <header><h1>Bienvenida</h1><p className="sub">Únete a vuestra casa con el código que te pasen.</p></header>
          <div className="field"><label htmlFor="code">Código de la casa</label>
            <div className="input"><input id="code" autoCapitalize="characters" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></div></div>
          <div className="field"><label htmlFor="nm">Tu nombre</label>
            <div className="input plain"><input id="nm" value={name} onChange={(e) => setName(e.target.value)} /></div></div>
          {error && <p role="alert" className="error"><Icon name="alert" />{error}</p>}
          <button className="primary" disabled={busy || code.length < 6} onClick={join}>{busy ? "Entrando…" : "Unirme"}</button>
        </div>
      </main>
    );
  }

  return (
    <div className="screen">
      <main className="content" style={{ gap: 18 }}>
        <div className="step" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }} aria-label={`Paso ${step} de ${STEPS.length}`}>
          {STEPS.map((s, i) => <span key={s} className={i < step ? "on" : ""} />)}
        </div>

        {step === 1 && (
          <>
            <header><h1>Hola{name ? `, ${name}` : ""}</h1><p className="sub">Vamos a preparar tus sobres. Todo lo que pongas aquí se puede cambiar después en Sobres.</p></header>
            <div className="field"><label htmlFor="nm">¿Cómo te llamas?</label>
              <div className="input plain"><input id="nm" value={name} onChange={(e) => setName(e.target.value)} /></div></div>
            <div className="field"><span className="label-strong">¿Cuánto cobras al mes, más o menos?</span>
              <NumInput big label="Nómina" value={income} onChange={setIncome} suffix="€" />
              <span className="small">Solo para calcular la propuesta. Cada mes pondrás lo que cobres de verdad.</span></div>
            <div className="field"><span className="label-strong">¿Qué días del mes sueles cobrar?</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="small">del</span><NumInput grow label="Desde el día" value={payFrom} onChange={setPayFrom} />
                <span className="small">al</span><NumInput grow label="Hasta el día" value={payTo} onChange={setPayTo} />
              </div>
              <span className="small">Si no has repartido el día después, te llegará un aviso.</span></div>
            <div className="field"><span className="label-strong">¿Cuántos días a la semana trabajas?</span>
              <div className="seg">{[3, 4, 5, 6, 7].map((d) => <button key={d} type="button" aria-pressed={workdays === d} onClick={() => setWorkdays(d)}>{d}</button>)}</div>
              <span className="small">Sirve para los sobres de “€ por día” (cafés, comida del trabajo…).</span></div>
          </>
        )}

        {step === 2 && (
          <>
            <header><h1>Tus cuentas</h1><p className="sub">Dónde entra la nómina y a dónde mueves el dinero. La conjunta ya está creada.</p></header>
            {accounts.map((a, i) => (
              <section key={a.key} className="card" style={{ gap: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div className="input plain" style={{ minHeight: 48, flex: 2, minWidth: 0 }}><input aria-label="Nombre de la cuenta" value={a.name} onChange={(e) => setAccounts(accounts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></div>
                  <div className="input plain" style={{ minHeight: 48, flex: 1, minWidth: 0 }}><input aria-label="Banco" placeholder="Banco" value={a.bank} onChange={(e) => setAccounts(accounts.map((x, j) => (j === i ? { ...x, bank: e.target.value } : x)))} /></div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ROLES.map((r) => <button key={r.key} type="button" className="chip" style={{ minHeight: 40 }} aria-pressed={a.role === r.key}
                    onClick={() => setAccounts(accounts.map((x, j) => (j === i ? { ...x, role: r.key } : x)))}>{r.label}</button>)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button type="button" role="radio" aria-checked={a.is_main} onClick={() => setAccounts(accounts.map((x, j) => ({ ...x, is_main: j === i })))}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <span className="check" style={{ width: 32, height: 32, borderRadius: 16, background: a.is_main ? "var(--ink)" : "#fff" }}>{a.is_main && <Icon name="check" color="#fff" size={18} />}</span>
                    <span>Aquí entra la nómina</span>
                  </button>
                  {accounts.length > 1 && !a.is_main && <button type="button" className="chip" style={{ minHeight: 40 }} onClick={() => setAccounts(accounts.filter((_, j) => j !== i))}>Quitar</button>}
                </div>
              </section>
            ))}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {([["savings", "Ahorro"], ["hucha", "Hucha"], ["cash", "Efectivo"], ["other", "Otra cuenta"]] as [Role, string][]).map(([role, label]) => (
                <button key={role} type="button" className="chip" onClick={() => setAccounts([...accounts, { key: `acc${uidSeq++}`, name: label, bank: accounts[0]?.bank ?? "", role, is_main: false }])}>
                  + {label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <header><h1>¿En qué sueles gastar?</h1><p className="sub">Toca los que te sirvan (ninguno es obligatorio) y ajusta el importe. Puedes crear los tuyos.</p></header>
            {EXAMPLES.map((g) => (
              <section key={g.group} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h2 style={{ fontSize: "1rem" }}>{g.group}</h2>
                <div className="tiles">
                  {g.items.map((e) => {
                    const on = !!selected(e.name); const f = fam(e.family);
                    return (
                      <button key={e.name} type="button" className="tile" aria-pressed={on} onClick={() => toggleExample(e)}
                        style={{ background: f.tint, borderColor: on ? f.color : "transparent" }}>
                        {on ? <span className="check" style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: f.color }}><Icon name="check" color="#fff" size={16} /></span>
                          : <Icon name={e.family} color={f.color} size={22} />}
                        <span><span className="t1">{e.name}</span><span className="t2">{ruleText(e)}</span></span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            <section aria-labelledby="t-mis" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h2 id="t-mis" style={{ fontSize: "1.0625rem" }}>Tus sobres ({items.length})</h2>
              {items.length === 0 && <p className="small" style={{ margin: 0 }}>Aún ninguno. Si no eliges nada, todo irá a Libre.</p>}
              {items.map((e) => {
                const f = fam(e.family);
                return (
                  <div key={e.uid} style={{ borderBottom: "1px solid var(--line)", padding: "8px 0", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <FamilyBox family={e.family} color={f.color} tint={f.tint} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}><strong>{e.name || "Nuevo sobre"}</strong><span className="small" style={{ display: "block" }}>{ruleText(e)}</span></div>
                      <button type="button" className="chip" style={{ minHeight: 40 }} aria-expanded={!!e.open} onClick={() => setItems(items.map((i) => (i.uid === e.uid ? { ...i, open: !i.open } : i)))}>
                        {e.open ? "Listo" : "Editar"}
                      </button>
                    </div>
                    {e.open && (
                      <div className="card">
                        <EnvelopeFields value={e} families={families} accounts={accOptions} onChange={(n) => update(e.uid, n)} />
                        <button type="button" className="secondary" onClick={() => setItems(items.filter((i) => i.uid !== e.uid))}>Quitar este sobre</button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button type="button" className="secondary" style={{ marginTop: 8 }}
                onClick={() => setItems([...items, { uid: uidSeq++, open: true, name: "", family: "personal", kind: "budget", rule: "fixed", amount: 0, period_months: 1, percent: null, daily_rate: null, flexible: true, rollover: "to_hucha", account_key: "main" }])}>
                <Icon name="plus" /> Crear un sobre mío
              </button>
            </section>
          </>
        )}

        {step === 4 && (
          <>
            <header><h1>Casa y hucha</h1></header>
            <section className="card" style={{ background: "#DBEAFE", border: "none" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Icon name="casa" color="#1D4ED8" size={26} /><strong style={{ color: "#1D4ED8" }}>Aportación a Casa</strong></div>
              {casa.hasShared ? (
                <>
                  <p style={{ margin: 0 }}>Los gastos comunes suman unos <strong className="num">{eur(casa.total)}</strong> al mes. Cada uno pone su parte al cobrar: a ti te tocan unos <strong className="num">{eur(casa.total / casa.members)}</strong>.</p>
                  <button type="button" role="switch" aria-checked={contribution} onClick={() => setContribution(!contribution)}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                    <span className="check" style={{ background: contribution ? "var(--ink)" : "#fff" }}>{contribution && <Icon name="check" color="#fff" />}</span>
                    <span>Apartar mi parte cada mes (recomendado)</span>
                  </button>
                  <span className="small" style={{ color: "#1E3A8A" }}>Los sobres de Casa los podéis cambiar los dos desde Sobres.</span>
                </>
              ) : <p style={{ margin: 0 }}>Todavía no hay cuenta conjunta. Se puede añadir después.</p>}
            </section>

            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 style={{ fontSize: "1.0625rem" }}>Tu hucha</h2>
              <p className="small" style={{ margin: 0 }}>Lo que sobre en los sobres de gasto va aquí. “{goals[0]?.name || "Sin asignar"}” recibe los sobrantes; los demás son objetivos.</p>
              {goals.map((g, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div className="input plain" style={{ minHeight: 48, flex: 2, minWidth: 0 }}><input aria-label="Nombre del objetivo" value={g.name} onChange={(e) => setGoals(goals.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></div>
                  {i > 0 && <div style={{ flex: 1, minWidth: 0 }}><NumInput label="Objetivo" value={g.target} onChange={(t) => setGoals(goals.map((x, j) => (j === i ? { ...x, target: t } : x)))} suffix="€" /></div>}
                  {i > 0 && <button type="button" className="iconbtn" aria-label="Quitar" onClick={() => setGoals(goals.filter((_, j) => j !== i))}><Icon name="minus" /></button>}
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {GOAL_EXAMPLES.filter((x) => !goals.some((g) => g.name === x.name)).map((x) => (
                  <button key={x.name} type="button" className="chip" onClick={() => setGoals([...goals, x])}>+ {x.name}</button>
                ))}
                <button type="button" className="chip" onClick={() => setGoals([...goals, { name: "", target: null }])}>+ Otro</button>
              </div>
            </section>
          </>
        )}

        {step === 5 && (
          <>
            <header><h1>Así quedaría</h1><p className="sub">Con una nómina de {eur(income ?? 0)}. Cada mes podrás ajustarlo antes de confirmar.</p></header>
            <table className="tbl">
              <tbody>
                {[...items].sort((a, b) => Number(b.kind === "savings") - Number(a.kind === "savings")).map((e) => (
                  <tr key={e.uid}><td><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name={e.family} color={fam(e.family).color} size={18} />{e.name}</span></td>
                    <td className="num">{eur(monthlyOf(e, income ?? 0, workdays * 4.2))}</td></tr>
                ))}
                {casaShare > 0 && <tr><td><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name="casa" color="#1D4ED8" size={18} />Aportación a Casa</span></td><td className="num">{eur(casaShare)}</td></tr>}
                <tr className="total"><td><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Icon name="libre" color="var(--libre)" size={18} />Libre</span></td><td className="num">{eur(libre)}</td></tr>
              </tbody>
            </table>
            {libre < 0 ? (
              <div role="alert" className="alert">
                <strong>No cuadra: faltan {eur(-libre)}.</strong>
                <span>{items.some((i) => i.flexible) ? `Los recortables (${items.filter((i) => i.flexible).map((i) => i.name).join(", ")}) se reducirán solos al repartir; si prefieres, baja importes en el paso anterior.` : "Baja algún importe en el paso anterior o marca algún sobre como recortable."}</span>
              </div>
            ) : (
              <p className="small" style={{ margin: 0 }}>Libre es lo que puedes gastar sin pensar. Unos {eur(libre / 30)} al día.</p>
            )}
          </>
        )}

        {error && <p role="alert" className="error"><Icon name="alert" />{error}</p>}
      </main>

      <div className="sticky" style={{ display: "flex", gap: 8 }}>
        {step > 1 && <button type="button" className="secondary" style={{ flex: 1 }} onClick={() => setStep(step - 1)} aria-label="Atrás"><Icon name="back" /></button>}
        {step < 5
          ? <button type="button" className="primary" style={{ flex: 3 }} disabled={!canNext} onClick={() => { setStep(step + 1); window.scrollTo(0, 0); }}>Siguiente: {STEPS[step]}</button>
          : <button type="button" className="primary" style={{ flex: 3 }} disabled={busy} onClick={finish}>{busy ? "Guardando…" : "Empezar"}</button>}
      </div>
    </div>
  );
}
