import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cockpit = resolve(root, "mfe_ux_lab/cockpit");
const require = createRequire(new URL("../mfe_ux_lab/cockpit/package.json", import.meta.url));

function usage() {
  console.error("Usage: node scripts/validate-xauusd-m5-holdout.mjs --manifest FILE --labels FILE --source FILE [--report FILE]");
}

function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (!arg.startsWith("--") || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error(`Missing value for ${arg}`);
    values[arg.slice(2)] = argv[++i];
  }
  return values;
}

async function loadValidator() {
  const { build } = require("esbuild");
  const bundle = await build({
    entryPoints: ["src/lib/xauusdM5HoldoutValidator.ts"],
    absWorkingDir: cockpit,
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
}

function parseJson(bytes, filename) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    throw new Error(`${filename} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function reportFor(args, validation) {
  return {
    schema: "quantsmart.xauusd-m5-holdout-intake/1",
    status: validation.ok ? "READY" : "NOT_READY",
    manifest_path: resolve(args.manifest),
    labels_path: resolve(args.labels),
    source_path: resolve(args.source),
    source_data_bundled: false,
    validation,
    authority: {
      focused_chart: "SHADOW_ONLY",
      decision: "NO_DECISION",
      live_apply_allowed: false,
    },
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

for (const key of ["manifest", "labels", "source"]) {
  if (typeof args[key] !== "string" || !args[key].trim()) {
    usage();
    process.exit(2);
  }
}

try {
  const [manifestBytes, labelsBytes, sourceBytes] = await Promise.all([
    readFile(resolve(args.manifest)),
    readFile(resolve(args.labels)),
    readFile(resolve(args.source)),
  ]);
  const validator = await loadValidator();
  const validation = await validator.validateXauusdM5Holdout({
    manifest: parseJson(manifestBytes, args.manifest),
    labels: parseJson(labelsBytes, args.labels),
    source_bytes: sourceBytes,
  });
  const report = reportFor(args, validation);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (args.report) await writeFile(resolve(args.report), serialized, "utf8");
  process.stdout.write(serialized);
  process.exit(validation.ok ? 0 : 1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const validation = {
    ok: false,
    errors: [message],
    dataset_id: null,
    bar_count: 0,
    label_count: 0,
    source_hash_verified: false,
    authority: "SHADOW_ONLY",
  };
  const report = reportFor(args, validation);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (args.report) await writeFile(resolve(args.report), serialized, "utf8");
  process.stdout.write(serialized);
  process.exit(1);
}
