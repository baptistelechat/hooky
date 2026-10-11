# Personnages Dots Lab

Chaque fichier `.svg` de ce dossier est une planche exportée depuis
[Dots Lab](https://dots-lab.pages.dev/) (flèche à côté de « Copy animated SVG » → **All 8 states → Copy SVG sheet**, style
**Animated**), enregistrée telle quelle. Hooky la découpe en 8 états à l'affichage (cf.
`src/lib/dotsAvatars.ts`).

Ajouter un personnage : déposer sa planche ici, le nom du fichier devient son nom
(`triangle-pills.svg` → « Triangle Pills »). Aucun changement de code.

Un utilisateur peut aussi importer sa propre planche depuis l'onglet Avatar (collage ou fichier
`.svg`) : elle est alors stockée en IndexedDB sur sa machine, pas dans ce dossier (cf.
`src/lib/customDots.ts`).

## Crédits et autorisation

Dots Lab est créé par Guillaume ([@guillaume_rygn](https://x.com/guillaume_rygn)). Ces
personnages ne sont pas couverts par une licence écrite : ils sont utilisés ici avec
l'autorisation donnée publiquement par leur auteur sous son annonce de lancement
(<https://x.com/guillaume_rygn/status/2105554685520146912>, réponses du 1er octobre 2026) :

- « yes you can ! i'm gonna open source it yes »
- « Sure, go for it! It's free to use »
- « Of course ! » (à la question d'une intégration directe dans un projet open source)

La licence AGPL-3.0 du dépôt couvre le code de Hooky, pas ces planches : elles restent l'œuvre
de leur auteur. Seuls les exports sont repris, pas le code du générateur.

## Planches du dépôt

| Fichier                 | Lien Dots Lab                                  |
| ----------------------- | ---------------------------------------------- |
| `flame.svg`             | <https://dots-lab.pages.dev/#m1404089f0ff5a5a> |
| `star.svg`              | <https://dots-lab.pages.dev/#m1800089f0ffc20e> |
| `briefcase.svg`         | <https://dots-lab.pages.dev/#m1704089f0b07350> |
| `triangle.svg`          | <https://dots-lab.pages.dev/#m1500089b03f95f5> |
| `round.svg`             | <https://dots-lab.pages.dev/#m1002089f01ed8c0> |
| `heart.svg`             | <https://dots-lab.pages.dev/#m1990069f09966ff> |
| `square.svg`            | <https://dots-lab.pages.dev/#m1600089i08e8e8e> |
| `drop.svg`              | <https://dots-lab.pages.dev/#m1310067f08e8e8e> |
| `triangle-pills.svg`    | <https://dots-lab.pages.dev/#m1510057903f95f5> |
| `cloud.svg`             | <https://dots-lab.pages.dev/#m1a60076a0ee7433> |
| `capsule.svg`           | <https://dots-lab.pages.dev/#m12100a8505ccb77> |
| `clover.svg`            | <https://dots-lab.pages.dev/#m1b10077j08a5a3a> |
| `round-pills.svg`       | <https://dots-lab.pages.dev/#m1010077f0161618> |
| `round-rings.svg`       | <https://dots-lab.pages.dev/#m103008af08844ee> |
| `round-slashes.svg`     | <https://dots-lab.pages.dev/#m1070079f0ee7433> |
| `round-rings-small.svg` | <https://dots-lab.pages.dev/#m1030035f0e4e4e1> |
| `round-plus.svg`        | <https://dots-lab.pages.dev/#m1050068f05ccb77> |
| `round-happy.svg`       | <https://dots-lab.pages.dev/#m1040069f0161618> |
| `round-squint.svg`      | <https://dots-lab.pages.dev/#m1080058f02f6bf0> |
