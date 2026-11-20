import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cockpit = join(root, "mfe_ux_lab", "cockpit");
const src = join(cockpit, "src");

assert.equal(
  existsSync(join(src, "components", "CockpitTelemetry.tsx")),
  false,
  "unreachable CockpitTelemetry wrapper must stay removed",
);
assert.equal(
  existsSync(join(cockpit, "tools", "test-cockpit-instruments.mjs")),
  false,
  "standalone acceptance tool for the retired wrapper must stay removed",
);

const sourceFiles = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (/\.(?:ts|tsx|mjs)$/.test(entry.name)) sourceFiles.push(absolute);
  }
}
visit(src);
const references = sourceFiles.filter((file) =>
  /CockpitTelemetry|quant-(?:gauge|dial|telemetry|bias-bar)/.test(readFileSync(file, "utf8")),
);
assert.deepEqual(references, [], "active source must not retain retired telemetry wrapper references");

assert.equal(
  existsSync(join(src, "lib", "cockpitTelemetry.ts")),
  true,
  "shared telemetry normalization remains available to existing service consumers",
);
assert.equal(
  existsSync(join(src, "components", "SandboxDatasetControls.tsx")),
  true,
  "shared sandbox dataset controls remain available",
);

console.log("LEGACY COCKPIT TELEMETRY CLEANUP PASS: unreachable wrapper and standalone tool removed; shared telemetry and sandbox services preserved.");
