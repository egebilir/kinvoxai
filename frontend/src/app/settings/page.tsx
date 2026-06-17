"use client";

import { useTranslations } from "next-intl";
import styles from "./page.module.css";
import Link from "next/link";

export default function SettingsPage() {
  const t = useTranslations();

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className="gradient-text">Kinvox</span>AI
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={styles.navItem}>
            📊 {t("sidebar.dashboard")}
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            ✍️ {t("sidebar.generate")}
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            📁 {t("sidebar.history")}
          </Link>
          <Link href="/settings" className={styles.navItemActive}>
            ⚙️ {t("sidebar.settings")}
          </Link>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>{t("settings.title")}</h1>
          <p className={styles.headerSub}>{t("settings.subtitle")}</p>
        </header>

        <div className={styles.sections}>
          <section className={`glass-card ${styles.section}`}>
            <h2>{t("settings.apiKeys.title")}</h2>
            <p className={styles.sectionDesc}>
              {t("settings.apiKeys.desc")}
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label htmlFor="claude-key">
                  {t("settings.apiKeys.claudeLabel")}
                </label>
                <input
                  id="claude-key"
                  type="password"
                  placeholder={t("settings.apiKeys.claudePlaceholder")}
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="openai-key">
                  {t("settings.apiKeys.openaiLabel")}
                </label>
                <input
                  id="openai-key"
                  type="password"
                  placeholder={t("settings.apiKeys.openaiPlaceholder")}
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="elevenlabs-key">
                  {t("settings.apiKeys.elevenlabsLabel")}
                </label>
                <input
                  id="elevenlabs-key"
                  type="password"
                  placeholder={t("settings.apiKeys.elevenlabsPlaceholder")}
                  className={styles.input}
                />
              </div>
            </div>
          </section>

          <section className={`glass-card ${styles.section}`}>
            <h2>{t("settings.billing.title")}</h2>
            <p className={styles.sectionDesc}>
              {t("settings.billing.desc")}
            </p>
            <div className={styles.billingInfo}>
              <span className={styles.planBadge}>
                {t("settings.billing.freePlan")}
              </span>
              <button className="btn-primary">
                {t("settings.billing.upgradePlan")}
              </button>
            </div>
          </section>

          <section className={`glass-card ${styles.section}`}>
            <h2>{t("settings.preferences.title")}</h2>
            <p className={styles.sectionDesc}>
              {t("settings.preferences.desc")}
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label htmlFor="default-model">
                  {t("settings.preferences.defaultModel")}
                </label>
                <select id="default-model" className={styles.input}>
                  <option value="claude">Claude</option>
                  <option value="gpt4">GPT-4</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
