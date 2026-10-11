import { emit } from "@tauri-apps/api/event";
import { DOTS_AVATAR_PREFIX } from "./dotsAvatars";

const STORAGE_KEY = "hooky-custom-dots";
export const CUSTOM_DOTS_EVENT = "hooky-custom-dots";

/** Index des personnages Dots Lab importés par l'utilisateur : `avatarId` -> nom affiché. La
 * planche elle-même vit dans IndexedDB (cf. plus bas), jamais ici. */
export type CustomDots = Record<string, { name: string }>;

/** `dots:custom:<uuid>` : sous le préfixe Dots Lab (même rendu), sans collision possible avec
 * une planche du repo (`dots:<fichier>`, un nom de fichier ne contient pas de `:`). */
export function customDotsAvatarId(): string {
  return `${DOTS_AVATAR_PREFIX}custom:${crypto.randomUUID()}`;
}

export function readCustomDots(): CustomDots {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Même pattern que writeCustomAvatars : persistance locale + diffusion aux autres fenêtres.
export function writeCustomDots(customDots: CustomDots): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customDots));
  void emit(CUSTOM_DOTS_EVENT, customDots);
}

// Les planches pèsent 0,5 à 0,9 Mo chacune : quelques-unes suffiraient à saturer le quota du
// localStorage (et chaque écriture rediffuserait le tout par IPC). IndexedDB est partagé par
// les fenêtres pet et settings (même origine), sans capability Tauri supplémentaire.
const DB_NAME = "hooky-dots";
const STORE = "sheets";
const SHEET_URL_PREFIX = "hooky-dots-sheet:";

/** Pseudo-URL d'une planche importée, comprise par `loadDotsSheetText` : un personnage
 * importé garde ainsi la même forme de bundle (`sheetUrl`) qu'une planche du repo. */
export function customDotsSheetUrl(avatarId: string): string {
  return `${SHEET_URL_PREFIX}${avatarId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function saveCustomDotsSheet(
  avatarId: string,
  sheet: string,
): Promise<void> {
  await withStore("readwrite", (store) => store.put(sheet, avatarId));
}

export async function deleteCustomDotsSheet(avatarId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(avatarId));
}

/** Texte de la planche derrière `sheetUrl` : IndexedDB pour un personnage importé, `fetch`
 * pour une planche du repo (asset Vite). */
export async function loadDotsSheetText(sheetUrl: string): Promise<string> {
  if (sheetUrl.startsWith(SHEET_URL_PREFIX)) {
    const sheet = await withStore<unknown>("readonly", (store) =>
      store.get(sheetUrl.slice(SHEET_URL_PREFIX.length)),
    );
    if (typeof sheet !== "string") throw new Error("planche importée absente");
    return sheet;
  }
  const response = await fetch(sheetUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
