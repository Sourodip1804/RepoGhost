import { useState } from "react";
import {
  Ghost, UploadCloud, FolderGit2, ScanSearch, MessageSquare,
  FileText, ShieldCheck, Sparkles, LoaderCircle, Trash2,
  AlertTriangle, CheckCircle2, Code2, Github
} from "lucide-react";

const API = "";

function App() {
  const [repo, setRepo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [report, setReport] = useState("");
  const [reportStats, setReportStats] = useState(null);

  async function uploadFile(file) {
    if (!file) return;
    setError("");
    setBusy(true);
    setMessages([]);
    setReport("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API}/api/upload`, {
        method: "POST", body: form
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Upload failed");
      setRepo(data);
      setTab("overview");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function askGhost(e) {
    e.preventDefault();
    if (!question.trim() || !repo) return;
    const currentQuestion = question.trim();
    setQuestion("");
    setMessages(old => [...old, { role: "user", content: currentQuestion }]);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/chat/${repo.repo_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "AI request failed");
      setMessages(old => [...old, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateReport() {
    if (!repo) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/report/${repo.repo_id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Report failed");
      setReport(data.report);
      setReportStats(data.stats);
      setTab("report");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeRepo() {
    if (!repo) return;
    try {
      await fetch(`${API}/api/repository/${repo.repo_id}`, { method: "DELETE" });
    } finally {
      setRepo(null);
      setMessages([]);
      setReport("");
      setTab("overview");
    }
  }

  const scan = repo?.scan;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Ghost size={25} /></div>
          <div><strong>RepoGhost</strong><span>CODEBASE RESURRECTION</span></div>
        </div>

        <div className="side-label">WORKSPACE</div>
        <button className={`nav-item ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
          <FolderGit2 size={18}/> Overview
        </button>
        <button className={`nav-item ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")} disabled={!repo}>
          <MessageSquare size={18}/> Ask the Ghost
        </button>
        <button className={`nav-item ${tab === "report" ? "active" : ""}`} onClick={() => setTab("report")} disabled={!repo}>
          <FileText size={18}/> Haunted Report
        </button>

        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="status-dot"></span>
            <div><b>Local AI mode</b><small>Powered by Ollama</small></div>
          </div>
          <div className="privacy-note"><ShieldCheck size={15}/> Your code stays on this machine.</div>
          <a className="github-link" href="https://github.com/" target="_blank" rel="noreferrer">
            <Github size={15}/> GitHub
          </a>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="crumb">Workspace <span>/</span> {repo?.name || "No repository selected"}</div>
          <div className="top-status"><span className="status-dot"></span> LOCAL ENGINE</div>
        </header>

        <div className="content">
          <section className="hero">
            <div>
              <div className="eyebrow"><Sparkles size={14}/> OPEN-SOURCE AI CODE INTELLIGENCE</div>
              <h1>Every codebase has a <em>ghost.</em></h1>
              <p>Resurrect forgotten projects. Understand mysterious code. Bring abandoned repositories back to life.</p>
            </div>
            <div className="hero-ghost"><Ghost size={74} strokeWidth={1.1}/><div className="ghost-glow"></div></div>
          </section>

          {error && <div className="error-banner"><AlertTriangle size={17}/>{error}</div>}

          {!repo ? (
            <section className="upload-panel">
              <div className="upload-icon"><UploadCloud size={29}/></div>
              <h2>Summon a repository</h2>
              <p>Upload a GitHub project as a ZIP file to begin the scan.</p>
              <label className="primary-button upload-button">
                {busy ? <LoaderCircle className="spin" size={17}/> : <UploadCloud size={17}/>}
                {busy ? "Analysing..." : "Upload repository ZIP"}
                <input type="file" accept=".zip,application/zip" hidden disabled={busy}
                  onChange={e => uploadFile(e.target.files?.[0])}/>
              </label>
              <div className="upload-hint">ZIP only · Maximum 50 MB · Local analysis</div>
            </section>
          ) : (
            <>
              <section className="repo-banner">
                <div className="repo-symbol"><FolderGit2 size={22}/></div>
                <div className="repo-name"><b>{repo.name}</b><small>Repository scanned successfully</small></div>
                <button className="icon-button danger" title="Remove repository" onClick={removeRepo}><Trash2 size={17}/></button>
              </section>

              {tab === "overview" && (
                <>
                  <div className="section-heading"><div><h2>Ghost scan results</h2><p>What we discovered inside this repository.</p></div>
                    <button className="secondary-button" onClick={generateReport} disabled={busy}>
                      {busy ? <LoaderCircle className="spin" size={16}/> : <FileText size={16}/>} Generate report
                    </button>
                  </div>
                  <div className="stats-grid">
                    <Stat icon={<Code2/>} label="Source files" value={scan.total_files}/>
                    <Stat icon={<ScanSearch/>} label="Open tasks" value={scan.todos.length}/>
                    <Stat icon={<AlertTriangle/>} label="Python syntax findings" value={scan.errors.length}/>
                    <Stat icon={<FolderGit2/>} label="Languages" value={Object.keys(scan.languages).length}/>
                  </div>
                  <div className="two-column">
                    <div className="panel">
                      <div className="panel-title"><Code2 size={17}/> Languages detected</div>
                      {Object.entries(scan.languages).sort((a,b) => b[1]-a[1]).map(([name,count]) => (
                        <div className="language-row" key={name}><span>{name}</span><b>{count} files</b></div>
                      ))}
                    </div>
                    <div className="panel">
                      <div className="panel-title"><AlertTriangle size={17}/> Forgotten tasks</div>
                      {scan.todos.length === 0 ? <p className="empty-small">No TODO, FIXME or HACK markers found.</p> :
                        <div className="task-list">{scan.todos.slice(0,8).map((item,i) => (
                          <div className="task" key={i}><span className={`tag ${item.type.toLowerCase()}`}>{item.type}</span>
                            <div><b>{item.file}:{item.line}</b><small>{item.content}</small></div></div>
                        ))}</div>}
                    </div>
                  </div>
                  <div className="panel file-panel">
                    <div className="panel-title"><FolderGit2 size={17}/> Repository files <span className="muted-count">{scan.files.length} shown</span></div>
                    <div className="file-list">{scan.files.slice(0,40).map(file => <div className="file-row" key={file}><FileText size={14}/>{file}</div>)}</div>
                  </div>
                  <div className="cta-panel">
                    <div><Sparkles size={20}/><b>Want to understand this codebase?</b><p>Ask the local AI about architecture, functions or improvements.</p></div>
                    <button className="primary-button" onClick={() => setTab("chat")}>Ask the Ghost <MessageSquare size={16}/></button>
                  </div>
                </>
              )}

              {tab === "chat" && (
                <section className="panel chat-panel">
                  <div className="panel-title"><Ghost size={19}/> Ask the Ghost <span className="ai-pill">LOCAL MODEL</span></div>
                  <div className="chat-messages">
                    {messages.length === 0 && <div className="chat-welcome"><Ghost size={38}/><h3>The ghost is listening...</h3><p>Ask something about {repo.name}.</p>
                      <div className="suggestions">
                        {["Explain the project architecture","Which file is the entry point?","What improvements do you suggest?"].map(q =>
                          <button key={q} onClick={() => setQuestion(q)}>{q}</button>)}
                      </div></div>}
                    {messages.map((m,i) => <div className={`message ${m.role}`} key={i}><b>{m.role === "user" ? "You" : "RepoGhost"}</b><div>{m.content}</div></div>)}
                    {busy && <div className="message assistant"><b>RepoGhost</b><div className="thinking"><span></span><span></span><span></span> Thinking locally...</div></div>}
                  </div>
                  <form className="chat-form" onSubmit={askGhost}>
                    <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask anything about your codebase..." disabled={busy}/>
                    <button className="primary-button" disabled={busy || !question.trim()}>Send <MessageSquare size={15}/></button>
                  </form>
                  <p className="chat-footnote"><ShieldCheck size={13}/> Your prompt and source context are sent only to your local Ollama service.</p>
                </section>
              )}

              {tab === "report" && (
                <section className="panel report-panel">
                  <div className="panel-title"><FileText size={18}/> Haunted project report</div>
                  {!report ? <div className="report-empty"><FileText size={36}/><h3>No report generated yet</h3><p>Ask the Ghost to review the repository and prepare a report.</p><button className="primary-button" onClick={generateReport} disabled={busy}>{busy ? "Generating..." : "Generate report"}</button></div> :
                    <>
                      <div className="report-stats">{reportStats && <><span>{reportStats.total_files} files</span><span>{reportStats.todos} unfinished markers</span><span>{reportStats.errors} syntax findings</span></>}</div>
                      <article className="report-text">{report}</article>
                    </>}
                </section>
              )}
            </>
          )}
          <footer>RepoGhost <span>·</span> Built with open-weight AI <span>·</span> The code stays local</footer>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></div>;
}

export default App;
