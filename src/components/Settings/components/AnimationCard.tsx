import { useEffect, useRef, useState } from "react";
import {
  AvatarEngine as AvatarPreview,
  avatarFitScale,
} from "@/components/avatarDefinition";
import type { AnimationMappingEntry } from "@/lib/animationCatalog";
import { AnimationOverlay } from "@/components/AnimationOverlay";
import { useAnimationEffects } from "@/hooks/useAnimationEffects";
import { triggerPreview } from "@/lib/eventTrigger";

const PREVIEW_SIZE = 56;
// Les effets ponctuels (confettis, bounce, shake) ne se rejouent que sur un changement
// de `revision` (cf. useWaapi) -- ici il n'y a pas de hook réel pour les déclencher, donc
// un tick périodique en tient lieu pour que la carte reste une vraie preview "en boucle"
// plutôt qu'un effet joué une seule fois au montage.
const REPLAY_INTERVAL_MS = 2500;

interface AnimationCardProps {
  entry: AnimationMappingEntry;
  /** Vrai si `selectedLabel` (état local du parent, cf. AnimationValidation) est le
   * `label` de cette entrée -- une seule carte surlignée à la fois, celle du dernier
   * clic. Volontairement pas basé sur l'agrégat live (useHookyState) : il mélange les
   * vraies sessions Claude Code actives avec le clic de test. */
  isLive: boolean;
  onSelect: (label: string) => void;
}

/** Carte de validation : rejoue en boucle l'animation mappée à un event/notification_type,
 * avec son libellé technique et la note de raisonnement issue de docs/EVENTS.md. Les
 * effets visuels (AnimationOverlay + useAnimationEffects) sont toujours actifs ici,
 * indépendamment du réglage "Effets visuels" -- cette grille sert justement à les valider.
 * Cliquer envoie l'event réel au backend local (même route que les hooks Claude Code) pour
 * voir aussi le vrai pet réagir, et surligne localement cette seule carte (cf. onSelect). */
export function AnimationCard({ entry, isLive, onSelect }: AnimationCardProps) {
  const { label, animation, note, icon: Icon } = entry;
  const containerRef = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setRevision((r) => r + 1), REPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useAnimationEffects(containerRef, animation, revision, true);

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(label);
        void triggerPreview(entry);
      }}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
        isLive
          ? "border-primary bg-primary/10"
          : "border-border bg-muted/30 hover:bg-muted/60"
      }`}
    >
      <div
        ref={containerRef}
        className="relative"
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
      >
        <AvatarPreview
          animation={animation}
          size={PREVIEW_SIZE}
          style={
            avatarFitScale < 1
              ? {
                  transform: `scale(${avatarFitScale})`,
                  transformOrigin: "center",
                }
              : undefined
          }
        />
        <AnimationOverlay
          animation={animation}
          revision={revision}
          enabled
          avatarSize={PREVIEW_SIZE}
          icon={entry.icon}
        />
      </div>
      <span className="font-mono text-xs font-medium break-all">{label}</span>
      <span className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[0.7rem] text-primary">
        {Icon && <Icon className="size-3 shrink-0" />}
        {animation}
      </span>
      <span className="text-[0.7rem] leading-snug text-muted-foreground">
        {note}
      </span>
    </button>
  );
}
