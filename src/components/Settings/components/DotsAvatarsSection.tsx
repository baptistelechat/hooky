import {
  buildCustomDotsBundle,
  DEFAULT_AVATAR_ID,
  dotsDisplayName,
  dotsRegistry,
} from "@/components/avatarDefinition";
import { Button } from "@/components/ui/button";
import { useCustomDots } from "@/hooks/useCustomDots";
import { useSettings } from "@/hooks/useSettings";
import {
  customDotsAvatarId,
  deleteCustomDotsSheet,
  readCustomDots,
  saveCustomDotsSheet,
} from "@/lib/customDots";
import { splitDotsSheet } from "@/lib/dotsAvatars";
import { readSettings } from "@/lib/settings";
import { FileUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddAvatarCard, HiddenFileInput } from "./AddAvatarCard";
import { AvatarPickerCard } from "./AvatarPickerCard";
import { PickerSectionHeader } from "./PickerSectionHeader";

const DOTS_LAB_URL = "https://dots-lab.pages.dev/";
// Une planche animée pèse 0,5 à 0,9 Mo : au-delà, ce n'est pas un export Dots Lab.
const MAX_SHEET_LENGTH = 5_000_000;
const INVALID_SHEET_MESSAGE =
  "n'est pas une planche Dots Lab. Dans Dots Lab : flèche à côté de « Copy animated SVG » → All 8 states → Copy SVG sheet.";

/** Personnages créés avec Dots Lab (Guillaume, @guillaume_rygn) : ceux livrés avec Hooky avec
 * son autorisation (cf. src/components/dots/README.md), puis ceux importés par l'utilisateur.
 * Dots Lab copie la planche dans le presse-papiers (« Copy SVG sheet ») : l'import se fait donc
 * d'abord par collage (carte « + » ou Ctrl+V), le fichier `.svg` restant possible (en-tête). Comme un pet
 * Codex, pas de couleurs éditables -- la couleur fait partie de la planche. */
export function DotsAvatarsSection() {
  const [settings, setSettings] = useSettings();
  const [customDots, setCustomDots] = useCustomDots();
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customBundles = useMemo(
    () =>
      Object.entries(customDots).map(([id, { name }]) =>
        buildCustomDotsBundle(id, name),
      ),
    [customDots],
  );

  // Validation à l'import, pas au rendu : seule une planche que `splitDotsSheet` sait découper
  // est enregistrée. Elle n'est jamais exécutée (affichée dans un `<img>`, cf. useDotsSheet).
  async function importSheet(sheet: string, name: string, source: string) {
    setImportError(null);
    if (sheet.length > MAX_SHEET_LENGTH || !splitDotsSheet(sheet)) {
      setImportError(`${source} ${INVALID_SHEET_MESSAGE}`);
      return;
    }

    const id = customDotsAvatarId();
    try {
      await saveCustomDotsSheet(id, sheet);
    } catch (e) {
      setImportError("Impossible d'enregistrer ce personnage.");
      console.error("Dots import error:", e);
      return;
    }
    // Relus après l'`await` : l'état capturé au clic peut avoir changé entre-temps.
    setCustomDots({ ...readCustomDots(), [id]: { name } });
    // Bascule directement sur le personnage ajouté, comme pour un avatar custom.
    setSettings({ ...readSettings(), avatarId: id });
  }

  function importPastedSheet(sheet: string) {
    const name = `Dots perso ${Object.keys(readCustomDots()).length + 1}`;
    return importSheet(sheet, name, "Le contenu collé");
  }

  async function handleFileSelected(file: File) {
    await importSheet(
      await file.text(),
      dotsDisplayName(file.name.replace(/\.svg$/i, "")),
      `"${file.name}"`,
    );
  }

  async function handlePasteClick() {
    let sheet: string;
    try {
      sheet = await navigator.clipboard.readText();
    } catch {
      setImportError(
        "Lecture du presse-papiers refusée. Utilise Ctrl+V dans cette fenêtre.",
      );
      return;
    }
    await importPastedSheet(sheet);
  }

  // Ctrl+V n'importe où dans l'onglet : ne demande aucune permission au webview, contrairement
  // à `navigator.clipboard.readText`. Un collage qui n'est pas du SVG (ou qui vise un champ de
  // saisie) est ignoré sans message. Le handler lit la dernière version d'`importPastedSheet`
  // via une ref, pour ne pas réabonner le listener à chaque render.
  const pasteHandlerRef = useRef(importPastedSheet);
  useEffect(() => {
    pasteHandlerRef.current = importPastedSheet;
  });
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text.trimStart().startsWith("<svg")) return;
      e.preventDefault();
      void pasteHandlerRef.current(text);
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  function deleteCustomDots(id: string) {
    const rest = { ...customDots };
    delete rest[id];
    setCustomDots(rest);
    deleteCustomDotsSheet(id).catch((e: unknown) =>
      console.error("Dots delete error:", e),
    );
    if (settings.avatarId === id) {
      setSettings({ ...settings, avatarId: DEFAULT_AVATAR_ID });
    }
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Personnages Dots Lab">
      <PickerSectionHeader
        title="Dots Lab"
        linkLabel="Créer sur Dots Lab"
        linkUrl={DOTS_LAB_URL}
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp data-icon="inline-start" />
          Importer un fichier
        </Button>
        <HiddenFileInput
          ref={fileInputRef}
          accept="image/svg+xml,.svg"
          onFileSelected={(file) => void handleFileSelected(file)}
        />
      </PickerSectionHeader>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] content-start gap-2">
        {Object.values(dotsRegistry).map((bundle) => (
          <AvatarPickerCard
            key={bundle.id}
            bundle={bundle}
            isSelected={bundle.id === settings.avatarId}
            isCustom={false}
            colorOverride={undefined}
            onSelect={() => setSettings({ ...settings, avatarId: bundle.id })}
            onResetColors={() => undefined}
          />
        ))}
        {customBundles.map((bundle) => (
          <AvatarPickerCard
            key={bundle.id}
            bundle={bundle}
            isSelected={bundle.id === settings.avatarId}
            isCustom
            colorOverride={undefined}
            onSelect={() => setSettings({ ...settings, avatarId: bundle.id })}
            onResetColors={() => undefined}
            onDelete={() => deleteCustomDots(bundle.id)}
          />
        ))}
        <AddAvatarCard
          label="Coller un personnage"
          onClick={() => void handlePasteClick()}
        />
      </div>
      {importError && (
        <p className="text-xs text-destructive" role="alert">
          {importError}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Personnages créés avec Dots Lab, par Guillaume (@guillaume_rygn). Pour
        ajouter le tien : dans Dots Lab, ouvre la flèche à côté de « Copy
        animated SVG », choisis All 8 states → Copy SVG sheet, puis clique sur «
        Coller un personnage » (ou fais Ctrl+V).
      </p>
    </section>
  );
}
