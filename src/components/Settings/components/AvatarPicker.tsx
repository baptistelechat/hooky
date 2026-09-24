import {
  avatarRegistry,
  buildAvatarBundle,
  buildSpriteBundle,
  DEFAULT_AVATAR_ID,
  type AvatarBundle,
  type RawAvatarDefinition,
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
import { useCodexPets } from "@/hooks/useCodexPets";
import { useCustomAvatars } from "@/hooks/useCustomAvatars";
import { useSettings } from "@/hooks/useSettings";
import { codexPetForAvatarId } from "@/lib/codexPets";
import { AVATAR_PREVIEW_SIZE } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, Palette, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarPickerCard } from "./AvatarPickerCard";
import { CodexPetsSection } from "./CodexPetsSection";

const COMMUNITY_URL = "https://avatars.bible-strong.app/";

interface AddCustomAvatarCardProps {
  onFileSelected: (file: File) => void;
}

/** Carte "+" en fin de grille -- déclenche un `<input type="file">` natif caché plutôt
 * qu'un plugin Tauri fs/dialog : le webview lit le fichier directement via `file.text()`,
 * aucune nouvelle capability requise. Même gabarit que AvatarPickerCard pour rester aligné
 * dans la grille. */
function AddCustomAvatarCard({ onFileSelected }: AddCustomAvatarCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-muted-foreground transition-colors hover:bg-muted/60"
      style={{ minHeight: AVATAR_PREVIEW_SIZE + 44 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFileSelected(file);
        }}
      />
      <Plus className="size-6" />
      <span className="text-xs font-medium">Ajouter un avatar</span>
    </button>
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

interface ResetButtonsProps {
  className?: string;
  selectedName: string;
  canResetCurrent: boolean;
  canResetAll: boolean;
  onResetCurrentClick: () => void;
  onResetAllClick: () => void;
}

// Rendu deux fois dans AvatarPicker (large sous la description, étroit sous les swatches --
// cf. commentaire sur Field ci-dessous) : composant partagé pour ne pas dupliquer le JSX,
// seul le `className` (direction flex, visibilité) change entre les deux instances.
function ResetButtons({
  className,
  selectedName,
  canResetCurrent,
  canResetAll,
  onResetCurrentClick,
  onResetAllClick,
}: ResetButtonsProps) {
  return (
    <div className={cn("gap-2", className)}>
      <Button
        responsive
        variant="outline"
        disabled={!canResetCurrent}
        onClick={onResetCurrentClick}
      >
        <RotateCcw data-icon="inline-start" />
        Réinitialiser {selectedName}
      </Button>
      <Button
        responsive
        variant="destructive"
        disabled={!canResetAll}
        onClick={onResetAllClick}
      >
        <RotateCcw data-icon="inline-start" />
        Réinitialiser les avatars
      </Button>
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
  const [customAvatars, setCustomAvatars] = useCustomAvatars();
  const [resetCurrentDialogOpen, setResetCurrentDialogOpen] = useState(false);
  const [resetAllDialogOpen, setResetAllDialogOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Recalculé seulement quand les customs changent (comme avatarRegistry, figé au
  // chargement pour les défauts) -- évite de rappeler `createAvatar` à chaque render.
  const customBundles = useMemo(
    () =>
      Object.entries(customAvatars).map(([id, definition]) =>
        buildAvatarBundle(id, definition),
      ),
    [customAvatars],
  );
  const codexPets = useCodexPets();
  const selectedCodexPet = codexPetForAvatarId(settings.avatarId, codexPets);
  const selectedBundle: AvatarBundle =
    avatarRegistry[settings.avatarId] ??
    customBundles.find((bundle) => bundle.id === settings.avatarId) ??
    (selectedCodexPet && buildSpriteBundle(selectedCodexPet)) ??
    avatarRegistry[DEFAULT_AVATAR_ID];
  const override = settings.avatarColorOverrides[selectedBundle.id];
  // Un pet Codex n'a ni body ni eyes : la section Couleurs est masquée (cf. plus bas).
  const bodyColor =
    override?.body ??
    (selectedBundle.kind === "procedural"
      ? selectedBundle.definition.colors.body
      : "");
  const eyesColor =
    override?.eyes ??
    (selectedBundle.kind === "procedural"
      ? selectedBundle.definition.colors.eyes
      : "");
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

  // Validation à l'import, pas au rendu : `buildAvatarBundle` appelle `createAvatar`
  // (moteur bible-strong), qui throw de façon synchrone si la structure est invalide --
  // aucun error boundary autour du montage (cf. avatarDefinition.ts), donc un JSON
  // douteux qui atteindrait la grille viderait la fenêtre. On catch ici, avant tout ajout.
  async function handleFileSelected(file: File) {
    setImportError(null);
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setImportError(`"${file.name}" n'est pas un JSON valide.`);
      return;
    }

    // Id généré (pas le nom de fichier) : évite toute collision avec un id par défaut
    // (cubee, sunee...) si un utilisateur recharge un JSON du même nom.
    const id = crypto.randomUUID();
    try {
      buildAvatarBundle(id, raw as RawAvatarDefinition);
    } catch (e) {
      setImportError(
        `"${file.name}" n'est pas un avatar valide. Veuillez vérifier la structure du fichier et réessayer.`,
      );
      console.error("Avatar import error:", e);
      return;
    }

    setCustomAvatars({
      ...customAvatars,
      [id]: raw as RawAvatarDefinition,
    });
    // Bascule directement sur le pet qu'on vient d'ajouter -- sinon rien à l'écran ne
    // confirme visuellement que l'import a fonctionné tant qu'on ne clique pas sa carte.
    setSettings({ ...settings, avatarId: id });
  }

  function deleteCustomAvatar(id: string) {
    const rest = { ...customAvatars };
    delete rest[id];
    setCustomAvatars(rest);

    const overrides = { ...settings.avatarColorOverrides };
    const hadOverride = id in overrides;
    delete overrides[id];

    if (settings.avatarId === id) {
      setSettings({
        ...settings,
        avatarId: DEFAULT_AVATAR_ID,
        avatarColorOverrides: overrides,
      });
    } else if (hadOverride) {
      setSettings({ ...settings, avatarColorOverrides: overrides });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      <button
        type="button"
        onClick={() => void openUrl(COMMUNITY_URL)}
        className="flex items-center gap-1.5 self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ExternalLink className="size-3" />
        Créer ou télécharger un avatar
      </button>

      {/* Une seule zone défilante : la grille des avatars du repo/customs, puis la section des
          pets Codex (lus depuis le disque, cf. CodexPetsSection). */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] content-start gap-2">
          {Object.values(avatarRegistry).map((bundle) => (
            <AvatarPickerCard
              key={bundle.id}
              bundle={bundle}
              isSelected={bundle.id === settings.avatarId}
              isCustom={false}
              colorOverride={settings.avatarColorOverrides[bundle.id]}
              onSelect={() => setSettings({ ...settings, avatarId: bundle.id })}
              onResetColors={() => resetColors(bundle.id)}
            />
          ))}
          {customBundles.map((bundle) => (
            <AvatarPickerCard
              key={bundle.id}
              bundle={bundle}
              isSelected={bundle.id === settings.avatarId}
              isCustom
              colorOverride={settings.avatarColorOverrides[bundle.id]}
              onSelect={() => setSettings({ ...settings, avatarId: bundle.id })}
              onResetColors={() => resetColors(bundle.id)}
              onDelete={() => deleteCustomAvatar(bundle.id)}
            />
          ))}
          <AddCustomAvatarCard
            onFileSelected={(file) => void handleFileSelected(file)}
          />
        </div>

        <CodexPetsSection />
      </div>

      {importError && <p className="text-xs text-destructive">{importError}</p>}

      <Separator />

      {/* Pas de couleurs à éditer pour un pet Codex (spritesheet figée, ni body ni eyes). */}
      {selectedBundle.kind === "procedural" && (
        <FieldGroup>
          {/* `orientation="responsive"` (cf. field.tsx) : même comportement que le Switch
            "Effets visuels" (label+description à gauche, contrôle à droite) mais qui
            repasse sous le label dès que le conteneur `field-group` (posé par FieldGroup
            lui-même, cf. `@container/field-group`) devient trop étroit -- le Switch reste
            toujours sur une ligne, les 2 swatches ont besoin de plus de place.

            Les boutons de reset sont dupliqués (cf. ResetButtons) plutôt que déplacés : en
            large ils doivent apparaître sous la description (donc dans FieldContent, à
            gauche des swatches), en étroit après les swatches (rendu existant, à ne pas
            changer) -- deux positions dans deux conteneurs flex différents, impossible à
            obtenir avec un seul élément + `order` CSS. Les <AlertDialog> restent uniques
            (state partagé), seuls les boutons déclencheurs sont dupliqués. */}
          <Field orientation="responsive">
            <FieldContent>
              <FieldTitle>
                <Palette className="size-4" />
                Couleurs
              </FieldTitle>
              <FieldDescription>
                Personnalise le corps et les yeux de l'avatar sélectionné.
              </FieldDescription>
              <ResetButtons
                className="hidden @md/field-group:mt-2 @md/field-group:flex @md/field-group:flex-row @md/field-group:flex-wrap"
                selectedName={selectedBundle.name}
                canResetCurrent={!!override}
                canResetAll={hasAnyOverride}
                onResetCurrentClick={() => setResetCurrentDialogOpen(true)}
                onResetAllClick={() => setResetAllDialogOpen(true)}
              />
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

          <Field className="@md/field-group:hidden">
            <ResetButtons
              className="flex flex-col"
              selectedName={selectedBundle.name}
              canResetCurrent={!!override}
              canResetAll={hasAnyOverride}
              onResetCurrentClick={() => setResetCurrentDialogOpen(true)}
              onResetAllClick={() => setResetAllDialogOpen(true)}
            />
          </Field>
        </FieldGroup>
      )}

      <AlertDialog
        open={resetCurrentDialogOpen}
        onOpenChange={setResetCurrentDialogOpen}
      >
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Réinitialiser tous les avatars ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Les couleurs éditées pour TOUS les avatars reviendront à celles
              d'origine. Les modifications actuelles seront perdues.
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
  );
}
