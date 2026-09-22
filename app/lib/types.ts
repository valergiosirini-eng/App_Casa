export type EnvelopeStatus = {
  allocation_id: string;
  cycle_id: string;
  member_id: string | null;
  period: string;
  status: "distributed" | "closed";
  envelope_id: string;
  name: string;
  family: string;
  color: string;
  tint: string;
  kind: "fixed" | "budget" | "sinking" | "event" | "savings" | "cash" | "contribution" | "free";
  owner_id: string | null;
  account_id: string;
  allocated: number;
  carried_in: number;
  spent: number;
  committed: number;
  available: number;
  moved: number;
};

// Presupuesto vigente del sobre: asignado + arrastrado + traspasos
export const budgetOf = (s: Pick<EnvelopeStatus, "allocated" | "carried_in" | "moved">) =>
  Number(s.allocated) + Number(s.carried_in) + Number(s.moved ?? 0);

export type Cycle = {
  id: string;
  member_id: string | null;
  period: string;
  starts_on: string;
  ends_on: string;
  status: "distributed" | "closed";
  income: number | null;
  credit_in?: number;
};

// Sobres que ya están apartados y no piden atención en el día a día
export const AUTOMATIC_KINDS = ["savings", "contribution", "fixed"];
