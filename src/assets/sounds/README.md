# Sons du pet

Source : [uisfx](https://uisfx.com) 0.4.0 (audio CC0, cf. `LICENSE-AUDIO`). 12 « feels » (un
dossier chacun), 15 cues MP3 + 1 boucle OGG par feel — le mapping événement → cue est dans
`src/lib/sounds.ts`.

Les fichiers ne sont **pas** les originaux : le volume a été égalisé pour que tous les feels
sonnent au même niveau (les originaux vont de −14 dB à −23 dB de RMS, zen étant nettement plus
discret qu'arcade).

- **Cues (MP3)** : un gain unique par feel (pas par cue, pour garder l'équilibre voulu entre
  les cues d'un même feel) amène le RMS actif moyen à −15 dBFS, plafonné pour qu'aucun pic ne
  dépasse −1 dBFS.
- **Boucle `streaming` (OGG, stéréo)** : au même niveau que les cues (−15 dBFS de RMS) : la
  discrétion vient du curseur « Volume de l'ambiance » (30 % par défaut), pas du fichier. OGG et non MP3 : le MP3 ajoute du silence d'encodage qui ferait un trou à la
  jointure de la boucle. Jouée via `AudioBufferSourceNode` (cf. `startWorkLoop`).

À refaire de la même façon si des cues sont ajoutés ou remplacés.
