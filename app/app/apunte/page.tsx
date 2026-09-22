"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import Icon from "@/components/Icon";
import { supabase } from "@/lib/supabase";
import { useCycle } from "@/lib/hooks/useCycle";
import { eur } from "@/lib/format";
import { AUTOMATIC_KINDS, type EnvelopeStatus } from "@/lib/types";

export default function Page() {
  return <AuthGate>{(s) => <Apunte userId={s.user.id} />}</AuthGate>;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "del"];

function Apunte({ userId }: { userId: string }) {
  const router = useRouter();
  const d = useCycle(userId);
  const [sel, setSel] = useState<string | null>(null);
  const [s, setS] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sobres donde se gasta en el día a día: los míos (sin los automáticos) y los de casa (sin el colchón)
  const tiles: EnvelopeStatus[] = useMemo(() => [
    ...d.mine.filter((x) => !AUTOMATIC_KINDS.includes(x.kind)),
    ...d.casa.filter((x) => x.name !== "Colchón"),
  ], [d.mine, d.casa]);

  // Sugerencia: por la mañana, desayunos
  const suggested = useMemo(() => {
    const morning = new Date().getHours() < 11;
    return (morning && tiles.find((t) => /desayun/i.test(t.name))) || tiles[0];
  }, [tiles]);
  const current = tiles.find((t) => t.envelope_id === sel) ?? suggested;

  if (d.loading) return <main className="center muted">Cargando…</main>;
  if (!d.cycle) return <main className="content"><p>Primero hay que repartir la nómina.</p><Link className="primary" href="/reparto">Repartir</Link></main>;

  const n = parseFloat((s || "0").replace(",", ".")) || 0;
  const after = current ? current.available - n : 0;

  function press(k: string) {
    setS((v) => {
      if (k === "del") return v.slice(0, -1);
      if (k === ",") return v.includes(",") ? v : (v || "0") + ",";
      if (v.includes(",") && v.split(",")[1].length >= 2) return v;
      if (v.length >= 7) return v;
      return (v === "0" ? "" : v) + k;
    });
  }

  async function save() {
    if (!current || n <= 0 || !d.me) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.from("transactions")
      .insert({ household_id: d.me.household_id, member_id: userId, envelope_id: current.envelope_id, amount: n, note: note.trim() || null })
      .select("id").single();
    setBusy(false);
    if (error || !data) { setError("No se ha podido guardar. Prueba otra vez."); return; }
    router.replace(`/guardado?id=${data.id}`);
  }

  return (
    <div className="screen">
      <main className="content" style={{ gap: 14 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" aria-label="Cancelar" className="iconbtn" style={{ background: "transparent", marginLeft: -12 }}><Icon name="back" /></Link>
          <h1 style={{ fontSize: "1.25rem" }}>Nuevo gasto</h1>
        </header>

        <section aria-labelledby="q1" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 id="q1" style={{ fontSize: "1.0625rem" }}>1. ¿De qué color es?</h2>
          <div className="tiles">
            {tiles.map((t) => {
              const on = t.envelope_id === current?.envelope_id;
              return (
                <button key={t.envelope_id} type="button" className="tile" aria-pressed={on} onClick={() => setSel(t.envelope_id)}
                  style={{ background: t.tint, borderColor: on ? t.color : "transparent" }}>
                  <Icon name={t.family} color={t.color} size={22} />
                  <span><span className="t1">{t.name}{t.owner_id === null ? " (casa)" : ""}</span><span className="t2 num">quedan {eur(t.available)}</span></span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="q2" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 id="q2" style={{ fontSize: "1.0625rem" }}>2. ¿Cuánto?</h2>
          <div aria-live="polite" style={{ padding: "10px 16px", borderRadius: 16, background: current?.tint }}>
            <div className="num" style={{ fontSize: "2.75rem", fontWeight: 700, lineHeight: 1.1 }}>{s || "0"} €</div>
            {current && (
              <div style={{ fontWeight: 700, color: after >= 0 ? current.color : "var(--ink)" }}>
                {after >= 0 ? `${current.name} quedará en ${eur(after)}` : `Te pasas ${eur(-after)}: saldrá del Libre`}
              </div>
            )}
          </div>
          <div className="keypad">
            {KEYS.map((k) => (
              <button key={k} type="button" className="key" onClick={() => press(k)} aria-label={k === "del" ? "Borrar" : k === "," ? "Coma decimal" : k}>
                {k === "del" ? "⌫" : k}
              </button>
            ))}
          </div>
          <div className="input plain" style={{ minHeight: 48, borderWidth: 1, borderColor: "var(--line-2)" }}>
            <input aria-label="Nota (opcional)" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </section>
        {error && <p role="alert" className="error"><Icon name="alert" />{error}</p>}
      </main>
      <div className="sticky">
        <button className="primary" type="button" onClick={save} disabled={busy || n <= 0 || !current}>
          {busy ? "Guardando…" : `Guardar ${eur(n)}${current ? ` en ${current.name}` : ""}`}
        </button>
      </div>
    </div>
  );
}
