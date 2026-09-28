//! Fermeture du menu contextuel du pet (fenêtre "menu", cf. ContextMenuWindow.tsx).
//!
//! La fenêtre du menu n'obtient pas de façon fiable le focus système (le clic droit qui l'a
//! ouverte le rend à la fenêtre du pet), donc ni `onFocusChanged` ni un clic capturé côté web
//! ne permettent de détecter "l'utilisateur a cliqué ailleurs". On surveille donc la souris
//! au niveau de l'OS : un thread ferme la fenêtre au premier clic hors de la zone du menu, ou
//! sur Échap, sans dépendre du focus.

use std::thread;
use std::time::Duration;

use tauri::{Manager, WebviewWindow};

/// Marge transparente autour du menu dans sa fenêtre -- DOIT rester égale à
/// `CONTEXT_MENU_PADDING` (src/lib/layout.ts) : un clic dans cette marge est "hors du menu".
const MENU_PADDING: f64 = 12.0;

const POLL_INTERVAL: Duration = Duration::from_millis(15);

#[cfg(windows)]
mod input {
    const VK_LBUTTON: i32 = 0x01;
    const VK_RBUTTON: i32 = 0x02;
    const VK_MBUTTON: i32 = 0x04;
    const VK_ESCAPE: i32 = 0x1B;

    #[link(name = "user32")]
    extern "system" {
        fn GetAsyncKeyState(vkey: i32) -> i16;
    }

    fn is_down(vkey: i32) -> bool {
        // Bit de poids fort = touche actuellement enfoncée.
        // SAFETY: appel Win32 sans effet de bord, sans pointeur.
        (unsafe { GetAsyncKeyState(vkey) } as u16) & 0x8000 != 0
    }

    pub fn any_mouse_button_down() -> bool {
        is_down(VK_LBUTTON) || is_down(VK_RBUTTON) || is_down(VK_MBUTTON)
    }

    pub fn escape_down() -> bool {
        is_down(VK_ESCAPE)
    }
}

#[cfg(not(windows))]
mod input {
    pub fn any_mouse_button_down() -> bool {
        false
    }

    pub fn escape_down() -> bool {
        false
    }
}

/// Lance la surveillance de fermeture pour la fenêtre appelante ("menu") : elle se ferme au
/// premier clic (n'importe quel bouton) hors du menu, ou sur Échap. Le thread s'arrête de
/// lui-même dès que la fenêtre n'existe plus (fermée par un choix d'item, par exemple).
#[tauri::command]
pub fn watch_menu_dismiss(window: WebviewWindow) {
    thread::spawn(move || {
        // État initial pris comme "déjà enfoncé" : ignore un clic encore en cours (celui qui
        // a ouvert le menu) -- seules les NOUVELLES pressions comptent.
        let mut mouse_was_down = input::any_mouse_button_down();
        let mut escape_was_down = input::escape_down();

        loop {
            thread::sleep(POLL_INTERVAL);

            let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) else {
                return; // fenêtre détruite
            };

            let mouse_down = input::any_mouse_button_down();
            let escape_down = input::escape_down();

            if escape_down && !escape_was_down {
                let _ = window.close();
                return;
            }

            if mouse_down && !mouse_was_down {
                if let Ok(cursor) = window.app_handle().cursor_position() {
                    let padding = MENU_PADDING * window.scale_factor().unwrap_or(1.0);
                    let inside = cursor.x >= position.x as f64 + padding
                        && cursor.x <= (position.x as f64 + size.width as f64) - padding
                        && cursor.y >= position.y as f64 + padding
                        && cursor.y <= (position.y as f64 + size.height as f64) - padding;
                    if !inside {
                        let _ = window.close();
                        return;
                    }
                }
            }

            mouse_was_down = mouse_down;
            escape_was_down = escape_down;
        }
    });
}
