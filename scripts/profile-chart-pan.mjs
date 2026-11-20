// Live Orca browser diagnostic. Run after the chart has finished loading.
// Samples real chart updates without changing broker data or saved drawings.
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function summarizePanProbe(probe) {
  if (!probe || probe.state !== 'done') throw Error('Pan probe has not completed.');
  if (!Array.isArray(probe.intervals) || !probe.intervals.length || !probe.intervals.every(value => Number.isFinite(value) && value >= 0)
    || ![probe.actualDisplacement, probe.expectedDisplacement, probe.maxYDrift, probe.updates].every(Number.isFinite)) throw Error('Pan probe contains invalid measurements.');
  if (probe.hidden) throw Error('Tab was hidden during the probe; frame timings are invalid.');
  const intervals = probe.intervals.slice(2).filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = fraction => intervals.length ? intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * fraction))] : null;
  const displacementError = Math.abs(probe.actualDisplacement - probe.expectedDisplacement);
  const schedulerStalls = intervals.filter(value => value > 500).length;
  return {
    schema: 'quantsmart.chart-pan-profile/1',
    chart: probe.label,
    frames: probe.intervals.length,
    frameTimeMs: { median: percentile(0.5), p95: percentile(0.95), max: intervals.at(-1) ?? null, over25: intervals.filter(value => value > 25).length },
    geometry: { expectedDisplacement: probe.expectedDisplacement, actualDisplacement: probe.actualDisplacement, displacementError, maxYDrift: probe.maxYDrift, coordinateUpdates: probe.updates },
    continuousGeometry: displacementError < 0.25 && probe.maxYDrift < 0.25 && probe.updates > 0,
    timingStatus: schedulerStalls >= 2 ? 'INCONCLUSIVE_SCHEDULER_STALLS' : 'MEASURED',
    schedulerStalls,
    note: 'Frame times describe this browser and machine during the probe, not a guaranteed frame rate. Price auto-fit on release is outside the Y-lock measurement.',
  };
}

/** Stop a running diagnostic without rewriting a completed result. */
export function cancelPanProbe(probe) {
  if (probe && probe.state === 'running') {
    probe.cancelled = true;
    probe.state = 'cancelled';
  }
  return probe;
}

export function panProbeTimeoutReason(probe) {
  const slowFrames = Array.isArray(probe?.intervals)
    ? probe.intervals.filter(value => Number.isFinite(value) && value > 500).length : 0;
  return slowFrames >= 2
    ? 'Browser requestAnimationFrame was throttled during the probe; frame timings cannot measure chart performance.'
    : 'Probe did not complete within 45 seconds.';
}

/** Build the exact page-side RAF probe used by the live diagnostic. */
export function panProbePageExpression(start, distance, frames) {
  return `(()=>{const svg=document.querySelector('.microchart-canvas'),candles=Array.from(svg.querySelectorAll('[data-candle-direction]'));const wick=candles[Math.floor(candles.length/2)].querySelector('line');const coordinate=()=>new DOMPoint(+wick.getAttribute('x1'),+wick.getAttribute('y1')).matrixTransform(wick.getCTM());const initial=coordinate(),initialX=initial.x,initialY=initial.y;const profile=window.__orcaChartPanProfile={state:'running',cancelled:false,label:${JSON.stringify(start.label)},intervals:[],updates:0,maxYDrift:0,expectedDisplacement:${distance},hidden:false};let last=null,previousX=initialX,index=0;const step=now=>{if(profile.cancelled||profile.state!=='running')return;if(document.visibilityState!=='visible')profile.hidden=true;profile.intervals.push(last===null?0:Math.max(0,now-last));last=now;const x=coordinate().x;if(Math.abs(x-previousX)>0.001)profile.updates++;previousX=x;profile.maxYDrift=Math.max(profile.maxYDrift,Math.abs(coordinate().y-initialY));if(!wick.isConnected){profile.state='error';profile.error='Chart changed during probe';return;}if(index<${frames}){index++;svg.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'mouse',buttons:1,clientX:${start.x}+${distance}*index/${frames},clientY:${start.y}}));requestAnimationFrame(step);}else{requestAnimationFrame(()=>requestAnimationFrame(()=>{if(profile.cancelled||profile.state!=='running')return;profile.actualDisplacement=coordinate().x-initialX;profile.maxYDrift=Math.max(profile.maxYDrift,Math.abs(coordinate().y-initialY));svg.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1,pointerType:'mouse',buttons:0,clientX:${start.x}+${distance},clientY:${start.y}}));profile.state='done';}));}};requestAnimationFrame(step);return JSON.stringify({state:profile.state});})()`;
}

/** Reuse the same state transition for page cleanup and node regressions. */
export function panProbeCancelExpression() {
  return `(()=>{(${cancelPanProbe.toString()})(window.__orcaChartPanProfile);const svg=document.querySelector('.microchart-canvas');svg?.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'}));return true})()`;
}

