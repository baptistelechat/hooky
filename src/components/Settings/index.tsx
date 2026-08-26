import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
            onClick={() => setView("settings")}
          >
            Réglages
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
