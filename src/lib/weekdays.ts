// Dias da semana dos locais de atendimento (0 = domingo … 6 = sábado,
// mesmo padrão do Date#getDay). Compartilhado entre server e client.

export const WEEKDAYS = [
  { value: 0, short: "Dom", label: "Domingo" },
  { value: 1, short: "Seg", label: "Segunda" },
  { value: 2, short: "Ter", label: "Terça" },
  { value: 3, short: "Qua", label: "Quarta" },
  { value: 4, short: "Qui", label: "Quinta" },
  { value: 5, short: "Sex", label: "Sexta" },
  { value: 6, short: "Sáb", label: "Sábado" },
] as const;

export const MAP_TIME_ZONE = "America/Fortaleza"; // Piauí, UTC-3, sem horário de verão

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Dia da semana de hoje no fuso do mapa (0 = domingo … 6 = sábado). */
export function todayWeekday(): number {
  const short = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: MAP_TIME_ZONE }).format(new Date());
  return WEEKDAY_INDEX[short] ?? new Date().getDay();
}

/** Normaliza o campo `weekdays` (no fallback SQLite de dev ele vem como Json). */
export function toWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort();
}

/** "Seg, Qua e Sáb" · "Todos os dias" · "Seg a Sex". */
export function formatWeekdays(days: number[]): string {
  const sorted = toWeekdays(days);
  if (sorted.length === 0) return "Nenhum dia definido";
  if (sorted.length === 7) return "Todos os dias";
  if (sorted.join(",") === "1,2,3,4,5") return "Seg a Sex";
  if (sorted.join(",") === "1,2,3,4,5,6") return "Seg a Sáb";
  const names = sorted.map((day) => WEEKDAYS[day].short);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}
