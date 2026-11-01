import { useState, useRef, useEffect } from "react";
import {
  Ghost, Upload, FolderGit2, ScanSearch,
  MessageSquare, FileText, ShieldCheck, Sparkles,
  LoaderCircle, Trash2, TriangleAlert, Code, ExternalLink
} from "lucide-react";

const API = ""; // e.g. "http://localhost:8000" if not using a dev proxy
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

// Safely read a response: never throws on non-JSON bodies (413, 502, HTML pages)
async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

// FastAPI returns `detail` as a string or as a list of validation objects
function errorMessage(data, fallback) {
  const d = data?.detail;
  if (!d) return fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d.map(item => item?.msg || JSON.stringify(item)).join("; ");
  }
  return JSON.stringify(d);
}

function App() {
  const [repo, setRepo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [report, setReport] = useState("");
  const [reportStats, setReportStats] = useState(null);

  // Tracks which repo is currently loaded, so late responses
  // for a deleted/replaced repo are ignored
  const activeRepoId = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    activeRepoId.current = repo?.repo_id ?? null;
  }, [repo]);

  // Auto-scroll chat to the newest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, tab]);

  // Upload repository ZIP
  async function uploadFile(file) {
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is larger than 50 MB. Please upload a smaller ZIP.");
      return;
    }

    setError("");
    setBusy(true);
    setMessages([]);
    setReport("");
    setReportStats(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(`${API}/api/upload`, {
        method: "POST",
        body: form
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(errorMessage(data, `Upload failed (${response.status})`));
      }

      activeRepoId.current = data.repo_id;
      setRepo(data);
      setTab("overview");
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  // Ask local AI
  async function askGhost(e) {
    e.preventDefault();

    if (!question.trim() || !repo || busy) return;

    const currentQuestion = question.trim();
    const repoId = repo.repo_id;

    setQuestion("");
    setMessages(old => [...old, { role: "user", content: currentQuestion }]);
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/chat/${repoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion })
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(errorMessage(data, `AI request failed (${response.status})`));
      }

      // Repo was removed or replaced while waiting: drop the answer
      if (activeRepoId.current !== repoId) return;

      setMessages(old => [
        ...old,
        { role: "assistant", content: data.answer ?? "(empty answer)" }
      ]);
    } catch (err) {
      if (activeRepoId.current === repoId) {
        setError(err.message || "AI request failed");
      }
    } finally {
      setBusy(false);
    }
  }

  // Generate project report
  async function generateReport() {
    if (!repo || busy) return;

    const repoId = repo.repo_id;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`${API}/api/report/${repoId}`);
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(errorMessage(data, `Report failed (${response.status})`));
      }

      if (activeRepoId.current !== repoId) return;

      setReport(data.report ?? "");
      setReportStats(data.stats ?? null);
      setTab("report");
    } catch (err) {
      if (activeRepoId.current === repoId) {
        setError(err.message || "Report failed");
      }
    } finally {
      setBusy(false);
    }
  }

  // Delete repository
  async function removeRepo() {
    if (!repo) return;

    try {
      const response = await fetch(`${API}/api/repository/${repo.repo_id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await readJson(response);
        throw new Error(errorMessage(data, "Could not delete repository"));
      }
    } catch (err) {
      setError(err.message || "Could not delete repository");
      return;
    }

    activeRepoId.current = null;
    setRepo(null);
    setMessages([]);
    setReport("");
    setReportStats(null);
    setError("");
    setTab("overview");
  }

  // Guard against missing fields in the backend response
  const scan = repo?.scan ?? {};
  const todos = scan.todos ?? [];
  const syntaxErrors = scan.errors ?? [];
  const languages = scan.languages ?? {};
  const files = scan.files ?? [];
  const totalFiles = scan.total_files ?? files.length;

  return (
    <div className="app-shell">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            <Ghost size={25} />
          </div>

          <div>
            <strong>RepoGhost</strong>
            <span>CODEBASE RESURRECTION</span>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        <button
          className={`nav-item ${tab === "overview" ? "active" : ""}`}
          onClick={() => setTab("overview")}
        >
          <FolderGit2 size={18} />
          Overview
        </button>

        <button
          className={`nav-item ${tab === "chat" ? "active" : ""}`}
          onClick={() => setTab("chat")}
          disabled={!repo}
        >
          <MessageSquare size={18} />
          Ask the Ghost
        </button>

        <button
          className={`nav-item ${tab === "report" ? "active" : ""}`}
          onClick={() => setTab("report")}
          disabled={!repo}
        >
          <FileText size={18} />
          Haunted Report
        </button>

        <div className="sidebar-bottom">

          <div className="local-card">
            <span className="status-dot"></span>
            <div>
              <b>Local AI mode</b>
              <small>Powered by Ollama</small>
            </div>
          </div>

          <div className="privacy-note">
            <ShieldCheck size={15} />
            Your code stays on this machine.
          </div>

          <a
            className="github-link"
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            GitHub
          </a>

        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-area">

        <header className="topbar">
          <div className="crumb">
            Workspace <span>/</span>
            {repo?.name || "No repository selected"}
          </div>

          <div className="top-status">
            <span className="status-dot"></span>
            LOCAL ENGINE
          </div>
        </header>

        <div className="content">

          {/* HERO */}
          <section className="hero">
            <div>
              <div className="eyebrow">
                <Sparkles size={14} />
                OPEN-SOURCE AI CODE INTELLIGENCE
              </div>

              <h1>
                Every codebase has a <em>ghost.</em>
              </h1>

              <p>
                Resurrect forgotten projects. Understand
                mysterious code. Bring abandoned repositories
                back to life.
              </p>
            </div>

            <div className="hero-ghost">
              <Ghost size={74} strokeWidth={1.1} />
              <div className="ghost-glow"></div>
            </div>
          </section>

          {/* ERROR */}
          {error && (
            <div className="error-banner" role="alert">
              <TriangleAlert size={17} />
              {error}
            </div>
          )}

          {/* UPLOAD SECTION */}
          {!repo ? (

            <section className="upload-panel">

              <div className="upload-icon">
                <Upload size={29} />
              </div>

              <h2>Summon a repository</h2>

              <p>
                Upload a GitHub project as a ZIP file
                to begin the scan.
              </p>

              <label className="primary-button upload-button">

                {busy
                  ? <LoaderCircle className="spin" size={17} />
                  : <Upload size={17} />
                }

                {busy ? "Analysing..." : "Upload repository ZIP"}

                <input
                  type="file"
                  accept=".zip,application/zip"
                  hidden
                  disabled={busy}
                  onChange={e => {
                    uploadFile(e.target.files?.[0]);
                    e.target.value = ""; // allow re-selecting the same file
                  }}
                />

              </label>

              <div className="upload-hint">
                ZIP only · Maximum 50 MB · Local analysis
              </div>

            </section>

          ) : (

            <>

              {/* REPOSITORY INFORMATION */}
              <section className="repo-banner">

                <div className="repo-symbol">
                  <FolderGit2 size={22} />
                </div>

                <div className="repo-name">
                  <b>{repo.name}</b>
                  <small>Repository scanned successfully</small>
                </div>

                <button
                  className="icon-button danger"
                  onClick={removeRepo}
                  title="Remove repository"
                  aria-label="Remove repository"
                >
                  <Trash2 size={17} />
                </button>

              </section>

              {/* OVERVIEW */}
              {tab === "overview" && (

                <>

                  <div className="section-heading">

                    <div>
                      <h2>Ghost scan results</h2>
                      <p>What we discovered inside this repository.</p>
                    </div>

                    <button
                      className="secondary-button"
                      onClick={generateReport}
                      disabled={busy}
                    >
                      {busy
                        ? <LoaderCircle className="spin" size={16} />
                        : <FileText size={16} />
                      }
                      Generate report
                    </button>

                  </div>

                  {/* STATISTICS */}
                  <div className="stats-grid">

                    <Stat
                      icon={<Code />}
                      label="Source files"
                      value={totalFiles}
                    />

                    <Stat
                      icon={<ScanSearch />}
                      label="Open tasks"
                      value={todos.length}
                    />

                    <Stat
                      icon={<TriangleAlert />}
                      label="Python syntax findings"
                      value={syntaxErrors.length}
                    />

                    <Stat
                      icon={<FolderGit2 />}
                      label="Languages"
                      value={Object.keys(languages).length}
                    />

                  </div>

                  {/* LANGUAGE AND TODO SECTION */}
                  <div className="two-column">

                    <div className="panel">

                      <div className="panel-title">
                        <Code size={17} />
                        Languages detected
                      </div>

                      {Object.entries(languages)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, count]) => (
                          <div className="language-row" key={name}>
                            <span>{name}</span>
                            <b>{count} files</b>
                          </div>
                        ))}

                    </div>

                    <div className="panel">

                      <div className="panel-title">
                        <TriangleAlert size={17} />
                        Forgotten tasks
                      </div>

                      {todos.length === 0 ? (

                        <p className="empty-small">
                          No TODO, FIXME or HACK markers found.
                        </p>

                      ) : (

                        <div className="task-list">

                          {todos.slice(0, 8).map((item, i) => (

                            <div className="task" key={i}>

                              <span className={`tag ${String(item.type ?? "").toLowerCase()}`}>
                                {item.type}
                              </span>

                              <div>
                                <b>{item.file}:{item.line}</b>
                                <small>{item.content}</small>
                              </div>

                            </div>

                          ))}

                        </div>

                      )}

                    </div>

                  </div>

                  {/* FILE LIST */}
                  <div className="panel file-panel">

                    <div className="panel-title">
                      <FolderGit2 size={17} />
                      Repository files

                      <span className="muted-count">
                        {Math.min(files.length, 40)} of {files.length} shown
                      </span>
                    </div>

                    <div className="file-list">

                      {files.slice(0, 40).map(file => (
                        <div className="file-row" key={file}>
                          <FileText size={14} />
                          {file}
                        </div>
                      ))}

                    </div>

                  </div>

                  {/* ASK AI BUTTON */}
                  <div className="cta-panel">

                    <div>
                      <Sparkles size={20} />
                      <b>Want to understand this codebase?</b>

                      <p>
                        Ask the local AI about architecture,
                        functions or improvements.
                      </p>
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => setTab("chat")}
                    >
                      Ask the Ghost
                      <MessageSquare size={16} />
                    </button>

                  </div>

                </>

              )}

              {/* AI CHAT */}
              {tab === "chat" && (

                <section className="panel chat-panel">

                  <div className="panel-title">
                    <Ghost size={19} />
                    Ask the Ghost
                    <span className="ai-pill">LOCAL MODEL</span>
                  </div>

                  <div className="chat-messages">

                    {messages.length === 0 && (

                      <div className="chat-welcome">

                        <Ghost size={38} />

                        <h3>The ghost is listening...</h3>

                        <p>Ask something about {repo.name}.</p>

                        <div className="suggestions">

                          {[
                            "Explain the project architecture",
                            "Which file is the entry point?",
                            "What improvements do you suggest?"
                          ].map(q => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setQuestion(q)}
                            >
                              {q}
                            </button>
                          ))}

                        </div>

                      </div>

                    )}

                    {messages.map((m, i) => (

                      <div className={`message ${m.role}`} key={i}>

                        <b>{m.role === "user" ? "You" : "RepoGhost"}</b>

                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {m.content}
                        </div>

                      </div>

                    ))}

                    {busy && (
                      <div className="message assistant">
                        <b>RepoGhost</b>
                        <div>Thinking locally...</div>
                      </div>
                    )}

                    <div ref={chatEndRef} />

                  </div>

                  <form className="chat-form" onSubmit={askGhost}>

                    <input
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      placeholder="Ask anything about your codebase..."
                      disabled={busy}
                    />

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={busy || !question.trim()}
                    >
                      Send
                      <MessageSquare size={15} />
                    </button>

                  </form>

                  <p className="chat-footnote">
                    <ShieldCheck size={13} />
                    Your prompt and source context are sent
                    only to your local Ollama service.
                  </p>

                </section>

              )}

              {/* REPORT */}
              {tab === "report" && (

                <section className="panel report-panel">

                  <div className="panel-title">
                    <FileText size={18} />
                    Haunted project report
                  </div>

                  {!report ? (

                    <div className="report-empty">

                      <FileText size={36} />

                      <h3>No report generated yet</h3>

                      <p>Ask the Ghost to review the repository.</p>

                      <button
                        className="primary-button"
                        onClick={generateReport}
                        disabled={busy}
                      >
                        {busy ? "Generating..." : "Generate report"}
                      </button>

                    </div>

                  ) : (

                    <>

                      {reportStats && (
                        <div className="report-stats">
                          <span>{reportStats.total_files ?? 0} files</span>
                          <span>{reportStats.todos ?? 0} unfinished markers</span>
                          <span>{reportStats.errors ?? 0} syntax findings</span>
                        </div>
                      )}

                      <article
                        className="report-text"
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {report}
                      </article>

                    </>

                  )}

                </section>

              )}

            </>

          )}

          <footer>
            RepoGhost <span>·</span>
            Built with open-weight AI <span>·</span>
            The code stays local
          </footer>

        </div>
      </main>
    </div>
  );
}

// Reusable statistics card
function Stat({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default App;