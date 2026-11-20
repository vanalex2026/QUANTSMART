import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getLocaleMessage, getWorkspaceLabel, LOCALE_STORAGE_KEY, readStoredLocale, type Locale, type LocaleMessageKey } from "./locale.ts";

export type { Locale, LocaleMessageKey } from "./locale.ts";
export { LOCALE_STORAGE_KEY, getLocaleMessage, getWorkspaceLabel, readStoredLocale } from "./locale.ts";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: LocaleMessageKey) => string;
  workspaceLabel: (id: string, fallback?: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);
const fallbackLocaleContext: LocaleContextValue = {
  locale: "en",
  setLocale: () => {},
  toggleLocale: () => {},
  t: (key) => getLocaleMessage("en", key),
  workspaceLabel: (id, fallback = id) => getWorkspaceLabel("en", id) || fallback,
};

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(() => readStoredLocale());
  const setLocale = (next: Locale) => {
    updateLocale(next);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* storage is optional */ }
  };
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale(locale === "en" ? "vi" : "en"),
    t: (key) => getLocaleMessage(locale, key),
    workspaceLabel: (id, fallback = id) => getWorkspaceLabel(locale, id) || fallback,
  }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  return context || fallbackLocaleContext;
}
