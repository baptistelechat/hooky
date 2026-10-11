import {
  type CustomAvatars,
  readCustomAvatars,
  writeCustomAvatars,
  CUSTOM_AVATARS_EVENT,
} from "../lib/customAvatars";
import { useBroadcastState } from "./useBroadcastState";

/** Pets custom importés par l'utilisateur, partagés entre toutes les fenêtres Hooky (pet +
 * settings), même contrat d'écoute Tauri que useSettings. */
export function useCustomAvatars(): [
  CustomAvatars,
  (next: CustomAvatars) => void,
] {
  const [customAvatars, setCustomAvatars] = useBroadcastState(
    CUSTOM_AVATARS_EVENT,
    readCustomAvatars,
  );

  const update = (next: CustomAvatars) => {
    setCustomAvatars(next);
    writeCustomAvatars(next);
  };

  return [customAvatars, update];
}
