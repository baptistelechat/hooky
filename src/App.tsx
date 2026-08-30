import { getCurrentWindow } from "@tauri-apps/api/window";
import { lazy, Suspense } from "react";
import "./App.css";
import { useHookyState } from "./hooks/useHookyState";

// Chargement paresseux PAR FENÊTRE (label) -- "main"/"settings"/"bubble" partagent le même
// bundle Vite (un seul point d'entrée `index.html`, cf. vite.config.ts), donc un import
// statique de ces trois composants chargerait la totalité du code de CHACUN dans CHAQUE
// fenêtre, même celles qui n'en ont pas besoin. Concrètement : la fenêtre "bubble", spawnée
// à chaque notification, entraînait avec elle tout `SettingsPanel` (AvatarPicker,
// AnimationValidation, shadcn/ui...) et tout le moteur d'animation SVG de `PetAvatar` --
// juste pour afficher une bulle de texte. `React.lazy` fait que chaque fenêtre ne charge
// (et n'exécute) QUE le module du composant qu'elle va réellement monter, réduisant
// d'autant la latence perçue au spawn d'une nouvelle fenêtre "bubble".
const PetAvatar = lazy(() =>
  import("./components/Avatar").then((m) => ({ default: m.PetAvatar })),
);
const NotificationBubbleWindow = lazy(() =>
  import("./components/NotificationBubbleWindow").then((m) => ({
    default: m.NotificationBubbleWindow,
  })),
);
const SettingsPanel = lazy(() =>
  import("./components/Settings").then((m) => ({
    default: m.SettingsPanel,
  })),
);

function App() {
  const hooky = useHookyState();
  const label = getCurrentWindow().label;

  // Fenêtres "settings"/"bubble" créées dynamiquement (cf. Avatar.tsx/useBubbleWindow) --
  // même bundle, rendu différent selon le label plutôt qu'un point d'entrée HTML séparé.
  if (label === "settings") {
    return (
      <Suspense fallback={null}>
        <SettingsPanel />
      </Suspense>
    );
  }

  if (label === "bubble") {
    return (
      <Suspense fallback={null}>
        <NotificationBubbleWindow />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <PetAvatar
        animation={hooky.animation}
        lastEvent={hooky.lastEvent}
        toolName={hooky.toolName}
        notificationType={hooky.notificationType}
        revision={hooky.revision}
      />
    </Suspense>
  );
}

export default App;
