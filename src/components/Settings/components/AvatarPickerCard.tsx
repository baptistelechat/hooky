import {
  avatarBundleKey,
  type AnimationName,
  type AvatarBundle,
  type AvatarColorOverride,
} from "@/components/avatarDefinition";
import { FittedAvatarEngine } from "@/components/FittedAvatarEngine";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAvatarBundle } from "@/hooks/useAvatarBundle";
import {
  SPRITE_ANIMATION_ORDER,
  hasGaze,
  spriteCycleMs,
} from "@/lib/codexPets";
import { AVATAR_PREVIEW_SIZE } from "@/lib/layout";
import { Eye, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

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
// Un pet Codex n'a pas de steps : durée de sa ligne de spritesheet (cf. spriteCycleMs).
function animationCycleDuration(
  bundle: AvatarBundle,
  animation: AnimationName,
): number {
  if (bundle.kind === "sprite") return spriteCycleMs(animation);
  return bundle.definition.animations[animation].steps.reduce(
    (total, step) => total + step.holdMs + step.transitionMs,
    0,
  );
}

interface AvatarPickerCardProps {
  bundle: AvatarBundle;
  isSelected: boolean;
  isCustom: boolean;
  colorOverride: AvatarColorOverride | undefined;
  onSelect: () => void;
  onResetColors: () => void;
  onDelete?: () => void;
}

// Chaque carte pioche indépendamment (Math.random() propre à son instance) et relance une
// nouvelle animation aléatoire dès que la précédente a fini son cycle -- desynchronise
// naturellement les cartes entre elles (plus "vivant" qu'un pool figé sur "idle" partagé).
export function AvatarPickerCard({
  bundle,
  isSelected,
  isCustom,
  colorOverride,
  onSelect,
  onResetColors,
  onDelete,
}: AvatarPickerCardProps) {
  const animationOrder =
    bundle.kind === "sprite"
      ? SPRITE_ANIMATION_ORDER
      : (bundle.definition.animationOrder as AnimationName[]);
  const [animation, setAnimation] = useState<AnimationName>(() =>
    pickRandomAnimation(animationOrder),
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // Reflète l'override couleur de CET avatar (pas seulement le sélectionné) -- même hook
  // que le pet flottant et la grille d'animation, pour une couleur cohérente partout.
  const liveBundle = useAvatarBundle(bundle.id, colorOverride);

  useEffect(() => {
    const id = setTimeout(
      () =>
        setAnimation((current) => pickRandomAnimation(animationOrder, current)),
      animationCycleDuration(bundle, animation),
    );
    return () => clearTimeout(id);
  }, [animation, animationOrder, bundle]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
          isSelected
            ? "border-primary bg-primary/10"
            : "border-border bg-muted/30 hover:bg-muted/60"
        }`}
      >
        <div
          className="relative drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]"
          style={{ width: AVATAR_PREVIEW_SIZE, height: AVATAR_PREVIEW_SIZE }}
        >
          <FittedAvatarEngine
            key={avatarBundleKey(liveBundle)}
            bundle={liveBundle}
            animation={animation}
            size={AVATAR_PREVIEW_SIZE}
            className="animate-in fade-in duration-300"
          />
        </div>
        {/* `line-clamp-2` : un pet Codex peut avoir un nom long ou non latin (ex. chinois),
            il ne doit pas déformer la grille. */}
        <span className="line-clamp-2 text-xs font-medium">{bundle.name}</span>
      </button>

      {/* Pet Codex v2 : suit le curseur en veille (`sleeping`, cf. useCursorGaze). Coin haut-gauche,
          libre pour un pet Codex (suppression = avatars custom, reset = couleurs éditées). */}
      {bundle.kind === "sprite" && hasGaze(bundle.rows) && (
        <span
          role="img"
          title="Suit le curseur en veille"
          aria-label="Suit le curseur en veille"
          className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm"
        >
          <Eye className="size-3" />
        </span>
      )}

      {/* Suppression réservée aux avatars custom (les avatars par défaut viennent du repo, pas
          retirables) -- coin haut-gauche pour ne pas collisionner avec le reset couleur
          (haut-droit). Confirmation requise, même garde que le reset (cf. LRN-110). */}
      {isCustom && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1 left-1 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Supprimer ${bundle.name}`}
              />
            }
          >
            <Trash2 className="size-3" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer {bundle.name} ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cet avatar sera définitivement retiré de la liste. Si c'est
                l'avatar en cours, l'avatar par défaut sera sélectionné à la
                place.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onDelete?.();
                  setDeleteDialogOpen(false);
                }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Reset au niveau de la carte de l'avatar édité (pas seulement celui sélectionné) --
          n'importe quel avatar avec des couleurs éditées peut être réinitialisé depuis sa
          propre carte, sans avoir à d'abord le sélectionner. Confirmation requise (cf.
          LRN-110) : même geste destructif que les boutons du footer, même garde. */}
      {colorOverride && (
        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute top-1 right-1 rounded-full bg-background/80 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Réinitialiser les couleurs de ${bundle.name}`}
              />
            }
          >
            <RotateCcw className="size-3" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Réinitialiser les couleurs de {bundle.name} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Les couleurs éditées pour cet avatar reviendront à celles
                d'origine. Les modifications actuelles seront perdues.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  onResetColors();
                  setResetDialogOpen(false);
                }}
              >
                Réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
