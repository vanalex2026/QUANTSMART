import type { Locale } from "../lib/locale.ts";
import { getPriceActionKnowledge } from "../lib/priceActionKnowledgeLookup.ts";
import type { PdfSignalStatisticsResult } from "../lib/pdfSignalStatistics.ts";
import type { PdfSignalStatisticsProgress } from "../lib/pdfSignalStatistics.ts";
import "./pdf-signal-statistics-panel.css";

import type { M5PriceBar } from "../lib/priceActionDetector.ts";
import { usePdfSignalStatistics } from "../lib/usePdfSignalStatistics.ts";

export function HistoricalPdfStatistics({ bars, enabled, locale }: {
  bars: readonly M5PriceBar[]; enabled: boolean; locale: Locale;
}) {
  const scan = usePdfSignalStatistics(bars, enabled);
  return <PdfSignalStatisticsPanel {...scan} locale={locale} />;
}
const namesVi: Record<string, string> = {
  double_pressure: "Áp lực kép", dominant_pressure: "Áp lực chi phối", support_resistance: "Hỗ trợ / kháng cự", buildup: "Tích lũy",
  false_break: "Phá vỡ giả", tease_break: "Phá vỡ nhử", false_high_low: "Đỉnh / đáy giả", pullback_reversal: "Hồi giá / đảo chiều",
  ceiling_test: "Kiểm tra trần", round_number: "Số tròn", signal_entry_bar: "Nến vào lệnh theo nguồn", pattern_break_combi: "Tổ hợp phá mẫu",
  bracket_costs: "Khung giá / chi phí", news_exit: "Thoát theo tin", resistance_exit: "Thoát tại kháng cự", reversal_exit: "Thoát đảo chiều",
  trade_selection_failure: "Thất bại chọn giao dịch", consecutive_review: "Rà soát liên tiếp", position_sizing: "Quy mô vị thế", low_volatility: "Biến động thấp",
  pattern_break: "Phá mẫu", pattern_break_pullback: "Phá mẫu hồi giá", obstacle_room: "Khoảng cách đến vùng cản",
};
const conceptLabel = (id: string, locale: Locale) => locale === "vi" ? namesVi[id] || id : getPriceActionKnowledge(id)?.name || id;

type ScanStatus = "idle" | "loading" | "ready" | "error";

