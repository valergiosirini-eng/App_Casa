export const num = (v: unknown) => Number(v ?? 0);

export const eur = (v: unknown) => {
  const n = num(v);
  return (
    n.toLocaleString("es-ES", {
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
};

export const pct = (a: unknown, b: unknown) => {
  const total = num(b);
  if (total <= 0) return "0%";
  return Math.max(0, Math.min(100, Math.round((num(a) / total) * 100))) + "%";
};

// Fecha local (Europa/Madrid en el móvil) en formato AAAA-MM-DD
export const isoDay = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

// Mes que financia una nómina (misma regla que period_for en la base de datos)
export const periodFor = (day: string) => {
  const d = new Date(day + "T12:00:00");
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export const daysLeft = (endsOn: string, today = isoDay()) => {
  const a = new Date(today + "T12:00:00").getTime();
  const b = new Date(endsOn + "T12:00:00").getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
};

export const monthName = (period: string) =>
  new Date(period + "T12:00:00").toLocaleDateString("es-ES", { month: "long" }).replace(/^./, (c) => c.toUpperCase());
