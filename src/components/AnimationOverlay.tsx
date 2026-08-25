import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { AnimationName } from "./Avatar";
import { useWaapi } from "../hooks/useWaapi";
import { badgeIconColor } from "./avatarDefinition";
// Doit correspondre à la durée de transition Tailwind utilisée sur le badge (duration-200).
const BADGE_TRANSITION_MS = 200;

interface AnimationOverlayProps {
  animation: AnimationName;
  revision: number;
  enabled: boolean;
  /** Taille réelle de l'avatar (peut être < la fenêtre, cf. Settings) -- les badges
   * (icône, "zZz") doivent s'ancrer à ce carré, pas au coin de la fenêtre entière,
   * sous peine de flotter dans le vide transparent quand l'avatar est réduit. */
  avatarSize: number;
  /** Icône du badge, choisie par le hook courant (cf. animationCatalog.findMappingEntry) --
   * pas par `animation` seule : plusieurs hooks partagent le même bucket d'animation sans
   * avoir le même sens (une oreille sur SessionStart n'aurait aucun sens). Absent = pas de
   * badge icône pour ce hook (idle, working générique...). */
  icon?: LucideIcon;
}

const RISE: Keyframe[] = [
  { opacity: 0, transform: "translateY(0)" },
  { opacity: 1, transform: "translateY(-6px)", offset: 0.3 },
  { opacity: 0, transform: "translateY(-18px)" },
];

const CONFETTI_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#eab308", "#ec4899"];
const CONFETTI_COUNT = 10;

// Le SVG du moteur a un viewBox de 300x300 mais le corps dessiné ("primary" du cube dans
// avatar.json) ne fait que ~191.5 unités, en plus arrondi (roundness ~0.73) -- la marge
// invisible autour de la forme visible dépasse donc les ~18% de la bounding box brute.
// 10% pose le badge nettement sur le corps plutôt qu'à sa tangente.
const BADGE_INSET_PCT = 10;

/** Overlay décoratif superposé à l'avatar -- renforce visuellement l'état courant en plus
 * de l'animation SVG du moteur (confettis sur `celebrate`, badge icône fixe en haut à
 * droite pour les hooks qui en ont un, "zZz" flottant au même coin pour `sleeping`
 * uniquement -- jamais affichés en même temps). Purement additif, ne touche jamais
 * `AvatarEngine`. Ponctuation du conteneur (bounce/shake) -> `useAnimationEffects`,
 * délibérément séparé (cible le conteneur avatar, pas cet overlay). */
