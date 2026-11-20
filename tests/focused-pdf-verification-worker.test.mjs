import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const microscope = readFileSync(new URL("../mfe_ux_lab/cockpit/src/pages/Microscope.tsx", import.meta.url), "utf8");
const hook = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/usePdfSignalVerification.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../mfe_ux_lab/cockpit/src/lib/pdfSignalVerification.worker.ts", import.meta.url), "utf8");

assert.match(hook, /new Worker\(new URL\("\.\/pdfSignalVerification\.worker\.ts", import\.meta\.url\)/,
  "PDF verification must execute in its dedicated worker");
assert.match(hook, /generation\.current\s*(?:\+\+|\+=\s*1)/, "verification cleanup must invalidate queued worker replies");
assert.match(hook, /active\.onmessage = null[\s\S]*active\.terminate\(\)/,
  "verification cleanup must detach handlers before terminating the worker");
assert.match(worker, /verifyPdfSignalReceipt\(data\.input, data\.source\)/,
  "the worker must preserve the existing receipt implementation and inputs");
assert.match(worker, /PDF_SIGNAL_VERIFICATION_FAILED/,
  "worker failures must fail closed through the hook");
assert.match(microscope, /usePdfSignalVerification/,
  "focused Microscope must consume the asynchronous verification hook");
assert.doesNotMatch(microscope, /import\s*\{\s*verifyPdfSignalReceipt\s*\}\s*from\s*["']\.\.\/lib\/pdfSignalVerification\.ts/,
  "focused Microscope must not import the blocking receipt function directly");
assert.doesNotMatch(microscope, /const\s+pdfSignalVerification\s*=\s*useMemo\([\s\S]*?verifyPdfSignalReceipt\(/,
  "focused Microscope must not run PDF receipt verification synchronously during render");

console.log("FOCUSED PDF VERIFICATION WORKER PASS: receipt verification stays off the chart render thread with generation-safe cleanup.");
