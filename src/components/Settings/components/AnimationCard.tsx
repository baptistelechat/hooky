import { createAvatar } from "@bible-strong/avatar-react";
import definition from "@/components/avatar.json";
import type { AnimationMappingEntry } from "@/lib/animationCatalog";

const AvatarPreview = createAvatar(definition);

const PREVIEW_SIZE = 56;

/** Carte de validation : rejoue en boucle l'animation mappée à un event/notification_type,
 * avec son libellé technique et la note de raisonnement issue de docs/EVENTS.md. */
export function AnimationCard({
  label,
  animation,
  note,
}: AnimationMappingEntry) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-3 text-center">
      <AvatarPreview animation={animation} size={PREVIEW_SIZE} />
      <span className="font-mono text-xs font-medium break-all">{label}</span>
      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.7rem] text-primary">
        {animation}
      </span>
      <span className="text-[0.7rem] leading-snug text-muted-foreground">
        {note}
      </span>
    </div>
  );
}
