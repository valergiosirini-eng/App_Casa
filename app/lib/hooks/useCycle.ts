"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isoDay } from "@/lib/format";
import type { Cycle, EnvelopeStatus } from "@/lib/types";

type Data = {
  me: { id: string; household_id: string; display_name: string; payday_from: number } | null;
  cycle: Cycle | null;        // mi ciclo abierto más reciente
  shared: Cycle | null;       // ciclo compartido del mismo periodo
  mine: EnvelopeStatus[];
  casa: EnvelopeStatus[];
  pendingTransfers: { id: string; amount: number; account: string }[];
  needsReparto: boolean;      // ya toca repartir y aún no se ha hecho
};

const empty: Data = { me: null, cycle: null, shared: null, mine: [], casa: [], pendingTransfers: [], needsReparto: false };

// Carga todo lo que necesitan Inicio y Apuntar gasto
export function useCycle(userId: string) {
  const [data, setData] = useState<Data>(empty);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: me } = await supabase.from("members").select("id, household_id, display_name, payday_from").eq("id", userId).single();

    const { data: cycles } = await supabase.from("cycles").select("*").eq("member_id", userId)
      .order("period", { ascending: false }).limit(1);
    const cycle = (cycles?.[0] as Cycle | undefined) ?? null;

    let shared: Cycle | null = null;
    if (cycle) {
      const { data: s } = await supabase.from("cycles").select("*").is("member_id", null).eq("period", cycle.period).maybeSingle();
      shared = (s as Cycle) ?? null;
    }

    const ids = [cycle?.id, shared?.id].filter(Boolean) as string[];
    const { data: status } = ids.length
      ? await supabase.from("v_envelope_status").select("*").in("cycle_id", ids)
      : { data: [] as EnvelopeStatus[] };
    const all = ((status ?? []) as EnvelopeStatus[]).map((s) => ({
      ...s, allocated: Number(s.allocated), carried_in: Number(s.carried_in), spent: Number(s.spent),
      committed: Number(s.committed), available: Number(s.available), moved: Number(s.moved ?? 0),
    }));

    let pendingTransfers: Data["pendingTransfers"] = [];
    if (cycle) {
      const { data: t } = await supabase.from("transfers").select("id, amount, done, accounts(name)").eq("cycle_id", cycle.id).eq("done", false);
      pendingTransfers = (t ?? []).map((x: any) => ({ id: x.id, amount: Number(x.amount), account: x.accounts?.name ?? "" }));
    }

    // Toca repartir cuando no hay ciclo o el actual ya terminó (acaba la víspera del cobro)
    const today = isoDay();
    const needsReparto = !cycle || today > cycle.ends_on;

    setData({
      me: me as Data["me"], cycle, shared,
      mine: all.filter((s) => s.cycle_id === cycle?.id),
      casa: all.filter((s) => s.cycle_id === shared?.id),
      pendingTransfers, needsReparto,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Lo compartido se actualiza en vivo cuando la otra persona apunta un gasto
  useEffect(() => {
    const ch = supabase.channel("gastos")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { ...data, loading, reload: load };
}

// Número en el icono del iPhone (Badging API; solo funciona con la app instalada y avisos permitidos)
export async function refreshBadge() {
  try {
    const { data } = await supabase.rpc("my_badge");
    const n = Number(data ?? 0);
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (n > 0) await nav.setAppBadge?.(n);
    else await nav.clearAppBadge?.();
  } catch {
    /* sin soporte o sin permiso: no pasa nada */
  }
}
