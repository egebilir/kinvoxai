"use client";

import { useTranslations } from "next-intl";
import styles from "./page.module.css";
import Link from "next/link";
import { LanguageToggle } from "../components/LanguageToggle";

export default function Home() {
  const t = useTranslations();

  return (
    <main className={styles.main}>
      <div className={styles.bgGlow} />

      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className="gradient-text">Kinvox</span>AI
        </div>
        <div className={styles.navLinks}>
          <Link href="/dashboard">{t("nav.dashboard")}</Link>
          <Link href="/settings">{t("nav.settings")}</Link>
          <LanguageToggle />
          <button className="btn-primary">{t("nav.getStarted")}</button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          {t("landing.badge")}
        </div>
        <h1 className={styles.title}>
          {t("landing.titleLine1")}{" "}
          <span className="gradient-text">{t("landing.titleHighlight")}</span>
          <br />
          {t("landing.titleLine2")}
        </h1>
        <p className={styles.subtitle}>{t("landing.subtitle")}</p>
        <div className={styles.actions}>
          <button className="btn-primary">{t("landing.startCreating")}</button>
          <button className="btn-secondary">{t("landing.viewDemo")}</button>
        </div>
      </section>

      <section className={styles.features}>
        <div className={`glass-card ${styles.featureCard}`}>
          <div className={styles.featureIcon}>✍️</div>
          <h3>{t("landing.features.textTitle")}</h3>
          <p>{t("landing.features.textDesc")}</p>
        </div>
        <div className={`glass-card ${styles.featureCard}`}>
          <div className={styles.featureIcon}>🎨</div>
          <h3>{t("landing.features.imageTitle")}</h3>
          <p>{t("landing.features.imageDesc")}</p>
        </div>
        <div className={`glass-card ${styles.featureCard}`}>
          <div className={styles.featureIcon}>🔊</div>
          <h3>{t("landing.features.audioTitle")}</h3>
          <p>{t("landing.features.audioDesc")}</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>{t("landing.footer")}</p>
      </footer>
    </main>
  );
}
