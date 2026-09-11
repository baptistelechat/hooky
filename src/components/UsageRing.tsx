import type { CSSProperties, ReactNode } from "react";
import { usageColor, usageGlyphColor } from "../lib/usage";

interface UsageRingProps {
  percent: number;
  /** Texte court OU icône (cf. UsagePanel, calendrier pour "weekly_all") -- le ring ne
   * décide pas lui-même de la représentation, juste de son affichage centré. */
  glyph: ReactNode;
  size?: number;
}

const RING_THICKNESS = 4;

/** Anneau de progression en `conic-gradient` CSS pur -- pas de SVG ni de lib de charting
 * (cf. UsagePanel : shadcn n'a qu'un wrapper Recharts pour ça, disproportionné pour 3
 * petits anneaux dans un panneau de 150px). Le "trou" du donut est un second disque
 * centré par-dessus, épaisseur = `RING_THICKNESS`.
 *
 * Couleurs fixes (`bg-white/90` + texte sombre), pas des tokens de thème shadcn
 * (`bg-popover`/`text-foreground`) : contrairement au reste de l'UI, ce panneau flotte
 * SANS fond sur le bureau de l'utilisateur (fenêtre transparente), pas sur une surface
 * themée de l'app -- un token qui vire clair/sombre selon le thème système devient
 * illisible sur un bureau sombre. Même convention que le badge (AnimationOverlay,
 * `bg-white/90`), déjà établie pour cette exacte raison. */
export function UsageRing({ percent, glyph, size = 44 }: UsageRingProps) {
  const color = usageColor(percent);
  const trackStyle: CSSProperties = {
    width: size,
    height: size,
    background: `conic-gradient(${color} ${percent}%, rgba(255,255,255,0.25) 0)`,
  };

  return (
    <div className="relative shrink-0 rounded-full" style={trackStyle}>
      <div
        className="absolute flex items-center justify-center rounded-full bg-white/90 font-mono text-xs shadow-sm"
        style={{ inset: RING_THICKNESS, color: usageGlyphColor(percent) }}
      >
        {glyph}
      </div>
    </div>
  );
}
