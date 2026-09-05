import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  readUpdateStatus,
  UPDATE_STATUS_EVENT,
  type UpdateStatus,
} from "../lib/updateStatus";

/** État "mise à jour disponible" partagé entre toutes les fenêtres Hooky -- même contrat
 * d'écoute Tauri que useSettings/useHookyState (localStorage + event, pas de store
 * Zustand dans ce projet, cf. lib/updateStatus.ts). */
export function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>(readUpdateStatus);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    listen<UpdateStatus>(UPDATE_STATUS_EVENT, (event) => {
      setStatus(event.payload);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return status;
}
