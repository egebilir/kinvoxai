import styles from "./page.module.css";
import Link from "next/link";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.bgGlow} />

      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className="gradient-text">Kinvox</span>AI
        </div>
        <div className={styles.navLinks}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/settings">Settings</Link>
          <button className="btn-primary">Get Started</button>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Now in Early Access
        </div>
        <h1 className={styles.title}>
          Create with <span className="gradient-text">AI-Powered</span>
          <br />
          Intelligence
        </h1>
        <p className={styles.subtitle}>
          Generate stunning text, images, and audio using cutting-edge AI
          models. One platform, unlimited creative possibilities.
        </p>
        <div className={styles.actions}>
          <button className="btn-primary">Start Creating →</button>
          <button className="btn-secondary">View Demo</button>
        </div>
      </section>

      <section className={styles.features}>
        <div className={`glass-card ${styles.featureCard}`}>
          <div className={styles.featureIcon}>✍️</div>
          <h3>Text Generation</h3>
          <p>Powered by Claude for nuanced, creative text generation.</p>
        </div>
        <div className={`glass-card ${styles.featureCard}`}>
          <div className={styles.featureIcon}>🎨</div>
          <h3>Image Creation</h3>
          <p>Create stunning visuals with DALL·E integration.</p>
        </div>
        <div className={`glass-card ${styles.featureCard}`}>
          <div className={styles.featureIcon}>🔊</div>
          <h3>Audio Synthesis</h3>
          <p>Natural voice generation via ElevenLabs.</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2026 KinvoxAI. All rights reserved.</p>
      </footer>
    </main>
  );
}
