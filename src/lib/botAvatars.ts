import type { AvatarState, AvatarStateDefinition } from "open-bot-avatar";
import type { AvatarMaterial } from "open-bot-avatar/dom";
import { fluffy } from "open-bot-avatar/materials/fluffy";
import { glass } from "open-bot-avatar/materials/glass";
import type { AnimationName } from "../components/avatarDefinition";

/** Préfixe de l'`avatarId` d'un avatar Open Bot Avatar (`bot:<id>`), comme `dots:`. */
export const BOT_AVATAR_PREFIX = "bot:";

export function botAvatarId(id: string): string {
  return `${BOT_AVATAR_PREFIX}${id}`;
}

export type BotMood = "neutral" | "happy";
export type BotMaterialName = "flat" | "fluffy" | "glass";

// Un matériau est une valeur importée, pas un nom (cf. README du package) : le nom reste en
// settings, la valeur est résolue au rendu.
export const BOT_MATERIALS: Record<BotMaterialName, AvatarMaterial> = {
  flat: "flat",
  fluffy,
  glass,
};

// Le moteur n'a pas d'état « dort » : yeux fermés, corps qui respire lentement.
const sleeping: AvatarStateDefinition = {
  id: "sleeping",
  pose: (ctx) => ({
    ...ctx.rest(1.6),
    blink: 1,
    gazeX: 0,
    gazeY: 0.3,
    lift: 2 + ctx.wave(3.4),
  }),
};

/** État agrégé Hooky -> état Open Bot Avatar (mêmes 10 états que STATE_TO_DOTS). */
const STATE_TO_BOT: Partial<
  Record<AnimationName, AvatarState | AvatarStateDefinition>
> = {
  idle: "idle",
  listening: "waiting",
  thinking: "thinking",
  searching: "thinking",
  working: "working",
  confused: "blocked",
  celebrate: "done",
  bored: "idle",
  waking: "waiting",
  sleeping,
};

export const BOT_ANIMATION_ORDER = Object.keys(STATE_TO_BOT) as AnimationName[];

export function botStateFor(
  animation: AnimationName,
): AvatarState | AvatarStateDefinition {
  return STATE_TO_BOT[animation] ?? "idle";
}

export function botStateName(animation: AnimationName): string {
  const state = botStateFor(animation);
  return typeof state === "string" ? state : state.id;
}

// ponytail: durée fixe sur les cartes du picker, les états du moteur bouclent sans fin.
export function botCycleMs(): number {
  return 4000;
}
