import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../mfe_ux_lab/cockpit/src/', import.meta.url);
assert.equal(existsSync(new URL('pages/WeeklyAudit.tsx', root)), false, 'retired weekly summary must not retain an inaccessible standalone table surface');
assert.equal(existsSync(new URL('pages/StrategyRanking.tsx', root)), false, 'retired compatibility map must not retain a standalone table surface');
const sources = {
  assets: readFileSync(new URL('components/AssetReadinessPanel.tsx', root), 'utf8'),
  coefficients: readFileSync(new URL('pages/HiddenCoefficients.tsx', root), 'utf8'),
  tuner: readFileSync(new URL('components/TriggerCoefTuner.tsx', root), 'utf8'),
};
for (const [name, source] of Object.entries(sources)) {
  assert.match(source, /className="coef-table-wrap"[^>]*role="region"[^>]*tabIndex=\{0\}/, `${name} table must be a keyboard-scrollable named region`);
  assert.match(source, /<table className="coef-table"[^>]*aria-label=/, `${name} table must expose an accessible name`);
  assert.match(source, /<caption className="coef-table-caption">/, `${name} table must state its evidence/provenance context`);
  assert.ok((source.match(/<th scope="col">/g) || []).length >= 2, `${name} table must scope column headers`);
  assert.ok((source.match(/<th scope="row"/g) || []).length >= 1, `${name} table must expose a row header for keyboard and screen-reader context`);
}
const styles = readFileSync(new URL('pages/coefficients.css', root), 'utf8');
assert.match(styles, /\.coef-table-wrap:focus-visible[\s\S]*outline: 2px solid var\(--border-active\)/, 'table viewport focus must remain visible in both themes');
assert.match(styles, /\.coef-table-caption[\s\S]*color: var\(--text-secondary\)/, 'table provenance captions must use theme tokens');
assert.match(styles, /\.coef-table \.coef-number[\s\S]*color: var\(--text-primary\)/, 'numeric evidence must remain readable in light mode');
assert.match(styles, /\.coef-table \.coef-name[\s\S]*color: var\(--text-primary\)/, 'row labels must use the theme text token');
assert.match(styles, /\.number-scrubber input[\s\S]*color: var\(--text-primary\)/, 'editable numeric evidence must use the theme text token');
assert.match(styles, /\.coef-table-wrap[\s\S]*scrollbar-color: var\(--border-panel\) var\(--bg-panel\)/, 'research table scrollbars must use theme surface tokens');
const csvStyles = readFileSync(new URL('components/csv-import.css', root), 'utf8');
const previewSources = {
  csvImport: readFileSync(new URL('components/CsvImportPanel.tsx', root), 'utf8'),
  decisionEvidence: readFileSync(new URL('components/DecisionEvidencePanel.tsx', root), 'utf8'),
  attribution: readFileSync(new URL('components/StrategyAttributionPanel.tsx', root), 'utf8'),
};
for (const [name, source] of Object.entries(previewSources)) {
  assert.match(source, /className="csv-import-preview"[^>]*role="region"[^>]*tabIndex=\{0\}[^>]*aria-label=/, `${name} preview must be a keyboard-scrollable named region`);
  assert.match(source, /<th scope="row">/, `${name} preview must expose a stable row header for screen-reader row context`);
}
assert.match(previewSources.csvImport, /<th scope="col">UTC time<\/th>/, 'import preview headers must scope columns');
assert.match(csvStyles, /\.csv-import-preview:focus-visible[\s\S]*outline: 2px solid var\(--accent-cyan\)/, 'evidence preview focus must remain visible in both themes');
assert.match(csvStyles, /\.csv-import[\s\S]*background: var\(--bg-panel\)/, 'CSV panels must use theme background tokens');
assert.match(csvStyles, /\.csv-import input,[\s\S]*background: var\(--bg-elevated\)/, 'CSV controls must use theme background tokens');
assert.match(csvStyles, /\.csv-import table[\s\S]*min-width: 560px/, 'evidence tables must preserve readable columns on narrow screens');
assert.match(csvStyles, /\.csv-import-preview[\s\S]*scrollbar-color: var\(--border-panel\) var\(--bg-panel\)/, 'evidence table scrollbars must use theme tokens');
assert.match(csvStyles, /\.csv-import table caption[\s\S]*color: var\(--text-secondary\)/, 'evidence captions must retain contrast in both themes');
assert.match(csvStyles, /\.csv-import thead th[\s\S]*color: var\(--text-secondary\)/, 'evidence headers must use theme text tokens');
console.log('RESEARCH TABLE ACCESSIBILITY PASS: evidence tables expose labelled keyboard scroll regions, captions, scoped headers, and theme-safe contrast.');
