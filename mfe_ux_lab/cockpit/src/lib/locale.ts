export type Locale = "en" | "vi";

export const LOCALE_STORAGE_KEY = "quantsmart_locale";

export const patternCausalReplayCopy = {
  en: {
    section: "Causal candle reveal",
    exit: "Exit candle reveal",
    reveal: "Reveal one bar at a time",
    controls: "Causal reveal controls",
    previousLabel: "Previous causal bar",
    previous: "Previous bar",
    nextLabel: "Next causal bar",
    next: "Next bar",
    resetLabel: "Reset to setup close",
    reset: "Setup close",
    progress: (revealed: number, time: string | null) => `${revealed} of at most 24 post-setup candles revealed. Latest revealed candle opens ${time} UTC.`,
    unavailable: "Causal reveal unavailable for this retained candle. Exit candle reveal or select another occurrence.",
    note: "Setup and Context stop at the setup close. Outcome path reveals one closed M5 candle per step. Later candles and retrospective statistics stay hidden while reveal is on. OHLC does not establish intrabar order or fills.",
  },
  vi: {
    section: "Phát lại từng nến",
    exit: "Thoát chế độ phát lại",
    reveal: "Hiện từng nến một",
    controls: "Điều khiển phát lại",
    previousLabel: "Lùi về nến trước",
    previous: "Nến trước",
    nextLabel: "Tiến đến nến tiếp theo",
    next: "Nến tiếp theo",
    resetLabel: "Về thời điểm đóng nến thiết lập",
    reset: "Về nến thiết lập",
    progress: (revealed: number, time: string | null) => `Đã hiện ${revealed} trên tối đa 24 nến sau thiết lập. Nến mới nhất đã hiện mở lúc ${time} UTC.`,
    unavailable: "Không thể phát lại từ nến này trong dữ liệu đang lưu. Hãy thoát chế độ phát lại hoặc chọn lần xuất hiện khác.",
    note: "Chế độ Thiết lập và Bối cảnh dừng ở thời điểm đóng nến thiết lập. Chế độ Đường kết quả hiện thêm một nến M5 đã đóng mỗi bước. Các nến về sau và thống kê hồi cứu được ẩn trong khi phát lại. OHLC không xác định diễn biến trong nến hay việc khớp lệnh.",
  },
};

export const patternReplayBookmarkCopy = {
  en: {
    section: "Replay bookmark",
    actions: "Replay bookmark actions",
    save: "Save current replay",
    restore: "Restore saved replay",
    clear: "Delete saved replay",
    note: "Bookmarks are read-only replay identity: UTC occurrence, concept, direction, mode and reveal time. They store no prices, OHLC, outcomes, fills or statistics; restoring recomputes current retained evidence.",
    idle: "No saved replay identity loaded for this account scope.",
    saved: "Replay identity saved for this account scope.",
    loaded: "Saved replay identity loaded for current retained-data validation.",
    cleared: "Saved replay identity deleted.",
    missing: "No saved replay identity is available.",
    storageUnavailable: "Replay bookmarks are unavailable in this browser.",
    unavailable: (reason: string) => `Replay bookmark unavailable (${reason}).`,
    invalidRestore: (reason: string) => `Saved replay unavailable in current retained evidence (${reason}). No substitute occurrence selected.`,
    restored: "Saved replay restored from the exact current retained UTC M5 occurrence. Read-only evidence recomputed.",
  },
  vi: {
    section: "Dấu trang phát lại",
    actions: "Thao tác với dấu trang phát lại",
    save: "Lưu phiên phát lại hiện tại",
    restore: "Khôi phục phiên phát lại đã lưu",
    clear: "Xóa phiên phát lại đã lưu",
    note: "Dấu trang chỉ lưu thời điểm xuất hiện theo UTC, khái niệm, hướng, chế độ và thời điểm của nến đã hiện. Giá, OHLC, kết quả, khớp lệnh và thống kê không được lưu. Khi khôi phục, hệ thống tính lại bằng chứng từ dữ liệu đang lưu.",
    idle: "Chưa tải dấu trang phát lại cho tài khoản này.",
    saved: "Đã lưu dấu trang phát lại cho tài khoản này.",
    loaded: "Đã tải dấu trang phát lại để kiểm tra với dữ liệu đang lưu.",
    cleared: "Đã xóa dấu trang phát lại.",
    missing: "Chưa có dấu trang phát lại đã lưu.",
    storageUnavailable: "Trình duyệt này không hỗ trợ lưu dấu trang phát lại.",
    unavailable: (reason: string) => `Không có dấu trang phát lại (${reason}).`,
    invalidRestore: (reason: string) => `Không thể khôi phục phiên phát lại từ dữ liệu đang lưu (${reason}). Vẫn giữ lần xuất hiện đang chọn.`,
    restored: "Đã khôi phục phiên phát lại tại đúng lần xuất hiện trên nến M5 theo UTC trong dữ liệu đang lưu. Đã tính lại bằng chứng chỉ đọc.",
  },
};

