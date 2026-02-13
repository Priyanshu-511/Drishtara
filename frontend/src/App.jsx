import { useEffect, useState, useRef } from "react";
import "./App.css";

// ── Emotion config ────────────────────────────────────────────────────────────
const EMOTIONS = {
  Happy:    { emoji: "😊", color: "#FFD93D", bg: "rgba(255,217,61,0.15)",   state: "You're radiating joy right now. Keep that energy alive." },
  Neutral:  { emoji: "😐", color: "#A0AEC0", bg: "rgba(160,174,192,0.15)", state: "Calm and composed. A balanced, steady state of mind." },
  Sad:      { emoji: "😢", color: "#63B3ED", bg: "rgba(99,179,237,0.15)",   state: "Feeling low? That's okay. Every wave passes in time." },
  Angry:    { emoji: "😠", color: "#FC8181", bg: "rgba(252,129,129,0.15)", state: "There's fire in you. Take a breath — channel it wisely." },
  Fear:     { emoji: "😨", color: "#B794F4", bg: "rgba(183,148,244,0.15)", state: "Feeling uneasy? Acknowledge it. Courage is fear in motion." },
  Surprise: { emoji: "😲", color: "#F6AD55", bg: "rgba(246,173,85,0.15)",  state: "Something caught you off guard. Stay curious!" },
  Disgust:  { emoji: "🤢", color: "#68D391", bg: "rgba(104,211,145,0.15)", state: "Something doesn't sit right. Trust your instincts." },
};

