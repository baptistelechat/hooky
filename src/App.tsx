import { getCurrentWindow } from "@tauri-apps/api/window";
import { useHookyState } from "./hooks/useHookyState";
import { PetAvatar } from "./components/Avatar";
import { SettingsPanel } from "./components/Settings";
import "./App.css";

function App() {
  const hooky = useHookyState();

  // Fenêtre "settings" créée dynamiquement (cf. Avatar.tsx) -- même bundle, rendu différent
  // selon le label plutôt qu'un point d'entrée HTML séparé.
  if (getCurrentWindow().label === "settings") {
    return <SettingsPanel />;
  }

  return (
    <PetAvatar
      animation={hooky.animation}
      lastEvent={hooky.lastEvent}
      toolName={hooky.toolName}
    />
  );
}

export default App;
