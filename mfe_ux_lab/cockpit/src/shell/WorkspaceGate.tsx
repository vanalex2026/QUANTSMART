import { useEffect, type ReactNode } from "react";
import { initializeWorkspace, installWorkspaceSync, useWorkspaceStatus, flushWorkspace } from "../lib/workspaceClient.ts";
import "./workspace.css";

function boundedServiceError(value: unknown) {
  return typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim().slice(0, 240) : "No diagnostic was returned by the local service.";
}

export function WorkspaceGate({children}:{children:ReactNode}) {
  const status=useWorkspaceStatus();
  useEffect(()=>{void initializeWorkspace().catch(()=>{});return installWorkspaceSync();},[]);
  if(status.phase==="loading")return <div className="workspace-service-shell"><section className="workspace-service-message workspace-error-card" role="status" aria-labelledby="workspace-gate-loading-title"><div className="workspace-error-eyebrow"><span className="workspace-error-dot" aria-hidden="true" />CONNECTING <span className="workspace-error-mode">READ-ONLY</span></div><h1 id="workspace-gate-loading-title">Opening your workspace</h1><p>Connecting to the local workspace service before research controls are enabled.</p></section></div>;
  if(status.phase==="error"&&!status.savedAt)return <div className="workspace-service-shell"><section className="workspace-service-message workspace-error-card" data-error-state="service-unavailable" role="alert" aria-labelledby="workspace-gate-error-title"><div className="workspace-error-eyebrow"><span className="workspace-error-dot" aria-hidden="true" />SERVICE UNAVAILABLE <span className="workspace-error-mode">FAIL-CLOSED</span></div><h1 id="workspace-gate-error-title">Workspace service unavailable</h1><p>Saved research is still protected. Start the local application service, then retry the connection.</p><details className="workspace-error-details"><summary>Technical details</summary><code>{boundedServiceError(status.error)}</code></details><div className="workspace-error-actions"><button type="button" onClick={()=>{void initializeWorkspace().catch(()=>{});}}>Retry connection</button></div></section></div>;
  return <>{children}</>;
}
export function WorkspaceSaveStatus(){const status=useWorkspaceStatus();return <span className={`workspace-save-state ${status.phase}`} role="status">{status.phase==="saving"?"Saving…":status.phase==="error"?<button onClick={()=>void flushWorkspace().catch(()=>{})} title={status.error||""}>Save failed · retry</button>:"Saved to workspace"}</span>;}
