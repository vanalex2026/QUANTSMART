// Presentation registry. Navigation never executes a research or broker action.
import type { GlyphName } from "../components/ui/Glyph.tsx";
export const WORKSPACE_GROUPS = [
  { id: "cockpit", label: "Cockpit" }, { id: "microscope", label: "Microscope" },
  { id: "studio", label: "Strategy Studio" }, { id: "analytics", label: "Analytics" }, { id: "system", label: "System" },
] as const;
export type WorkspaceGroup = typeof WORKSPACE_GROUPS[number]["id"];
export interface Workspace { id: string; label: string; group: WorkspaceGroup; icon: GlyphName; description: string; aliases: string; showInSidebar?: boolean }
export const WORKSPACES: Workspace[] = [
  { id: "home", label: "XAUUSD M5 Chart", group: "cockpit", icon: "monitor", description: "Inspect the two-year XAUUSD M5 closed-bar chart with research annotations and drawing tools.", aliases: "home overview xauusd gold m5 chart tradingview pattern atlas" },
  { id: "microscope", label: "Chart & Replay", group: "microscope", icon: "microscope", description: "Inspect charts and replay strategy evaluations bar by bar.", aliases: "microscope chart history replay", showInSidebar: false },
  { id: "strategy-lab", label: "Strategy Lab", group: "studio", icon: "flask", description: "Review saved validation runs, OOS windows and module contributions.", aliases: "validation results", showInSidebar: false },
  { id: "strategy-canvas", label: "Canvas", group: "studio", icon: "window", description: "Assemble, save and validate a research Strategy Card.", aliases: "strategy canvas build create", showInSidebar: false },
  { id: "blocks-modules", label: "Blocks & Modules", group: "studio", icon: "puzzle", description: "Inspect blocks, modules, roles and their mechanisms.", aliases: "blocks modules library", showInSidebar: false },
  { id: "beast-lab", label: "Beast", group: "studio", icon: "beast", description: "Compose Cards by role and verify their source lineage.", aliases: "card beast ensemble", showInSidebar: false },
  { id: "formula-lab", label: "Coordinate Lab", group: "studio", icon: "ruler", description: "Explore formula curves, density and modeled geometry.", aliases: "quantlab coordinate formula", showInSidebar: false },
  { id: "assets", label: "Assets", group: "analytics", icon: "globe", description: "Inspect dataset availability and configure dated sources.", aliases: "assets symbol data", showInSidebar: false },
  { id: "hidden-coefficients", label: "Hidden Coefficients", group: "system", icon: "digits", description: "Audit configuration coefficients and edit a Shadow profile.", aliases: "coefficients calibration weights", showInSidebar: false },
  { id: "debugger", label: "Debugger", group: "system", icon: "wrench", description: "Inspect actual service payloads and source errors.", aliases: "debugger errors diagnostics", showInSidebar: false },
  { id: "help", label: "Guide", group: "system", icon: "book", description: "Get started, follow a task or look up a term.", aliases: "guide help getting started" },
];
/** The sidebar is the product surface. Legacy research builders remain route-compatible for old links,
 * but they are intentionally excluded from discovery so the trading workflow stays focused. */
export const SIDEBAR_WORKSPACES = WORKSPACES.filter((item) => item.showInSidebar !== false);
/** Keep the canonical chart home visually single-purpose. Secondary shell groups
 * remain available on every other route and through the command palette/direct hashes. */
export const visibleWorkspaceGroups = (current: string) => {
  const groups = WORKSPACE_GROUPS.filter((group) => SIDEBAR_WORKSPACES.some((item) => item.group === group.id));
  return current === "home" ? groups.filter((group) => group.id === "cockpit") : groups;
};
/** Legacy hashes stay usable while resolving to the single focused XAUUSD M5 surface. */
export const LEGACY_ROUTE_ALIASES: Record<string, string> = { "pattern-atlas": "home", "research-atlas": "home", "kidi-events": "home", "entry-danger": "home", "weekly-audit": "home", "strategy-ranking": "home", "analysis": "home", "playbook": "home" };
export const canonicalPage = (id: string) => LEGACY_ROUTE_ALIASES[id] || id;
export const workspaceFor = (id: string) => WORKSPACES.find((item) => item.id === canonicalPage(id));
export const validPage = (id: string) => !!workspaceFor(id);
/** Resolve a browser hash to the one canonical URL for its workspace. Invalid and
 * legacy hashes intentionally collapse to the focused XAUUSD M5 home surface. */
export const canonicalHash = (hash: string) => {
  // Accept links emitted by routers that include a leading or trailing slash
  // while still collapsing query-only/unknown hashes to the canonical home.
  const id = hash.replace(/^#\/*/, "").split("?")[0].replace(/\/+$/, "").trim();
  const canonical = canonicalPage(id);
  return `#${validPage(canonical) ? canonical : "home"}`;
};
export const pageFromHash = (hash: string) => canonicalHash(hash).slice(1);
const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
export function searchWorkspaces(query: string): Workspace[] {
  const phrase = normalize(query), terms = phrase.split(/\s+/).filter(Boolean);
  const score = (item: Workspace) => normalize(item.label).includes(phrase) ? 100 : normalize(item.aliases).includes(phrase) ? 80 : 10;
  return SIDEBAR_WORKSPACES.filter((item) => terms.every((term) => normalize(`${item.label} ${item.aliases} ${item.description}`).includes(term))).sort((a, b) => phrase ? score(b) - score(a) : 0);
}
