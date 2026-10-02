import { atom, read, update } from "claude-code";
import type { Register } from "claude-code";

// Le backend de Hooky reste la seule source de vérité (animation, avatar actif) : ce mod ne fait
// qu'afficher le sprite correspondant à GET /state. Les sprites sont générés par l'app (src/lib/modSprites.ts).
const STATE_URL = "http://127.0.0.1:4242/state";

const shown = atom({ plugin: "hooky-pet", key: "shown" } as const, {
  key: "",
  svg: null as string | null,
});

export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    const poll = async () => {
      let key = "";
      let svg: string | null = null;
      try {
        const { ok, text } = await $.http.fetch(STATE_URL);
        if (ok) {
          const s = JSON.parse(text);
          const dir = `${s.spritesDir}/${s.spriteKey}`;
          key = `${dir}/${s.state}`;
          if ((await read($, shown)).key === key) return;
          for (const name of [s.state, "idle"]) {
            try {
              svg = await $.fs.read(
                `${dir}/${name}.svg`,
              );
              break;
            } catch {
              // sprite absent : on retente avec idle
            }
          }
        }
      } catch {
        // Hooky fermé : on n'affiche rien
      }
      await update($, shown, () => ({ key, svg }));
    };

    await poll();
    $.clock.every(500, poll);

    return next(e);
  });

  on("ui.render", { component: "AbovePrompt" }, async ($, e, next) => {
    // ponytail: un seul mod dessine la bande ; on empile le pet sur ce que les autres mods
    // (ex. clock-weather) ont déjà dessiné, au lieu de les écraser.
    const below = await next(e);
    const { svg } = await read($, shown);
    if (e.props.hasSurvey || !svg) return below;
    const { Box, Svg } = $.ui.resolve(e);
    return (
      <Box flexDirection="column">
        <Svg source={svg} alt="Hooky" width={64} height={64} />
        {below}
      </Box>
    );
  });
};
