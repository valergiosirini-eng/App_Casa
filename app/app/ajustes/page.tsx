"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import Icon from "@/components/Icon";
import { NumInput } from "@/components/EnvelopeFields";
import { supabase } from "@/lib/supabase";
import { ROLES, type Role } from "@/lib/config";

export default function Page() {
  return <AuthGate>{(s) => <Ajustes userId={s.user.id} />}</AuthGate>;
}

type M = { display_name: string; payday_from: number; payday_to: number; reminder_day: number; workdays_per_week: number;
  expected_income: number | null; badge_mode: string; morning_push: boolean; morning_push_hour: number; household_id: string };
type A = { id?: string; name: string; bank: string | null; role: Role; is_main: boolean; owner_id: string | null; active: boolean; dirty?: boolean };

function Ajustes({ userId }: { userId: string }) {
  const router = useRouter();
  const [m, setM] = useState<M | null>(null);
  const [accs, setAccs] = useState<A[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    const [{ data: me }, { data: a }, { data: h }] = await Promise.all([
      supabase.from("members").select("display_name, payday_from, payday_to, reminder_day, workdays_per_week, expected_income, badge_mode, morning_push, morning_push_hour, household_id").eq("id", userId).single(),
      supabase.from("accounts").select("id, name, bank, role, is_main, owner_id, active").order("sort_order"),
      supabase.from("households").select("invite_code").single(),
    ]);
    setM(me ? { ...(me as M), expected_income: me.expected_income == null ? null : Number(me.expected_income) } : null);
    setAccs((a ?? []) as A[]);
    setCode(h?.invite_code ?? "");
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (!m) return <main className="center muted">Cargando…</main>;
  const set = (p: Partial<M>) => setM({ ...m, ...p });
  const setA = (i: number, p: Partial<A>) => setAccs(accs.map((x, j) => (j === i ? { ...x, ...p, dirty: true } : x)));
  const mine = accs.map((a, i) => ({ a, i })).filter(({ a }) => a.owner_id === userId || a.owner_id === null);

  async function save() {
    if (!m) return;
    setBusy(true); setMsg(null);
    const { household_id, ...fields } = m;
    const r1 = await supabase.from("members").update(fields).eq("id", userId);
    let err = r1.error?.message ?? null;
    // Primero se quita el "principal" de las que lo pierden (índice único)
    const changed = accs.filter((a) => a.dirty);
    for (const a of changed.filter((x) => x.id && !x.is_main)) {
      const r = await supabase.from("accounts").update({ name: a.name.trim(), bank: a.bank?.trim() || null, role: a.role, is_main: false, active: a.active }).eq("id", a.id!);
      err = err ?? r.error?.message ?? null;
    }
    for (const a of changed.filter((x) => x.id && x.is_main)) {
      const r = await supabase.from("accounts").update({ name: a.name.trim(), bank: a.bank?.trim() || null, role: a.role, is_main: true, active: true }).eq("id", a.id!);
      err = err ?? r.error?.message ?? null;
    }
    const nuevos = changed.filter((x) => !x.id && x.name.trim());
    if (nuevos.length) {
      const r = await supabase.from("accounts").insert(nuevos.map((a, k) => ({ household_id, owner_id: a.owner_id, name: a.name.trim(), bank: a.bank?.trim() || null, role: a.role, is_main: a.is_main, sort_order: 50 + k })));
      err = err ?? r.error?.message ?? null;
    }
    setBusy(false);
    setMsg(err ? { ok: false, text: `No se ha podido guardar todo: ${err}` } : { ok: true, text: "Guardado" });
    load();
  }

  async function logout() { await supabase.auth.signOut(); router.replace("/login"); }

  return (
    <div className="screen">
      <main className="content" style={{ gap: 18 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/sobres" aria-label="Volver" className="iconbtn" style={{ background: "transparent", marginLeft: -12 }}><Icon name="back" /></Link>
          <h1 style={{ fontSize: "1.25rem" }}>Ajustes</h1>
        </header>

        <section className="card">
          <h2 style={{ fontSize: "1.0625rem" }}>Tú</h2>
          <div className="field"><label htmlFor="nm">Nombre</label>
            <div className="input plain" style={{ minHeight: 48 }}><input id="nm" value={m.display_name} onChange={(e) => set({ display_name: e.target.value })} /></div></div>
          <div className="field"><span className="label-strong">Nómina orientativa</span>
            <NumInput label="Nómina orientativa" value={m.expected_income} onChange={(v) => set({ expected_income: v })} suffix="€ al mes" /></div>
          <div className="field"><span className="label-strong">Días de cobro</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="small">del</span><NumInput grow label="Desde el día" value={m.payday_from} onChange={(v) => v != null && set({ payday_from: Math.round(v) })} />
              <span className="small">al</span><NumInput grow label="Hasta el día" value={m.payday_to} onChange={(v) => v != null && set({ payday_to: Math.round(v) })} />
            </div></div>
          <div className="field"><span className="label-strong">Aviso si no has repartido, el día</span>
            <NumInput label="Día del aviso" value={m.reminder_day} onChange={(v) => v != null && set({ reminder_day: Math.round(v) })} /></div>
          <div className="field"><span className="label-strong">Días que trabajas a la semana</span>
            <div className="seg">{[3, 4, 5, 6, 7].map((d) => <button key={d} type="button" aria-pressed={m.workdays_per_week === d} onClick={() => set({ workdays_per_week: d })}>{d}</button>)}</div></div>
          <div className="field"><span className="label-strong">Número en el icono</span>
            <div className="seg">{[["daily", "€ al día"], ["total", "Libre total"], ["off", "Nada"]].map(([k, l]) => <button key={k} type="button" aria-pressed={m.badge_mode === k} onClick={() => set({ badge_mode: k })}>{l}</button>)}</div></div>
        </section>

        <section className="card">
          <h2 style={{ fontSize: "1.0625rem" }}>Cuentas</h2>
          {mine.map(({ a, i }) => (
            <div key={a.id ?? `n${i}`} style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10, borderBottom: "1px solid var(--line)", opacity: a.active ? 1 : 0.5 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="input plain" style={{ minHeight: 48, flex: 2, minWidth: 0 }}><input aria-label="Nombre de la cuenta" value={a.name} onChange={(e) => setA(i, { name: e.target.value })} /></div>
                <div className="input plain" style={{ minHeight: 48, flex: 1, minWidth: 0 }}><input aria-label="Banco" placeholder="Banco" value={a.bank ?? ""} onChange={(e) => setA(i, { bank: e.target.value })} /></div>
              </div>
              {a.owner_id === null ? <span className="small">Compartida (Casa)</span> : (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {ROLES.map((r) => <button key={r.key} type="button" className="chip" style={{ minHeight: 36, padding: "0 10px" }} aria-pressed={a.role === r.key} onClick={() => setA(i, { role: r.key })}>{r.label}</button>)}
                  <button type="button" className="chip" style={{ minHeight: 36, padding: "0 10px" }} aria-pressed={a.is_main}
                    onClick={() => setAccs(accs.map((x, j) => (x.owner_id === userId ? { ...x, is_main: j === i, dirty: x.dirty || x.is_main !== (j === i) } : x)))}>Nómina aquí</button>
                  {!a.is_main && <button type="button" className="chip" style={{ minHeight: 36, padding: "0 10px" }} onClick={() => setA(i, { active: !a.active })}>{a.active ? "Archivar" : "Recuperar"}</button>}
                </div>
              )}
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setAccs([...accs, { name: "", bank: "", role: "spending", is_main: false, owner_id: userId, active: true, dirty: true }])}>
            <Icon name="plus" /> Añadir cuenta
          </button>
        </section>

        {code && <p className="small" style={{ margin: 0 }}>Código de la casa: <strong className="num">{code}</strong></p>}
        {msg && <p role="status" className={msg.ok ? "ok" : "error"} style={{ margin: 0 }}>{msg.text}</p>}
        <button type="button" className="secondary" onClick={logout}>Cerrar sesión</button>
      </main>
      <div className="sticky"><button type="button" className="primary" disabled={busy} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button></div>
    </div>
  );
}
