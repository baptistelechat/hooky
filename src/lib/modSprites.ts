import { invoke } from "@tauri-apps/api/core";
import {
  advanceAvatarPlayback,
  playAvatarAnimation,
  renderAvatarFrame,
  type AvatarDefinition,
} from "@bible-strong/avatar-core";
import {
  avatarRegistry,
  DEFAULT_AVATAR_ID,
  type AvatarBundle,
  type ProceduralAvatarBundle,
  type SpriteAvatarBundle,
} from "../components/avatarDefinition";
import { codexRowFor } from "./codexPets";

/** Sprites pour le mod Claude Code `hooky-pet` : chaque animation de l'avatar actif rendue en
 * SVG autonome (frames PNG + SMIL, le mod n'ayant ni script ni DOM), écrite côté Rust dans le
 * dossier de données de Hooky. Le mod lit ensuite `GET /state` (animation, clé, dossier). */

const FPS = 12;
const SIZES = [64, 48, 40, 32]; // px ; réduit tant que le SVG dépasse la limite du moteur (131072)
const SVG_LIMIT = 131072;
const CODEX_CELL = { w: 192, h: 208 };
const VIEWBOX_HALF = 150; // viewBox fixe du moteur : -150..150

// Même contrat fixe que `AnimationName` : le set d'animations est partagé par tous les avatars.
const ANIMATIONS = Object.keys(
  avatarRegistry[DEFAULT_AVATAR_ID].definition.animations,
);

interface Frame {
  ms: number;
  /** Dessine la frame dans `ctx`, aux dimensions `size` x `size`, origine en (0, 0). */
  draw: (ctx: OffscreenCanvasRenderingContext2D, size: number) => void;
}

/** Clé de dossier du bundle : id nettoyé (`codex:om-nom` -> `codex_om-nom`) + couleurs
 * résolues pour un avatar procédural (un changement de couleur régénère ses sprites). */
export function spriteKeyFor(bundle: AvatarBundle): string {
  const id = bundle.id.replace(/[^\w-]/g, "_");
  if (bundle.kind === "sprite") return id;
  const { body, eyes } = bundle.definition.colors;
  return `${id}-${(body + eyes).replace(/[^\w]/g, "")}`;
}

function proceduralFrames(
  bundle: ProceduralAvatarBundle,
  animation: string,
): Frame[] {
  const definition = bundle.definition as unknown as AvatarDefinition;
  const anim = bundle.definition.animations[
    animation as keyof typeof bundle.definition.animations
  ] as { steps: { holdMs: number; transitionMs: number }[] };
  const env = { random: () => 0.5, reduceMotion: false };
  const total = anim.steps.reduce((n, s) => n + s.holdMs + s.transitionMs, 0);
  const start = anim.steps[0].transitionMs; // on échantillonne un cycle complet, après l'entrée
  const played = playAvatarAnimation(definition, animation, 0);
  if (!played.ok) return [];
  let state = played.value;

  const frames: (Frame & { key: string })[] = [];
  for (let t = start; t < start + total; t += 1000 / FPS) {
    state = advanceAvatarPlayback(definition, state, t, env);
    const { geometry: g, colors } = renderAvatarFrame(
      definition,
      state,
      t,
      env,
    );
    const key = `${g.headPath}|${g.leftPath}|${g.rightPath}|${g.leftVisible}|${g.rightVisible}`;
    const last = frames[frames.length - 1];
    if (last?.key === key) {
      last.ms += 1000 / FPS;
      continue;
    }
    frames.push({
      key,
      ms: 1000 / FPS,
      draw: (ctx, size) => {
        const k = size / (2 * VIEWBOX_HALF);
        ctx.save();
        ctx.setTransform(k, 0, 0, k, size / 2, size / 2);
        const head = new Path2D(g.headPath);
        ctx.fillStyle = colors.body;
        ctx.fill(head);
        ctx.clip(head); // les yeux sont clippés par la tête, comme dans le SVG du moteur
        ctx.fillStyle = colors.eyes;
        if (g.leftVisible) ctx.fill(new Path2D(g.leftPath));
        if (g.rightVisible) ctx.fill(new Path2D(g.rightPath));
        ctx.restore();
      },
    });
  }
  return frames;
}