export function PdfSignalStatisticsPanel({ result, locale, status = "ready", loadingElapsedMs = 0, loadingProgress = null }: { result: PdfSignalStatisticsResult | null; locale: Locale; status?: ScanStatus; loadingElapsedMs?: number; loadingProgress?: PdfSignalStatisticsProgress | null }) {
  const isVi = locale === "vi";
  const language = isVi ? "vi-VN" : "en-US";
  if (!result) {
    if (status === "idle") return null;
    const elapsed = loadingElapsedMs >= 1000 ? ` (${Math.floor(loadingElapsedMs / 1000)} ${isVi ? "giây" : "s"})` : "";
    const progress = loadingProgress && loadingProgress.totalRows > 0
      ? ` ${loadingProgress.processedRows.toLocaleString(language)}/${loadingProgress.totalRows.toLocaleString(language)}`
      : "";
    const text = status === "loading"
      ? (isVi ? `${"Đang quét thống kê 23 khái niệm PDF…"}${progress ? ` ${"đã xử lý"}${progress}` : ""}${elapsed ? ` ${"đã chạy"}${elapsed}` : ""}` : `Scanning historical statistics for 23 PDF concepts...${progress}${elapsed}`)
      : (isVi ? "Chưa thể tạo thống kê lịch sử PDF" : "Historical PDF statistics are unavailable");
    return <section className="m5-pdf-statistics" aria-live="polite" role="status"><strong>{text}</strong></section>;
  }
  if (result.state !== "READY") {
    const title = isVi ? "Thống kê 23 khái niệm PDF · XAUUSD M5" : "Historical statistics for 23 PDF concepts · XAUUSD M5";
    const problem = result.invalidBar;
    const causes = {
      timestamp: isVi ? "Thời gian của nến không hợp lệ trên khung 5 phút." : "The candle has an invalid M5 timestamp.",
      order: isVi ? "Thời gian của nến bị trùng hoặc sai thứ tự." : "Candle timestamps repeat or are out of order.",
      forming: isVi ? "Nến chưa đóng tại thời điểm kiểm tra." : "The candle was still open at the scan cutoff.",
      prices: isVi ? "Giá mở, cao nhất, thấp nhất và đóng cửa bị thiếu hoặc không nhất quán." : "The open, high, low and close are inconsistent or missing.",
      flat: isVi ? "Giá cao nhất bằng giá thấp nhất. Phép thống kê này yêu cầu nến có biên độ lớn hơn 0." : "The high and low are equal. This scan requires a positive candle range.",
    };
    let detail = isVi ? "Chưa đủ dữ liệu nến đóng để thống kê." : "There is insufficient closed-candle data for the scan.";
    if (problem) {
      const stamp = problem.time ? ` · ${problem.time.slice(0, 16).replace("T", " ")} UTC` : "";
      detail = `${isVi ? "Nến thứ" : "Candle"} ${problem.row.toLocaleString(language)}${stamp}. ${causes[problem.cause]}`;
    } else if (result.reason === "INVALID_XAUUSD_M5_IDENTITY") {
      detail = isVi ? "Dữ liệu cần thuộc XAUUSD trên khung 5 phút." : "The scan requires XAUUSD five-minute data.";
    } else if (result.reason === "NO_CONTIGUOUS_CLOSED_M5_ROWS") {
      detail = isVi ? "Chưa có nến đủ lịch sử và có nến kế tiếp cách đúng 5 phút." : "No candle has both enough history and a next closed candle exactly five minutes later.";
    }
    return <section aria-labelledby="m5-pdf-statistics-title" className="m5-pdf-statistics m5-pdf-statistics-readable" data-pdf-statistics-state={result.state}>
      <div className="m5-pdf-statistics-head"><div><h2 id="m5-pdf-statistics-title">{title}</h2>
        <p role="status">{isVi ? "Chưa thể tính tần suất tín hiệu." : "Signal frequencies are unavailable."} {detail}</p>
      </div></div>
    </section>;
  }
  const rows = Object.values(result.statistics);
  const withheld = isVi ? "Chưa đánh giá" : "Withheld";
  return <section className="m5-pdf-statistics m5-pdf-statistics-readable" aria-labelledby="m5-pdf-statistics-title" data-pdf-statistics="23">
    <div className="m5-pdf-statistics-head"><div>
      <h2 id="m5-pdf-statistics-title">{isVi ? "Thống kê lịch sử 23 khái niệm PDF · XAUUSD M5" : "Historical statistics for 23 PDF concepts · XAUUSD M5"}</h2>
      <p>{isVi ? "Đã quét" + " " + result.bars.toLocaleString(language) + " " + "nến đóng" + " · " + result.evaluatedRows.toLocaleString(language) + " " + "nến có nến kế tiếp cách đúng 5 phút" + " · " + "bỏ qua" + " " + result.skippedRows.toLocaleString(language) + " " + "nến trước khoảng trống dữ liệu." : "Scanned " + result.bars.toLocaleString(language) + " closed candles · " + result.evaluatedRows.toLocaleString(language) + " contiguous rows · skipped " + result.skippedRows.toLocaleString(language) + " rows with gaps."}</p>
    </div><span>{isVi ? "Chỉ dùng để nghiên cứu" : "Research only"}</span></div>
    <p className="m5-pdf-statistics-accounting" data-pdf-statistics-accounting>{isVi ? `Tần suất bằng số lần nhận diện chia cho số nến có thể đánh giá. Có ${result.warmupRows.toLocaleString(language)} nến đầu dùng làm dữ liệu ban đầu và ${result.terminalRowsWithoutH1.toLocaleString(language)} nến cuối chưa có nến kế tiếp.` : `Denominator: ${result.denominatorEquation}. ${result.warmupRows.toLocaleString(language)} warm-up rows and ${result.terminalRowsWithoutH1.toLocaleString(language)} terminal row without H+1. ${result.rowAccountingEquation}.`}</p>
    <p id="m5-pdf-statistics-note" className="m5-pdf-statistics-note">{isVi ? "Tỷ lệ là tần suất quan sát hình học cục bộ trong băng XAUUSD. Các mục diễn giải từ tài liệu chỉ ghi số lần quan sát, không phải tỷ lệ thắng, lệnh hay khớp lệnh." : "Rates are local XAUUSD geometry observation frequencies. SOURCE_REVIEW_ONLY concepts show descriptive row counts only, not win rates, orders or fills."}</p>
    <div className="m5-pdf-statistics-table-wrap"><table className="m5-pdf-statistics-table" aria-describedby="m5-pdf-statistics-note"><caption className="m5-pdf-statistics-caption">{isVi ? "Số lần quan sát theo từng khái niệm PDF" : "Descriptive census by PDF concept"}</caption>
      <thead><tr><th>{isVi ? "Khái niệm" : "Concept"}</th><th>{isVi ? "Nguồn" : "Source"}</th><th>{isVi ? "Đánh giá" : "Evaluated (DETECTED + ABSTAIN)"}</th><th>{isVi ? "Quan sát" : "Observed"}</th><th>{isVi ? "Tần suất" : "Rate"}</th><th>{isVi ? "Hướng" : "Direction"}</th><th>{isVi ? "H+1 mô tả" : "Descriptive H+1"}</th></tr></thead>
      <tbody>{rows.map((row) => { const direction = row.sourceStatus === "SOURCE_REVIEW_ONLY" ? withheld : `${row.directionCounts.up}/${row.directionCounts.down}/${row.directionCounts.neutral}`; const h1 = row.h1Direction ? `${row.h1Direction.up}/${row.h1Direction.down}/${row.h1Direction.flat}` : withheld; return <tr key={row.conceptId} data-pdf-stat-concept={row.conceptId} data-pdf-stat-source={row.sourceStatus}>
        <th scope="row"><span>{conceptLabel(row.conceptId, locale)}</span><small aria-label={isVi ? "Nguồn dữ liệu" : "Source provenance"} className={`m5-pdf-stat-source m5-pdf-stat-provenance source-${row.sourceStatus === "SOURCE_REVIEW_ONLY" ? "notes" : "geometry"}`}>{row.sourceStatus === "SOURCE_REVIEW_ONLY" ? (isVi ? "Diễn giải tài liệu" : "Source note") : (isVi ? "Hình dạng giá" : "Price geometry")}</small></th><td><span className={`m5-pdf-stat-source source-${row.sourceStatus === "SOURCE_REVIEW_ONLY" ? "notes" : "geometry"}`}>{row.sourceStatus === "SOURCE_REVIEW_ONLY" ? (isVi ? "Diễn giải tài liệu" : "Source note") : (isVi ? "Hình dạng giá" : "Price geometry")}</span></td><td>{row.evaluated.toLocaleString(language)}</td><td>{row.occurrences.toLocaleString(language)}</td><td>{row.detectionRate == null ? "—" : row.detectionRate.toLocaleString(language, { style: "percent", maximumFractionDigits: 1 })}</td><td>{direction}</td><td>{h1}</td>
      </tr>; })}</tbody>
    </table></div>
    <small className="m5-pdf-statistics-authority">{isVi ? "Hướng mẫu theo thứ tự tăng / giảm / trung tính. Nến kế tiếp theo thứ tự đóng cao hơn / thấp hơn / bằng giá đóng hiện tại." : "Direction = UP / DOWN / NEUTRAL. H+1 is shown only for GEOMETRY_PROXY with an immediately contiguous closed candle. Source outcomes remain WITHHELD."}</small>
  </section>;
}