const messages = {
  en: {
    loadingWorkspace: "Loading workspace...",
    workspaceNavigation: "Workspace navigation",
    switchWorkspace: "Switch workspace",
    findWorkspace: "Find workspace",
    searchWorkspaces: "Search workspaces, tasks or terms...",
    closeSearch: "Close search",
    noWorkspace: "No focused workspace found. Try Pattern Atlas or Guide.",
    select: "select",
    enterToOpen: "Enter to open",
    navigationOnly: "Workspace navigation only",
    researchTerminal: "Research terminal",
    patternResearch: "Pattern research",
    shadowMode: "Shadow mode",
    readOnly: "read only",
    openCockpit: "QUANTSMART - open Cockpit",
    currentLiveFeed: "Current live feed",
    liveFeedNotVerified: "Live feed not verified",
    asset: "Asset",
    focusedAssetTitle: "The focused surface is fixed to XAUUSD M5.",
    mainNavigation: "Main navigation",
    jumpTo: "Jump to...",
    switchToLight: "Switch to light theme",
    switchToDark: "Switch to dark theme",
    light: "Light",
    dark: "Dark",
    workspaceViews: "Workspace views",
    guide: "Guide",
    aboutWorkspace: "About this workspace",
    aboutWorkspaceHelp: "Use Ctrl+K to switch workspaces, or open Guide for task-based instructions.",
    researchWorkspace: "RESEARCH WORKSPACE",
    shadowNoDecision: "SHADOW / NO DECISION",
    languageEnglish: "English",
    languageVietnamese: "Vietnamese",
    switchLanguage: "Switch language",
  },
  vi: {
    loadingWorkspace: "Đang tải không gian làm việc...",
    workspaceNavigation: "Điều hướng không gian làm việc",
    switchWorkspace: "Chuyển không gian làm việc",
    findWorkspace: "Tìm không gian làm việc",
    searchWorkspaces: "Tìm không gian, tác vụ hoặc thuật ngữ...",
    closeSearch: "Đóng tìm kiếm",
    noWorkspace: "Không tìm thấy không gian phù hợp. Hãy thử Pattern Atlas hoặc Hướng dẫn.",
    select: "chọn",
    enterToOpen: "Enter để mở",
    navigationOnly: "Chỉ điều hướng không gian làm việc",
    researchTerminal: "Thiết bị nghiên cứu",
    patternResearch: "Nghiên cứu mô hình",
    shadowMode: "Chế độ bóng",
    readOnly: "chỉ đọc",
    openCockpit: "QUANTSMART - mở Cockpit",
    currentLiveFeed: "Luồng trực tiếp hiện tại",
    liveFeedNotVerified: "Chưa xác minh luồng trực tiếp",
    asset: "Tài sản",
    focusedAssetTitle: "Bề mặt tập trung được cố định ở XAUUSD M5.",
    mainNavigation: "Điều hướng chính",
    jumpTo: "Đi tới...",
    switchToLight: "Chuyển sang giao diện sáng",
    switchToDark: "Chuyển sang giao diện tối",
    light: "Sáng",
    dark: "Tối",
    workspaceViews: "Chế độ xem không gian",
    guide: "Hướng dẫn",
    aboutWorkspace: "Về không gian này",
    aboutWorkspaceHelp: "Dùng Ctrl+K để chuyển không gian hoặc mở Hướng dẫn để xem chỉ dẫn theo tác vụ.",
    researchWorkspace: "KHÔNG GIAN NGHIÊN CỨU",
    shadowNoDecision: "SHADOW / NO DECISION",
    languageEnglish: "Tiếng Anh",
    languageVietnamese: "Tiếng Việt",
    switchLanguage: "Chuyển ngôn ngữ",
  },
} as const;

export type LocaleMessageKey = keyof typeof messages.en;

const workspaceLabels = {
  en: {
    cockpit: "Cockpit",
    microscope: "Microscope",
    studio: "Strategy Studio",
    analytics: "Analytics",
    system: "System",
    home: "XAUUSD M5 Chart",
    microscopePage: "Chart & Replay",
    strategyLab: "Strategy Lab",
    canvas: "Canvas",
    blocksModules: "Blocks & Modules",
    coordinateLab: "Coordinate Lab",
    assets: "Assets",
    hiddenCoefficients: "Hidden Coefficients",
    debugger: "Debugger",
    help: "Guide",
  },
  vi: {
    cockpit: "Bảng điều khiển",
    microscope: "Kính hiển vi",
    studio: "Xưởng chiến lược",
    analytics: "Phân tích",
    system: "Hệ thống",
    home: "Biểu đồ XAUUSD M5",
    microscopePage: "Biểu đồ & phát lại",
    strategyLab: "Phòng chiến lược",
    canvas: "Bảng dựng",
    blocksModules: "Khối & mô-đun",
    coordinateLab: "Phòng tọa độ",
    assets: "Tài sản",
    hiddenCoefficients: "Hệ số ẩn",
    debugger: "Gỡ lỗi",
    help: "Hướng dẫn",
  },
} as const;

export type WorkspaceLocaleId = keyof typeof workspaceLabels.en;

export function getLocaleMessage(locale: Locale, key: LocaleMessageKey): string {
  return messages[locale][key];
}

export function getWorkspaceLabel(locale: Locale, id: string): string | undefined {
  return workspaceLabels[locale][id as WorkspaceLocaleId];
}

export function readStoredLocale(storage: Pick<Storage, "getItem"> | undefined = typeof localStorage === "undefined" ? undefined : localStorage): Locale {
  try {
    return storage?.getItem(LOCALE_STORAGE_KEY) === "vi" ? "vi" : "en";
  } catch {
    return "en";
  }
}
