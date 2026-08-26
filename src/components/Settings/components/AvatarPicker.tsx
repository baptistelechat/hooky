import {
  avatarBundleKey,
  avatarRegistry,
  DEFAULT_AVATAR_ID,
  type AnimationName,
  type AvatarBundle,
  type AvatarColorOverride,
} from "@/components/avatarDefinition";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { useAvatarBundle } from "@/hooks/useAvatarBundle";
import { useSettings } from "@/hooks/useSettings";
import { Palette, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  colorOverride: AvatarColorOverride | undefined;
  onSelect: () => void;
  onResetColors: () => void;
}

// Chaque carte pioche indépendamment (Math.random() propre à son instance) et relance une
// nouvelle animation aléatoire dès que la précédente a fini son cycle -- desynchronise
// naturellement les cartes entre elles (plus "vivant" qu'un pool figé sur "idle" partagé).
function AvatarPickerCard({
  bundle,
  isSelected,
  colorOverride,
  onSelect,
  onResetColors,
}: AvatarPickerCardProps) {
  const animationOrder = bundle.definition.animationOrder as AnimationName[];
  const [animation, setAnimation] = useState<AnimationName>(() =>
    pickRandomAnimation(animationOrder),
  );
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
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
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
        >
          <liveBundle.AvatarEngine
            key={avatarBundleKey(liveBundle)}
            animation={animation}
            size={PREVIEW_SIZE}
            className="animate-in fade-in duration-300"
            style={
              liveBundle.avatarFitScale < 1
                ? {
                    transform: `scale(${liveBundle.avatarFitScale})`,
                    transformOrigin: "center",
                  }
                : undefined
            }
          />
        </div>
        <span className="text-xs font-medium">{bundle.name}</span>
      </button>

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

interface ColorSwatchProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// Wrapper autour du picker natif : `<input type="color">` s'affiche par défaut comme un
// petit rectangle avec la texture "damier" du navigateur -- overlay transparent
// (opacity-0) sur un swatch rond stylé (fond = la couleur elle-même) pour rester cohérent
// avec le reste de l'UI, sans dépendance ni popover custom (le natif garde son
// accessibilité clavier/lecteur d'écran).
//
// `onChange` (React) est branché sur l'event natif "input" pour ce type d'input --
// continu pendant qu'on drague dans le picker (contrairement à "change", qui ne fire
// qu'une fois à la fermeture). Chaque changement remonte à `avatarColorOverrides`,
// diffusé par IPC Tauri vers la fenêtre du pet flottant, qui reconstruit tout l'avatar
// (`createAvatar`) -- committer à chaque tick de drag rendait le picker (et le pet) lourds.
// On garde donc l'aperçu du swatch en state local (instantané, aucun coût) et on ne
// committe `onChange` (prop) que sur l'event "change" natif, écouté directement.
function ColorSwatch({ id, label, value, onChange }: ColorSwatchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  // Resynchronise le draft local sur un changement externe (switch d'avatar, reset,
  // commit depuis une autre fenêtre) -- setState pendant le render plutôt que dans un
  // effet (cf. GLRN-059/react-hooks/set-state-in-effect) : pas de cycle de render en plus.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const handleCommit = (e: Event) => {
      onChange((e.target as HTMLInputElement).value);
    };
    input.addEventListener("change", handleCommit);
    return () => input.removeEventListener("change", handleCommit);
  }, [onChange]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <label
        htmlFor={id}
        className="relative block size-9 cursor-pointer overflow-hidden rounded-full border-2 border-border shadow-sm transition-transform hover:scale-105"
        style={{ backgroundColor: draft }}
      >
        <input
          ref={inputRef}
          id={id}
          type="color"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** Grille de sélection d'avatar -- un fichier déposé dans src/components/avatars/*.json
 * (export du Studio bible-strong) apparaît ici automatiquement (cf. avatarDefinition.ts,
 * import.meta.glob). Clic = persistance immédiate via useSettings, même pattern que le
 * reste des réglages (pas de bouton "Appliquer").
 *
 * Swatches couleurs (corps/yeux) de l'avatar sélectionné en footer épinglé, hors du
 * conteneur scrollable de la grille -- même pattern que Configuration dans
 * SettingsControls : seule la grille défile, le panneau couleurs reste toujours visible.
 * Deux niveaux de reset : l'icône CCW sur la carte d'un avatar édité (immédiat, sans
 * confirmation -- un aller-retour rapide sur une seule couleur) et les 2 boutons du footer
 * (avec AlertDialog, cf. LRN-110 : action qui efface un travail d'édition, guard bloquant). */
export function AvatarPicker() {
  const [settings, setSettings] = useSettings();
  const [resetCurrentDialogOpen, setResetCurrentDialogOpen] = useState(false);
  const [resetAllDialogOpen, setResetAllDialogOpen] = useState(false);
  const selectedBundle =
    avatarRegistry[settings.avatarId] ?? avatarRegistry[DEFAULT_AVATAR_ID];
  const override = settings.avatarColorOverrides[selectedBundle.id];
  const bodyColor = override?.body ?? selectedBundle.definition.colors.body;
  const eyesColor = override?.eyes ?? selectedBundle.definition.colors.eyes;
  const hasAnyOverride = Object.keys(settings.avatarColorOverrides).length > 0;

  function setColor(key: "body" | "eyes", value: string) {
    setSettings({
      ...settings,
      avatarColorOverrides: {
        ...settings.avatarColorOverrides,
        [selectedBundle.id]: {
          ...settings.avatarColorOverrides[selectedBundle.id],
          [key]: value,
        },
      },
    });
  }

  function resetColors(avatarId: string) {
    const rest = { ...settings.avatarColorOverrides };
    delete rest[avatarId];
    setSettings({ ...settings, avatarColorOverrides: rest });
  }

  function resetAllColors() {
    setSettings({ ...settings, avatarColorOverrides: {} });
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(120px,1fr))] content-start gap-2 overflow-y-auto pr-1">
        {Object.values(avatarRegistry).map((bundle) => (
          <AvatarPickerCard
            key={bundle.id}
            bundle={bundle}
            isSelected={bundle.id === settings.avatarId}
            colorOverride={settings.avatarColorOverrides[bundle.id]}
            onSelect={() => setSettings({ ...settings, avatarId: bundle.id })}
            onResetColors={() => resetColors(bundle.id)}
          />
        ))}
      </div>

      <Separator />

      <FieldGroup>
        {/* `orientation="responsive"` (cf. field.tsx) : même comportement que le Switch
            "Effets visuels" (label+description à gauche, contrôle à droite) mais qui
            repasse sous le label dès que le conteneur `field-group` (posé par FieldGroup
            lui-même, cf. `@container/field-group`) devient trop étroit -- le Switch reste
            toujours sur une ligne, les 2 swatches ont besoin de plus de place. */}
        <Field orientation="responsive">
          <FieldContent>
            <FieldTitle>
              <Palette className="size-4" />
              Couleurs
            </FieldTitle>
            <FieldDescription>
              Personnalise le corps et les yeux de l'avatar sélectionné.
            </FieldDescription>
          </FieldContent>
          <div className="flex items-center gap-6">
            <ColorSwatch
              id="avatar-color-body"
              label="Corps"
              value={bodyColor}
              onChange={(value) => setColor("body", value)}
            />
            <ColorSwatch
              id="avatar-color-eyes"
              label="Yeux"
              value={eyesColor}
              onChange={(value) => setColor("eyes", value)}
            />
          </div>
        </Field>

        <Field>
          <div className="flex flex-col gap-2 @md/field-group:flex-row @md/field-group:flex-wrap">
            <AlertDialog
              open={resetCurrentDialogOpen}
              onOpenChange={setResetCurrentDialogOpen}
            >
              <AlertDialogTrigger
                render={
                  <Button responsive variant="outline" disabled={!override} />
                }
              >
                <RotateCcw data-icon="inline-start" />
                Réinitialiser {selectedBundle.name}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Réinitialiser les couleurs de {selectedBundle.name} ?
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
                      resetColors(selectedBundle.id);
                      setResetCurrentDialogOpen(false);
                    }}
                  >
                    Réinitialiser
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
              open={resetAllDialogOpen}
              onOpenChange={setResetAllDialogOpen}
            >
              <AlertDialogTrigger
                render={
                  <Button
                    responsive
                    variant="destructive"
                    disabled={!hasAnyOverride}
                  />
                }
              >
                <RotateCcw data-icon="inline-start" />
                Réinitialiser les avatars
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Réinitialiser tous les avatars ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Les couleurs éditées pour TOUS les avatars reviendront à
                    celles d'origine. Les modifications actuelles seront
                    perdues.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => {
                      resetAllColors();
                      setResetAllDialogOpen(false);
                    }}
                  >
                    Réinitialiser les avatars
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Field>
      </FieldGroup>
    </div>
  );
}
