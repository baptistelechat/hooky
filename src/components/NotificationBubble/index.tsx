import { useEffect, useMemo, useState } from "react";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow, monitorFromPoint } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import notificationSoundUrl from "../../assets/sounds/notification.wav";
import stopSoundUrl from "../../assets/sounds/stop.wav";
import { useHookyState } from "../../hooks/useHookyState";
import { useSettings } from "../../hooks/useSettings";
import { pickNotificationMessage } from "../../lib/notificationMessages";

const DISPLAY_DURATION_MS = 6000;
const GAP_PX = 4;

/**
 * Fenêtre dédiée (label "bubble", statique dans tauri.conf.json) : entièrement
 * autonome, pas pilotée par la fenêtre "main". Écoute le même event Tauri "hooky-state"
 * que le pet (useHookyState) pour choisir un message (Stop/Notification uniquement,
 * cf. pickNotificationMessage), se positionne au-dessus du pet en lisant sa position
 * live via WebviewWindow.getByLabel("main") -- gère le cas où le pet a été dragué --,
 * puis se show()/hide() elle-même. Taille de fenêtre fixe et généreuse (300x90,
 * tauri.conf.json) : pas de mesure de contenu ni de resize dynamique à gérer (les
 * messages restent courts, comme le pool PS1 d'origine) -- le fond transparent en trop
 * est masqué en collant le contenu au bord qui touche le pet (cf. `placement`).
 */
export function NotificationBubble() {
  const { lastEvent, notificationType, revision } = useHookyState();
  const [settings] = useSettings();

  // Objet (pas juste la string) pour que sa référence change à CHAQUE `revision`, même
  // si le pool random retombe deux fois de suite sur la même phrase -- sinon l'effet
  // ci-dessous, qui dépend de ce résultat, ne se redéclencherait pas pour deux
  // notifications identiques consécutives (deux `idle_prompt` de suite, par ex).
  const notification = useMemo(() => {
    const text = pickNotificationMessage(lastEvent, notificationType);
    return text ? { text, revision } : null;
  }, [lastEvent, notificationType, revision]);

  // La fenêtre (300x90) reste plus grande que le contenu réel -- le contenu est collé au
  // bord qui touche le pet (au lieu d'être centré) pour que le fond transparent en trop
  // ne se voie pas comme un espace vide entre la bulle et le pet.
  const [placement, setPlacement] = useState<"above" | "below">("above");

  useEffect(() => {
    if (!settings.notificationsEnabled || !notification) return;

    let cancelled = false;
    void (async () => {
      const mainWindow = await WebviewWindow.getByLabel("main");
      if (!mainWindow) return;

      const self = getCurrentWindow();
      const [mainPos, mainSize, selfSize] = await Promise.all([
        mainWindow.outerPosition(),
        mainWindow.outerSize(),
        self.outerSize(),
      ]);
      if (cancelled) return;

      // Moniteur sous le pet (pas forcément celui de la bulle avant repositionnement) --
      // gère aussi le cas multi-écrans.
      const monitor = await monitorFromPoint(
        mainPos.x + mainSize.width / 2,
        mainPos.y + mainSize.height / 2,
      );
      if (cancelled) return;

      let x = mainPos.x + mainSize.width / 2 - selfSize.width / 2;
      let y = mainPos.y - selfSize.height - GAP_PX;
      let nextPlacement: "above" | "below" = "above";

      if (monitor) {
        const minX = monitor.position.x;
        const maxX = monitor.position.x + monitor.size.width - selfSize.width;
        const minY = monitor.position.y;
        const maxY = monitor.position.y + monitor.size.height - selfSize.height;

        // Pas assez de place au-dessus du pet (proche du bord haut de l'écran) ->
        // affiche la bulle en dessous à la place.
        if (y < minY) {
          y = mainPos.y + mainSize.height + GAP_PX;
          nextPlacement = "below";
        }
        x = Math.min(Math.max(x, minX), maxX);
        y = Math.min(Math.max(y, minY), maxY);
      }

      setPlacement(nextPlacement);
      await self.setPosition(
        new PhysicalPosition(Math.round(x), Math.round(y)),
      );
      await self.show();

      const soundUrl =
        lastEvent === "Stop" ? stopSoundUrl : notificationSoundUrl;
      void new Audio(soundUrl).play().catch(() => {});
    })();

    const timer = setTimeout(() => {
      void getCurrentWindow().hide();
    }, DISPLAY_DURATION_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [notification, lastEvent, settings.notificationsEnabled]);

  return (
    <div
      className={`flex h-full w-full justify-center p-1 ${
        placement === "above" ? "items-end" : "items-start"
      }`}
    >
      <div className="max-w-full rounded-2xl border bg-popover px-4 py-3 text-center text-sm text-popover-foreground shadow-lg">
        {notification?.text}
      </div>
    </div>
  );
}
