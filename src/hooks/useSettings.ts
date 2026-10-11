import {
  type HookySettings,
  readSettings,
  writeSettings,
  SETTINGS_EVENT,
} from "../lib/settings";
import { useBroadcastState } from "./useBroadcastState";

/** État settings partagé entre toutes les fenêtres Hooky (pet + settings), même contrat
 * d'écoute Tauri que useHookyState. */
export function useSettings(): [HookySettings, (next: HookySettings) => void] {
  const [settings, setSettings] = useBroadcastState(
    SETTINGS_EVENT,
    readSettings,
  );

  const update = (next: HookySettings) => {
    setSettings(next);
    writeSettings(next);
  };

  return [settings, update];
}
