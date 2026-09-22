"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import Icon from "@/components/Icon";
import EnvelopeFields from "@/components/EnvelopeFields";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/format";
import { monthlyOf, type EnvelopeDraft, type Family } from "@/lib/config";

export default function Page() {
  return <AuthGate>{(s) => <Suspense><Editor userId={s.user.id} /></Suspense>}</AuthGate>;
}

type Acc = { id: string; name: string; owner_id: string | null; role: string; is_main: boolean };
const FIELDS = ["name", "family", "kind", "rule", "amount", "period_months", "percent", "daily_rate", "flexible", "rollover", "account_id"] as const;

function Editor({ userId }: { userId: string }) {
  const router = useRouter();
  const q = useSearchParams();
  const id = q.get("id");
  const nuevo = q.get("nuevo"); // "mio" | "casa"
  const [e, setE] = useState<EnvelopeDraft | null>(null);
  const [orig, setOrig] = useState<EnvelopeDraft | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [household, setHousehold] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: fam }, { data: acc }, { data: me }] = await Promise.all([
        supabase.from("color_families").select("key, name, color, tint").order("sort_order"),
        supabase.from("accounts").select("id, name, owner_id, role, is_main").eq("active", true).order("sort_order"),
        supabase.from("members").select("household_id").eq("id", userId).single(),
      ]);
      setFamilies((fam ?? []) as Family[]);
      setAccounts((acc ?? []) as Acc[]);
      setHousehold(me?.household_id ?? null);
      if (id) {
        const { data } = await supabase.from("envelopes").select("*").eq("id", id).single();
        if (data) {
          const d = { ...data, amount: data.amount == null ? null : Number(data.amount), percent: data.percent == null ? null : Number(data.percent), daily_rate: data.daily_rate == null ? null : Number(data.daily_rate) } as EnvelopeDraft;
          setE(d); setOrig(d);
        }
      } else {
        const shared = nuevo === "casa";
        const accs = (acc ?? []) as Acc[];
        const account = shared ? accs.find((a) => a.owner_id === null && a.role === "shared") : accs.find((a) => a.owner_id === userId && a.is_main);
        const { data: last } = await supabase.from("envelopes").select("priority").eq("active", true).neq("rule", "remainder")
          .filter("owner_id", shared ? "is" : "eq", shared ? null : userId).order("priority", { ascending: false }).limit(1);
        setE({
          name: "", family: shared ? "casa" : "personal", kind: "budget", rule: "fixed", amount: 0, period_months: 1, percent: null, daily_rate: null,
          flexible: !shared, rollover: shared ? "credit" : "to_hucha", account_id: account?.id ?? null, owner_id: shared ? null : userId,
          priority: Math.min(990, Number(last?.[0]?.priority ?? 0) + 10),
        });
      }
    })();
  }, [id, nuevo, userId]);

  if (!e) return <main className="center muted">Cargando…</main>;
  const shared = e.owner_id === null;
  const accOptions = accounts.filter((a) => (shared ? a.owner_id === null : a.owner_id === userId)).map((a) => ({ value: a.id, name: a.name }));
  const special = e.kind === "contribution" || e.kind === "free";
  const valid = e.name.trim().length > 0 && (e.rule === "fixed" ? (e.amount ?? -1) >= 0 : e.rule === "daily" ? (e.daily_rate ?? -1) >= 0 : e.rule === "percent" ? (e.percent ?? -1) >= 0 : true);

  async function save() {
    if (!e) return;
    setBusy(true); setError(null);
    const row: Record<string, unknown> = {};
    for (const k of FIELDS) row[k] = (e as any)[k] ?? null;
    row.name = e.name.trim();
    if (e.rule !== "fixed") { row.amount = null; row.period_months = 1; }
    if (e.rule !== "percent") row.percent = null;
    if (e.rule !== "daily") row.daily_rate = null;
    let res;
    if (id) res = await supabase.from("envelopes").update({ ...row, updated_at: new Date().toISOString() }).eq("id", id);
    else res = await supabase.from("envelopes").insert({ ...row, household_id: household, owner_id: e.owner_id, priority: e.priority, sort_order: e.priority });
    setBusy(false);
    if (res.error) { setError(res.error.message.includes("rule_params") ? "Falta el importe." : `No se ha podido guardar: ${res.error.message}`); return; }
    router.replace("/sobres");
  }

  async function archive() {
    setBusy(true);
    const { error } = await supabase.from("envelopes").update({ active: false }).eq("id", id!);
    setBusy(false);
    if (error) setError(error.message); else router.replace("/sobres");
  }

  const changed = !orig || FIELDS.some((k) => (orig as any)[k] !== (e as any)[k]);
  const monthly = monthlyOf(e);

  return (
    <div className="screen">
      <main className="content" style={{ gap: 16 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/sobres" aria-label="Volver" className="iconbtn" style={{ background: "transparent", marginLeft: -12 }}><Icon name="back" /></Link>
          <h1 style={{ fontSize: "1.25rem" }}>{id ? `Editar ${orig?.name ?? ""}` : shared ? "Nuevo sobre de Casa" : "Nuevo sobre"}</h1>
        </header>
        {shared && <p className="small" style={{ margin: 0 }}>Es de Casa: el cambio lo veréis los dos y cambia lo que aporta cada uno.</p>}

        <EnvelopeFields value={e} onChange={setE} families={families} accounts={accOptions} shared={shared} />

        {!special && e.rule !== "percent" && monthly > 0 && (
          <p className="small" style={{ margin: 0 }}>Unos <strong className="num">{eur(monthly)}</strong> al mes{e.rule === "daily" ? " (con 21 días laborables)" : ""}.</p>
        )}
        {error && <p role="alert" className="error"><Icon name="alert" />{error}</p>}

        {id && !special && (
          confirmArchive ? (
            <div className="alert">
              <strong>¿Archivar {orig?.name}?</strong>
              <span className="small">Deja de repartirse desde el próximo mes. El historial se conserva y lo puedes recuperar.</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="secondary" onClick={() => setConfirmArchive(false)}>No</button>
                <button type="button" className="primary" disabled={busy} onClick={archive}>Sí, archivar</button>
              </div>
            </div>
          ) : (
            <button type="button" className="secondary" onClick={() => setConfirmArchive(true)}>Archivar sobre</button>
          )
        )}
      </main>
      <div className="sticky">
        <button type="button" className="primary" disabled={busy || !valid || !changed} onClick={save}>{busy ? "Guardando…" : id ? "Guardar cambios" : "Crear sobre"}</button>
      </div>
    </div>
  );
}
