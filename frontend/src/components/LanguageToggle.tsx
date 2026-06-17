"use client";

import { useLocale } from "../i18n/LocaleProvider";
import styles from "./LanguageToggle.module.css";

export function LanguageToggle() {
  const { locale, toggleLocale } = useLocale();

  return (
    <button
      id="language-toggle"
      className={styles.toggle}
      onClick={toggleLocale}
      aria-label={locale === "en" ? "Switch to Turkish" : "Switch to English"}
      title={locale === "en" ? "Türkçe'ye geç" : "Switch to English"}
    >
      <span className={styles.flag}>
        {locale === "en" ? "🇬🇧" : "🇹🇷"}
      </span>
      <span className={styles.label}>
        {locale === "en" ? "EN" : "TR"}
      </span>
    </button>
  );
}
