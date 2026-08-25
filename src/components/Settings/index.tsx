import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsControls } from "./components/SettingsControls";
import { AnimationValidation } from "./components/AnimationValidation";

type View = "settings" | "animation";

/** Fenêtre de settings (window label "settings", cf. Avatar.tsx). Bascule entre les
 * réglages persistés et la grille de validation visuelle du mapping hook -> animation. */
export function SettingsPanel() {
  const [view, setView] = useState<View>("settings");

  return (
    <div className="flex h-screen flex-col gap-4 bg-background p-6 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-base font-semibold">
          <Settings2 className="size-4" />
          Paramètres
        </h1>
        <div className="flex gap-1">
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

      {view === "settings" ? <SettingsControls /> : <AnimationValidation />}
    </div>
  );
}
