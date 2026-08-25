import { Separator } from "@/components/ui/separator";
import { EventAnimationGrid } from "./EventAnimationGrid";
import { NotificationAnimationGrid } from "./NotificationAnimationGrid";

/** Grille de validation visuelle : chaque hook/notification_type Claude Code rejoue en
 * boucle l'animation qui lui est mappée (docs/EVENTS.md), pour confronter le mapping
 * décidé par sémantique au rendu réel du moteur. */
export function AnimationValidation() {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Hooks Claude Code</h2>
        <EventAnimationGrid />
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <NotificationAnimationGrid />
      </section>
    </div>
  );
}
