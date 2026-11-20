// Shared research workspace shell. Presentation only; navigation grants no authority.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getActiveSymbol, setActiveSymbol, SYMBOL_CHANGED_EVENT, SYMBOL_REGISTRY } from "../lib/activeSymbolStore.ts";
import { Glyph } from "../components/ui/Glyph.tsx";
import { WORKSPACE_GROUPS, SIDEBAR_WORKSPACES, visibleWorkspaceGroups, workspaceFor, searchWorkspaces } from "./navigation.ts";
import { ConnectionStatus } from "./ConnectionStatus.tsx";
import { WorkspaceSaveStatus } from "./WorkspaceGate.tsx";
import { useLocale } from "../lib/locale.tsx";
import "./workspace.css";

function CommandPalette({ onNavigate, onClose }: { onNavigate: (id: string) => void; onClose: () => void }) {
  const { t, workspaceLabel } = useLocale();
  const [query, setQuery] = useState(""); const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDivElement>(null); const results = searchWorkspaces(query);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null; dialog.current?.querySelector("input")?.focus();
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  useEffect(() => { dialog.current?.querySelector(`[data-result-index="${selected}"]`)?.scrollIntoView({ block: "nearest" }); }, [selected]);
  const choose = (id: string) => { onNavigate(id); onClose(); };
  return createPortal(<div className="command-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="command-dialog" ref={dialog} role="dialog" aria-modal="true" aria-label={t("switchWorkspace")} onKeyDown={(e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setSelected((index) => results.length ? (index + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length : 0); }
      if (e.key === "Enter" && e.target instanceof HTMLInputElement && results[selected]) { e.preventDefault(); choose(results[selected].id); }
      if (e.key === "Tab") {
        const controls = dialog.current?.querySelectorAll<HTMLElement>("input, button");
        if (controls?.length) { const first = controls[0], last = controls[controls.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }
    }}>
      <div className="command-input"><Glyph name="search" size={19} /><input aria-label={t("findWorkspace")} role="combobox" aria-expanded="true" aria-controls="workspace-results" aria-activedescendant={results[selected] ? `jump-${results[selected].id}` : undefined} placeholder={t("searchWorkspaces")} value={query} onChange={(e) => { setQuery(e.target.value); setSelected(0); }} /><button onClick={onClose} aria-label={t("closeSearch")}><kbd>Esc</kbd></button></div>
      <div className="command-results" id="workspace-results" role="listbox" aria-label={t("workspaceNavigation")}>{results.map((item, index) => <div key={item.id} id={`jump-${item.id}`} role="option" aria-selected={selected === index} data-result-index={index} className={`command-result ${selected === index ? "selected" : ""}`} onMouseEnter={() => setSelected(index)} onClick={() => choose(item.id)}><Glyph name={item.icon} size={18} /><span><strong>{workspaceLabel(item.id, item.label)}</strong><small>{item.description}</small></span><span className="result-group">{workspaceLabel(item.group, WORKSPACE_GROUPS.find((group) => group.id === item.group)?.label || item.group)}</span></div>)}{!results.length && <p className="command-empty">{t("noWorkspace")}</p>}</div>
      <div className="command-footer"><span>Arrow keys {t("select")}</span><span>{t("enterToOpen")}</span><span>{t("navigationOnly")}</span></div>
    </div>
  </div>, document.body);
}

