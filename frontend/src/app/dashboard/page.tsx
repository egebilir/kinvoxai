"use client";

import { useTranslations } from "next-intl";
import styles from "./page.module.css";
import Link from "next/link";

export default function DashboardPage() {
  const t = useTranslations();

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className="gradient-text">Kinvox</span>AI
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={styles.navItemActive}>
            📊 {t("sidebar.dashboard")}
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            ✍️ {t("sidebar.generate")}
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            📁 {t("sidebar.history")}
          </Link>
          <Link href="/settings" className={styles.navItem}>
            ⚙️ {t("sidebar.settings")}
          </Link>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>{t("dashboard.title")}</h1>
            <p className={styles.headerSub}>{t("dashboard.subtitle")}</p>
          </div>
        </header>

        <div className={styles.statsGrid}>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statLabel}>
              {t("dashboard.stats.totalGenerations")}
            </span>
            <span className={styles.statValue}>0</span>
          </div>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statLabel}>
              {t("dashboard.stats.activeJobs")}
            </span>
            <span className={styles.statValue}>0</span>
          </div>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statLabel}>
              {t("dashboard.stats.creditsUsed")}
            </span>
            <span className={styles.statValue}>0</span>
          </div>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statLabel}>
              {t("dashboard.stats.apiCallsToday")}
            </span>
            <span className={styles.statValue}>0</span>
          </div>
        </div>

        <section className={`glass-card ${styles.recentSection}`}>
          <h2>{t("dashboard.recentActivity")}</h2>
          <div className={styles.emptyState}>
            <p>{t("dashboard.emptyState")}</p>
            <button className="btn-primary">{t("dashboard.createNew")}</button>
          </div>
        </section>
      </main>
    </div>
  );
}
