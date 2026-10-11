import { useSyncExternalStore } from "react";
import { loadDotsSheetText } from "../lib/customDots";
import { splitDotsSheet, type DotsStateName } from "../lib/dotsAvatars";

/** Planche découpée et prête à afficher : une URL `blob:` par état (lue par un `<img>`, donc
 * animée mais jamais exécutée -- un SVG chargé comme image ne lance aucun script). */
export interface LoadedDotsSheet {
  color?: string;
  urls: Record<DotsStateName, string>;
}

// Store module-level (une instance par webview), même raison que `useCodexPets` : une planche
// est partagée par le pet flottant, sa carte de picker et ~25 cartes de la grille Animation --
// un téléchargement + découpage par consommateur serait absurde. Les URLs `blob:` vivent
// autant que la webview (quelques Mo au total), jamais révoquées.
const sheets = new Map<string, LoadedDotsSheet>();
const loading = new Set<string>();
const listeners = new Set<() => void>();

function load(sheetUrl: string) {
  if (sheets.has(sheetUrl) || loading.has(sheetUrl)) return;
  loading.add(sheetUrl);
  loadDotsSheetText(sheetUrl)
    .then((text) => {
      const sheet = splitDotsSheet(text);
      if (!sheet)
        throw new Error("planche Dots Lab invalide (8 cases attendues)");
      const urls = {} as Record<DotsStateName, string>;
      for (const [state, svg] of Object.entries(sheet.states)) {
        urls[state as DotsStateName] = URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml" }),
        );
      }
      sheets.set(sheetUrl, { color: sheet.color, urls });
      listeners.forEach((listener) => listener());
    })
    .catch((error: unknown) =>
      console.error(`[dots] planche illisible : ${sheetUrl}`, error),
    )
    .finally(() => loading.delete(sheetUrl));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Planche découpée pour `sheetUrl`, `undefined` tant qu'elle charge (ou si `sheetUrl` est
 * absent : avatar d'un autre type, le hook reste appelable sans condition). */
export function useDotsSheet(
  sheetUrl: string | undefined,
): LoadedDotsSheet | undefined {
  const sheet = useSyncExternalStore(subscribe, () =>
    sheetUrl ? sheets.get(sheetUrl) : undefined,
  );
  // Déclenché pendant le render plutôt que dans un effet : idempotent (garde `loading`), et la
  // planche part charger une frame plus tôt.
  if (sheetUrl && !sheet) load(sheetUrl);
  return sheet;
}
