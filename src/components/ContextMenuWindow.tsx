import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CONTEXT_MENU_PADDING } from "../lib/layout";

/** Contenu de la fenêtre "menu" (cf. lib/contextMenuWindow.ts) : les mêmes entrées que le
 * menu du tray (Paramètres, Quitter), en menu shadcn/ui.
 *
 * Le menu est ouvert d'emblée et ancré sur un déclencheur invisible calé dans le coin
 * (PADDING, PADDING) de la fenêtre -- il s'affiche donc exactement où la fenêtre a été
 * posée. La fenêtre se ferme dès que le menu se ferme (choix d'un item) ou sur clic
 * extérieur / Échap (surveillés côté Rust) : un menu, pas une fenêtre persistante. */
export function ContextMenuWindow() {
  const closedRef = useRef(false);

  const closeWindow = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    getCurrentWindow()
      .close()
      .catch((error: unknown) =>
        console.error("[ContextMenuWindow] close échoué", error),
      );
  }, []);

  // Fermeture au clic extérieur / Échap : surveillée côté Rust (cf. context_menu.rs), pas
  // via le focus -- cette fenêtre n'obtient pas de façon fiable le focus système (le clic
  // droit qui l'a ouverte le rend à "main"), donc `onFocusChanged` ne se déclenchait jamais.
  // Le garde évite un second thread de surveillance si StrictMode double-invoque l'effet.
  // Bloque aussi le menu natif WebView2 (Actualiser / Inspecter...) sur cette fenêtre : un
  // clic droit sur le menu ou sa marge le rouvrait, comme sur la fenêtre "main" (cf.
  // Avatar.tsx `onContextMenu`).
  useEffect(() => {
    const block = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  const watchingRef = useRef(false);
  useEffect(() => {
    if (watchingRef.current) return;
    watchingRef.current = true;
    invoke("watch_menu_dismiss").catch((error: unknown) =>
      console.error("[ContextMenuWindow] watch_menu_dismiss échoué", error),
    );
    // Focus au mieux, pour la navigation clavier du menu (flèches) quand l'OS l'accorde.
    getCurrentWindow()
      .setFocus()
      .catch((error: unknown) =>
        console.error("[ContextMenuWindow] setFocus échoué", error),
      );
  }, []);

  return (
    <DropdownMenu
      defaultOpen
      onOpenChange={(open) => {
        if (!open) closeWindow();
      }}
    >
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <span
            aria-hidden
            className="fixed size-0"
            style={{ left: CONTEXT_MENU_PADDING, top: CONTEXT_MENU_PADDING }}
          />
        }
      />
      {/* `w-40` = CONTEXT_MENU_WIDTH (160px, cf. layout.ts) -- Tailwind ne lit pas la
          constante JS ; les deux doivent rester alignés. */}
      <DropdownMenuContent sideOffset={0} className="w-40">
        <DropdownMenuItem
          onClick={() => {
            emit("hooky-open-settings").catch((error: unknown) =>
              console.error("[ContextMenuWindow] emit échoué", error),
            );
          }}
        >
          <SettingsIcon />
          Paramètres
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            invoke("quit_app").catch((error: unknown) =>
              console.error("[ContextMenuWindow] quit_app échoué", error),
            );
          }}
        >
          <LogOutIcon />
          Quitter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
