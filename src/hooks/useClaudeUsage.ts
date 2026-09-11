import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { parseUsage, type ParsedUsageLimit } from "../lib/usage";

export interface ClaudeUsageState {
  limits: ParsedUsageLimit[] | null;
  /** Nombre d'échecs consécutifs du poller backend (cf. `hooky-usage-error`,
   * spawn_usage_poller). Distingue "premier chargement en cours" (0) de "échoue en boucle
   * depuis un moment" (>0) -- les deux se traduisent par `limits === null`, ce qui laissait
   * la bulle bloquée sur "Chargement…" indéfiniment sans aucun signal (cf. BLK-032). Remis
   * à 0 dès qu'un succès arrive. */
  consecutiveFailures: number;
}

/** Quotas Claude Code, mis à jour par le poller backend (cf. spawn_usage_poller,
 * src-tauri/src/lib.rs -- un seul GET toutes les 3 minutes, peu importe le nombre de
 * fenêtres/re-renders côté front). `limits` reste `null` tant qu'aucune donnée exploitable
 * n'est encore disponible (chargement initial, ou dernière tentative en erreur).
 *
 * Lit `get_cached_usage` UNE FOIS au montage, en plus d'écouter `hooky-usage` : le premier
 * tick du poller part si tôt qu'il peut arriver avant que ce listener soit posé (webview
 * encore en train de charger) -- Tauri ne rejoue jamais un event passé à un listener tardif
 * (même piège déjà rencontré sur ce projet pour la bulle de notification). Sans ce fallback,
 * le panneau restait bloqué sur "Chargement…" jusqu'au tick suivant, 3 minutes plus tard. */
export function useClaudeUsage(): ClaudeUsageState {
  const [limits, setLimits] = useState<ParsedUsageLimit[] | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  useEffect(() => {
    let unlistenUsage: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;
    let cancelled = false;

    void invoke<unknown>("get_cached_usage").then((data) => {
      if (!cancelled) setLimits(parseUsage(data));
    });

    listen<unknown>("hooky-usage", (event) => {
      setConsecutiveFailures(0);
      setLimits(parseUsage(event.payload));
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlistenUsage = fn;
      }
    });

    listen<number>("hooky-usage-error", (event) => {
      setConsecutiveFailures(event.payload);
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlistenError = fn;
      }
    });

    return () => {
      cancelled = true;
      unlistenUsage?.();
      unlistenError?.();
    };
  }, []);

  return { limits, consecutiveFailures };
}
