import { useState, useEffect, lazy, Suspense } from "react";
import { Layout } from "./shell/Layout.tsx";
import { canonicalHash, canonicalPage, pageFromHash, validPage, workspaceFor } from "./shell/navigation.ts";
import { WorkspaceErrorBoundary } from "./shell/WorkspaceErrorBoundary.tsx";
import { useLocale } from "./lib/locale.tsx";

// Keep only the shell eager. The focused home surface is a real loading boundary,
// so legacy research modules stay out of the initial bundle.
const Microscope = lazy(() => import("./pages/Microscope.tsx").then((m) => ({ default: m.Microscope })));
const StrategyLab = lazy(() => import("./pages/StrategyLab.tsx").then((m) => ({ default: m.StrategyLab })));
const StrategyCanvas = lazy(() => import("./pages/StrategyCanvas.tsx").then((m) => ({ default: m.StrategyCanvas })));
const Debugger = lazy(() => import("./pages/Debugger.tsx").then((m) => ({ default: m.Debugger })));
const HiddenCoefficients = lazy(() => import("./pages/HiddenCoefficients.tsx").then((m) => ({ default: m.HiddenCoefficients })));
const HelpManual = lazy(() => import("./pages/HelpManual.tsx").then((m) => ({ default: m.HelpManual })));
const AssetReadinessPanel = lazy(() => import("./components/AssetReadinessPanel.tsx").then((m) => ({ default: m.AssetReadinessPanel })));
const BlockModuleLibrary = lazy(() => import("./components/BlockModuleLibrary.tsx").then((m) => ({ default: m.BlockModuleLibrary })));
const FormulaLabPage = lazy(() => import("./formulaLab/FormulaLabPage.tsx").then((m) => ({ default: m.FormulaLabPage })));

// Legacy research routes remain lazy and hash-compatible, while the visible home surface
// stays focused on causal candle evidence and read-only broker history.
export function App() {
  const { t } = useLocale();
  const [page, setPage] = useState(() => pageFromHash(window.location.hash));
  const navigate = (id: string) => { const canonical = canonicalPage(id); if (!validPage(canonical)) return; setPage(canonical); if (window.location.hash !== `#${canonical}`) window.location.hash = canonical; };
  useEffect(() => {
    const checkHash = () => {
      const canonical = canonicalHash(window.location.hash);
      if (window.location.hash !== canonical) window.history.replaceState(null, "", canonical);
      setPage(pageFromHash(canonical));
    };
    checkHash();
    // cross-page navigation (for example, Strategy Lab -> Microscope) via a custom event
    const onNav = (e: Event) => { const id = (e as CustomEvent).detail; if (typeof id === "string") navigate(id); };
    window.addEventListener("hashchange", checkHash);
    window.addEventListener("mfe-nav", onNav);
    return () => { window.removeEventListener("hashchange", checkHash); window.removeEventListener("mfe-nav", onNav); };
  }, []);
  return (
    <Layout
      current={page}
      onNavigate={navigate}
    >
      <WorkspaceErrorBoundary key={page} routeLabel={workspaceFor(page)?.label}>
      <Suspense fallback={<div style={{ padding: 24, color: "var(--mfe-muted)" }}>{t("loadingWorkspace")}</div>}>
        {page === "home" && <Microscope focused />}
        {page === "help" && <HelpManual />}
        {page === "microscope" && <Microscope />}
        {page === "strategy-lab" && <StrategyLab />}
        {page === "assets" && <AssetReadinessPanel />}
        {page === "blocks-modules" && <BlockModuleLibrary />}
        {page === "strategy-canvas" && <StrategyCanvas />}
        {page === "formula-lab" && <FormulaLabPage />}
        {page === "hidden-coefficients" && <HiddenCoefficients />}
        {page === "debugger" && <Debugger />}
      </Suspense>
      </WorkspaceErrorBoundary>
    </Layout>
  );
}
