import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  type CustomAvatars,
  readCustomAvatars,
  writeCustomAvatars,
  CUSTOM_AVATARS_EVENT,
} from "../lib/customAvatars";

/** Pets custom importés par l'utilisateur, partagés entre toutes les fenêtres Hooky (pet +
 * settings), même contrat d'écoute Tauri que useSettings. */
export function useCustomAvatars(): [
  CustomAvatars,
  (next: CustomAvatars) => void,
] {
  const [customAvatars, setCustomAvatars] =
    useState<CustomAvatars>(readCustomAvatars);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    listen<CustomAvatars>(CUSTOM_AVATARS_EVENT, (event) => {
      setCustomAvatars(event.payload);
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

  const update = (next: CustomAvatars) => {
    setCustomAvatars(next);
    writeCustomAvatars(next);
  };

  return [customAvatars, update];
}
