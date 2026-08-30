// Port direct de baptistelechat-setup/settings/Claude/hooks/notify/src/messages.ps1
// (Start + Stop + les notification_type de Notification, contenu FR/humour repris tel
// quel). Les messages ne s'adressent plus à un prénom en dur : chaque ligne qui
// interpellait "Baptiste" porte un jeton `{name}` à la même place, résolu par
// `fillName()` -- soit remplacé par le nom configuré (Settings > "Comment dois-je
// t'appeler ?"), soit proprement retiré si aucun nom n'est configuré.
export const NOTIFICATION_MESSAGES: Record<string, string[]> = {
  start: [
    "Salut {name}, je suis là ! 👋",
    "En place et prêt à bosser ! 🚀",
    "C'est parti {name} ! 💻",
    "Prêt quand tu l'es {name} 😊",
    "Chargé et prêt au combat ! ⚡",
    "Je suis en ligne, qu'est-ce qu'on attaque ? 🔥",
    "Café chaud, cerveau allumé — go ! ☕",
    "Présent ! Dis-moi ce qu'il faut faire 🧠",
    "Connecté et concentré ! C'est quoi le plan ? 📋",
    "{name}, Jarvis en ligne 🦾",
    "Tu as pris la pilule rouge {name}, allons-y ! 💊",
    "Let's-a go {name} ! 🍄",
    "It's dangerous to go alone — take me ! 🗡️",
    "Je suis… inévitable. Et disponible. 🫰",
    "Ground control to Major Tom — je suis opérationnel 🚀",
    "You've got a friend in me 🤠",
    "L'hiver arrive... mais moi je suis chaud ! 🐺",
    "Accio Claude ! ⚡ Je suis invoqué.",
    "Réveille-toi {name} — j'ai du boulot pour toi 🕶️",
  ],
  stop: [
    "C'est fait {name} ! 🎉",
    "Terminé ! À toi de jouer {name} 🚀",
    "J'ai fini, jette un œil quand tu veux 👀",
    "Mission accomplie {name} ! 💪",
    "Voilà, c'est plié ! 🎯",
    "Boulot terminé, vérifie que ça te convient 🔍",
    "J'ai fait de mon mieux, à toi de valider ! ✨",
    "Fini ! Dis-moi si tu veux qu'on ajuste 🛠️",
    "C'est dans la boîte {name} ! 📦",
    "Tadaaa ! 🎩 C'est prêt.",
    "Hasta la vista, bug ! 🤖",
    "Élémentaire, mon cher {name} 🔍",
    "Vers l'infini et au-delà ! C'est dans la boîte 🚀",
    "Un Lannister paie toujours ses dettes. Moi j'honore mes commits 💰",
    "Que la Force soit avec ton code ✨",
    "That's not a bug, that's a feature. Et c'est fini. ✅",
    "On ne fait pas simplement merger du code… on le livre ! 💍",
    "Je reviendrai... avec la prochaine tâche 🤖",
    "Boom. Headshot. 🎯 Code livré.",
  ],
  permission_prompt: [
    "{name}, j'ai besoin de ta permission pour continuer 🔐",
    "Hé ! Une autorisation est requise de ta part 🔐",
    "Je suis bloqué {name}, une permission manque 🔐",
    "Stop ! Je ne peux pas avancer sans ton feu vert 🚦",
    "Une petite validation de ta part et je continue 🔑",
    "Tu ne passeras pas… sans m'avoir accordé ça 🧙",
    "Un grand pouvoir implique une grande responsabilité — accorde-moi la mienne 🕷️",
    "Ouvre les portes du vaisseau {name}… s'il te plaît 🛸",
    "J'ai besoin de ton autorisation. Maintenant. 🤖",
  ],
  idle_prompt: [
    "{name}, t'es là ? J'attends ta réponse 👀",
    "Je t'attends {name}, prends ton temps 💬",
    "Toujours là {name} ! Quand tu veux 🕐",
    "Je patiente sagement... mais je suis là 🐢",
    "En mode veille, réveille-moi quand tu reviens 😴",
    "T'inquiète, je garde le fil ! Reviens quand tu peux 🧵",
    "Un signe de vie {name} ? 👋",
    "Hello ? Is it me you're looking for ? 🎵",
    "Ground control to {name}... tu me reçois ? 🚀",
    "Je suis là comme Jack sur la porte... mais moi j'attends 🚢",
  ],
  auth_success: [
    "Authentification réussie, on peut continuer ! ✅",
    "Identité confirmée, go ! ✅",
    "Accès accordé {name} ! 🔓",
    "{name}, bienvenue 🖥️",
    "Identité vérifiée. Vous pouvez passer 🧙",
  ],
  elicitation_dialog: [
    "{name}, j'ai besoin d'une info de ta part ℹ️",
    "Une petite question {name}, avant que je continue ℹ️",
    "J'ai besoin d'un détail pour avancer 🤔",
    "Dis-moi juste une chose et je m'occupe du reste 📝",
    "On ne traverse pas simplement sans cette info 💍",
  ],
  elicitation_url_dialog: [
    "{name}, un service veut ouvrir une page — je te laisse regarder 🔗",
    "Y'a une URL qui veut se montrer, tu valides ? 🌐",
    "Un serveur MCP demande d'ouvrir un lien — check ça 🔗",
    "{name}, suis le lapin blanc... enfin, le lien 🐇",
  ],
  elicitation_complete: [
    "C'est répondu, on peut avancer ✅",
    "Formulaire bouclé, merci {name} ! ✅",
    "Info reçue, je continue ma route 🛣️",
  ],
  elicitation_response: [
    "Réponse envoyée, ça repart de mon côté 📤",
    "C'est transmis, on avance 🚀",
    "Message passé au serveur, la suite arrive 📨",
  ],
  agent_needs_input: [
    "{name}, un de mes sous-agents t'attend 👀",
    "Ton avis est requis pour un agent en cours 🙋",
    "Un sous-agent est bloqué sans toi — un coup de main ? 🔐",
    "{name}, un padawan attend ton feu vert 🧑‍🚀",
  ],
  agent_completed: [
    "Un sous-agent a terminé sa mission 🏁",
    "Un de mes agents a fini son taf, check le résultat 📋",
    "Mission de sous-agent bouclée, à toi de voir 🔍",
  ],
  quota_auto_resume_fired: [
    "Le quota est repassé au vert, je reprends le taf ⚡",
    "Pause quota terminée, on repart {name} 🔄",
    "Je reviendrai... et je suis revenu 🤖",
  ],
  quota_auto_resume_stale: [
    "Ça faisait un bail — le quota s'est déjà réinitialisé entre-temps 😴",
    "T'étais loin longtemps, le compteur a eu le temps de repartir 🕰️",
    "Longue pause détectée, mais bonne nouvelle : le quota a suivi 🌅",
  ],
  quota_auto_resume_disabled: [
    "J'ai arrêté d'attendre le quota, à toi de relancer {name} 🛑",
    "Je jette l'éponge sur l'attente automatique — un coup de main ? 🙏",
    "{name}, reprise auto désactivée, il faudra ta main ✋",
  ],
  default: [
    "{name}, j'ai besoin de toi ⚠️",
    "Quelque chose nécessite ton regard 👁️",
    "Petit check nécessaire de ta part ⚠️",
    "Hé, viens voir ça une seconde {name} 🔔",
    "Houston, on a un problème 🚀",
    "This is fine. 🔥🐶 Enfin... viens voir.",
    "Alerte rouge ! Boucliers en place {name} ! 🚨",
    "Il y a quelque chose de pourri au royaume du code 🎭",
  ],
};

