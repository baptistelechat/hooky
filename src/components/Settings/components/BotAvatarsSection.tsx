import {
  botPaletteColor,
  botRegistry,
  buildBotBundle,
  DEFAULT_AVATAR_ID,
} from "@/components/avatarDefinition";
import { Button } from "@/components/ui/button";
import { useCustomBots } from "@/hooks/useCustomBots";
import { useSettings } from "@/hooks/useSettings";
import {
  customBotAvatarId,
  parseBotDefinition,
  readCustomBots,
} from "@/lib/customBots";
import { readSettings } from "@/lib/settings";
import { Bot, FileUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AddAvatarCard, HiddenFileInput } from "./AddAvatarCard";
import { AvatarPickerCard } from "./AvatarPickerCard";
import { PickerSection } from "./PickerSection";

const OPEN_BOT_URL = "https://dominikscholz.github.io/open-bot-avatar/";

/** Avatars Open Bot Avatar (Dominik Scholz, MIT) : couleurs éditables par avatar (footer du
 * picker), humeur des yeux, matière et suivi du curseur communs à tous. Le générateur du site
 * rend un JSON : import par collage (carte « + » ou Ctrl+V) ou par fichier, comme Dots Lab. */
export function BotAvatarsSection() {
  const [settings, setSettings] = useSettings();
  const [customBots, setCustomBots] = useCustomBots();
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customBundles = useMemo(
    () =>
      Object.entries(customBots).map(([id, definition]) =>
        buildBotBundle(id, definition, botPaletteColor(id)),
      ),
    [customBots],
  );

  function resetColors(avatarId: string) {
    const rest = { ...settings.avatarColorOverrides };
    delete rest[avatarId];
    setSettings({ ...settings, avatarColorOverrides: rest });
  }

  // Validation à l'import (`validateAvatar` du package) : rien d'invalide n'atteint la grille.
  function importBot(text: string, source: string) {
    setImportError(null);
    const result = parseBotDefinition(text);
    if (!result.ok) {
      setImportError(`${source} n'est pas un avatar Open Bot (${result.error}).`);
      return;
    }
    const id = customBotAvatarId();
    setCustomBots({ ...readCustomBots(), [id]: result.value });
    // Bascule directement sur le bot ajouté, comme pour un avatar custom.
    setSettings({ ...readSettings(), avatarId: id });
  }

  async function handlePasteClick() {
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setImportError(
        "Lecture du presse-papiers refusée. Utilise Ctrl+V dans cette fenêtre.",
      );
      return;
    }
    importBot(text, "Le contenu collé");
  }

  // Ctrl+V n'importe où dans l'onglet, même principe que DotsAvatarsSection (qui ne prend que
  // le SVG) : ici, un collage qui commence par `{` ou un bloc ```json.
  const importRef = useRef(importBot);
  useEffect(() => {
    importRef.current = importBot;
  });
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!/^\s*(\{|```)/.test(text)) return;
      e.preventDefault();
      importRef.current(text, "Le contenu collé");
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  function deleteCustomBot(id: string) {
    const rest = { ...customBots };
    delete rest[id];
    setCustomBots(rest);
    const overrides = { ...settings.avatarColorOverrides };
    delete overrides[id];
    setSettings({
      ...settings,
      avatarColorOverrides: overrides,
      avatarId: settings.avatarId === id ? DEFAULT_AVATAR_ID : settings.avatarId,
    });
  }

  return (
    <PickerSection
      value="bots"
      icon={Bot}
      title="Open Bot Avatar"
      count={Object.keys(botRegistry).length + customBundles.length}
      linkLabel="Créer sur Open Bot Avatar"
      linkUrl={OPEN_BOT_URL}
      actions={
        <>
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
          accept="application/json,.json"
          onFileSelected={(file) =>
            void file.text().then((text) => importBot(text, `"${file.name}"`))
          }
        />
        </>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] content-start gap-2">
        {Object.values(botRegistry).map((bundle) => (
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
            onDelete={() => deleteCustomBot(bundle.id)}
          />
        ))}
        <AddAvatarCard
          label="Coller un bot"
          onClick={() => void handlePasteClick()}
        />
      </div>
      {importError && (
        <p className="text-xs text-destructive" role="alert">
          {importError}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Avatars d'Open Bot Avatar, par Dominik Scholz (licence MIT). Pour
        ajouter le tien : sur le site, Generate puis envoie le prompt à un
        modèle, copie le JSON qu'il renvoie (ou Copy → JSON sous un avatar) et
        clique sur « Coller un bot » (ou fais Ctrl+V). Couleurs, yeux, matière
        et suivi du curseur se règlent en bas de la fenêtre.
      </p>
    </PickerSection>
  );
}
