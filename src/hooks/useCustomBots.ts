import {
  CUSTOM_BOTS_EVENT,
  readCustomBots,
  writeCustomBots,
  type CustomBots,
} from "../lib/customBots";
import { useBroadcastState } from "./useBroadcastState";

/** Bots Open Bot Avatar importés, partagés entre toutes les fenêtres Hooky -- même contrat que
 * useCustomAvatars. */
export function useCustomBots(): [CustomBots, (next: CustomBots) => void] {
  const [customBots, setCustomBots] = useBroadcastState(
    CUSTOM_BOTS_EVENT,
    readCustomBots,
  );

  const update = (next: CustomBots) => {
    setCustomBots(next);
    writeCustomBots(next);
  };

  return [customBots, update];
}
