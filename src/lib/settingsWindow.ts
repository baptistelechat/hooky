import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

/** Ouvre, refocus ou minimise la fenêtre de settings. Si elle a déjà le focus, un
 * double-clic (Avatar.tsx) la minimise (toggle, comme cliquer une icône de taskbar déjà
 * active) -- sinon `show()`/`unminimize()` avant `setFocus()` la ramène au premier plan :
 * Windows refuse silencieusement de voler le focus à une autre appli avec `setFocus()`
 * seul (anti-focus-stealing), y compris pour ramener une fenêtre déjà ouverte mais passée
 * en arrière-plan ou minimisée.
 *
 * Extraite d'Avatar.tsx (pas une simple fonction locale) : réutilisée par App.tsx (menu
 * tray "Paramètres", cf. lib.rs `on_menu_event` -> event `hooky-open-settings`) sans
 * dupliquer cette logique côté Rust -- vivre dans un module `lib/` plutôt qu'être
 * exportée depuis Avatar.tsx évite aussi de mélanger export de composant et export de
 * fonction dans le même fichier (`react-refresh/only-export-components`). */
export async function openSettingsWindow(): Promise<void> {
  const existing = await WebviewWindow.getByLabel("settings");
  if (existing) {
    if (await existing.isFocused()) {
      await existing.minimize();
      return;
    }
    await existing.show();
    await existing.unminimize();
    await existing.setFocus();
    return;
  }

  new WebviewWindow("settings", {
    title: "Hooky - Paramètres",
    width: 620,
    // Volontairement compacte (agrandir à 712 a été essayé puis annulé) : un nouvel utilisateur
    // n'a pas forcément de pets Codex installés, donc la vue par défaut montre les avatars du
    // repo d'un coup ; la section Pets Codex se rejoint en scrollant.
    height: 512,
    // max/min Width doivent être fournis en paire avec Height pour être pris en compte
    // (quirk de l'API Tauri, cf. LRN-012) -- généreux sur l'axe non contraint.
    maxWidth: 620,
    maxHeight: 1000,
    minWidth: 400,
    minHeight: 512,
    resizable: true,
    decorations: true,
    center: true,
  });
}
