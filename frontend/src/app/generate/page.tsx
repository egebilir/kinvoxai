"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import Link from "next/link";

type JobStatus = "idle" | "queued" | "processing" | "completed" | "failed";
type ImageStatus = "idle" | "generating" | "completed" | "failed";

interface StoryResult {
  baslik: string;
  hikaye: string;
  seslendirme: string;
  sahneler_tr: string[];
  sahneler_en: string[];
  imagePaths: string[] | null;
  style: string;
  duration: string;
  sahneSayisi: number;
}

interface StatusResponse {
  jobId: string;
  status: string;
  progress: number;
  error: string | null;
  result: StoryResult | null;
}

interface ImageGenResponse {
  jobId: string;
  status: string;
  imagePaths: string[];
  errors?: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function GeneratePage() {
  const t = useTranslations();

  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<"short" | "long">("short");
  const [style, setStyle] = useState("horror");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<StoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image generation state
  const [imageStatus, setImageStatus] = useState<ImageStatus>("idle");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/status/${id}`);
      const data = (await res.json()) as StatusResponse;

      setStatus(data.status as JobStatus);
      setProgress(data.progress);

      if (data.status === "completed" && data.result) {
        setResult(data.result);
        // If images already exist (from a previous run), use them
        if (data.result.imagePaths && data.result.imagePaths.length > 0) {
          setImagePaths(data.result.imagePaths);
          setImageStatus("completed");
        }
        return true;
      }
      if (data.status === "failed") {
        setError(data.error || "Generation failed");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Auto-trigger image generation after story completes
  useEffect(() => {
    if (
      status === "completed" &&
      result &&
      jobId &&
      imageStatus === "idle" &&
      result.sahneler_en.length > 0 &&
      (!result.imagePaths || result.imagePaths.length === 0)
    ) {
      generateImagesForStory(jobId, result.sahneler_en);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, result, jobId, imageStatus]);

  async function generateImagesForStory(id: string, scenes: string[]): Promise<void> {
    setImageStatus("generating");
    setImageError(null);

    try {
      const res = await fetch(`${API_URL}/api/generate-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, scenes }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error || "Image generation failed");
      }

      const data = (await res.json()) as ImageGenResponse;
      setImagePaths(data.imagePaths);
      setImageStatus("completed");

      if (data.errors && data.errors.length > 0) {
        setImageError(data.errors.join("; "));
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Image generation failed");
      setImageStatus("failed");
    }
  }

  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed") return;

    const interval = setInterval(async () => {
      const done = await pollStatus(jobId);
      if (done) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, status, pollStatus]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setStatus("idle");
    setProgress(0);
    setImageStatus("idle");
    setImagePaths([]);
    setImageError(null);

    try {
      const res = await fetch(`${API_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_prompt: prompt.trim(),
          duration,
          style,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error || "Request failed");
      }

      const data = (await res.json()) as { jobId: string; status: string };
      setJobId(data.jobId);
      setStatus(data.status as JobStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isGenerating = status === "queued" || status === "processing";

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
          <Link href="/generate" className={styles.navItemActive}>
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
          <h1>{t("generate.title")}</h1>
          <p className={styles.headerSub}>{t("generate.subtitle")}</p>
        </header>

        {/* Generation Form */}
        <form onSubmit={handleSubmit} className={`glass-card ${styles.formCard}`}>
          <div className={styles.formField}>
            <label htmlFor="story-prompt">{t("generate.promptLabel")}</label>
            <textarea
              id="story-prompt"
              className={styles.textarea}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("generate.promptPlaceholder")}
              rows={3}
              disabled={isGenerating}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="duration-select">{t("generate.durationLabel")}</label>
              <select
                id="duration-select"
                className={styles.select}
                value={duration}
                onChange={(e) => setDuration(e.target.value as "short" | "long")}
                disabled={isGenerating}
              >
                <option value="short">{t("generate.durationShort")}</option>
                <option value="long">{t("generate.durationLong")}</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label htmlFor="style-select">{t("generate.styleLabel")}</label>
              <select
                id="style-select"
                className={styles.select}
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                disabled={isGenerating}
              >
                <option value="horror">{t("generate.styles.horror")}</option>
                <option value="adventure">{t("generate.styles.adventure")}</option>
                <option value="comedy">{t("generate.styles.comedy")}</option>
                <option value="drama">{t("generate.styles.drama")}</option>
                <option value="scifi">{t("generate.styles.scifi")}</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!prompt.trim() || isGenerating}
            style={{ width: "100%", padding: "14px", opacity: (!prompt.trim() || isGenerating) ? 0.5 : 1 }}
          >
            {isGenerating ? t("generate.generating") : t("generate.submit")}
          </button>
        </form>

        {/* Story Progress */}
        {isGenerating && (
          <div className={`glass-card ${styles.progressCard}`}>
            <div className={styles.progressHeader}>
              <span className={styles.progressDot} />
              <span>{t("generate.progressLabel")}</span>
              <span className={styles.progressPct}>{progress}%</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <p className={styles.progressHint}>{t("generate.progressHint")}</p>
          </div>
        )}

        {/* Image Generation Progress */}
        {imageStatus === "generating" && (
          <div className={`glass-card ${styles.progressCard}`}>
            <div className={styles.progressHeader}>
              <span className={styles.progressDotImage} />
              <span>{t("generate.imageProgressLabel")}</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFillImage} style={{ width: "60%" }} />
            </div>
            <p className={styles.progressHint}>{t("generate.imageProgressHint")}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`glass-card ${styles.errorCard}`}>
            <strong>❌ {t("generate.errorTitle")}</strong>
            <p>{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={styles.resultSection}>
            {/* Header */}
            <div className={`glass-card ${styles.resultHeader}`}>
              <h2 className={styles.storyTitle}>{result.baslik}</h2>
              <div className={styles.resultMeta}>
                <span className={styles.metaBadge}>{result.style}</span>
                <span className={styles.metaBadge}>
                  {result.duration === "short" ? "TikTok" : "YouTube"}
                </span>
                <span className={styles.metaBadge}>
                  {result.sahneSayisi} {t("generate.scenes")}
                </span>
                {imageStatus === "completed" && (
                  <span className={`${styles.metaBadge} ${styles.metaBadgeSuccess}`}>
                    🖼️ {t("generate.imagesReady")}
                  </span>
                )}
              </div>
            </div>

            {/* Scene Images Grid */}
            {imagePaths.length > 0 && (
              <div className={`glass-card ${styles.imagesCard}`}>
                <h3>🖼️ {t("generate.sceneImages")} ({imagePaths.length})</h3>
                {imageError && (
                  <p className={styles.imageWarning}>⚠️ {imageError}</p>
                )}
                <div className={styles.imagesGrid}>
                  {imagePaths.map((imgPath, i) => (
                    <div key={i} className={styles.imageItem}>
                      <div className={styles.imageWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`${API_URL}${imgPath}`}
                          alt={`Scene ${i + 1}`}
                          className={styles.sceneImage}
                          loading="lazy"
                        />
                      </div>
                      <div className={styles.imageLabel}>
                        <span className={styles.imageLabelNum}>{i + 1}</span>
                        <span>{t("generate.sceneLabel")} {i + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hikaye */}
            <div className={`glass-card ${styles.storyCard}`}>
              <h3>📖 {t("generate.hikaye")}</h3>
              <div className={styles.storyText}>
                <p>{result.hikaye}</p>
              </div>
            </div>

            {/* Seslendirme */}
            <div className={`glass-card ${styles.voiceoverCard}`}>
              <h3>🎙️ {t("generate.seslendirme")}</h3>
              <div className={styles.voiceoverText}>
                <p>{result.seslendirme}</p>
              </div>
            </div>

            {/* Sahneler TR */}
            <div className={`glass-card ${styles.scenesCard}`}>
              <h3>
                🇹🇷 {t("generate.sahnelerTr")} ({result.sahneler_tr.length})
              </h3>
              <div className={styles.scenesGrid}>
                {result.sahneler_tr.map((scene, i) => (
                  <div key={i} className={styles.sceneItem}>
                    <div className={styles.sceneNumber}>{i + 1}</div>
                    <p>{scene}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sahneler EN */}
            <div className={`glass-card ${styles.scenesCard}`}>
              <h3>
                🇬🇧 {t("generate.sahnelerEn")} ({result.sahneler_en.length})
              </h3>
              <div className={styles.scenesGrid}>
                {result.sahneler_en.map((scene, i) => (
                  <div key={i} className={`${styles.sceneItem} ${styles.sceneItemEn}`}>
                    <div className={styles.sceneNumberEn}>{i + 1}</div>
                    <p>{scene}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
