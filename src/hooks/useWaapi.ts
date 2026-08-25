import { useEffect, type RefObject } from "react";

/** Joue une animation Web Animations API sur `ref` tant que `active` est vrai (annulée
 * proprement à la désactivation/démontage). `replayKey` force une nouvelle lecture même
 * si `active` reste vrai d'un rendu à l'autre (ex: deux `Stop` consécutifs sans event
 * intermédiaire) -- sans lui, seule la transition false->true rejoue l'animation. Choix
 * volontaire de ne pas dépendre de `keyframes`/`options` (nouvelle référence à chaque
 * rendu) : ne rejouer que sur un changement d'état réel, pas un re-render du parent. */
export function useWaapi(
  ref: RefObject<Element | null>,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
  active: boolean,
  replayKey?: number,
) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const anim = ref.current.animate(keyframes, options);
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, replayKey]);
}
