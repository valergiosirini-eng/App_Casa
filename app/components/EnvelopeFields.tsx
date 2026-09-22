"use client";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { KINDS, ROLLOVERS, defaultRollover, num, type EnvelopeDraft, type Family, type Kind, type Rule } from "@/lib/config";

// Campo numérico que acepta coma decimal
export function NumInput({ value, onChange, suffix, label, id, big = false, grow = false }:
  { value: number | null; onChange: (n: number | null) => void; suffix?: string; label: string; id?: string; big?: boolean; grow?: boolean }) {
  const [s, setS] = useState(value == null ? "" : String(value).replace(".", ","));
  useEffect(() => {
    if (num(s) !== value) setS(value == null ? "" : String(value).replace(".", ","));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={big ? "input" : "input plain"} style={{ ...(big ? {} : { minHeight: 48 }), ...(grow ? { flex: "1 1 0", minWidth: 0 } : {}) }}>
      <input id={id} aria-label={label} inputMode="decimal" value={s} placeholder="0"
        onChange={(e) => { const v = e.target.value.replace(/[^0-9.,]/g, ""); setS(v); onChange(num(v)); }} />
      {suffix && <span className="small" style={{ whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  );
}

export function FamilyPicker({ families, value, onChange }: { families: Family[]; value: string; onChange: (k: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Color" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
      {families.map((f) => {
        const on = f.key === value;
        return (
          <button key={f.key} type="button" role="radio" aria-checked={on} onClick={() => onChange(f.key)} title={f.name}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 2px", borderRadius: 12, cursor: "pointer",
              background: f.tint, border: `3px solid ${on ? f.color : "transparent"}`, fontSize: "0.75rem", fontWeight: on ? 700 : 400, color: "#111827" }}>
            <Icon name={f.key} color={f.color} size={22} />
            {f.name}
          </button>
        );
      })}
    </div>
  );
}

type Acc = { value: string; name: string };

// Formulario completo de un sobre (lo usan el asistente y la pantalla de edición)
export default function EnvelopeFields({ value: e, onChange, families, accounts, shared = false }:
  { value: EnvelopeDraft; onChange: (e: EnvelopeDraft) => void; families: Family[]; accounts: Acc[]; shared?: boolean }) {
  const set = (p: Partial<EnvelopeDraft>) => onChange({ ...e, ...p });
  const special = e.kind === "contribution" || e.kind === "free";
  const accValue = e.account_key ?? e.account_id ?? "";
  const setAcc = (v: string) => (e.account_key !== undefined ? set({ account_key: v }) : set({ account_id: v }));

  function setRule(r: Rule) {
    set({ rule: r, amount: r === "fixed" ? e.amount ?? 0 : e.amount, daily_rate: r === "daily" ? e.daily_rate ?? 0 : e.daily_rate,
      percent: r === "percent" ? e.percent ?? 0 : e.percent, period_months: r === "fixed" ? e.period_months : 1 });
  }
  function setKind(k: Kind) {
    set({ kind: k, rollover: shared && k === "budget" ? "credit" : defaultRollover(k), flexible: k === "budget" || k === "event" ? e.flexible : false });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="field">
        <label htmlFor="env-name">Nombre</label>
        <div className="input plain" style={{ minHeight: 48 }}>
          <input id="env-name" value={e.name} maxLength={40} onChange={(x) => set({ name: x.target.value })} />
        </div>
      </div>

      <div className="field">
        <span className="label-strong">Color</span>
        <FamilyPicker families={families} value={e.family} onChange={(family) => set({ family })} />
      </div>

      {special ? (
        <p className="small" style={{ margin: 0 }}>
          {e.kind === "free" ? "Libre es lo que queda después de todos los demás sobres. Su importe lo calcula la app." : "Tu parte de los sobres de Casa. Su importe lo calcula la app a partir de lo compartido."}
        </p>
      ) : (
        <>
          <div className="field">
            <span className="label-strong">¿Cómo funciona?</span>
            <div role="radiogroup" aria-label="Tipo" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {KINDS.filter((k) => !shared || !["savings", "cash"].includes(k.key)).map((k) => (
                <button key={k.key} type="button" role="radio" aria-checked={e.kind === k.key} onClick={() => setKind(k.key)}
                  className="chip" aria-pressed={e.kind === k.key} style={{ textAlign: "left", padding: "8px 14px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span>{k.label}</span>
                  <span style={{ fontWeight: 400, fontSize: "0.8125rem", opacity: 0.85 }}>{k.help}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="label-strong">¿Cuánto?</span>
            <div className="seg" role="group" aria-label="Cómo se calcula">
              {([["fixed", "€ al mes"], ["daily", "€ por día"], ["percent", "%"]] as [Rule, string][]).map(([r, l]) => (
                <button key={r} type="button" aria-pressed={e.rule === r} onClick={() => setRule(r)}>{l}</button>
              ))}
            </div>
            {e.rule === "fixed" && <NumInput label="Importe" value={e.amount} onChange={(amount) => set({ amount })} suffix={e.period_months > 1 ? `cada ${e.period_months} meses` : "al mes"} />}
            {e.rule === "daily" && <NumInput label="Euros por día laborable" value={e.daily_rate} onChange={(daily_rate) => set({ daily_rate })} suffix="por día laborable" />}
            {e.rule === "percent" && <NumInput label="Porcentaje" value={e.percent} onChange={(percent) => set({ percent })} suffix={shared ? "% de lo compartido" : "% de la nómina"} />}
            {e.rule === "fixed" && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span className="small">Se paga cada</span>
                {[1, 2, 3, 6, 12].map((m) => (
                  <button key={m} type="button" className="chip" style={{ minHeight: 40, padding: "0 12px" }} aria-pressed={e.period_months === m} onClick={() => set({ period_months: m })}>
                    {m === 1 ? "mes" : `${m} meses`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <span className="label-strong">Lo que sobre al acabar el mes</span>
            <div className="seg" role="group" aria-label="Lo que sobre">
              {ROLLOVERS.filter((r) => (shared ? r.key !== "to_hucha" : !r.sharedOnly)).map((r) => (
                <button key={r.key} type="button" aria-pressed={e.rollover === r.key} onClick={() => set({ rollover: r.key })}>{r.label}</button>
              ))}
            </div>
            <span className="small">{ROLLOVERS.find((r) => r.key === e.rollover)?.help}</span>
          </div>

          <button type="button" role="switch" aria-checked={e.flexible} onClick={() => set({ flexible: !e.flexible })}
            style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer" }}>
            <span className="check" aria-hidden style={{ background: e.flexible ? "var(--ink)" : "#fff" }}>{e.flexible && <Icon name="check" color="#fff" />}</span>
            <span><strong>Se puede recortar</strong><span className="small" style={{ display: "block" }}>Si un mes no llega el dinero, se reduce este antes que los demás.</span></span>
          </button>
        </>
      )}

      {accounts.length > 1 && e.kind !== "contribution" && (
        <div className="field">
          <span className="label-strong">Cuenta donde va el dinero</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {accounts.map((a) => (
              <button key={a.value} type="button" className="chip" aria-pressed={accValue === a.value} onClick={() => setAcc(a.value)}>{a.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
