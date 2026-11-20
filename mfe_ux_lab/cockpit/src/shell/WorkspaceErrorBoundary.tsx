import { Component, type ReactNode } from "react";
type BoundaryProps = { children: ReactNode; routeLabel?: string };
type BoundaryState = { failed: boolean; errorName?: string; errorMessage?: string };

function boundedErrorMessage(error: unknown) {
  const message = error instanceof Error && error.message ? error.message : "Unknown render error";
  return message.replace(/\s+/g, " ").trim().slice(0, 240) || "Unknown render error";
}

export class WorkspaceErrorBoundary extends Component<BoundaryProps,BoundaryState> {
  state: BoundaryState = { failed: false };
  static getDerivedStateFromError(error: unknown): BoundaryState {
    return {
      failed: true,
      errorName: error instanceof Error && error.name ? error.name.slice(0, 80) : "RenderError",
      errorMessage: boundedErrorMessage(error),
    };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Keep the visible recovery surface safe while retaining a local diagnostic
    // for chunk/import failures that otherwise collapse into a generic screen.
    console.error("MFE_WORKSPACE_RENDER_FAILED", error, info.componentStack);
  }
  private reload = () => window.location.reload();
  private openFocusedChart = () => { window.location.hash = "#home"; };
  render(){
    if(this.state.failed) {
      const routeLabel = this.props.routeLabel || "This workspace";
      const focused = routeLabel === "XAUUSD M5 Chart";
      return <div className="workspace-service-shell">
        <section className="workspace-service-message workspace-error-card" data-error-state="render-failed" role="alert" aria-labelledby="workspace-render-error-title">
          <div className="workspace-error-eyebrow"><span className="workspace-error-dot" aria-hidden="true" />RENDER HALTED <span className="workspace-error-mode">FAIL-CLOSED</span></div>
          <h1 id="workspace-render-error-title">Workspace paused safely</h1>
          <p><strong>{routeLabel}</strong> stopped rendering before its research controls could open.</p>
          <p className="workspace-error-copy">Saved workspace data was left untouched. Reload to retry the route; use the focused chart as a safe starting point if another route keeps failing.</p>
          <div className="workspace-error-actions">
            <button type="button" onClick={this.reload}>Reload workspace</button>
            {!focused && <button type="button" className="workspace-error-secondary" onClick={this.openFocusedChart}>Open focused chart</button>}
          </div>
          <details className="workspace-error-details">
            <summary>Technical details</summary>
            <dl><dt>Error type</dt><dd>{this.state.errorName || "RenderError"}</dd><dt>Message</dt><dd><code>{this.state.errorMessage || "Unknown render error"}</code></dd></dl>
          </details>
        </section>
      </div>;
    }
    return this.props.children;
  }
}