export function AnimationOverlay({
  animation,
  revision,
  enabled,
  avatarSize,
  icon: Icon,
}: AnimationOverlayProps) {
  const confettiRef = useRef<HTMLDivElement>(null);
  const zzzRef = useRef<HTMLSpanElement>(null);

  // Garde la dernière icône affichée le temps du fade-out (200ms) au lieu de démonter
  // instantanément -- une transition CSS ne peut pas animer une disparition sur un nœud
  // qui n'existe déjà plus au rendu suivant. La synchronisation immédiate (Icon défini)
  // se fait pendant le rendu (pattern React "adjusting state when a prop changes"), pas
  // dans un effect -- seul le clear différé (Icon absent) est un vrai effet de bord.
  const [displayIcon, setDisplayIcon] = useState<LucideIcon | undefined>(Icon);
  const [prevIcon, setPrevIcon] = useState<LucideIcon | undefined>(Icon);
  if (Icon !== prevIcon) {
    setPrevIcon(() => Icon);
    if (Icon) setDisplayIcon(() => Icon);
  }
  useEffect(() => {
    if (Icon) return;
    const timeout = setTimeout(
      () => setDisplayIcon(undefined),
      BADGE_TRANSITION_MS,
    );
    return () => clearTimeout(timeout);
  }, [Icon]);

  // Confettis : effet imperatif plutôt qu'un tas de refs React -- un burst est jetable
  // par nature (créé, joué, retiré), pas un état à faire vivre dans le rendu.
  useEffect(() => {
    if (!enabled || animation !== "celebrate" || !confettiRef.current) return;
    const container = confettiRef.current;
    const particles: HTMLSpanElement[] = [];

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const el = document.createElement("span");
      el.style.cssText =
        "position:absolute;top:50%;left:50%;width:6px;height:6px;border-radius:1px;pointer-events:none;" +
        `background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};`;
      container.appendChild(el);
      particles.push(el);

      // Distance relative à `avatarSize` -- sinon un burst calibré pour le pet (240px)
      // envoie les confettis bien au-delà des mini-cartes de preview (56px, cf. Settings).
      const angle = Math.random() * Math.PI * 2;
      const distance = avatarSize * (0.25 + Math.random() * 0.35);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance - avatarSize * 0.12; // biais vers le haut

      const particleAnim = el.animate(
        [
          { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
          {
            transform: `translate(${x}px, ${y}px) rotate(${Math.random() * 360}deg)`,
            opacity: 0,
          },
        ],
        { duration: 650 + Math.random() * 350, easing: "ease-out" },
      );
      particleAnim.onfinish = () => el.remove();
    }

    return () => particles.forEach((el) => el.remove());
  }, [enabled, animation, revision, avatarSize]);

  // "bored" reste sans overlay -- l'engine seul (posture affaissée) suffit à le lire,
  // le "zZz" est réservé à "sleeping" où c'est le seul signal visuel de l'état.
  const isSleeping = animation === "sleeping";

  // Proportionnel à `avatarSize` -- un badge à taille fixe devient minuscule sur un avatar
  // à 240px et disproportionné sur une mini-carte de preview à 56px (Settings). Réduit par
  // rapport à la première version (0.22) pour prendre moins d'importance face à l'avatar.
  const badgeSize = Math.max(12, Math.round(avatarSize * 0.18));
  const iconSize = Math.round(badgeSize * 0.55);
  const zzzFontSize = Math.max(10, Math.round(avatarSize * 0.11));
  // Icône et "zZz" partagent le même coin -- jamais affichés en même temps (icône = hooks
  // actifs, zZz = sleeping uniquement), pas besoin de les séparer.
  const badgeStyle = {
    top: `${BADGE_INSET_PCT}%`,
    right: `${BADGE_INSET_PCT}%`,
  };

  useWaapi(
    zzzRef,
    RISE,
    { duration: 1800, iterations: Infinity },
    enabled && isSleeping,
  );

  if (!enabled) return null;

  // Alias capitalisé -- JSX exige un identifiant commençant par une majuscule pour
  // reconnaître une variable comme composant plutôt que comme balise DOM littérale.
  const DisplayIcon = displayIcon;

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Confettis : plein cadre, pas limité au carré de l'avatar -- une explosion a
          besoin de place, indépendamment de la taille configurée. */}
      <div ref={confettiRef} className="absolute inset-0" />

      {/* Badges (icône, "zZz") : carré recentré sur la taille réelle de l'avatar, sinon
          `top-1 right-1` s'ancre au coin de la fenêtre (240px fixe) et flotte loin de
          l'avatar dès que celui-ci est réduit via le slider de taille. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{ width: avatarSize, height: avatarSize }}
        >
          {DisplayIcon && (
            <span
              className={`absolute flex items-center justify-center rounded-full bg-white/90 shadow-sm transition-[opacity,transform] duration-200 ease-out ${
                Icon ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
              style={{
                ...badgeStyle,
                width: badgeSize,
                height: badgeSize,
                color: badgeIconColor,
              }}
            >
              <DisplayIcon size={iconSize} />
            </span>
          )}

          {isSleeping && (
            <span
              ref={zzzRef}
              className="absolute font-bold text-white [text-shadow:0_0_2px_#000]"
              style={{ ...badgeStyle, fontSize: zzzFontSize }}
            >
              z z Z
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