async function main() {
  const values = {};
  const flags = new Set(['--page', '--frames', '--distance', '--output']);
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') {
      console.log('node scripts/profile-chart-pan.mjs [--page browserPageId] [--frames 120] [--distance 180] [--output artifacts/chart-pan-profile.json]\nUses the existing local XAUUSD M5 tab in Orca. Keep the page visible and do not move the pointer during the probe. Restores the latest chart window afterwards; drawings and broker data are untouched.');
      return;
    }
    if (!flags.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw Error(`Unknown option or missing value: ${args[i]}`);
    values[args[i]] = args[++i];
  }
  const frames = Number(values['--frames'] ?? 120), distance = Number(values['--distance'] ?? 180);
  if (!Number.isInteger(frames) || frames < 12 || frames > 600 || !Number.isFinite(distance) || distance < 10 || distance > 400) throw Error('Use 12..600 frames and a distance of 10..400 pixels.');
  const executable = process.env.ORCA_CLI_COMMAND || (process.env.ORCA_DEV_REPO_ROOT ? 'orca-dev' : process.platform === 'linux' ? 'orca-ide' : 'orca');
  const orca = args => {
    const result = spawnSync(executable, [...args, '--json'], { encoding: 'utf8', windowsHide: true, timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
    if (result.error) throw result.error;
    let response;
    try { response = JSON.parse(result.stdout); } catch { throw Error(`Orca returned no JSON: ${result.stderr || result.stdout || result.status}`); }
    if (!response.ok) throw Error(`${response.error?.code}: ${response.error?.message}`);
    return response.result;
  };
  const tabs = orca(['tab', 'list']).tabs;
  const tab = values['--page'] ? tabs.find(tab => tab.browserPageId === values['--page']) : tabs.find(tab => /^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/#home$/.test(tab.url));
  if (!tab) throw Error('Open the local #home chart in Orca, or pass its --page id.');
  const page = tab.browserPageId;
  const evaluate = expression => {
    const value = orca(['eval', '--page', page, '--expect-url', tab.url, '--expression', expression]).result;
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  };
  // Use the already observed chart class, then read its current geometry. The
  // real mouse-down establishes browser pointer capture; synthetic moves are
  // paced by that page's animation clock rather than shell/CLI latency.
  evaluate("(()=>{const svg=document.querySelector('.microchart-canvas');if(!svg)throw Error('Chart is unavailable');if(document.visibilityState!=='visible')throw Error('Keep the chart tab visible');svg.focus({preventScroll:true});return true})()");
  orca(['keypress', '--page', page, '--expect-url', tab.url, '--key', 'c']);
  orca(['keypress', '--page', page, '--expect-url', tab.url, '--key', 'End']);
  // Resolve the point and label after End changes the viewport. The report
  // must describe the exact candles used by the probe, not the prior zoom.
  const start = evaluate(`(()=>{const svg=document.querySelector('.microchart-canvas');if(!svg)throw Error('Chart is unavailable');if(document.visibilityState!=='visible')throw Error('Keep the chart tab visible');if(svg.querySelector('.microchart-drawing'))throw Error('Hide saved drawings before profiling so the probe cannot select or move one');const candles=Array.from(svg.querySelectorAll('[data-candle-direction]'));if(candles.length<30)throw Error('Zoom to at least 30 visible candles');const r=svg.getBoundingClientRect();let point;for(const fy of [.45,.65,.25,.8]){for(const fx of [.5,.6,.4]){const x=r.left+r.width*fx,y=r.top+r.height*fy;const hit=document.elementFromPoint(x,y);if(hit&&svg.contains(hit)&&!hit.closest('.microchart-signal,.microchart-trade,[data-drawing-index]')){point={x,y};break;}}if(point)break;}if(!point)throw Error('No clear pan area is visible');return JSON.stringify({...point,label:svg.getAttribute('aria-label')});})()`);
  if (!start?.label?.startsWith('XAUUSD M5 research chart')) throw Error('This diagnostic requires the focused XAUUSD M5 chart.');
  let mouseDown = false;
  try {
    orca(['mouse', 'move', '--page', page, '--expect-url', tab.url, '--x', String(start.x), '--y', String(start.y)]);
    orca(['mouse', 'down', '--page', page, '--expect-url', tab.url, '--button', 'left']);
    mouseDown = true;
    evaluate(panProbePageExpression(start, distance, frames));
    const deadline = Date.now() + 45_000;
    let probe;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const state = evaluate('window.__orcaChartPanProfile?.state');
      if (state !== 'running') { probe = evaluate('JSON.stringify(window.__orcaChartPanProfile)'); break; }
    }
    if (probe?.state !== 'done') {
      if (!probe) probe = evaluate('JSON.stringify(window.__orcaChartPanProfile)');
      throw Error(probe?.error || panProbeTimeoutReason(probe));
    }
    const report = { ...summarizePanProbe(probe), measuredAt: new Date().toISOString(), url: tab.url };
    if (values['--output']) {
      const output = resolve(values['--output']);
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    }
    console.log(JSON.stringify(report, null, 2));
    if (!report.continuousGeometry) process.exitCode = 1;
  } finally {
    // Cancel first if the probe failed; a real pointer-up at the old physical
    // position must not overwrite the last synthetic displacement.
    try { evaluate(panProbeCancelExpression()); } catch {}
    if (mouseDown) try { orca(['mouse', 'up', '--page', page, '--expect-url', tab.url, '--button', 'left']); } catch {}
    try { evaluate("(()=>{const svg=document.querySelector('.microchart-canvas');svg?.focus({preventScroll:true});return true})()"); orca(['keypress', '--page', page, '--expect-url', tab.url, '--key', 'End']); } catch {}
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
