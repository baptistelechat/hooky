import { emit } from "@tauri-apps/api/event";
import {
  DEFAULT_AVATAR_ID,
  type AvatarColorOverride,
} from "../components/avatarDefinition";

export interface HookySettings {
  avatarSize: number;
  debugMode: boolean;
  effectsEnabled: boolean;
  notificationsEnabled: boolean;
  avatarId: string;
  // Couleurs éditées par avatar (id -> override) -- keyed par avatarId pour que changer
  // d'avatar n'écrase pas l'édition d'un autre, et que revenir dessus la retrouve.
  avatarColorOverrides: Record<string, AvatarColorOverride>;
  // Prénom/pseudo inséré dans les bulles de notification (cf. notificationMessages.ts,
  // jeton `{name}`) -- vide par défaut : les messages restent génériques, adressables à
  // n'importe qui, plutôt que de coder un prénom en dur (Hooky est destiné à être
  // partagé publiquement, cf. CLAUDE.md).
  callName: string;
}

export const DEFAULT_SETTINGS: HookySettings = {
  avatarSize: 240,
  debugMode: false,
  effectsEnabled: true,
  notificationsEnabled: true,
  avatarId: DEFAULT_AVATAR_ID,
  avatarColorOverrides: {},
  callName: "",
};

const STORAGE_KEY = "hooky-settings";
export const SETTINGS_EVENT = "hooky-settings";

export function readSettings(): HookySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// Écrit en local (persistance) et diffuse aux autres fenêtres Tauri (le pet et les settings
// tournent dans des webviews séparées -- pas de re-render automatique sans cet event).
export function writeSettings(settings: HookySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  void emit(SETTINGS_EVENT, settings);
}
