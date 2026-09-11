import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { parseUsage, type ParsedUsageLimit } from "../lib/usage";

/** Quotas Claude Code, mis à jour par le poller backend (cf. spawn_usage_poller,
 * src-tauri/src/lib.rs -- un seul GET toutes les 3 minutes, peu importe le nombre de
 * fenêtres/re-renders côté front). `null` tant qu'aucune donnée exploitable n'est encore
 * disponible (chargement initial, ou dernière tentative en erreur).
 *
 * Lit `get_cached_usage` UNE FOIS au montage, en plus d'écouter `hooky-usage` : le premier
 * tick du poller part si tôt qu'il peut arriver avant que ce listener soit posé (webview
 * encore en train de charger) -- Tauri ne rejoue jamais un event passé à un listener tardif
 * (même piège déjà rencontré sur ce projet pour la bulle de notification). Sans ce fallback,
 * le panneau restait bloqué sur "Chargement…" jusqu'au tick suivant, 3 minutes plus tard. */
export function useClaudeUsage(): ParsedUsageLimit[] | null {
  const [limits, setLimits] = useState<ParsedUsageLimit[] | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void invoke<unknown>("get_cached_usage").then((data) => {
      if (!cancelled) setLimits(parseUsage(data));
    });

    listen<unknown>("hooky-usage", (event) => {
      setLimits(parseUsage(event.payload));
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return limits;
}