function spriteFrames(
  bundle: SpriteAvatarBundle,
  animation: string,
  sheet: ImageBitmap,
): Frame[] {
  const { row, frames, fps } = codexRowFor(animation as never);
  const count = bundle.rowFrames?.[row] || frames;
  return Array.from({ length: count }, (_, k) => ({
    ms: 1000 / fps,
    draw: (ctx, size) => {
      const w = Math.round((CODEX_CELL.w * size) / CODEX_CELL.h); // cellule ajustée en hauteur
      ctx.drawImage(
        sheet,
        k * CODEX_CELL.w,
        row * CODEX_CELL.h,
        CODEX_CELL.w,
        CODEX_CELL.h,
        Math.round((size - w) / 2),
        0,
        w,
        size,
      );
    },
  }));
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** SVG animé (SMIL, défilement discret à durées variables) ; `null` si trop gros même à 32 px. */
async function buildSvg(frames: Frame[]): Promise<string | null> {
  if (frames.length === 0) return null;
  const total = frames.reduce((n, f) => n + f.ms, 0);
  let elapsed = 0;
  const keyTimes = frames.map((f) => {
    const t = (elapsed / total).toFixed(4);
    elapsed += f.ms;
    return t;
  });
  for (const size of SIZES) {
    const canvas = new OffscreenCanvas(size * frames.length, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    frames.forEach((f, i) => {
      ctx.save();
      ctx.translate(i * size, 0);
      ctx.beginPath();
      ctx.rect(0, 0, size, size);
      ctx.clip();
      f.draw(ctx, size);
      ctx.restore();
    });
    const png = await toBase64(
      await canvas.convertToBlob({ type: "image/png" }),
    );
    const xs = frames.map((_, i) => -i * size).join(";");
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<image href="data:image/png;base64,${png}" width="${size * frames.length}" height="${size}" x="0">` +
      `<animate attributeName="x" values="${xs}" keyTimes="${keyTimes.join(";")}" dur="${(total / 1000).toFixed(3)}s" calcMode="discrete" repeatCount="indefinite"/>` +
      `</image></svg>`;
    if (svg.length < SVG_LIMIT) return svg;
  }
  return null;
}

const inFlight = new Set<string>();

/** Génère (une fois par clé) les sprites de l'avatar actif ; sans effet s'ils existent déjà ou
 * si une génération est en cours. Échec silencieux : le mod n'affichera simplement rien. */
export async function ensureModSprites(bundle: AvatarBundle): Promise<void> {
  const key = spriteKeyFor(bundle);
  if (inFlight.has(key)) return;
  inFlight.add(key);
  try {
    if (await invoke<boolean>("mod_sprites_ready", { key })) return;

    const sheet =
      bundle.kind === "sprite"
        ? await createImageBitmap(await (await fetch(bundle.spriteUrl)).blob())
        : null;

    for (const animation of ANIMATIONS) {
      const frames =
        bundle.kind === "sprite" && sheet
          ? spriteFrames(bundle, animation, sheet)
          : bundle.kind === "procedural"
            ? proceduralFrames(bundle, animation)
            : [];
      const svg = await buildSvg(frames);
      if (svg) await invoke("write_mod_sprite", { key, animation, svg });
      await new Promise((resolve) => setTimeout(resolve)); // laisse respirer le pet
    }
    await invoke("mark_mod_sprites_ready", { key });
  } catch (error) {
    console.warn("[mod-sprites] génération impossible :", error);
  } finally {
    inFlight.delete(key);
  }
}