function sample(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Résout le jeton `{name}` d'un message : remplacé par `name` si renseigné, sinon
 * proprement retiré (jeton en tête de phrase -> "{name}, reste" devient "Reste" avec la
 * majuscule recalée ; jeton ailleurs -> son espace précédent part avec lui, ce qui
 * laisse la ponctuation existante intacte). No-op sur les messages sans jeton. */
function fillName(message: string, name: string): string {
  if (name) return message.replace(/\{name\}/g, name);

  const leading = /^\{name\},\s*/.exec(message);
  if (leading) {
    const rest = message.slice(leading[0].length);
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return message.replace(/\s*\{name\}/g, "");
}

/** Sélectionne une phrase pour un event donné, personnalisée avec `name` si fourni
 * (cf. `HookySettings.callName`). `null` en dehors de SessionStart/Stop/Notification --
 * pas de bulle sur PreToolUse/PostToolUse/etc. Repli sur "default" si le
 * notification_type n'a pas d'entrée dédiée dans le pool (miroir de main.ps1). */
export function pickNotificationMessage(
  lastEvent?: string,
  notificationType?: string,
  name = "",
): string | null {
  if (lastEvent === "SessionStart")
    return fillName(sample(NOTIFICATION_MESSAGES.start), name);
  if (lastEvent === "Stop")
    return fillName(sample(NOTIFICATION_MESSAGES.stop), name);
  if (lastEvent === "Notification") {
    const pool =
      (notificationType && NOTIFICATION_MESSAGES[notificationType]) ||
      NOTIFICATION_MESSAGES.default;
    return fillName(sample(pool), name);
  }
  return null;
}
