import { emit } from "@tauri-apps/api/event";
import { validateAvatar, type AvatarDefinition } from "open-bot-avatar";
import { botAvatarId } from "./botAvatars";

const STORAGE_KEY = "hooky-custom-bots";
export const CUSTOM_BOTS_EVENT = "hooky-custom-bots";

/** Bots Open Bot Avatar importés (avatarId `bot:custom-<uuid>` -> définition validée). Une
 * définition pèse moins d'1 ko : localStorage suffit, pas besoin d'IndexedDB comme Dots Lab. */
export type CustomBots = Record<string, AvatarDefinition>;

export function customBotAvatarId(): string {
  return botAvatarId(`custom-${crypto.randomUUID()}`);
}

export function readCustomBots(): CustomBots {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Même pattern que writeCustomAvatars : persistance locale + diffusion aux autres fenêtres.
export function writeCustomBots(customBots: CustomBots): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customBots));
  void emit(CUSTOM_BOTS_EVENT, customBots);
}

/** Lit la réponse du générateur : le JSON seul, ou entouré de texte / d'un bloc ```json (cas
 * d'une réponse de modèle collée telle quelle). Renvoie la définition validée ou les erreurs. */
export function parseBotDefinition(
  text: string,
): { ok: true; value: AvatarDefinition } | { ok: false; error: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start)
    return { ok: false, error: "aucun JSON trouvé" };
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { ok: false, error: "JSON invalide" };
  }
  const result = validateAvatar(raw);
  return result.ok
    ? { ok: true, value: result.value }
    : { ok: false, error: result.errors.join(" ; ") };
}
