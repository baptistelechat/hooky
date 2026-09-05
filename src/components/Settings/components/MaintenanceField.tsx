import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { RefreshCw, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { useUpdateStatus } from "@/hooks/useUpdateStatus";
import { checkForUpdate } from "@/lib/updateStatus";

type HookInstallStatus =
  | "idle"
  | "installing"
  | "installed"
  | "merged"
  | "already_up_to_date"
  | "error";

const HOOK_STATUS_LABEL: Record<
  Exclude<HookInstallStatus, "idle" | "installing">,
  string
> = {
  installed: "Hooks installés dans ~/.claude/settings.json.",
  merged: "Hooks fusionnés dans ~/.claude/settings.json (existants préservés).",
  already_up_to_date: "Déjà à jour, rien à faire.",
  error:
    "Échec -- vérifie que le fichier n'est pas verrouillé par un autre programme.",
};

type CheckStatus = "idle" | "checking" | "checked" | "error";

/** Installation des hooks Claude Code (fusion idempotente dans ~/.claude/settings.json,
 * cf. lib.rs `install_claude_hooks` + docs/hooks/README.md) et vérification manuelle de
 * mise à jour de l'app -- extrait de SettingsControls (auto-refactor >200 lignes), même
 * esprit que ConfigurationField. Feedback inline, pas de toast (cf. BDR-041 : ce projet
 * n'a volontairement aucune dépendance toast). */
export function MaintenanceField() {
  const [hookStatus, setHookStatus] = useState<HookInstallStatus>("idle");
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const update = useUpdateStatus();

  async function installHooks() {
    setHookStatus("installing");
    try {
      const result = await invoke<string>("install_claude_hooks");
      setHookStatus(result as HookInstallStatus);
    } catch {
      setHookStatus("error");
    }
  }

  async function checkUpdate() {
    setCheckStatus("checking");
    try {
      const status = await checkForUpdate();
      if (status.updateAvailable && status.htmlUrl) {
        await openUrl(status.htmlUrl);
      }
      setCheckStatus("checked");
    } catch {
      setCheckStatus("error");
    }
  }

  return (
    <>
      <Field>
        <FieldLabel className="items-center">
          <Webhook className="size-4" />
          Hooks Claude Code
        </FieldLabel>
        <FieldDescription>
          Fusionne les hooks Hooky dans ~/.claude/settings.json -- idempotent,
          ne touche jamais aux hooks déjà configurés.
        </FieldDescription>
        <Button
          responsive
          variant="outline"
          className="mt-1 self-start"
          disabled={hookStatus === "installing"}
          onClick={() => void installHooks()}
        >
          <Webhook data-icon="inline-start" />
          Mettre a jour ma configuration Claude Code
        </Button>
        {hookStatus !== "idle" && hookStatus !== "installing" && (
          <FieldDescription>{HOOK_STATUS_LABEL[hookStatus]}</FieldDescription>
        )}
      </Field>

      <FieldSeparator />

      <Field>
        <FieldLabel className="items-center">
          <RefreshCw className="size-4" />
          Mises à jour
        </FieldLabel>
        <FieldDescription>
          Compare la version installée à la dernière release publiée sur GitHub.
        </FieldDescription>
        <Button
          responsive
          variant="outline"
          className="relative mt-1 self-start"
          disabled={checkStatus === "checking"}
          onClick={() => void checkUpdate()}
        >
          <RefreshCw data-icon="inline-start" />
          Vérifier les mises à jour
          {/* Badge persistant (ne s'efface pas seul, contrairement aux badges de hooks
              éphémères sur le pet, cf. AnimationOverlay) -- reflète `update.updateAvailable`,
              qui vient du check silencieux au lancement OU d'un clic ici, partagé entre
              fenêtres via lib/updateStatus.ts. */}
          {update.updateAvailable && (
            <span
              aria-label="Mise à jour disponible"
              className="absolute -top-1 -right-1 size-2 rounded-full bg-destructive"
            />
          )}
        </Button>
        {update.updateAvailable && (
          <FieldDescription>
            Version {update.latestVersion} disponible.
          </FieldDescription>
        )}
        {checkStatus === "checked" && !update.updateAvailable && (
          <FieldDescription>Déjà à jour.</FieldDescription>
        )}
        {checkStatus === "error" && (
          <FieldDescription>Échec de la vérification.</FieldDescription>
        )}
      </Field>
    </>
  );
}
