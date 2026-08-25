import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { endPreviewSession } from "@/lib/eventTrigger";
import { EventAnimationGrid } from "./EventAnimationGrid";
import { NotificationAnimationGrid } from "./NotificationAnimationGrid";

/** Grille de validation visuelle : chaque hook/notification_type Claude Code rejoue en
 * boucle l'animation qui lui est mappée (docs/EVENTS.md), pour confronter le mapping
 * décidé par sémantique au rendu réel du moteur. Une seule carte surlignée à la fois --
 * celle dont le `label` (identifiant unique) correspond au dernier clic, pas toutes les
 * cartes qui partagent la même animation (essayé, rejeté : trop de cartes s'allumaient
 * ensemble sans que ce soit clair pourquoi). État purement local, pas l'agrégat live
 * (`useHookyState`) : il mélange les vraies sessions Claude Code actives avec le clic. */
export function AnimationValidation() {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  useEffect(() => {
    // Quitter l'onglet ne doit pas laisser une preview polluer l'état agrégé du pet.
    return () => void endPreviewSession();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Hooks Claude Code</h2>
        <EventAnimationGrid
          selectedLabel={selectedLabel}
          onSelect={setSelectedLabel}
        />
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Notifications</h2>
        <NotificationAnimationGrid
          selectedLabel={selectedLabel}
          onSelect={setSelectedLabel}
        />
      </section>
    </div>
  );
}
