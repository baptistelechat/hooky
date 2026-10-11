import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

/** État partagé entre toutes les fenêtres Hooky (pet + settings, webviews séparées) : valeur
 * initiale lue en local (`read`), puis resynchronisée sur chaque event Tauri `event` émis par
 * la fenêtre qui écrit. Le setter renvoyé ne fait que mettre à jour l'état local -- persister
 * et diffuser restent à la charge de l'appelant (cf. writeSettings, writeCustomAvatars...). */
export function useBroadcastState<T>(
  event: string,
  read: () => T,
): [T, (next: T) => void] {
  const [state, setState] = useState<T>(read);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    listen<T>(event, (e) => {
      setState(e.payload);
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
  }, [event]);

  return [state, setState];
}
