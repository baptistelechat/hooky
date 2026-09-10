interface UsageLimit {
  kind: string;
  percent: number;
  scope?: { model?: { display_name?: string | null } | null } | null;
  /** Hypothèse de nom de champ (snake_case, cohérent avec `kind`/`percent`/`scope`) --
   * jamais confirmé contre un payload réel (pas de token dispo depuis cet environnement).
   * À vérifier en usage réel : si le "restant" n'apparaît jamais dans le tooltip, c'est que
   * l'API utilise un autre nom -- `resetsAt` reste `null` par simple absence de champ, pas
   * de crash, cf. parseUsage. */
  resets_at?: string | null;
}

export interface ParsedUsageLimit {
  key: string;
  /** "session" / "weekly_all" / "weekly_scoped" -- exposé pour que UsagePanel choisisse une
   * icône dédiée (calendrier pour "weekly_all", cf. UsagePanel) plutôt que le glyphe texte
   * par défaut. */
  kind: string;
  /** Glyphe texte affiché AU CENTRE du ring à défaut d'icône dédiée pour ce `kind` (cf.
   * UsageRing) -- pas de lib d'icônes pour un ou deux caractères, la couleur du ring porte
   * déjà la sévérité. */
  glyph: string;
  percent: number;
  /** Nom complet du modèle scopé ("weekly_scoped" uniquement), exposé en plus de `glyph`
   * (son initiale) pour qu'UsagePanel puisse cibler une icône dédiée par nom exact (ex.
   * Fable) sans construire une table de correspondance pour tous les modèles. */
  modelName: string | null;
  /** Date de reset de cette limite si l'API l'expose, sinon `null` (cf. UsageLimit.resets_at)
   * -- UsagePanel n'affiche le "restant" dans le tooltip que si non-null. */
  resetsAt: Date | null;
}

function glyphFor(limit: UsageLimit, index: number): string {
  switch (limit.kind) {
    case "session":
      return "5h";
    case "weekly_all":
      return "W";
    case "weekly_scoped": {
      const model = limit.scope?.model?.display_name;
      return model ? model.slice(0, 1).toUpperCase() : "M";
    }
    default:
      return String(index + 1);
  }
}

/** Réponse brute de `GET https://api.anthropic.com/api/oauth/usage` (cf. spawn_usage_poller,
 * src-tauri/src/lib.rs) -- seul `limits` est utilisé, structure documentée par
 * github.com/Ulrichfr/Claude-Marge-Widget et vérifiée en appel réel. `null` = pas encore de
 * donnée ou payload d'erreur (`{"error": ...}`, sans `limits`) -- un seul état "pas de
 * donnée" pour les deux cas, pas de branche d'erreur dédiée à maintenir en double.
 */
export function parseUsage(data: unknown): ParsedUsageLimit[] | null {
  const limits = (data as { limits?: UsageLimit[] } | null)?.limits;
  if (!Array.isArray(limits) || limits.length === 0) return null;
  return limits.map((limit, index) => ({
    key: `${limit.kind}-${index}`,
    kind: limit.kind,
    glyph: glyphFor(limit, index),
    percent: Math.round(limit.percent),
    resetsAt: limit.resets_at ? new Date(limit.resets_at) : null,
    modelName: limit.scope?.model?.display_name ?? null,
  }));
}

/** Durée avant reset, formatée pour tenir dans un tooltip -- jours+heures au-delà de 24h
 * (weekly_all/weekly_scoped, jusqu'à 7 jours), heures+minutes en-dessous (session, max 5h).
 * `null` si pas de date connue ou déjà passée (poller pas encore rattrapé le nouveau cycle). */
export function formatTimeRemaining(resetsAt: Date | null): string | null {
  if (!resetsAt) return null;
  const totalMinutes = Math.round((resetsAt.getTime() - Date.now()) / 60_000);
  if (totalMinutes <= 0) return null;

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}j ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

/** Vert < 50% / jaune 50-69% / orange 69-89% / rouge >= 89% -- seuil jaune ajusté depuis
 * l'échelle initiale de Claude-Marge-Widget (35%, référence donnée par Baptiste), jugée
 * trop précoce à l'usage. Couleurs en dur (pas de token sémantique shadcn) : cette teinte
 * est dérivée d'une valeur runtime, pas d'un variant de composant -- même logique déjà en
 * place pour CONFETTI_COLORS (AnimationOverlay.tsx). */
export function usageColor(percent: number): string {
  if (percent >= 89) return "#ef4444";
  if (percent >= 69) return "#f97316";
  if (percent >= 50) return "#eab308";
  return "#22c55e";
}

/** Même échelle que `usageColor`, teintes -700 (au lieu de -500) -- le glyphe (texte 10px
 * ou icône) sur fond `bg-white/90` (cf. UsageRing) a besoin de bien plus de contraste que
 * l'arc du ring, surtout le jaune (#eab308 illisible en petit texte, #a16207 correct). Le
 * ring lui-même garde ses couleurs vives (`usageColor`), inchangées. */
export function usageGlyphColor(percent: number): string {
  if (percent >= 89) return "#b91c1c";
  if (percent >= 69) return "#c2410c";
  if (percent >= 50) return "#a16207";
  return "#15803d";
}