export function Layout({ current, onNavigate, children }: { current: string; onNavigate: (id: string) => void; children: ReactNode }) {
  const { locale, t, toggleLocale, workspaceLabel } = useLocale();
  const [sym, setSym] = useState(getActiveSymbol); const [menu, setMenu] = useState<string | null>(null); const [palette, setPalette] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("quantsmart_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch { /* storage is optional */ }
    return "dark";
  });
  const [assetSynced, setAssetSynced] = useState(false);
  const header = useRef<HTMLElement>(null); const active = workspaceFor(current);
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("quantsmart_theme", theme); } catch { /* storage is optional */ }
  }, [theme]);
  useEffect(() => {
    const sync = () => { setSym(getActiveSymbol()); setAssetSynced(false); };
    const key = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { if (current === "home") return; e.preventDefault(); setPalette((p) => !p); setMenu(null); } if (e.key === "Escape") setMenu(null); };
    const outside = (e: PointerEvent) => { if (!header.current?.contains(e.target as Node)) setMenu(null); };
    window.addEventListener(SYMBOL_CHANGED_EVENT, sync); window.addEventListener("keydown", key); document.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener(SYMBOL_CHANGED_EVENT, sync); window.removeEventListener("keydown", key); document.removeEventListener("pointerdown", outside); };
  }, [current]);
  useEffect(() => {
    if (current === "home") setPalette(false);
  }, [current]);
  const go = (id: string) => { onNavigate(id); setMenu(null); };
  const visibleGroups = visibleWorkspaceGroups(current);
  return <div className="app-shell workspace-shell" data-focus-surface={current === "home" ? "m5-chart" : undefined}>
    <aside className="workspace-sidebar" aria-label={t("workspaceNavigation")}>
      <button className="sidebar-brand" onClick={() => go("home")} aria-label={t("openCockpit")}>
        <span className="sidebar-brand-mark" aria-hidden="true">◈</span>
        <span><strong>QUANTSMART</strong><small>{t("researchTerminal")}</small></span>
      </button>
      <div className="sidebar-rule" />
      <div className="sidebar-caption">{t("patternResearch")}</div>
      <nav className="sidebar-workspaces">
        {visibleGroups.map((group) => {
          const items = SIDEBAR_WORKSPACES.filter((item) => item.group === group.id);
          if (!items.length) return null;
          const groupActive = active?.group === group.id;
          return <section className={`sidebar-group ${groupActive ? "is-active" : ""}`} key={group.id}>
            <div className="sidebar-group-label"><span className="sidebar-group-dot" aria-hidden="true" />{workspaceLabel(group.id, group.label)}</div>
            <div className="sidebar-group-items">
              {items.map((item) => <button key={item.id} className={`sidebar-workspace-link ${current === item.id ? "is-active" : ""}`} aria-current={current === item.id ? "page" : undefined} onClick={() => go(item.id)}>
                <Glyph name={item.icon} size={15} /><span>{workspaceLabel(item.id, item.label)}</span>
              </button>)}
            </div>
          </section>;
        })}
      </nav>
      <div className="sidebar-footer"><span className="sidebar-mode-dot" aria-hidden="true" />{t("shadowMode")} <span className="sidebar-footer-hint">{t("readOnly")}</span></div>
    </aside>
    <header className="workspace-header" ref={header}>
      <div className="workspace-context"><button className="workspace-brand" onClick={() => go("home")} aria-label={t("openCockpit")}> <span aria-hidden="true">◈</span> QUANTSMART</button><span className="context-divider">/</span><span className={`asset-feed-dot ${assetSynced ? "synced" : ""}`} title={assetSynced ? t("currentLiveFeed") : t("liveFeedNotVerified")} /><select aria-label={t("asset")} disabled={current === "home"} title={current === "home" ? t("focusedAssetTitle") : t("asset")} value={current === "home" ? "XAUUSD" : sym} onChange={(e) => { setActiveSymbol(e.target.value); if (!SYMBOL_REGISTRY.find((s) => s.symbol === e.target.value)?.hasLocalData) go("assets"); }}>{!SYMBOL_REGISTRY.some(s=>s.symbol===sym)&&<option value={sym}>{sym} · imported</option>}{SYMBOL_REGISTRY.map((s) => <option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}</select></div>
      <nav className="workspace-navigation" aria-label={t("mainNavigation")}>{visibleGroups.map((group) => <div className="workspace-nav-group" key={group.id}><button className={`workspace-nav-link ${active?.group === group.id ? "is-active" : ""}`} aria-current={active?.group === group.id ? "page" : undefined} aria-expanded={group.id === "cockpit" || group.id === "microscope" ? undefined : menu === group.id} onClick={() => group.id === "cockpit" ? go("home") : group.id === "microscope" ? go("microscope") : setMenu(menu === group.id ? null : group.id)}>{workspaceLabel(group.id, group.label)}{group.id !== "cockpit" && group.id !== "microscope" && <span className="nav-chevron">▾</span>}</button>{menu === group.id && <div className="workspace-dropdown">{SIDEBAR_WORKSPACES.filter((item) => item.group === group.id).map((item) => <button key={item.id} className={current === item.id ? "selected" : ""} onClick={() => go(item.id)}><Glyph name={item.icon} size={16} /><span>{workspaceLabel(item.id, item.label)}</span></button>)}</div>}</div>)}</nav>
      <div className="workspace-mobile-nav"><button className="mobile-workspace-trigger" aria-expanded={menu === "mobile"} onClick={() => setMenu(menu === "mobile" ? null : "mobile")}><Glyph name="menu" size={16} /><span>{active ? workspaceLabel(active.id, active.label) : t("workspaceNavigation")}</span><span>▾</span></button>{menu === "mobile" && <div className="workspace-dropdown mobile-workspace-menu">{visibleGroups.map((group) => <div key={group.id}><div className="dropdown-group-label">{workspaceLabel(group.id, group.label)}</div>{SIDEBAR_WORKSPACES.filter((item) => item.group === group.id).map((item) => <button key={item.id} className={current === item.id ? "selected" : ""} onClick={() => go(item.id)}><Glyph name={item.icon} size={15} />{workspaceLabel(item.id, item.label)}</button>)}</div>)}</div>}</div>
      <div className="workspace-tools"><button className="command-trigger" onClick={() => setPalette(true)} aria-label={`${t("findWorkspace")} (Ctrl+K)`}><Glyph name="search" size={15} /><span>{t("jumpTo")}</span><kbd>{mac ? "⌘ K" : "Ctrl K"}</kbd></button><button className="theme-toggle" type="button" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? t("switchToLight") : t("switchToDark")} title={theme === "dark" ? t("switchToLight") : t("switchToDark")}>{theme === "dark" ? t("light") : t("dark")}</button><button className="theme-toggle locale-toggle" type="button" onClick={toggleLocale} aria-pressed={locale === "vi"} aria-label={`${t("switchLanguage")}: ${locale === "en" ? t("languageVietnamese") : t("languageEnglish")}`} title={`${t("switchLanguage")}: ${locale === "en" ? t("languageVietnamese") : t("languageEnglish")}`}>{locale === "en" ? `VI · ${t("languageVietnamese")}` : `EN · ${t("languageEnglish")}`}</button><ConnectionStatus locale={locale} onSynced={setAssetSynced} /></div>
    </header>
    {active && (active.group === "cockpit" || active.group === "microscope") && <nav className={`workspace-subnav ${current === "home" ? "workspace-subnav-cockpit" : ""}`} aria-label={t("workspaceViews")}>{SIDEBAR_WORKSPACES.filter((item) => item.group === active.group).map((item) => <button key={item.id} aria-current={item.id === current ? "page" : undefined} className={item.id === current ? "is-active" : ""} onClick={() => go(item.id)}>{workspaceLabel(item.id, item.label)}</button>)}{current === "home" ? <div id="cockpit-controls-slot" /> : <button className="workspace-help-link" onClick={() => go("help")}><Glyph name="book" size={14} />{t("guide")}</button>}</nav>}
    <main className="main main-wide" data-workspace={current} key={sym}>{active && current !== "help" && current !== "home" && <div className="workspace-orientation"><span>{workspaceLabel(active.group, WORKSPACE_GROUPS.find((g) => g.id === active.group)?.label || active.group)} / {workspaceLabel(active.id, active.label)}</span><details><summary>{t("aboutWorkspace")}</summary><p>{active.description} {t("aboutWorkspaceHelp")}</p></details></div>}{children}</main>
    <footer className="workspace-statusbar"><WorkspaceSaveStatus /><span>QUANTSMART <span>·</span> {t("researchWorkspace")}</span><span>{sym} <span>·</span> {t("shadowNoDecision")}</span></footer>
    {palette && current !== "home" && <CommandPalette onNavigate={go} onClose={() => setPalette(false)} />}
  </div>;
}
export function PageHeader({ title, sub }: { title: string; sub?: string }) { return <header><h1 className="page-title">{title}</h1>{sub && <p className="page-sub">{sub}</p>}</header>; }
