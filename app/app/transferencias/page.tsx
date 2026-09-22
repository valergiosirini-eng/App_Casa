"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Icon from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/format";

export default function Page() {
  return <AuthGate>{(s) => <Transferencias userId={s.user.id} />}</AuthGate>;
}

type T = { id: string; amount: number; done: boolean; account: string; bank: string | null };

function Transferencias({ userId }: { userId: string }) {
  const [items, setItems] = useState<T[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("cycles").select("id").eq("member_id", userId).order("period", { ascending: false }).limit(1);
      if (!c?.[0]) { setItems([]); return; }
      const { data } = await supabase.from("transfers").select("id, amount, done, accounts(name, bank)").eq("cycle_id", c[0].id).order("amount", { ascending: false });
      setItems((data ?? []).map((x: any) => ({ id: x.id, amount: Number(x.amount), done: x.done, account: x.accounts?.name ?? "", bank: x.accounts?.bank ?? null })));
    })();
  }, [userId]);

  async function toggle(t: T) {
    const done = !t.done;
    setItems((xs) => xs!.map((x) => (x.id === t.id ? { ...x, done } : x)));
    await supabase.from("transfers").update({ done, done_at: done ? new Date().toISOString() : null }).eq("id", t.id);
  }

  async function copy(t: T) {
    try { await navigator.clipboard.writeText(t.amount.toFixed(2).replace(".", ",")); setCopied(t.id); setTimeout(() => setCopied(null), 1500); } catch {}
  }

  if (!items) return <main className="center muted">Cargando…</main>;
  const n = items.filter((x) => x.done).length;

  return (
    <div className="screen">
      <main className="content" style={{ gap: 16 }}>
        <div className="step" aria-hidden="true"><span className="on" /><span className="on" /><span className="on" /></div>
        <div>
          <h1>{items.length === 1 ? "Haz esta transferencia" : `Haz estas ${items.length} transferencias`}</h1>
          <p className="sub">Márcalas cuando estén hechas. Si se te pasa, te lo recuerdo en Inicio.</p>
        </div>
        <p aria-live="polite" style={{ margin: 0, fontWeight: 700 }}>{n === items.length ? "Todo hecho. El reparto está completo." : `${n} de ${items.length} hechas`}</p>
        {items.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, border: `2px solid ${t.done ? "var(--line-2)" : "var(--ink)"}`, opacity: t.done ? 0.7 : 1 }}>
            <button type="button" role="checkbox" aria-checked={t.done} className="check" onClick={() => toggle(t)} aria-label={`Marcar ${eur(t.amount)} a ${t.account} como hecha`}>
              {t.done && <Icon name="check" color="#fff" stroke={3} size={22} />}
            </button>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <strong className="num" style={{ fontSize: "1.125rem" }}>{eur(t.amount)}</strong>
              <span className="small">a {t.account}{t.bank ? ` (${t.bank})` : ""}</span>
            </div>
            <button type="button" className="iconbtn" aria-label="Copiar importe" onClick={() => copy(t)}>
              <Icon name={copied === t.id ? "check" : "copy"} size={20} />
            </button>
          </div>
        ))}
      </main>
      <div className="sticky"><Link className="primary" href="/">Ir al inicio</Link></div>
    </div>
  );
}
