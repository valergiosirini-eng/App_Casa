// Textos, opciones y ejemplos para configurar sobres. Los ejemplos son solo sugerencias:
// al elegirlos se guardan como datos normales y se pueden cambiar o borrar.
import { eur } from "./format";

export type Kind = "fixed" | "budget" | "sinking" | "event" | "savings" | "cash" | "contribution" | "free";
export type Rule = "fixed" | "percent" | "daily" | "shared_split" | "remainder";
export type Rollover = "reset" | "keep" | "to_hucha" | "credit";
export type Role = "spending" | "savings" | "hucha" | "shared" | "cash" | "other";

export type Family = { key: string; name: string; color: string; tint: string };

export type EnvelopeDraft = {
  id?: string;
  name: string;
  family: string;
  kind: Kind;
  rule: Rule;
  amount: number | null;
  period_months: number;
  percent: number | null;
  daily_rate: number | null;
  flexible: boolean;
  rollover: Rollover;
  account_id?: string | null;   // en la edición
  account_key?: string | null;  // en el asistente (cuentas aún sin crear)
  owner_id?: string | null;
  priority?: number;
  active?: boolean;
};

export type AccountDraft = { key: string; id?: string; name: string; bank: string; role: Role; is_main: boolean; active?: boolean };

// Tipos de sobre en lenguaje llano (contribution y free no se eligen: los crea la app)
export const KINDS: { key: Kind; label: string; help: string }[] = [
  { key: "budget", label: "Gasto del día a día", help: "Se va gastando poco a poco: comida fuera, cafés, transporte…" },
  { key: "fixed", label: "Cuota fija", help: "Sale siempre lo mismo: gimnasio, móvil, suscripciones…" },
  { key: "savings", label: "Ahorro", help: "Se aparta nada más cobrar y no se toca." },
  { key: "sinking", label: "Ir guardando para algo", help: "Se acumula mes a mes: regalos, arreglos, un viaje…" },
  { key: "event", label: "Planes y eventos", help: "Conciertos, entradas, cenas especiales. Lo que no gastes se queda." },
  { key: "cash", label: "Efectivo", help: "Dinero en mano. Al cerrar el mes se cuenta lo que queda." },
];

export const ROLLOVERS: { key: Rollover; label: string; help: string; sharedOnly?: boolean }[] = [
  { key: "to_hucha", label: "A la hucha", help: "Lo que sobre va a la hucha" },
  { key: "keep", label: "Se queda", help: "Lo que sobre se suma al mes siguiente" },
  { key: "reset", label: "Se pierde", help: "Cada mes empieza de cero" },
  { key: "credit", label: "Descuenta", help: "Lo que sobre reduce lo que ponéis el mes siguiente", sharedOnly: true },
];

export const ROLES: { key: Role; label: string }[] = [
  { key: "spending", label: "Para gastar" },
  { key: "savings", label: "Ahorro" },
  { key: "hucha", label: "Hucha" },
  { key: "cash", label: "Efectivo" },
  { key: "other", label: "Otra" },
];

export const defaultRollover = (k: Kind): Rollover =>
  k === "budget" ? "to_hucha" : k === "sinking" || k === "event" || k === "cash" ? "keep" : "reset";

// Importe mensual orientativo de un sobre (21 días laborables)
export function monthlyOf(e: Pick<EnvelopeDraft, "rule" | "amount" | "period_months" | "percent" | "daily_rate">, base = 0, workdays = 21) {
  if (e.rule === "fixed") return Number(e.amount ?? 0) / Math.max(1, e.period_months || 1);
  if (e.rule === "daily") return Number(e.daily_rate ?? 0) * workdays;
  if (e.rule === "percent") return (base * Number(e.percent ?? 0)) / 100;
  return 0;
}

export function ruleText(e: EnvelopeDraft & { kind: Kind }, shared = false) {
  const base =
    e.rule === "fixed" ? (e.period_months > 1 ? `${eur(Number(e.amount))} cada ${e.period_months} meses` : `${eur(Number(e.amount))} al mes`)
    : e.rule === "percent" ? `${Number(e.percent)} % ${shared ? "de lo compartido" : "de la nómina"}`
    : e.rule === "daily" ? `${eur(Number(e.daily_rate))} por día laborable`
    : e.rule === "shared_split" ? "Tu parte de lo compartido"
    : "Lo que queda al final";
  const roll = e.kind === "free" || e.kind === "contribution" ? "" : ({ reset: "", keep: " · se acumula", to_hucha: " · sobrante a la hucha", credit: " · sobrante descuenta" } as const)[e.rollover];
  return base + (e.flexible ? " · recortable" : "") + roll;
}

const ex = (name: string, family: string, kind: Kind, over: Partial<EnvelopeDraft> = {}): EnvelopeDraft => ({
  name, family, kind, rule: "fixed", amount: null, period_months: 1, percent: null, daily_rate: null,
  flexible: kind === "budget" || kind === "event", rollover: defaultRollover(kind), ...over,
});

// Ejemplos del asistente, agrupados por color. Ninguno viene marcado.
export const EXAMPLES: { group: string; items: EnvelopeDraft[] }[] = [
  { group: "Ahorro", items: [
    ex("Ahorro", "ahorro", "savings", { amount: 150, flexible: false }),
  ] },
  { group: "Comer y beber", items: [
    ex("Súper personal", "comer", "budget", { amount: 60 }),
    ex("Restaurantes", "comer", "budget", { amount: 120 }),
    ex("Cafés y desayunos", "comer", "budget", { rule: "daily", daily_rate: 2.5, flexible: false }),
    ex("Comida del trabajo", "comer", "budget", { rule: "daily", daily_rate: 6, flexible: false }),
  ] },
  { group: "Deporte y salud", items: [
    ex("Gimnasio", "deporte", "fixed", { amount: 40 }),
    ex("Clases (yoga, pilates…)", "deporte", "fixed", { amount: 50 }),
    ex("Farmacia y salud", "deporte", "budget", { amount: 25, flexible: false, rollover: "keep" }),
  ] },
  { group: "Personal", items: [
    ex("Transporte", "personal", "budget", { amount: 40, flexible: false }),
    ex("Móvil", "personal", "fixed", { amount: 15 }),
    ex("Suscripciones", "personal", "fixed", { amount: 20 }),
    ex("Ropa", "personal", "budget", { amount: 50 }),
    ex("Peluquería y cuidado", "personal", "sinking", { amount: 30, flexible: false }),
    ex("Formación", "personal", "fixed", { amount: 30 }),
  ] },
  { group: "Ocio y planes", items: [
    ex("Planes y salidas", "ocio", "budget", { amount: 80 }),
    ex("Conciertos y eventos", "ocio", "event", { amount: 40 }),
    ex("Viajes", "ocio", "sinking", { amount: 50, flexible: false }),
    ex("Regalos", "ocio", "sinking", { amount: 25, flexible: false }),
  ] },
  { group: "Efectivo", items: [
    ex("Efectivo", "efectivo", "cash", { amount: 80, flexible: false }),
  ] },
];

export const GOAL_EXAMPLES = [
  { name: "Viajes", target: 600 },
  { name: "Navidad", target: 300 },
  { name: "Emergencia", target: 1000 },
];

export const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
