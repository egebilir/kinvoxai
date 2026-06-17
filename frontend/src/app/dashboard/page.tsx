import type { Metadata } from "next";
import styles from "./page.module.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard – KinvoxAI",
  description: "Manage your AI-generated content and monitor active jobs.",
};

export default function DashboardPage() {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className="gradient-text">Kinvox</span>AI
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={styles.navItemActive}>
            📊 Dashboard
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            ✍️ Generate
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            📁 History
          </Link>
          <Link href="/settings" className={styles.navItem}>
            ⚙️ Settings
          </Link>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1>Dashboard</h1>
            <p className={styles.headerSub}>
              Welcome back. Here&apos;s your overview.
            </p>
          </div>
        </header>

        <div className={styles.statsGrid}>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statLabel}>Total Generations</span>
            <span className={styles.statValue}>0</span>
          </div>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statLabel}>Active Jobs</span>
            <span className={styles.statValue}>0</span>
          </div>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statLabel}>Credits Used</span>
            <span className={styles.statValue}>0</span>
          </div>
          <div className={`glass-card ${styles.statCard}`}>
            <span className={styles.statLabel}>API Calls Today</span>
            <span className={styles.statValue}>0</span>
          </div>
        </div>

        <section className={`glass-card ${styles.recentSection}`}>
          <h2>Recent Activity</h2>
          <div className={styles.emptyState}>
            <p>No activity yet. Start by creating your first generation.</p>
            <button className="btn-primary">Create New →</button>
          </div>
        </section>
      </main>
    </div>
  );
}
