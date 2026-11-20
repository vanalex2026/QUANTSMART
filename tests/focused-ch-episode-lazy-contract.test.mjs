import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");

assert.doesNotMatch(
  source,
  /^import\s+\{[^\n]*chEpisodeSegments[^\n]*\}\s+from\s+["']\.\.\/lib\/ch\/chEpisodeSegments\.ts["'];/m,
  "focused Microscope must not eagerly import the legacy CH episode builder",
);
assert.match(
  source,
  /const hasEpisodeLens = !focused && !!activeCard\?\.modules\?\.includes\("ch_episode_lens"\);/,
  "CH episode overlays must remain disabled on focused home",
);
assert.match(
  source,
  /if \(!hasEpisodeLens \|\| replayBars\.length <= 30\) \{ setMsEpisodes\(null\); return; \}/,
  "legacy CH episode loading must stay behind the card and history guard",
);
assert.match(
  source,
  /import\("\.\.\/lib\/ch\/chEpisodeSegments\.ts"\)\.then\(\(\{ chEpisodeSegments \}\)/,
  "legacy CH episode builder must load dynamically",
);

console.log("focused CH episode lazy contract: ok");
