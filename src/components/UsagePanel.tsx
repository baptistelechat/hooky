import { CalendarDays } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ParsedUsageLimit } from "../lib/usage";
import { UsageRing } from "./UsageRing";

interface UsagePanelProps {
  limits: ParsedUsageLimit[] | null;
}

/** Icône dédiée pour "weekly_all" (plus parlant qu'un "W" texte) -- les autres kinds
 * gardent leur glyphe texte (`5h`, initiale du modèle) : pas d'icône lucide évidente pour
 * "session" ou un modèle précis sans ajouter une table de correspondance par modèle. */
function glyphFor(limit: ParsedUsageLimit) {
  if (limit.kind === "weekly_all") return <CalendarDays className="size-4" />;
  return limit.glyph;
}

/** Ligne de rings de quotas Claude Code, sans carte/fond -- juste les rings flottant SOUS
 * l'avatar (cf. Avatar.tsx, layout.ts `USAGE_PANEL_HEIGHT`), jamais dans une fenêtre
 * séparée à faire suivre pendant le drag. Le pourcentage précis n'est PAS affiché en
 * permanence (le ring encode déjà couleur + remplissage) -- seulement au survol, via
 * Tooltip (`render={<span/>}` : sans ça `TooltipTrigger` rend un `<button>` par défaut,
 * cf. doc shadcn -- imbriquer le ring, un `div`, dedans est invalide en HTML). */
export function UsagePanel({ limits }: UsagePanelProps) {
  if (limits === null) {
    return (
      <span className="rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10px] text-neutral-600 shadow-sm">
        Chargement…
      </span>
    );
  }

  return (
    <TooltipProvider delay={0}>
      <div className="flex items-center justify-center gap-3">
        {limits.map((limit) => (
          <Tooltip key={limit.key}>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <UsageRing percent={limit.percent} glyph={glyphFor(limit)} />
            </TooltipTrigger>
            <TooltipContent>{limit.percent}%</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
