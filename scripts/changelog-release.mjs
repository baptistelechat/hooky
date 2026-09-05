#!/usr/bin/env node
// Bascule la section `## [Unreleased]` de CHANGELOG.md vers `## [X.Y.Z] - <date>` --
// tourne dans le hook "version" de `pnpm version`, donc `package.json` porte déjà la
// nouvelle version au moment de l'exécution (même contrat que sync-version.mjs).
//
// Échoue volontairement (exit 1) si la section Unreleased est vide : mieux vaut bloquer
// le bump que publier une release sans note -- cf. le "Full Changelog: <lien>" vide
// constaté sur v0.1.0, qu'on ne veut plus reproduire.
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const changelog = readFileSync("CHANGELOG.md", "utf8");

const unreleasedHeading = "## [Unreleased]";
const start = changelog.indexOf(unreleasedHeading);
if (start === -1) {
  console.error('CHANGELOG.md : section "## [Unreleased]" introuvable.');
  process.exit(1);
}

const afterHeadingLine = changelog.indexOf("\n", start) + 1;
const nextHeading = changelog.indexOf("\n## [", afterHeadingLine);
const body = changelog
  .slice(afterHeadingLine, nextHeading === -1 ? changelog.length : nextHeading)
  .trim();

if (!body) {
  console.error(
    'CHANGELOG.md : section "## [Unreleased]" vide -- ajoute au moins une ligne ' +
      "avant de bump la version (cf. https://keepachangelog.com/en/1.0.0/).",
  );
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const rest = nextHeading === -1 ? "" : changelog.slice(nextHeading + 1);

const updated =
  changelog.slice(0, start) +
  `${unreleasedHeading}\n\n## [${version}] - ${today}\n\n${body}\n\n` +
  rest;

const linkRefPattern = /^\[Unreleased\]: (.+)\/compare\/v[\w.-]+\.\.\.HEAD$/m;
const match = updated.match(linkRefPattern);
const withLinks = match
  ? updated.replace(
      linkRefPattern,
      `[Unreleased]: ${match[1]}/compare/v${version}...HEAD\n[${version}]: ${match[1]}/releases/tag/v${version}`,
    )
  : updated;

writeFileSync("CHANGELOG.md", withLinks);
console.log(`CHANGELOG.md: [Unreleased] -> [${version}] - ${today}`);
