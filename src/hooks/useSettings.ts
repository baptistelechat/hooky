import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  type HookySettings,
  readSettings,
  writeSettings,
  SETTINGS_EVENT,
} from "../lib/settings";

/** État settings partagé entre toutes les fenêtres Hooky (pet + settings), même contrat
 * d'écoute Tauri que useHookyState. */
export function useSettings(): [HookySettings, (next: HookySettings) => void] {
  const [settings, setSettings] = useState<HookySettings>(readSettings);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    listen<HookySettings>(SETTINGS_EVENT, (event) => {
      setSettings(event.payload);
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

  const update = (next: HookySettings) => {
    setSettings(next);
    writeSettings(next);
  };

  return [settings, update];
}
