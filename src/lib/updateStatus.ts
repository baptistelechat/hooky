import { emit } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";

export interface UpdateStatus {
  updateAvailable: boolean;
  latestVersion?: string;
  htmlUrl?: string;
}

const STORAGE_KEY = "hooky-update-status";
export const UPDATE_STATUS_EVENT = "hooky-update-status";
const REPO = "baptistelechat/hooky";

const NO_UPDATE: UpdateStatus = { updateAvailable: false };

// Même contrat que src/lib/settings.ts (localStorage + event Tauri) : pas de store Zustand
// dans ce projet (aucune dépendance `zustand`, cf. package.json) -- ce pattern EST déjà le
// mécanisme d'état partagé cross-fenêtre existant, pas besoin d'en introduire un nouveau.
export function readUpdateStatus(): UpdateStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return NO_UPDATE;
    return { ...NO_UPDATE, ...(JSON.parse(raw) as Partial<UpdateStatus>) };
  } catch {
    return NO_UPDATE;
  }
}

function writeUpdateStatus(status: UpdateStatus): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  void emit(UPDATE_STATUS_EVENT, status);
}

// ponytail: comparaison numérique simple par segment (major.minor.patch) -- suffisant pour
// ce repo, dont les tags de release restent "vX.Y.Z" sans pré-release/build metadata.
function isNewer(latestTag: string, current: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => Number(n) || 0);
  const [latestMajor, latestMinor, latestPatch] = parse(latestTag);
  const [currentMajor, currentMinor, currentPatch] = parse(current);
  if (latestMajor !== currentMajor) return latestMajor > currentMajor;
  if (latestMinor !== currentMinor) return latestMinor > currentMinor;
  return latestPatch > currentPatch;
}

/** Interroge la dernière release GitHub (fetch natif, pas d'Axios) et compare son
 * `tag_name` à la version courante de l'app (`getVersion()`, déjà fournie par
 * `@tauri-apps/api/app` -- pas de nouvelle commande Tauri nécessaire). Écrit le résultat
 * en localStorage + le diffuse aux autres fenêtres, comme `writeSettings`. */
export async function checkForUpdate(): Promise<UpdateStatus> {
  const current = await getVersion();
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
  );
  if (!response.ok) {
    throw new Error(`GitHub API a répondu ${response.status}`);
  }
  const data = (await response.json()) as {
    tag_name: string;
    html_url: string;
  };
  const status: UpdateStatus = {
    updateAvailable: isNewer(data.tag_name, current),
    latestVersion: data.tag_name,
    htmlUrl: data.html_url,
  };
  writeUpdateStatus(status);
  return status;
}

let hasCheckedThisSession = false;

/** Check silencieux, une fois par lancement de l'app (pas de polling) -- appelé depuis
 * App.tsx pour la fenêtre "main" uniquement. Le flag module-level absorbe le double-appel
 * React.StrictMode (mount -> cleanup -> remount, cf. useHookyState) ; un échec réseau/API
 * reste silencieux, retenté naturellement au prochain lancement plutôt qu'avec un retry. */
export async function checkForUpdateOnce(): Promise<void> {
  if (hasCheckedThisSession) return;
  hasCheckedThisSession = true;
  try {
    await checkForUpdate();
  } catch {
    // ponytail: échec silencieux, cf. commentaire ci-dessus.
  }
}
