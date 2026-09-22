"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import Compensar from "@/components/Compensar";
import Icon from "@/components/Icon";
import { useCycle } from "@/lib/hooks/useCycle";

export default function Page() {
  return <AuthGate>{(s) => <Suspense><Pantalla userId={s.user.id} /></Suspense>}</AuthGate>;
}

function Pantalla({ userId }: { userId: string }) {
  const id = useSearchParams().get("e");
  const d = useCycle(userId);
  const s = [...d.mine, ...d.casa].find((x) => x.envelope_id === id);
  return (
    <main className="screen">
      <div className="content">
        <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/" aria-label="Volver" className="iconbtn" style={{ background: "transparent", marginLeft: -12 }}><Icon name="back" /></Link>
          <h1 style={{ fontSize: "1.25rem" }}>Compensar</h1>
        </header>
        {d.loading ? <p className="muted">Cargando…</p> : !s ? <p className="muted">No encuentro ese sobre.</p> : s.available >= 0 ? (
          <>
            <p><strong>{s.name}</strong> ya está cubierto. Te quedan {s.available.toFixed(2).replace(".", ",")} €.</p>
            <Link className="primary" href="/">Volver al inicio</Link>
          </>
        ) : (
          <Compensar envelopeId={s.envelope_id} name={s.name} deficit={-s.available} onDone={() => d.reload()} />
        )}
      </div>
    </main>
  );
}
