import { useRef, useState, type ChangeEvent } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { Download, RotateCcw, Settings, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { DEFAULT_SETTINGS, type HookySettings } from "@/lib/settings";

interface ConfigurationFieldProps {
  settings: HookySettings;
  setSettings: (next: HookySettings) => void;
}

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

/** Export/import/reset des réglages -- extrait de SettingsControls (auto-refactor >200
 * lignes) pour rester le bloc "footer épinglé" de la fenêtre settings. */
export function ConfigurationField({
  settings,
  setSettings,
}: ConfigurationFieldProps) {
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
    <Field>
      <FieldLabel className="items-center">
        <Settings className="size-4" />
        Configuration
      </FieldLabel>
      <FieldDescription>
        Exporter, importer ou réinitialiser les réglages.
      </FieldDescription>
      <div className="mt-1 flex flex-col gap-2 @md/field-group:flex-row @md/field-group:flex-wrap">
        <Button
          responsive
          variant="outline"
          onClick={() => void exportSettings(settings)}
        >
          <Download data-icon="inline-start" />
          Exporter
        </Button>
        <Button
          responsive
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

        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogTrigger
            render={<Button responsive variant="destructive" />}
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
                Taille de l'avatar, avatar sélectionné, effets visuels et mode
                debug reviendront à leurs valeurs par défaut. Les modifications
                actuelles seront perdues.
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
  );
}
