import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpdateStatus } from "@/hooks/useUpdateStatus";
import { SettingsControls } from "./components/SettingsControls";
import { AnimationValidation } from "./components/AnimationValidation";
import { AvatarPicker } from "./components/AvatarPicker";

type View = "avatar" | "settings" | "animation";

/** Fenêtre de settings (window label "settings", cf. Avatar.tsx). Bascule entre le choix
 * d'avatar, les réglages persistés et la grille de validation visuelle du mapping
 * hook -> animation. "Avatar" en premier (et onglet par défaut) : c'est le choix
 * "identité" le plus ludique ; "Animation" en dernier, outil de validation dev plutôt
 * que réglage pour un utilisateur final. */
export function SettingsPanel() {
  const [view, setView] = useState<View>("avatar");
  // Discoverabilité : signale une mise à jour disponible même quand on n'est pas sur
  // l'onglet "Réglages" (où vit le bouton "Vérifier les mises à jour", cf.
  // MaintenanceField) -- point persistant, ne s'efface pas seul (cf. lib/updateStatus.ts).
  const update = useUpdateStatus();

  return (
    <div className="flex h-screen flex-col gap-4 bg-background p-6 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-base font-semibold">
          <Settings2 className="size-4" />
          Paramètres
        </h1>
        <div className="flex gap-1">
          <Button
            variant={view === "avatar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("avatar")}
          >
            Avatar
          </Button>
          <Button
            variant={view === "settings" ? "default" : "ghost"}
            size="sm"
            className="relative"
            onClick={() => setView("settings")}
          >
            Réglages
            {update.updateAvailable && (
              <span
                aria-label="Mise à jour disponible"
                className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive"
              />
            )}
          </Button>
          <Button
            variant={view === "animation" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("animation")}
          >
            Animation
          </Button>
        </div>
      </div>

      {view === "avatar" && <AvatarPicker />}
      {view === "settings" && <SettingsControls />}
      {view === "animation" && <AnimationValidation />}
    </div>
  );
}
