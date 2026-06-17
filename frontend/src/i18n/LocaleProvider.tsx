"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "../translations/en.json";
import trMessages from "../translations/tr.json";

type Locale = "en" | "tr";

const STORAGE_KEY = "kinvoxai_lang";
const GEO_API_URL = "http://ip-api.com/json/?fields=country";

const messages: Record<Locale, typeof enMessages> = {
  en: enMessages,
  tr: trMessages,
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => undefined,
  toggleLocale: () => undefined,
  isLoading: true,
});

export function useLocale(): LocaleContextType {
  return useContext(LocaleContext);
}

async function detectLocaleFromIP(): Promise<Locale> {
  try {
    const response = await fetch(GEO_API_URL);
    if (!response.ok) return "en";
    const data = await response.json() as { country?: string };
    return data.country === "Turkey" ? "tr" : "en";
  } catch {
    return "en";
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initLocale(): Promise<void> {
      // 1. Check localStorage first
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && (stored === "en" || stored === "tr")) {
        setLocaleState(stored);
        setIsLoading(false);
        return;
      }

      // 2. Auto-detect from IP geolocation
      const detected = await detectLocaleFromIP();
      setLocaleState(detected);
      localStorage.setItem(STORAGE_KEY, detected);
      setIsLoading(false);
    }

    initLocale();
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const toggleLocale = useCallback(() => {
    const next = locale === "en" ? "tr" : "en";
    setLocale(next);
  }, [locale, setLocale]);

  // Update html lang attribute
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, isLoading }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
