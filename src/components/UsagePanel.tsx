import { CalendarDays, Clock, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatTimeRemaining, type ParsedUsageLimit } from "../lib/usage";
import { UsageRing } from "./UsageRing";

interface UsagePanelProps {
  limits: ParsedUsageLimit[] | null;
  /** cf. `useClaudeUsage` -- 0 tant qu'aucun échec n'est survenu (chargement initial normal),
   * sinon distingue "en cours" de "bloqué" dans le message affiché. */
  consecutiveFailures: number;
  /** cf. `useClaudeUsage` -- refresh token OAuth mort, `claude auth login` requis. */
  reconnectRequired: boolean;
}

/** Icône dédiée pour "weekly_all" et "session" (plus parlant qu'un "W"/"5h" texte fixe --
 * ce dernier ne changeant jamais, il pouvait laisser croire à une valeur figée plutôt qu'un
 * simple label de catégorie). "weekly_scoped" garde son glyphe texte (initiale du modèle)
 * SAUF exception ciblée pour Fable -- pas de table complète par modèle, ajoutée seulement
 * au cas par cas si demandé pour un autre modèle. */
function glyphFor(limit: ParsedUsageLimit) {
  if (limit.kind === "weekly_all") return <CalendarDays className="size-4" />;
  if (limit.kind === "session") return <Clock className="size-4" />;
  if (limit.modelName?.includes("Fable"))
    return <Sparkles className="size-4" />;
  return limit.glyph;
}

/** Ligne de rings de quotas Claude Code, sans carte/fond -- juste les rings flottant SOUS
 * l'avatar (cf. Avatar.tsx, layout.ts `USAGE_PANEL_HEIGHT`), jamais dans une fenêtre
 * séparée à faire suivre pendant le drag. Le pourcentage précis n'est PAS affiché en
 * permanence (le ring encode déjà couleur + remplissage) -- seulement au survol, via
 * Tooltip (`render={<span/>}` : sans ça `TooltipTrigger` rend un `<button>` par défaut,
 * cf. doc shadcn -- imbriquer le ring, un `div`, dedans est invalide en HTML). */
export function UsagePanel({
  limits,
  consecutiveFailures,
  reconnectRequired,
}: UsagePanelProps) {
  if (limits === null) {
    return (
      <span className="rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10px] text-neutral-600 shadow-sm">
        {reconnectRequired
          ? "Reconnexion requise (claude auth login)"
          : consecutiveFailures > 0
            ? "Quotas indisponibles"
            : "Chargement…"}
      </span>
    );
  }

  return (
    <TooltipProvider delay={0}>
      <div className="flex items-center justify-center gap-3">
        {limits.map((limit) => {
          const remaining = formatTimeRemaining(limit.resetsAt);
          return (
            <Tooltip key={limit.key}>
              <TooltipTrigger render={<span className="inline-flex" />}>
                <UsageRing percent={limit.percent} glyph={glyphFor(limit)} />
              </TooltipTrigger>
              <TooltipContent>
                {limit.percent}%{remaining ? ` (${remaining} restant)` : ""}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
