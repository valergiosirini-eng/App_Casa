"use client";
import Link from "next/link";
import { FamilyBox } from "./Icon";
import { eur, pct } from "@/lib/format";
import { budgetOf, type EnvelopeStatus } from "@/lib/types";

// Presupuesto vs real por sobre: lo previsto, lo gastado y lo que queda
export default function BudgetList({ rows, pace }: { rows: EnvelopeStatus[]; pace?: number }) {
  const total = rows.reduce((a, s) => a + budgetOf(s), 0);
  const spent = rows.reduce((a, s) => a + s.spent, 0);
  const left = rows.reduce((a, s) => a + s.available, 0);

  return (
    <div>
      {rows.map((s) => {
        const b = budgetOf(s);
        const over = s.available < 0;
        const ahead = pace !== undefined && b > 0 && s.spent / b > pace + 0.15 && !over;
        return (
          <div className="row" key={s.allocation_id}>
            <FamilyBox family={s.family} color={s.color} tint={s.tint} />
            <div className="grow">
              <div className="top"><span className="name">{s.name}</span><span className="amt num">{eur(s.available)}</span></div>
              <div className="bar"><span style={{ width: pct(s.spent, b), background: over ? "var(--ink)" : s.color }} /></div>
              <span className="small num">
                {eur(s.spent)} gastado de {eur(b)}
                {s.moved !== 0 ? ` · ${s.moved > 0 ? "+" : ""}${eur(s.moved)} traspasado` : ""}
                {s.committed > 0 ? ` · ${eur(s.committed)} reservado` : ""}
              </span>
              {over && (
                <Link href={`/compensar?e=${s.envelope_id}`} className="small" style={{ color: "var(--ink)", fontWeight: 700 }}>
                  Te has pasado {eur(-s.available)} → compensar
                </Link>
              )}
              {ahead && <span className="small">Vas más rápido que el mes: llevas el {Math.round((s.spent / b) * 100)} % y ha pasado el {Math.round(pace! * 100)} %</span>}
            </div>
          </div>
        );
      })}
      <table className="tbl" style={{ marginTop: 8 }}>
        <thead><tr><th>Total</th><th>Previsto</th><th>Gastado</th><th>Queda</th></tr></thead>
        <tbody><tr className="total"><td></td><td>{eur(total)}</td><td>{eur(spent)}</td><td>{eur(left)}</td></tr></tbody>
      </table>
    </div>
  );
}
