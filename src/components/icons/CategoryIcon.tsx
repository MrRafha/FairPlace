import type { ListingCategoryValue } from "@/lib/constants";

// SVGs de linha do design handoff. Feira = barraca com toldo, Artesanato =
// losango, Agricultura = broto. Herdam cor do texto (stroke: currentColor).
export function CategoryIcon({ value, className = "fp-ico" }: { value: ListingCategoryValue; className?: string }) {
  if (value === "CRAFT") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 3l7 9-7 9-7-9zM5 12h14" />
      </svg>
    );
  }
  if (value === "FARM") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 21v-9M12 12c0-4 3-7 8-7 0 5-3 8-8 7zM12 15c0-3-2-5-7-5 0 4 3 6 7 5z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 10l1.5-5h13L20 10M4 10a2.67 2.67 0 005.33 0 2.67 2.67 0 005.34 0A2.67 2.67 0 0020 10M6 13v6h12v-6" />
    </svg>
  );
}

// Sufixo da variação de cor usada em .fp-iconbox-- e .fp-badge--
export function categoryTone(value: ListingCategoryValue): "feira" | "artesanato" | "agricultura" {
  if (value === "CRAFT") return "artesanato";
  if (value === "FARM") return "agricultura";
  return "feira";
}
