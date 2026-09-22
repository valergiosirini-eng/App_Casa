"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import BudgetList from "@/components/BudgetList";
import Icon from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { useCycle } from "@/lib/hooks/useCycle";
import { daysLeft, eur } from "@/lib/format";

export default function Page() {
  return <AuthGate>{(s) => <Cuentas userId={s.user.id} />}</AuthGate>;
}

type Tab = "balance" | "presupuesto" | "controles" | "diario";
const TABS: [Tab, string][] = [["balance", "Balance"], ["presupuesto", "Previsto"], ["controles", "Controles"], ["diario", "Diario"]];

function Cuentas({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("balance");
  return (
    <div className="screen">
      <main className="content">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Cuentas</h1>
          <Link href="/hucha" className="chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <Icon name="jar" size={20} />Hucha
          </Link>
        </header>
        <div className="seg" role="group" aria-label="Vista">
          {TABS.map(([k, l]) => <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        {tab === "balance" && <Balance userId={userId} />}
        {tab === "presupuesto" && <Presupuesto userId={userId} />}
        {tab === "controles" && <Controles />}
        {tab === "diario" && <Diario />}
      </main>
      <TabBar />
    </div>
  );
}

// ---------------------------------------------------------------- Balance
type BS = { owner_id: string | null; section: string; section_order: number; name: string; amount: number };

function Balance({ userId }: { userId: string }) {
  const [who, setWho] = useState<"yo" | "casa">("yo");
  const [rows, setRows] = useState<BS[] | null>(null);
  const [interco, setInterco] = useState<number>(0);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("v_balance_sheet").select("owner_id, section, section_order, name, amount");
    setRows((data ?? []).map((r: any) => ({ ...r, amount: Number(r.amount) })));
    const { data: ic } = await supabase.from("v_ledger_balances").select("balance").eq("is_intercompany", true).eq("owner_id", userId);
    setInterco(Number(ic?.[0]?.balance ?? 0));
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  async function settle() {
    const { error } = await supabase.rpc("settle_with_casa", { p_amount: null });
    setMsg(error ? error.message : "Hecho. Recuerda hacer la transferencia real en el banco.");
    load();
  }

  if (!rows) return <p className="muted">Cargando…</p>;
  const mine = rows.filter((r) => (who === "yo" ? r.owner_id === userId : r.owner_id === null));
  const sections = ["Activo", "Pasivo", "Patrimonio"];
  const tot = (s: string) => mine.filter((r) => r.section === s).reduce((a, r) => a + r.amount, 0);
  const activo = tot("Activo"), pp = tot("Pasivo") + tot("Patrimonio");
  const empty = mine.every((r) => r.amount === 0);

  return (
    <>
      <div className="seg" role="group" aria-label="De quién">
        <button type="button" aria-pressed={who === "yo"} onClick={() => setWho("yo")}>Tú</button>
        <button type="button" aria-pressed={who === "casa"} onClick={() => setWho("casa")}>Casa</button>
      </div>
      {who === "yo" && interco !== 0 && (
        <section className="alert">
          <strong>{interco > 0 ? `Casa te debe ${eur(interco)}` : `Debes ${eur(-interco)} a Casa`}</strong>
          <span className="small">{interco > 0 ? "Pagaste gastos de Casa con tu cuenta." : "Pagaste gastos tuyos con la conjunta."} Liquidadlo con una transferencia.</span>
          <button type="button" className="primary" onClick={settle}>{interco > 0 ? "Registrar que la conjunta me paga" : "Registrar que pago a la conjunta"}</button>
          {msg && <span className="small">{msg}</span>}
        </section>
      )}
      {empty && <p className="small">Aún no hay movimientos. Empieza poniendo el saldo real de cada cuenta en Controles.</p>}
      {sections.map((sec) => (
        <table className="tbl" key={sec}>
          <thead><tr><th>{sec}</th><th></th></tr></thead>
          <tbody>
            {mine.filter((r) => r.section === sec && r.amount !== 0).map((r) => (
              <tr key={r.name}><td>{r.name}</td><td>{eur(r.amount)}</td></tr>
            ))}
            <tr className="total"><td>Total {sec.toLowerCase()}</td><td>{eur(tot(sec))}</td></tr>
          </tbody>
        </table>
      ))}
      <p className={Math.abs(activo - pp) < 0.005 ? "small ok" : "small"} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Icon name={Math.abs(activo - pp) < 0.005 ? "check" : "alert"} size={18} />
        Activo {eur(activo)} = Pasivo + Patrimonio {eur(pp)}
      </p>
    </>
  );
}

// ---------------------------------------------------------------- Presupuesto vs real
function Presupuesto({ userId }: { userId: string }) {
  const d = useCycle(userId);
  if (d.loading) return <p className="muted">Cargando…</p>;
  if (!d.cycle) return <p className="muted">Todavía no hay reparto.</p>;
  const c = d.cycle;
  const pace = 1 - (daysLeft(c.ends_on) - 1) / Math.max(1, daysLeft(c.ends_on, c.starts_on));
  return (
    <>
      <p className="small">Nómina {eur(c.income)} · ha pasado el {Math.round(pace * 100)} % del mes</p>
      <BudgetList rows={d.mine} pace={pace} />
    </>
  );
}

// ---------------------------------------------------------------- Controles y conciliación
type Check = { key: string; label: string; ok: boolean; detail: string };
type Acc = { id: string; name: string; bank: string | null; ledger: number; hasOpening: boolean };

function Controles() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [accs, setAccs] = useState<Acc[]>([]);

  const load = useCallback(async () => {
    const { data: c } = await supabase.rpc("run_checks");
    setChecks((c ?? []) as Check[]);
    const { data: a } = await supabase.from("accounts").select("id, name, bank").eq("active", true).order("sort_order");
    const { data: lb } = await supabase.from("v_ledger_balances").select("account_id, balance").not("account_id", "is", null);
    const { data: op } = await supabase.from("journal_entries").select("description").eq("kind", "opening");
    const opened = new Set((op ?? []).map((o: any) => o.description));
    setAccs((a ?? []).map((x: any) => ({
      ...x, ledger: Number(lb?.find((l: any) => l.account_id === x.id)?.balance ?? 0), hasOpening: opened.has("Saldo inicial de " + x.name),
    })));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!checks) return <p className="muted">Cargando…</p>;
  return (
    <>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {checks.filter((c) => !c.key.startsWith("reconciled:")).map((c) => (
          <li key={c.key} className="row" style={{ alignItems: "flex-start" }}>
            <span className={c.ok ? "ok" : ""}><Icon name={c.ok ? "check" : "alert"} /></span>
            <div className="grow" style={{ gap: 0 }}><span className="name">{c.label}</span><span className="small">{c.detail}</span></div>
          </li>
        ))}
      </ul>
      <h2 style={{ fontSize: "1.125rem" }}>Conciliación con el banco</h2>
      <p className="small" style={{ marginTop: -12 }}>Mira el saldo en la app del banco y escríbelo. Si no cuadra, te digo la diferencia.</p>
      {accs.map((a) => (
        <ConcRow key={a.id} acc={a} check={checks.find((c) => c.key === "reconciled:" + a.id)} onChange={load} />
      ))}
    </>
  );
}

function ConcRow({ acc, check, onChange }: { acc: Acc; check?: Check; onChange: () => void }) {
  const [val, setVal] = useState("");
  const [diff, setDiff] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const n = parseFloat(val.replace(",", "."));

  async function run(adjust: boolean) {
    setBusy(true);
    const { data } = await supabase.rpc("reconcile_account", { p_account: acc.id, p_bank_balance: n, p_adjust: adjust, p_note: null });
    setBusy(false);
    setDiff(adjust ? 0 : Number((data as any)?.difference ?? 0));
    onChange();
  }
  async function opening() {
    setBusy(true);
    await supabase.rpc("set_opening_balance", { p_account: acc.id, p_amount: n - acc.ledger });
    await supabase.rpc("reconcile_account", { p_account: acc.id, p_bank_balance: n, p_adjust: false, p_note: "Saldo inicial" });
    setBusy(false); setDiff(0); onChange();
  }

  return (
    <div className="card" style={{ gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>{acc.name}{acc.bank ? ` (${acc.bank})` : ""}</strong>
        <span className="num">En la app: {eur(acc.ledger)}</span>
      </div>
      {check && <span className={check.ok ? "small ok" : "small"}>{check.detail}</span>}
      <div style={{ display: "flex", gap: 8 }}>
        <div className="input plain" style={{ flex: 1, minHeight: 48 }}>
          <input inputMode="decimal" aria-label={`Saldo real de ${acc.name}`} placeholder="Saldo en el banco" value={val} onChange={(e) => { setVal(e.target.value); setDiff(null); }} />
          <span>€</span>
        </div>
        <button type="button" className="chip" disabled={busy || isNaN(n)} onClick={() => run(false)}>Comprobar</button>
      </div>
      {diff !== null && diff !== 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="small">No cuadra: hay {eur(diff)} de diferencia{diff > 0 ? " (el banco tiene más)" : " (el banco tiene menos: ¿gasto sin apuntar?)"}.</span>
          {!acc.hasOpening && <button type="button" className="primary" disabled={busy} onClick={opening}>Es el saldo con el que empiezo</button>}
          <button type="button" className="secondary" disabled={busy} onClick={() => run(true)}>Ajustar la diferencia</button>
        </div>
      )}
      {diff === 0 && <span className="small ok">Cuadra con el banco.</span>}
    </div>
  );
}

// ---------------------------------------------------------------- Diario
type Line = { entry_id: string; entry_date: string; kind: string; description: string; reversed_by: string | null; account: string; debit: number; credit: number };

function Diario() {
  const [lines, setLines] = useState<Line[] | null>(null);
  useEffect(() => {
    supabase.from("v_journal").select("entry_id, entry_date, kind, description, reversed_by, account, debit, credit, line_id")
      .order("entry_date", { ascending: false }).order("line_id").limit(300)
      .then(({ data }) => setLines((data ?? []).map((l: any) => ({ ...l, debit: Number(l.debit), credit: Number(l.credit) }))));
  }, []);
  if (!lines) return <p className="muted">Cargando…</p>;
  if (!lines.length) return <p className="muted">Aún no hay asientos.</p>;
  const entries = Object.values(lines.reduce<Record<string, Line[]>>((acc, l) => { (acc[l.entry_id] = acc[l.entry_id] ?? []).push(l); return acc; }, {}));
  return (
    <>
      <p className="small">Cada movimiento es un asiento: lo que entra en una cuenta (debe) sale de otra (haber). No se borran: se anulan con un asiento inverso.</p>
      {entries.map((ls) => (
        <table className="tbl" key={ls[0].entry_id} style={{ opacity: ls[0].reversed_by ? 0.5 : 1 }}>
          <thead><tr><th>{new Date(ls[0].entry_date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · {ls[0].description}{ls[0].reversed_by ? " (anulado)" : ""}</th><th>Debe</th><th>Haber</th></tr></thead>
          <tbody>
            {ls.map((l, i) => (
              <tr key={i}><td>{l.account}</td><td>{l.debit ? eur(l.debit) : ""}</td><td>{l.credit ? eur(l.credit) : ""}</td></tr>
            ))}
          </tbody>
        </table>
      ))}
    </>
  );
}
