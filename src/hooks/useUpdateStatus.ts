import {
  readUpdateStatus,
  UPDATE_STATUS_EVENT,
  type UpdateStatus,
} from "../lib/updateStatus";
import { useBroadcastState } from "./useBroadcastState";

/** État "mise à jour disponible" partagé entre toutes les fenêtres Hooky -- même contrat
 * d'écoute Tauri que useSettings/useHookyState (localStorage + event, pas de store
 * Zustand dans ce projet, cf. lib/updateStatus.ts). */
export function useUpdateStatus(): UpdateStatus {
  return useBroadcastState(UPDATE_STATUS_EVENT, readUpdateStatus)[0];
}
