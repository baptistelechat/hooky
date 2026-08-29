// Port direct de baptistelechat-setup/settings/Claude/hooks/notify/src/messages.ps1
// (Stop + les notification_type de Notification, contenu FR/humour repris tel quel).
// "Start" non repris ici : Hooky ne déclenche pas de bulle sur SessionStart (juste le son,
// cf. NotificationBubble/index.tsx), pas besoin du pool de phrases.
export const NOTIFICATION_MESSAGES: Record<string, string[]> = {
  stop: [
    "C'est fait Baptiste ! 🎉",
    "Terminé ! À toi de jouer Baptiste 🚀",
    "J'ai fini, jette un œil quand tu veux 👀",
    "Mission accomplie Baptiste ! 💪",
    "Voilà, c'est plié ! 🎯",
    "Boulot terminé, vérifie que ça te convient 🔍",
    "J'ai fait de mon mieux, à toi de valider ! ✨",
    "Fini ! Dis-moi si tu veux qu'on ajuste 🛠️",
    "C'est dans la boîte Baptiste ! 📦",
    "Tadaaa ! 🎩 C'est prêt.",
    "Hasta la vista, bug ! 🤖",
    "Élémentaire, mon cher Baptiste 🔍",
    "Vers l'infini et au-delà ! C'est dans la boîte 🚀",
    "Un Lannister paie toujours ses dettes. Moi j'honore mes commits 💰",
    "Que la Force soit avec ton code ✨",
    "That's not a bug, that's a feature. Et c'est fini. ✅",
    "On ne fait pas simplement merger du code… on le livre ! 💍",
    "Je reviendrai... avec la prochaine tâche 🤖",
    "Boom. Headshot. 🎯 Code livré.",
  ],
  permission_prompt: [
    "Baptiste, j'ai besoin de ta permission pour continuer 🔐",
    "Hé ! Une autorisation est requise de ta part 🔐",
    "Je suis bloqué Baptiste, une permission manque 🔐",
    "Stop ! Je ne peux pas avancer sans ton feu vert 🚦",
    "Une petite validation de ta part et je continue 🔑",
    "Tu ne passeras pas… sans m'avoir accordé ça 🧙",
    "Un grand pouvoir implique une grande responsabilité — accorde-moi la mienne 🕷️",
    "Ouvre les portes du vaisseau Baptiste… s'il te plaît 🛸",
    "J'ai besoin de ton autorisation. Maintenant. 🤖",
  ],
  idle_prompt: [
    "Baptiste, t'es là ? J'attends ta réponse 👀",
    "Je t'attends Baptiste, prends ton temps 💬",
    "Toujours là Baptiste ! Quand tu veux 🕐",
    "Je patiente sagement... mais je suis là 🐢",
    "En mode veille, réveille-moi quand tu reviens 😴",
    "T'inquiète, je garde le fil ! Reviens quand tu peux 🧵",
    "Un signe de vie Baptiste ? 👋",
    "Hello ? Is it me you're looking for ? 🎵",
    "Ground control to Baptiste... tu me reçois ? 🚀",
    "Je suis là comme Jack sur la porte... mais moi j'attends 🚢",
  ],
  auth_success: [
    "Authentification réussie, on peut continuer ! ✅",
    "Identité confirmée, go ! ✅",
    "Accès accordé Baptiste ! 🔓",
    "Accès autorisé. Bienvenue, Baptiste 🖥️",
    "Identité vérifiée. Vous pouvez passer 🧙",
  ],
  elicitation_dialog: [
    "Baptiste, j'ai besoin d'une info de ta part ℹ️",
    "Une petite question Baptiste, avant que je continue ℹ️",
    "J'ai besoin d'un détail pour avancer 🤔",
    "Dis-moi juste une chose et je m'occupe du reste 📝",
    "On ne traverse pas simplement sans cette info 💍",
  ],
  elicitation_url_dialog: [
    "Un service veut ouvrir une page, Baptiste — je te laisse regarder 🔗",
    "Y'a une URL qui veut se montrer, tu valides ? 🌐",
    "Un serveur MCP demande d'ouvrir un lien — check ça 🔗",
    "Suis le lapin blanc, Baptiste... enfin, le lien 🐇",
  ],
  elicitation_complete: [
    "C'est répondu, on peut avancer ✅",
    "Formulaire bouclé, merci Baptiste ! ✅",
    "Info reçue, je continue ma route 🛣️",
  ],
  elicitation_response: [
    "Réponse envoyée, ça repart de mon côté 📤",
    "C'est transmis, on avance 🚀",
    "Message passé au serveur, la suite arrive 📨",
  ],
  agent_needs_input: [
    "Un de mes sous-agents t'attend, Baptiste 👀",
    "Ton avis est requis pour un agent en cours 🙋",
    "Un sous-agent est bloqué sans toi — un coup de main ? 🔐",
    "Un padawan attend ton feu vert, maître Baptiste 🧑‍🚀",
  ],
  agent_completed: [
    "Un sous-agent a terminé sa mission 🏁",
    "Un de mes agents a fini son taf, check le résultat 📋",
    "Mission de sous-agent bouclée, à toi de voir 🔍",
  ],
  quota_auto_resume_fired: [
    "Le quota est repassé au vert, je reprends le taf ⚡",
    "Pause quota terminée, on repart Baptiste 🔄",
    "Je reviendrai... et je suis revenu 🤖",
  ],
  quota_auto_resume_stale: [
    "Ça faisait un bail — le quota s'est déjà réinitialisé entre-temps 😴",
    "T'étais loin longtemps, le compteur a eu le temps de repartir 🕰️",
    "Longue pause détectée, mais bonne nouvelle : le quota a suivi 🌅",
  ],
  quota_auto_resume_disabled: [
    "J'ai arrêté d'attendre le quota, à toi de relancer Baptiste 🛑",
    "Je jette l'éponge sur l'attente automatique — un coup de main ? 🙏",
    "Reprise auto désactivée, il faudra la main de Baptiste ✋",
  ],
  default: [
    "Baptiste, j'ai besoin de toi ⚠️",
    "Quelque chose nécessite ton regard 👁️",
    "Petit check nécessaire de ta part ⚠️",
    "Hé, viens voir ça une seconde Baptiste 🔔",
    "Houston, on a un problème 🚀",
    "This is fine. 🔥🐶 Enfin... viens voir.",
    "Alerte rouge ! Boucliers en place Baptiste ! 🚨",
    "Il y a quelque chose de pourri au royaume du code 🎭",
  ],
};

function sample(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Sélectionne une phrase pour un event donné. `null` en dehors de Stop/Notification --
 * pas de bulle sur PreToolUse/PostToolUse/etc. Repli sur "default" si le
 * notification_type n'a pas d'entrée dédiée dans le pool (miroir de main.ps1). */
export function pickNotificationMessage(
  lastEvent?: string,
  notificationType?: string,
): string | null {
  if (lastEvent === "Stop") return sample(NOTIFICATION_MESSAGES.stop);
  if (lastEvent === "Notification") {
    const pool =
      (notificationType && NOTIFICATION_MESSAGES[notificationType]) ||
      NOTIFICATION_MESSAGES.default;
    return sample(pool);
  }
  return null;
}
