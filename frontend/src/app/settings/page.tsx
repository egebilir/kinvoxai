import type { Metadata } from "next";
import styles from "./page.module.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings – KinvoxAI",
  description: "Configure your API keys, preferences, and account settings.",
};

export default function SettingsPage() {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className="gradient-text">Kinvox</span>AI
        </div>
        <nav className={styles.sidebarNav}>
          <Link href="/dashboard" className={styles.navItem}>
            📊 Dashboard
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            ✍️ Generate
          </Link>
          <Link href="/dashboard" className={styles.navItem}>
            📁 History
          </Link>
          <Link href="/settings" className={styles.navItemActive}>
            ⚙️ Settings
          </Link>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Settings</h1>
          <p className={styles.headerSub}>
            Configure your API keys and preferences.
          </p>
        </header>

        <div className={styles.sections}>
          <section className={`glass-card ${styles.section}`}>
            <h2>API Keys</h2>
            <p className={styles.sectionDesc}>
              Connect your AI service providers.
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label htmlFor="claude-key">Claude API Key</label>
                <input
                  id="claude-key"
                  type="password"
                  placeholder="sk-ant-..."
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="openai-key">OpenAI API Key</label>
                <input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="elevenlabs-key">ElevenLabs API Key</label>
                <input
                  id="elevenlabs-key"
                  type="password"
                  placeholder="Enter your ElevenLabs key"
                  className={styles.input}
                />
              </div>
            </div>
          </section>

          <section className={`glass-card ${styles.section}`}>
            <h2>Billing</h2>
            <p className={styles.sectionDesc}>
              Manage your subscription and payment method via Paddle.
            </p>
            <div className={styles.billingInfo}>
              <span className={styles.planBadge}>Free Plan</span>
              <button className="btn-primary">Upgrade Plan</button>
            </div>
          </section>

          <section className={`glass-card ${styles.section}`}>
            <h2>Preferences</h2>
            <p className={styles.sectionDesc}>
              Customize your experience.
            </p>
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label htmlFor="default-model">Default Model</label>
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
