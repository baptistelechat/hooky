import {
  type CustomDots,
  readCustomDots,
  writeCustomDots,
  CUSTOM_DOTS_EVENT,
} from "../lib/customDots";
import { useBroadcastState } from "./useBroadcastState";

/** Personnages Dots Lab importés par l'utilisateur (index seulement, cf. lib/customDots.ts),
 * partagés entre toutes les fenêtres Hooky -- même contrat que useCustomAvatars. */
export function useCustomDots(): [CustomDots, (next: CustomDots) => void] {
  const [customDots, setCustomDots] = useBroadcastState(
    CUSTOM_DOTS_EVENT,
    readCustomDots,
  );

  const update = (next: CustomDots) => {
    setCustomDots(next);
    writeCustomDots(next);
  };

  return [customDots, update];
}
