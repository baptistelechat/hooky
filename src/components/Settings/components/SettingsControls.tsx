import { useRef, useState, type ChangeEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Bug, Download, RotateCcw, Ruler, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field";
import { DEFAULT_SETTINGS, type HookySettings } from "@/lib/settings";
import { useSettings } from "@/hooks/useSettings";

// Le téléchargement navigateur (Blob + <a download>) n'est pas fiable dans une webview
// Tauri (bug connu, cross-plateforme, WebView2 inclus -- rien ne se déclenche, aucune
// erreur console). On passe par le vrai dialogue natif + une commande Rust minimale
// (`write_text_file`, src-tauri/src/lib.rs) plutôt que le plugin fs : une commande
// applicative custom n'a besoin d'aucune entrée de capability (contrairement à
// `fs:allow-write-text-file`, qui exigerait un scope de chemins pré-déclaré alors que
// le chemin n'est connu qu'après le choix de l'utilisateur dans le dialogue).
async function exportSettings(settings: HookySettings): Promise<void> {
  const path = await save({
    defaultPath: "hooky-settings.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!path) return;

  await invoke("write_text_file", {
    path,
    content: JSON.stringify(settings, null, 2),
  });
}

/** Réglages persistés (taille avatar, mode debug) + export/import/reset. Stockage
 * localStorage, diffusé aux autres fenêtres via l'event Tauri "hooky-settings" (cf.
 * useSettings). Chaque contrôle applique directement -- pas de bouton "Appliquer".
 * Mode debug en footer épinglé : reste visible même si le contenu au-dessus défile. */
export function SettingsControls() {
  const [settings, setSettings] = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text) as Partial<HookySettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      })
      // ponytail: fichier invalide -> import ignoré silencieusement, cas assez rare
      // (mauvais fichier choisi) pour ne pas justifier une UI d'erreur dédiée.
      .catch(() => {});
  };

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <FieldGroup className="flex-1 overflow-x-hidden overflow-y-auto pr-1">
        <Field>
          <FieldLabel htmlFor="avatar-size" className="items-center">
            <Ruler className="size-4" />
            Taille de l'avatar ({settings.avatarSize}px)
          </FieldLabel>
          <Slider
            id="avatar-size"
            value={settings.avatarSize}
            onValueChange={(value) =>
              setSettings({ ...settings, avatarSize: value as number })
            }
            min={80}
            max={240}
            step={10}
          />
        </Field>

        <FieldSeparator />

        <Field>
          <FieldLabel className="items-center">Configuration</FieldLabel>
          <FieldDescription>
            Exporter, importer ou réinitialiser les réglages.
          </FieldDescription>
          <div className="mt-1 flex flex-col gap-2 @md/field-group:flex-row @md/field-group:flex-wrap">
            <Button
              className="w-full @md/field-group:w-auto"
              variant="outline"
              onClick={() => void exportSettings(settings)}
            >
              <Download data-icon="inline-start" />
              Exporter
            </Button>
            <Button
              className="w-full @md/field-group:w-auto"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload data-icon="inline-start" />
              Importer
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              hidden
            />

            <AlertDialog
              open={resetDialogOpen}
              onOpenChange={setResetDialogOpen}
            >
              <AlertDialogTrigger
                render={
                  <Button
                    className="w-full @md/field-group:w-auto"
                    variant="destructive"
                  />
                }
              >
                <RotateCcw data-icon="inline-start" />
                Réinitialiser
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Réinitialiser les paramètres ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Taille de l'avatar et mode debug reviendront à leurs valeurs
                    par défaut. Les modifications actuelles seront perdues.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => {
                      // AlertDialogAction (variante base-ui) ne ferme pas le dialog
                      // automatiquement au clic, contrairement à AlertDialogCancel
                      // (qui enveloppe Close) -- fermeture explicite ici.
                      setSettings(DEFAULT_SETTINGS);
                      setResetDialogOpen(false);
                    }}
                  >
                    Réinitialiser
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Field>
      </FieldGroup>

      <FieldSeparator />

      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>
            <Bug className="size-4" />
            Mode debug
          </FieldTitle>
          <FieldDescription>
            Fond semi-opaque + animation/hook affichés sur le pet.
          </FieldDescription>
        </FieldContent>
        <Switch
          checked={settings.debugMode}
          onCheckedChange={(checked) =>
            setSettings({ ...settings, debugMode: checked })
          }
        />
      </Field>
    </div>
  );
}
