import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import { useHookyState } from "./hooks/useHookyState";
import { PetAvatar } from "./components/Avatar";
import { SettingsPanel } from "./components/Settings";
import { NotificationBubble } from "./components/NotificationBubble";

function App() {
  const hooky = useHookyState();

  // Fenêtre "settings" créée dynamiquement (cf. Avatar.tsx) -- même bundle, rendu différent
  // selon le label plutôt qu'un point d'entrée HTML séparé.
  if (getCurrentWindow().label === "settings") {
    return <SettingsPanel />;
  }

  // Fenêtre "bubble" déclarée statiquement (tauri.conf.json) -- même principe de
  // routage par label, entièrement autonome (cf. NotificationBubble).
  if (getCurrentWindow().label === "bubble") {
    return <NotificationBubble />;
  }

  return (
    <PetAvatar
      animation={hooky.animation}
      lastEvent={hooky.lastEvent}
      toolName={hooky.toolName}
      notificationType={hooky.notificationType}
      revision={hooky.revision}
    />
  );
}

export default App;
