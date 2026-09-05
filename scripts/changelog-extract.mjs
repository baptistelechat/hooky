#!/usr/bin/env node
// Extrait le corps de la section `## [X.Y.Z]` de CHANGELOG.md pour une version donnée --
// réutilisé à la fois par la CI (corps de la GitHub Release) et manuellement
// (`node scripts/changelog-extract.mjs 0.1.0`, imprime le texte à coller où besoin).
import { readFileSync } from "node:fs";

const version = (process.argv[2] ?? "").replace(/^v/, "");
if (!version) {
  console.error("Usage: node scripts/changelog-extract.mjs <version|vVersion>");
  process.exit(1);
}

const changelog = readFileSync("CHANGELOG.md", "utf8");
const heading = `## [${version}]`;
const start = changelog.indexOf(heading);
if (start === -1) {
  console.error(`Aucune section "${heading}" trouvée dans CHANGELOG.md`);
  process.exit(1);
}

const afterHeadingLine = changelog.indexOf("\n", start) + 1;
const nextHeading = changelog.indexOf("\n## [", afterHeadingLine);
const raw = changelog.slice(
  afterHeadingLine,
  nextHeading === -1 ? undefined : nextHeading,
);
// La dernière section du fichier est suivie du bloc de liens de référence
// (`[X.Y.Z]: https://...`, en bas de fichier, style Keep a Changelog) -- pas de section
// suivante pour le délimiter, on le retire explicitement.
const body = raw.replace(/(\n\[[^\]]+\]: \S+)+\s*$/, "").trim();

if (!body) {
  console.error(`Section "${heading}" vide -- rien à publier.`);
  process.exit(1);
}

console.log(body);