// ── Animated emotion bar ──────────────────────────────────────────────────────
function EmotionBar({ label, value, color, bg, isTop, delay }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 80 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div
      className={`emotion-bar-wrap${isTop ? " emotion-bar-top" : ""}`}
      style={{
        background: isTop ? bg : "transparent",
        border: isTop ? `1px solid ${color}40` : "1px solid transparent",
      }}
    >
      <span className="emotion-bar-emoji">{EMOTIONS[label]?.emoji}</span>
      <div className="emotion-bar-body">
        <div className="emotion-bar-header">
          <span
            className="emotion-bar-label"
            style={{ fontWeight: isTop ? "700" : "500", color: isTop ? color : "#6B7280" }}
          >
            {label}
          </span>
          <span className="emotion-bar-value" style={{ color: isTop ? color : "#4B5563" }}>
            {value.toFixed(1)}%
          </span>
        </div>
        <div className="emotion-bar-track">
          <div
            className="emotion-bar-fill"
            style={{
              width: `${width}%`,
              background: isTop ? `linear-gradient(90deg, ${color}88, ${color})` : `${color}44`,
              boxShadow: isTop ? `0 0 10px ${color}55` : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [result, setResult]           = useState(null);
  const [file, setFile]               = useState(null);
  const [preview, setPreview]         = useState(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState("");
  const [dragOver, setDragOver]       = useState(false);
  const [activeNav, setActiveNav]     = useState("home");
  const fileInputRef                  = useRef();
  const homeRef                       = useRef();
  const aboutRef                      = useRef();

  // ── Health check ─────────────────────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch("http://localhost:3000/health", { credentials: "include" });
        setIsConnected(r.ok);
      } catch {
        setIsConnected(false);
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  // ── Scroll spy ────────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveNav(entry.target.id);
          }
        });
      },
      { threshold: 0.4 }
    );
    if (homeRef.current) observer.observe(homeRef.current);
    if (aboutRef.current) observer.observe(aboutRef.current);
    return () => observer.disconnect();
  }, []);

  // ── Nav scroll handler ────────────────────────────────────────────────────
  const scrollTo = (ref, id) => {
    setActiveNav(id);
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── Analyze ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true);
    setResult(null);
    setError("");
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res  = await fetch("http://localhost:3000/api/predict", {
        method: "POST", body: formData, credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || data.error) setError(data.error || "Something went wrong");
      else setResult(data);
    } catch {
      setError("Connection failed — is the backend running?");
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const sortedScores = result?.scores
    ? Object.entries(result.scores).sort((a, b) => b[1] - a[1])
    : [];
  const dominant    = result?.dominant;
  const dominantCfg = dominant ? EMOTIONS[dominant] : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="grid-bg" />
      <div className="glow-orb glow-orb-purple" />
      <div className="glow-orb glow-orb-teal" />

      <div className="app-wrap">

        {/* ── Top bar ── */}
        <header className="topbar">
          <div className="logo">
            <span className="logo-icon">◈</span>
            Drishtara
          </div>

          {/* ── Navbar ── */}
          <nav className="navbar">
            <button
              className={`nav-btn${activeNav === "home" ? " nav-active" : ""}`}
              onClick={() => scrollTo(homeRef, "home")}
            >
              <span className="nav-indicator" />
              Home
            </button>
            <button
              className={`nav-btn${activeNav === "about" ? " nav-active" : ""}`}
              onClick={() => scrollTo(aboutRef, "about")}
            >
              <span className="nav-indicator" />
              About
            </button>
          </nav>

          <div className={`pill ${isConnected ? "connected" : "disconnected"}`}>
            <span className="dot" />
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </header>

        {/* ════ HOME SECTION ════ */}
        <section id="home" ref={homeRef} className="page-section">

          {/* sub-header label */}
          <div className="section-page-label">
            <span className="section-page-num">01</span>
            <span>Facial Expression Analyser</span>
          </div>

          {/* ── Two-column layout ── */}
          <div className="layout">

            {/* ════ LEFT PANEL ════ */}
            <aside className="left-panel">

              {/* File input */}
              <section className="panel-section">
                <div className="section-label">
                  <span className="section-num">01</span> Input Image
                </div>

                <div
                  className={`drop-zone${dragOver ? " drag-over" : ""}${file ? " has-file" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <div className="drop-inner">
                    <div className="drop-icon">
                      {file ? "✓" : "↑"}
                    </div>
                    <div className="drop-primary">
                      {file ? file.name : "Drop image here"}
                    </div>
                    <div className="drop-secondary">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : "or click to browse"}
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files[0])}
                  style={{ display: "none" }}
                />

                <button
                  className="analyze-btn"
                  onClick={handleAnalyze}
                  disabled={!file || isLoading || !isConnected}
                >
                  {isLoading
                    ? <><span className="spinner" /> Analysing…</>
                    : !isConnected
                    ? "Waiting for backend…"
                    : "Analyse Expression"}
                </button>

                {error && <div className="error-msg">⚠ {error}</div>}
              </section>

              <div className="divider" />

              {/* Image preview */}
              <section className="panel-section preview-section">
                <div className="section-label">
                  <span className="section-num">02</span> Preview
                </div>
                <div className="preview-box">
                  {preview ? (
                    <img src={preview} alt="Selected" className="preview-img" />
                  ) : (
                    <div className="preview-placeholder">
                      <div className="preview-placeholder-icon">🖼</div>
                      <div className="preview-placeholder-text">Image will appear here</div>
                    </div>
                  )}
                  {isLoading && (
                    <div className="preview-loading-overlay">
                      <div className="big-spinner" />
                      <div className="loading-text">Analysing…</div>
                    </div>
                  )}
                </div>
              </section>

            </aside>

            {/* ════ RIGHT PANEL ════ */}
            <main className="right-panel">

              {/* Current state */}
              <section className="panel-section">
                <div className="section-label">
                  <span className="section-num">03</span> Current State
                </div>

                {dominantCfg ? (
                  <div
                    className="state-card fade-in"
                    style={{
                      background: `linear-gradient(145deg, ${dominantCfg.color}14, ${dominantCfg.color}06)`,
                      borderColor: `${dominantCfg.color}35`,
                    }}
                  >
                    <div className="state-top">
                      <span className="state-emoji">{dominantCfg.emoji}</span>
                      <div className="state-info">
                        <div className="state-name" style={{ color: dominantCfg.color }}>
                          {dominant}
                        </div>
                        <div className="state-conf" style={{ color: dominantCfg.color }}>
                          {result.confidence.toFixed(1)}% confidence
                        </div>
                      </div>
                    </div>
                    <p className="state-desc">{dominantCfg.state}</p>
                  </div>
                ) : (
                  <div className="state-empty">
                    <div className="state-empty-icon">◎</div>
                    <div className="state-empty-title">No analysis yet</div>
                    <div className="state-empty-sub">
                      Upload a face photo and click Analyse
                    </div>
                  </div>
                )}
              </section>

              <div className="divider" />

              {/* Breakdown */}
              <section className="panel-section">
                <div className="section-label">
                  <span className="section-num">04</span> Emotion Breakdown
                </div>

                {sortedScores.length > 0 ? (
                  <div className="breakdown-grid fade-in">
                    {sortedScores.map(([label, value], i) => (
                      <EmotionBar
                        key={label}
                        label={label}
                        value={value}
                        color={EMOTIONS[label]?.color || "#A0AEC0"}
                        bg={EMOTIONS[label]?.bg || "transparent"}
                        isTop={label === dominant}
                        delay={i * 60}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="breakdown-empty">
                    {[...Array(7)].map((_, i) => (
                      <div key={i} className="breakdown-skeleton">
                        <div className="skel-emoji" />
                        <div className="skel-body">
                          <div className="skel-label" style={{ width: `${55 + i * 8}px` }} />
                          <div className="skel-bar" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </main>
          </div>
        </section>

        {/* ════ ABOUT SECTION ════ */}
        <section id="about" ref={aboutRef} className="page-section about-section">

          <div className="section-page-label">
            <span className="section-page-num">02</span>
            <span>About &amp; Developer</span>
          </div>

          <div className="about-layout">

            {/* ── About the project ── */}
            <div className="about-card about-project">
              <div className="about-card-tag">The Project</div>
              <h2 className="about-card-title">
                What is <span className="about-highlight">Drishtara</span>?
              </h2>
              <p className="about-card-body">
                Drishtara is a real-time facial expression analyser powered by a deep learning
                model trained on thousands of labelled face images. It detects and quantifies
                seven universal emotions — Happy, Sad, Angry, Fear, Surprise, Disgust, and
                Neutral — from any uploaded portrait photo.
              </p>
              <p className="about-card-body">
                The name <em>Drishtara</em> is derived from Sanskrit <em>दृष्टि</em> (Drishti),
                meaning <em>vision</em> or <em>sight</em> — a nod to the system's ability to
                perceive subtle emotional cues invisible to a casual glance.
              </p>

              <div className="about-tech-row">
                {["React 18", "Vite", "Node.js", "Express", "TensorFlow / ONNX", "Python"].map((t) => (
                  <span key={t} className="about-tech-chip">{t}</span>
                ))}
              </div>
            </div>

            {/* ── Developer card ── */}
            <div className="about-card about-dev">
              <div className="about-card-tag">The Developer</div>

              <div className="dev-avatar-row">
                <div className="dev-avatar">
                  <span className="dev-avatar-initials">D</span>
                  <div className="dev-avatar-ring" />
                </div>
                <div className="dev-name-block">
                  <h3 className="dev-name">Developer</h3>
                  <span className="dev-title">Full-Stack &amp; ML Engineer</span>
                </div>
              </div>

              <p className="about-card-body">
                Passionate about bridging the gap between machine learning research and
                production-ready web applications. Drishtara was built as an exploration into
                real-time affective computing — making emotion intelligence accessible through
                a clean, minimal interface.
              </p>

              <div className="dev-stats-row">
                <div className="dev-stat">
                  <span className="dev-stat-num">7</span>
                  <span className="dev-stat-label">Emotions Detected</span>
                </div>
                <div className="dev-stat">
                  <span className="dev-stat-num">~95ms</span>
                  <span className="dev-stat-label">Avg Inference</span>
                </div>
                <div className="dev-stat">
                  <span className="dev-stat-num">FER+</span>
                  <span className="dev-stat-label">Dataset</span>
                </div>
              </div>

              <div className="dev-links">
                <a href="#" className="dev-link-btn">
                  <span>⬡</span> GitHub
                </a>
                <a href="#" className="dev-link-btn">
                  <span>◈</span> Portfolio
                </a>
                <a href="#" className="dev-link-btn">
                  <span>✦</span> LinkedIn
                </a>
              </div>
            </div>

            {/* ── How it works ── */}
            <div className="about-card about-how">
              <div className="about-card-tag">How It Works</div>
              <h2 className="about-card-title">Under the Hood</h2>

              <div className="how-steps">
                {[
                  { num: "01", title: "Upload", desc: "Select or drag-and-drop any face photo into the analyser." },
                  { num: "02", title: "Pre-process", desc: "The backend detects and crops the face region, resizes to 48×48 px grayscale." },
                  { num: "03", title: "Inference", desc: "A CNN model runs inference and outputs a probability vector over 7 emotion classes." },
                  { num: "04", title: "Visualise", desc: "Results are streamed back to the UI and rendered as animated confidence bars." },
                ].map((s) => (
                  <div key={s.num} className="how-step">
                    <div className="how-step-num">{s.num}</div>
                    <div className="how-step-content">
                      <div className="how-step-title">{s.title}</div>
                      <div className="how-step-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Footer inside about ── */}
          <div className="about-footer">
            <span>Built with ◈ &amp; curiosity</span>
            <button
              className="back-top-btn"
              onClick={() => scrollTo(homeRef, "home")}
            >
              ↑ Back to Top
            </button>
          </div>

        </section>

      </div>
    </>
  );
}