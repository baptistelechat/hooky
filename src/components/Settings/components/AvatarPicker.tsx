import { useEffect, useState } from "react";
import {
  avatarRegistry,
  type AnimationName,
  type AvatarBundle,
} from "@/components/avatarDefinition";
import { useSettings } from "@/hooks/useSettings";

const PREVIEW_SIZE = 56;

function pickRandomAnimation(
  animationOrder: AnimationName[],
  exclude?: AnimationName,
): AnimationName {
  const pool =
    exclude && animationOrder.length > 1
      ? animationOrder.filter((name) => name !== exclude)
      : animationOrder;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Durée réelle d'un passage complet de l'animation (somme des holdMs/transitionMs de ses
// steps) -- pas une durée arbitraire, pour relancer une nouvelle animation aléatoire
// exactement quand la précédente a fini son cycle plutôt qu'à un instant qui coupe une pose.
function animationCycleDuration(
  bundle: AvatarBundle,
  animation: AnimationName,
): number {
  return bundle.definition.animations[animation].steps.reduce(
    (total, step) => total + step.holdMs + step.transitionMs,
    0,
  );
}

interface AvatarPickerCardProps {
  bundle: AvatarBundle;
  isSelected: boolean;
  onSelect: () => void;
}

// Chaque carte pioche indépendamment (Math.random() propre à son instance) et relance une
// nouvelle animation aléatoire dès que la précédente a fini son cycle -- desynchronise
// naturellement les cartes entre elles (plus "vivant" qu'un pool figé sur "idle" partagé).
function AvatarPickerCard({
  bundle,
  isSelected,
  onSelect,
}: AvatarPickerCardProps) {
  const animationOrder = bundle.definition.animationOrder as AnimationName[];
  const [animation, setAnimation] = useState<AnimationName>(() =>
    pickRandomAnimation(animationOrder),
  );

  useEffect(() => {
    const id = setTimeout(
      () =>
        setAnimation((current) => pickRandomAnimation(animationOrder, current)),
      animationCycleDuration(bundle, animation),
    );
    return () => clearTimeout(id);
  }, [animation, animationOrder, bundle]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-muted/30 hover:bg-muted/60"
      }`}
    >
      <div
        className="relative drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]"
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
      >
        <bundle.AvatarEngine
          animation={animation}
          size={PREVIEW_SIZE}
          style={
            bundle.avatarFitScale < 1
              ? {
                  transform: `scale(${bundle.avatarFitScale})`,
                  transformOrigin: "center",
                }
              : undefined
          }
        />
      </div>
      <span className="text-xs font-medium">{bundle.name}</span>
    </button>
  );
}

/** Grille de sélection d'avatar -- un fichier déposé dans src/components/avatars/*.json
 * (export du Studio bible-strong) apparaît ici automatiquement (cf. avatarDefinition.ts,
 * import.meta.glob). Clic = persistance immédiate via useSettings, même pattern que le
 * reste des réglages (pas de bouton "Appliquer"). */
export function AvatarPicker() {
  const [settings, setSettings] = useSettings();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto pr-1">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
        {Object.values(avatarRegistry).map((bundle) => (
          <AvatarPickerCard
            key={bundle.id}
            bundle={bundle}
            isSelected={bundle.id === settings.avatarId}
            onSelect={() => setSettings({ ...settings, avatarId: bundle.id })}
          />
        ))}
      </div>
    </div>
  );
}
