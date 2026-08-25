import type { RefObject } from "react";
import type { AnimationName } from "../components/Avatar";
import { useWaapi } from "./useWaapi";

// Plusieurs petits sauts d'amplitude décroissante (façon balle qui rebondit) plutôt
// qu'un unique bounce -- chaque montée décélère (ease-out) et chaque chute accélère
// (ease-in, gravité), l'easing d'un keyframe WAAPI s'appliquant au segment qui suit.
// Un essai à 2 sauts plus amples avait remplacé cette structure, jugé moins bon --
// revenu à 3 sauts, gardés sur une durée longue (2000ms) pour rester lent.
const BOUNCE: Keyframe[] = [
  { transform: "translateY(0) scale(1)", offset: 0, easing: "ease-out" },
  {
    transform: "translateY(-12px) scale(1.05)",
    offset: 0.15,
    easing: "ease-in",
  },
  { transform: "translateY(0) scale(0.97)", offset: 0.32, easing: "ease-out" },
  { transform: "translateY(-7px) scale(1.03)", offset: 0.5, easing: "ease-in" },
  { transform: "translateY(0) scale(0.99)", offset: 0.68, easing: "ease-out" },
  {
    transform: "translateY(-4px) scale(1.02)",
    offset: 0.84,
    easing: "ease-in",
  },
  { transform: "translateY(0) scale(1)", offset: 1 },
];

const SHAKE: Keyframe[] = [
  { transform: "translateX(0)" },
  { transform: "translateX(-6px)" },
  { transform: "translateX(6px)" },
  { transform: "translateX(-4px)" },
  { transform: "translateX(4px)" },
  { transform: "translateX(0)" },
];

/** Ponctue le conteneur avatar au moment où il entre en `celebrate` (petit saut) ou
 * `confused` (secousse) -- vient renforcer l'overlay décoratif (AnimationOverlay) sans
 * le dupliquer : ce hook ne touche que le conteneur, jamais le SVG du moteur d'avatar
 * lui-même (un remount interromprait sa propre animation en cours). */
export function useAnimationEffects(
  containerRef: RefObject<HTMLElement | null>,
  animation: AnimationName,
  revision: number,
  enabled: boolean,
) {
  useWaapi(
    containerRef,
    BOUNCE,
    { duration: 2000 },
    enabled && animation === "celebrate",
    revision,
  );
  useWaapi(
    containerRef,
    SHAKE,
    { duration: 400, easing: "ease-in-out" },
    enabled && animation === "confused",
    revision,
  );
}
