import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const API = "http://localhost:8000/api";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       "#050a0f",
  surface:  "#080f16",
  panel:    "#0c1620",
  border:   "#0e2030",
  accent:   "#00d4ff",
  accentDim:"#005f72",
  danger:   "#ff2d55",
  warn:     "#ff9500",
  ok:       "#30d158",
  purple:   "#bf5af2",
  text:     "#c8e0ee",
  muted:    "#4a7a94",
  dim:      "#1a3040",
};

// ── Severity color ────────────────────────────────────────────────────────────
const sevColor = (s) => ({
  critical: C.danger,
  high:     C.warn,
  medium:   "#ffd60a",
  low:      C.ok,
}[s?.toLowerCase()] || C.muted);

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{
    display: "inline-block", padding: "2px 8px", borderRadius: 4,
    fontSize: 10, fontWeight: 700, letterSpacing: 1,
    background: color + "22", color, border: `1px solid ${color}44`,
    textTransform: "uppercase",
  }}>{label}</span>
);

const Spinner = () => (
  <span style={{
    display: "inline-block", width: 16, height: 16,
    border: `2px solid ${C.accentDim}`, borderTopColor: C.accent,
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
  }} />
);

const Btn = ({ children, onClick, color = C.accent, disabled, small, style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      background: disabled ? C.dim : color + "15",
      color: disabled ? C.muted : color,
      border: `1px solid ${disabled ? C.dim : color + "55"}`,
      borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
      padding: small ? "4px 10px" : "8px 18px",
      fontSize: small ? 11 : 13, fontWeight: 600, letterSpacing: 0.5,
      fontFamily: "inherit", transition: "all 0.15s",
      ...style,
    }}
    onMouseEnter={e => { if (!disabled) e.target.style.background = color + "30"; }}
    onMouseLeave={e => { if (!disabled) e.target.style.background = color + "15"; }}
  >{children}</button>
);

const Input = ({ value, onChange, placeholder, type = "text", style = {} }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      background: C.bg, border: `1px solid ${C.border}`,
      borderRadius: 6, color: C.text, padding: "8px 12px",
      fontSize: 13, fontFamily: "inherit", outline: "none",
      width: "100%", boxSizing: "border-box", ...style,
    }}
    onFocus={e => e.target.style.borderColor = C.accentDim}
    onBlur={e => e.target.style.borderColor = C.border}
  />
);

const Select = ({ value, onChange, options, style = {} }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 6, color: C.text, padding: "8px 12px",
      fontSize: 13, fontFamily: "inherit", outline: "none", ...style,
    }}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.panel, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: 20, ...style,
  }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{
    color: C.accent, fontSize: 11, letterSpacing: 3,
    textTransform: "uppercase", margin: "0 0 16px",
    fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
  }}>▸ {children}</h3>
);

// ── Code Block ────────────────────────────────────────────────────────────────
const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <pre style={{
        background: "#020608", border: `1px solid ${C.border}`,
        borderRadius: 8, padding: 16, margin: "10px 0",
        fontSize: 11, color: "#7ec8e3", overflowX: "auto",
        fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.7,
        maxHeight: 360, overflowY: "auto",
      }}>{code}</pre>
      <Btn small color={C.muted} style={{ position: "absolute", top: 8, right: 8 }}
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? "✓" : "copy"}
      </Btn>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  PANELS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Dashboard ─────────────────────────────────────────────────────────────────
const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: "#0c1620", border: "1px solid #0e2030", borderRadius: 6, fontSize: 11 },
  labelStyle:   { color: "#c8e0ee" },
  itemStyle:    { color: "#c8e0ee" },
};

function Dashboard({ stats, onRefresh }) {
  const [series, setSeries]     = useState([]);
  const [typeCounts, setTypeCounts] = useState({});
  const [riskTrend, setRiskTrend]  = useState([]);
  const [loading, setLoading]   = useState(false);

  const loadCharts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/stats/timeseries?days=14`);
      if (r.ok) {
        const d = await r.json();
        setSeries(d.series || []);
        setTypeCounts(d.type_counts || {});
        setRiskTrend(d.risk_trend || []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCharts(); }, [loadCharts]);

  const metrics = [
    { label: "Total Scans",    value: stats.scans,            color: C.accent  },
    { label: "Findings",       value: stats.total_findings,   color: C.text    },
    { label: "Critical",       value: stats.critical,         color: C.danger  },
    { label: "High",           value: stats.high,             color: C.warn    },
    { label: "PoCs Generated", value: stats.pocs,             color: C.purple  },
    { label: "Remediations",   value: stats.remediations,     color: C.ok      },
    { label: "News Items",     value: stats.news_items,       color: "#ffd60a" },
    { label: "Research Rpts",  value: stats.research_reports, color: C.accentDim },
  ];

  const pieData = Object.entries(typeCounts).map(([k, v]) => ({ name: k, value: v }));
  const PIE_COLORS = [C.accent, C.purple, C.warn, C.ok, C.danger, "#ffd60a"];

  const shortDate = (d) => d ? d.slice(5) : "";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ color: C.text, margin: 0, fontSize: 22, fontWeight: 300 }}>
            Threat Intelligence <span style={{ color: C.accent, fontWeight: 700 }}>Command Center</span>
          </h2>
          <p style={{ color: C.muted, fontSize: 12, margin: "4px 0 0", fontFamily: "monospace" }}>
            AI Security Detection & Analysis Platform
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={loadCharts} color={C.muted} small disabled={loading}>
            {loading ? <Spinner /> : "↻ Charts"}
          </Btn>
          <Btn onClick={onRefresh}>↻ Refresh</Btn>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {metrics.map(m => (
          <Card key={m.label} style={{ textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: m.color, fontFamily: "monospace" }}>
              {m.value ?? 0}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, letterSpacing: 1 }}>{m.label}</div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      {series.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          {/* Findings over time */}
          <Card>
            <SectionTitle>Findings Over Time (14 days)</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  {[["critical", C.danger], ["high", C.warn], ["medium", "#ffd60a"], ["low", C.ok]].map(([k, c]) => (
                    <linearGradient key={k} id={`g_${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={c} stopOpacity={0}   />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: C.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
                {[["critical", C.danger], ["high", C.warn], ["medium", "#ffd60a"], ["low", C.ok]].map(([k, c]) => (
                  <Area key={k} type="monotone" dataKey={k} stroke={c} strokeWidth={1.5}
                    fill={`url(#g_${k})`} dot={false} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Scans + Activity */}
          <Card>
            <SectionTitle>Platform Activity (14 days)</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: C.muted, fontSize: 10 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
                <Bar dataKey="scans" fill={C.accent}  radius={[2, 2, 0, 0]} name="Scans" />
                <Bar dataKey="news"  fill={C.purple}  radius={[2, 2, 0, 0]} name="News" />
                <Bar dataKey="pocs"  fill={C.warn}    radius={[2, 2, 0, 0]} name="PoCs" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Risk score trend */}
          {riskTrend.length > 0 && (
            <Card>
              <SectionTitle>Risk Score Trend (last 20 scans)</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[...riskTrend].reverse()} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="target" tick={{ fill: C.muted, fontSize: 9 }}
                    tickFormatter={v => v?.slice(0, 10)} />
                  <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 10 }} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="score" stroke={C.danger} strokeWidth={2}
                    dot={{ fill: C.danger, r: 3 }} name="Risk Score" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Scan type pie */}
          {pieData.length > 0 && (
            <Card>
              <SectionTitle>Scan Types Breakdown</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={75}
                    dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: C.muted }}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* System status */}
      <Card>
        <SectionTitle>System Status</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { label: "Threat Intel Engine", status: "ONLINE", color: C.ok },
            { label: "PoC Simulator",       status: "READY",  color: C.ok },
            { label: "Remediation Engine",  status: "ACTIVE", color: C.ok },
            { label: "Security Test Suite", status: "ARMED",  color: C.warn },
          ].map(s => (
            <div key={s.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", background: C.bg, borderRadius: 6,
              border: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 12, color: C.text }}>{s.label}</span>
              <Badge label={s.status} color={s.color} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Threat News ───────────────────────────────────────────────────────────────
function ThreatNews() {
  const [news, setNews]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("AI security threats LLM vulnerabilities 2025");
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchStored(); }, []);

  const fetchStored = async () => {
    const r = await fetch(`${API}/news`);
    const d = await r.json();
    setNews(d.items || []);
  };

  const fetchLive = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/news/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 12 }),
      });
      const d = await r.json();
      setNews(d.items || []);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <Input value={query} onChange={setQuery} placeholder="Threat intel query..." style={{ flex: 1 }} />
        <Btn onClick={fetchLive} disabled={loading}>
          {loading ? <Spinner /> : "⚡ Fetch Intel"}
        </Btn>
        <Btn onClick={fetchStored} color={C.muted} small>Reload</Btn>
      </div>

      {news.length === 0 && !loading && (
        <Card style={{ textAlign: "center", padding: 40, color: C.muted }}>
          No threat intel loaded. Click "Fetch Intel" to pull latest data.
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {news.map(item => (
          <div key={item.id}
            onClick={() => setSelected(selected?.id === item.id ? null : item)}
            style={{
              background: selected?.id === item.id ? C.bg : C.panel,
              border: `1px solid ${selected?.id === item.id ? C.accentDim : C.border}`,
              borderRadius: 8, padding: 16, cursor: "pointer",
              transition: "all 0.15s",
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <Badge label={item.severity} color={sevColor(item.severity)} />
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>
                {item.source}
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: C.muted }}>{item.summary}</div>

            {selected?.id === item.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                {item.cve && <div style={{ fontSize: 11, color: C.warn, marginBottom: 4 }}>CVE: {item.cve}</div>}
                {item.mitre_atlas && <div style={{ fontSize: 11, color: C.purple, marginBottom: 4 }}>MITRE ATLAS: {item.mitre_atlas}</div>}
                <Badge label={item.category} color={C.accent} />
                <div style={{ marginTop: 8 }}>
                  <a href={item.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: C.accentDim }}>→ Source</a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Security Scanner ──────────────────────────────────────────────────────────
const SCAN_STAGES = [
  "Enumerating attack surface…",
  "Mapping MITRE ATLAS TTPs…",
  "Scoring CVSS vectors…",
  "Cross-referencing OWASP LLM Top 10…",
  "Generating findings…",
];

function SecurityScanner() {
  const [target, setTarget]         = useState("");
  const [scanType, setScanType]     = useState("agent");
  const [depth, setDepth]           = useState("standard");
  const [loading, setLoading]       = useState(false);
  const [stageIdx, setStageIdx]     = useState(0);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [history, setHistory]       = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [histFilter, setHistFilter] = useState("");
  const [deleting, setDeleting]     = useState(null);
  const stageTimer = useState(null);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    const r = await fetch(`${API}/findings?limit=100`);
    const d = await r.json();
    setHistory(d.items || []);
  };

  const runScan = async () => {
    if (!target.trim()) return;
    setLoading(true); setResult(null); setError(null); setStageIdx(0);
    // Cycle through stage messages while waiting
    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % SCAN_STAGES.length;
      setStageIdx(idx);
    }, 2200);
    stageTimer[0] = timer;
    try {
      const r = await fetch(`${API}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, scan_type: scanType, depth }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`);
      setResult(d);
      setSelectedScan(null);
      loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const deleteScan = async (e, scanId) => {
    e.stopPropagation();
    setDeleting(scanId);
    try {
      await fetch(`${API}/findings/${scanId}`, { method: "DELETE" });
      setHistory(h => h.filter(s => s.scan_id !== scanId));
      if (selectedScan?.scan_id === scanId) setSelectedScan(null);
      if (result?.scan_id === scanId) setResult(null);
    } finally { setDeleting(null); }
  };

  const exportScan = (scan) => {
    const blob = new Blob([JSON.stringify(scan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scan_${scan.scan_id}_${scan.target?.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const scanTypes = [
    { value: "agent", label: "AI Agent" },
    { value: "mcp",   label: "MCP Server" },
    { value: "llm",   label: "LLM Endpoint" },
    { value: "rag",   label: "RAG Pipeline" },
    { value: "api",   label: "AI API" },
  ];
  const depths = [
    { value: "quick",    label: "Quick Scan" },
    { value: "standard", label: "Standard" },
    { value: "deep",     label: "Deep Red Team" },
  ];

  const display = selectedScan || result;

  const filteredHistory = history.filter(s =>
    !histFilter || s.target?.toLowerCase().includes(histFilter.toLowerCase()) ||
    s.scan_type?.toLowerCase().includes(histFilter.toLowerCase()) ||
    s.risk_level?.toLowerCase().includes(histFilter.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
      {/* Left panel */}
      <div>
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle>New Scan</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input value={target} onChange={setTarget}
              placeholder="Target: agent name, URL, system description…" />
            <Select value={scanType} onChange={setScanType} options={scanTypes} />
            <Select value={depth} onChange={setDepth} options={depths} />
            {error && (
              <div style={{ padding: "8px 10px", background: C.danger + "15",
                border: `1px solid ${C.danger}44`, borderRadius: 6,
                fontSize: 11, color: C.danger }}>
                ⚠ {error}
              </div>
            )}
            <Btn onClick={runScan} disabled={loading || !target.trim()}>
              {loading ? <><Spinner />&nbsp; {SCAN_STAGES[stageIdx].slice(0, 22)}…</> : "▶ Run Scan"}
            </Btn>
          </div>
        </Card>

        <Card>
          <SectionTitle>Scan History ({history.length})</SectionTitle>
          <Input value={histFilter} onChange={setHistFilter}
            placeholder="Filter by target, type, severity…"
            style={{ marginBottom: 8, fontSize: 11 }} />
          <div style={{ maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
            {filteredHistory.map(s => (
              <div key={s.scan_id}
                onClick={() => { setSelectedScan(selectedScan?.scan_id === s.scan_id ? null : s); setResult(null); }}
                style={{
                  padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                  background: selectedScan?.scan_id === s.scan_id ? C.dim : C.bg,
                  border: `1px solid ${selectedScan?.scan_id === s.scan_id ? C.accentDim : C.border}`,
                  position: "relative",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, color: C.text, flex: 1, marginRight: 4 }}>
                    {s.target?.slice(0, 26)}
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                    <Badge label={s.risk_level} color={sevColor(s.risk_level)} />
                    <button
                      onClick={e => deleteScan(e, s.scan_id)}
                      disabled={deleting === s.scan_id}
                      style={{
                        background: "none", border: "none", color: C.muted,
                        cursor: "pointer", padding: "1px 4px", fontSize: 11,
                        lineHeight: 1,
                      }}
                      title="Delete scan"
                    >
                      {deleting === s.scan_id ? "…" : "✕"}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
                  {s.scan_type?.toUpperCase()} · {s.findings?.length ?? 0} findings
                  · {s.timestamp?.slice(0, 10)}
                </div>
              </div>
            ))}
            {filteredHistory.length === 0 && (
              <div style={{ color: C.muted, fontSize: 12, padding: "8px 0" }}>
                {history.length === 0 ? "No scans yet." : "No matches."}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Results panel */}
      <div>
        {loading && (
          <Card style={{ textAlign: "center", padding: 60 }}>
            <Spinner />
            <div style={{ color: C.muted, marginTop: 16, fontSize: 13 }}>
              {SCAN_STAGES[stageIdx]}
            </div>
            <div style={{ color: C.dim, marginTop: 8, fontSize: 11 }}>
              {depth} scan · {scanType} · {target?.slice(0, 40)}
            </div>
          </Card>
        )}

        {display && !loading && (
          <div>
            {/* Risk header */}
            <Card style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, color: C.text, fontWeight: 600 }}>{display.target}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    Scan ID:&nbsp;
                    <span style={{ fontFamily: "monospace", color: C.accent }}>{display.scan_id}</span>
                    &nbsp;·&nbsp;{display.scan_type?.toUpperCase()}
                    &nbsp;·&nbsp;{display.findings?.length ?? 0} findings
                    &nbsp;·&nbsp;{display.timestamp?.slice(0, 10)}
                  </div>
                  {display.recommendations_preview?.length > 0 && (
                    <div style={{ marginTop: 10, padding: "8px 12px", background: C.accent + "10",
                      borderRadius: 6, border: `1px solid ${C.accent}22` }}>
                      <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginBottom: 6 }}>
                        IMMEDIATE ACTIONS
                      </div>
                      {display.recommendations_preview.map((rec, i) => (
                        <div key={i} style={{ fontSize: 11, color: C.text, marginBottom: 3 }}>
                          {i + 1}. {rec}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", marginLeft: 16, flexShrink: 0 }}>
                  <div style={{ fontSize: 42, fontWeight: 700,
                    color: sevColor(display.risk_level), fontFamily: "monospace", lineHeight: 1 }}>
                    {display.risk_score}
                  </div>
                  <Badge label={display.risk_level} color={sevColor(display.risk_level)} />
                  <div style={{ marginTop: 8 }}>
                    <Btn small color={C.muted} onClick={() => exportScan(display)}>⬇ Export</Btn>
                  </div>
                </div>
              </div>
              {display.attack_surface_summary && (
                <div style={{ marginTop: 12, fontSize: 12, color: C.muted, lineHeight: 1.6,
                  borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                  {display.attack_surface_summary}
                </div>
              )}
            </Card>

            {/* Findings */}
            {(display.findings || []).map(f => (
              <FindingCard key={f.id} finding={f} scanId={display.scan_id} />
            ))}
          </div>
        )}

        {!display && !loading && (
          <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
            Configure and run a scan, or select one from history.
          </Card>
        )}
      </div>
    </div>
  );
}

function FindingCard({ finding: f, scanId }) {
  const [open, setOpen] = useState(false);
  const [pocLoading, setPocLoading] = useState(false);
  const [poc, setPoc] = useState(null);
  const [pocError, setPocError] = useState(null);
  const [remLoading, setRemLoading] = useState(false);
  const [rem, setRem] = useState(null);
  const [remError, setRemError] = useState(null);

  const genPoc = async () => {
    setPocLoading(true); setPocError(null);
    try {
      const r = await fetch(`${API}/poc/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding_id: f.id,
          attack_type: f.attack_vector || f.title || "unknown attack",
          target_description: f.description || f.title || "AI system finding",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`);
      setPoc(d);
    } catch (e) { setPocError(e.message); }
    finally { setPocLoading(false); }
  };

  const genRem = async () => {
    setRemLoading(true); setRemError(null);
    try {
      const r = await fetch(`${API}/remediate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding_id: scanId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`);
      setRem(d);
    } catch (e) { setRemError(e.message); }
    finally { setRemLoading(false); }
  };

  return (
    <Card style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <Badge label={f.severity} color={sevColor(f.severity)} />
            {f.owasp_llm && <Badge label={f.owasp_llm} color={C.purple} />}
            {f.mitre_atlas && <Badge label={f.mitre_atlas} color={C.accentDim} />}
            {f.cvss_score != null && (
              <span style={{ fontSize: 11, color: C.muted }}>CVSS {f.cvss_score}</span>
            )}
            {f.exploitability && (
              <span style={{ fontSize: 10, color: C.muted, fontFamily: "monospace" }}>
                exploit: {f.exploitability}
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{f.title}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{f.affected_component}</div>
        </div>
        <Btn small onClick={() => setOpen(!open)} color={C.muted}>{open ? "▲" : "▼"}</Btn>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7, marginBottom: 10 }}>
            {f.description}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.muted }}>
              <strong style={{ color: C.accent }}>Attack Vector: </strong>{f.attack_vector}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              <strong style={{ color: C.accent }}>Evidence: </strong>{f.evidence}
            </div>
          </div>

          {/* Error displays */}
          {pocError && (
            <div style={{ padding: "6px 10px", background: C.danger + "15",
              border: `1px solid ${C.danger}44`, borderRadius: 5,
              fontSize: 11, color: C.danger, marginBottom: 8 }}>
              PoC error: {pocError}
            </div>
          )}
          {remError && (
            <div style={{ padding: "6px 10px", background: C.danger + "15",
              border: `1px solid ${C.danger}44`, borderRadius: 5,
              fontSize: 11, color: C.danger, marginBottom: 8 }}>
              Remediation error: {remError}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn small onClick={genPoc} disabled={pocLoading} color={C.warn}>
              {pocLoading ? <Spinner /> : poc ? "↻ Regen PoC" : "⚗ Generate PoC"}
            </Btn>
            <Btn small onClick={genRem} disabled={remLoading} color={C.ok}>
              {remLoading ? <Spinner /> : rem ? "↻ Regen Remediation" : "🔧 Auto-Remediate"}
            </Btn>
          </div>

          {poc && (
            <div style={{ marginTop: 14, padding: 12, background: C.warn + "08",
              borderRadius: 8, border: `1px solid ${C.warn}22` }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <Badge label="PoC SIMULATION" color={C.warn} />
                {poc.severity && <Badge label={poc.severity} color={sevColor(poc.severity)} />}
                {poc.mitre_atlas && <Badge label={poc.mitre_atlas} color={C.purple} />}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{poc.description}</div>
              {poc.prerequisites?.length > 0 && (
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                  <strong style={{ color: C.accent }}>Prerequisites: </strong>
                  {poc.prerequisites.join(" · ")}
                </div>
              )}
              <CodeBlock code={poc.python_code} />
              {poc.bash_commands?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: C.warn, letterSpacing: 1, marginBottom: 4 }}>BASH SETUP</div>
                  <CodeBlock code={poc.bash_commands.join("\n")} />
                </div>
              )}
              {poc.expected_output && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                  <strong style={{ color: C.accent }}>Expected output: </strong>{poc.expected_output}
                </div>
              )}
              {poc.detection_indicators?.length > 0 && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.ok, letterSpacing: 1, marginBottom: 4 }}>DETECTION</div>
                  {poc.detection_indicators.map((d, i) => (
                    <div key={i} style={{ fontSize: 11, color: C.ok, marginBottom: 2 }}>⚑ {d}</div>
                  ))}
                </div>
              )}
              {poc.references?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>
                  References: {poc.references.slice(0, 3).join(" · ")}
                </div>
              )}
            </div>
          )}

          {rem && rem.remediations && (
            <div style={{ marginTop: 14, padding: 12, background: C.ok + "08",
              borderRadius: 8, border: `1px solid ${C.ok}22` }}>
              <div style={{ fontSize: 10, color: C.ok, letterSpacing: 1, marginBottom: 10 }}>
                REMEDIATION PLAN
              </div>
              {rem.quick_wins?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginBottom: 5 }}>QUICK WINS</div>
                  {rem.quick_wins.map((w, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 3 }}>✓ {w}</div>
                  ))}
                </div>
              )}
              {rem.remediations.slice(0, 2).map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                    <Badge label={`P${r.priority}`} color={C.accent} />
                    <Badge label={`effort: ${r.effort}`} color={C.muted} />
                    <Badge label={`impact: ${r.impact}`} color={C.ok} />
                  </div>
                  <div style={{ fontSize: 12, color: C.ok, marginBottom: 6 }}>{r.strategy}</div>
                  {r.python_implementation && <CodeBlock code={r.python_implementation} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── PoC Library ───────────────────────────────────────────────────────────────
function PocLibrary() {
  const [pocs, setPocs]         = useState([]);
  const [attackType, setAT]     = useState("prompt_injection");
  const [target, setTarget]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [searchQ, setSearchQ]   = useState("");
  const [sevFilter, setSevFilter] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [genError, setGenError] = useState(null);

  const attackTypes = [
    { value: "prompt_injection",         label: "Prompt Injection" },
    { value: "jailbreak",                label: "Jailbreak" },
    { value: "data_exfiltration",        label: "Data Exfiltration" },
    { value: "model_inversion",          label: "Model Inversion" },
    { value: "mcp_tool_abuse",           label: "MCP Tool Abuse" },
    { value: "rag_poisoning",            label: "RAG Poisoning" },
    { value: "agent_hijacking",          label: "Agent Hijacking" },
    { value: "system_prompt_extraction", label: "System Prompt Extraction" },
    { value: "supply_chain",             label: "Supply Chain Attack" },
    { value: "adversarial_inputs",       label: "Adversarial Inputs" },
  ];

  useEffect(() => { loadPocs(); }, []);

  const loadPocs = async () => {
    const r = await fetch(`${API}/pocs?limit=200`);
    const d = await r.json();
    setPocs(d.items || []);
  };

  const generate = async () => {
    setLoading(true); setSelected(null); setGenError(null);
    try {
      const r = await fetch(`${API}/poc/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attack_type: attackType,
          target_description: target || "generic AI system",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || `HTTP ${r.status}`);
      setPocs(p => [d, ...p]);
      setSelected(d);
    } catch (e) { setGenError(e.message); }
    finally { setLoading(false); }
  };

  const deletePoc = async (e, pocId) => {
    e.stopPropagation();
    setDeleting(pocId);
    // Backend doesn't have poc delete yet; remove from local state only
    setPocs(p => p.filter(x => x.poc_id !== pocId));
    if (selected?.poc_id === pocId) setSelected(null);
    setDeleting(null);
  };

  const exportPoc = (poc) => {
    const content = `# ${poc.title}\n# Attack: ${poc.attack_type}\n# MITRE: ${poc.mitre_atlas}\n# Severity: ${poc.severity}\n\n${poc.python_code}`;
    const blob = new Blob([content], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poc_${poc.attack_type}_${poc.poc_id}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = pocs.filter(p => {
    const matchSearch = !searchQ ||
      p.title?.toLowerCase().includes(searchQ.toLowerCase()) ||
      p.attack_type?.toLowerCase().includes(searchQ.toLowerCase());
    const matchSev = !sevFilter || p.severity === sevFilter;
    return matchSearch && matchSev;
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
      <div>
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle>Generate PoC</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Select value={attackType} onChange={setAT} options={attackTypes} />
            <Input value={target} onChange={setTarget} placeholder="Target description (optional)" />
            {genError && (
              <div style={{ padding: "6px 10px", background: C.danger + "15",
                border: `1px solid ${C.danger}44`, borderRadius: 5, fontSize: 11, color: C.danger }}>
                ⚠ {genError}
              </div>
            )}
            <Btn onClick={generate} disabled={loading}>
              {loading ? <><Spinner />&nbsp; Generating…</> : "⚗ Generate"}
            </Btn>
          </div>
        </Card>

        <Card>
          <SectionTitle>PoC Library ({filtered.length}/{pocs.length})</SectionTitle>
          <Input value={searchQ} onChange={setSearchQ}
            placeholder="Search by title or attack type…"
            style={{ marginBottom: 8, fontSize: 11 }} />
          <Select value={sevFilter} onChange={setSevFilter}
            options={[
              { value: "", label: "All severities" },
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
            style={{ marginBottom: 10, width: "100%", fontSize: 11 }} />
          <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
            {filtered.map(p => (
              <div key={p.poc_id}
                onClick={() => setSelected(selected?.poc_id === p.poc_id ? null : p)}
                style={{
                  padding: "8px 10px", borderRadius: 6, cursor: "pointer",
                  background: selected?.poc_id === p.poc_id ? C.dim : C.bg,
                  border: `1px solid ${selected?.poc_id === p.poc_id ? C.warn + "88" : C.border}`,
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 11, color: C.text, flex: 1, marginRight: 4, lineHeight: 1.3 }}>
                    {p.title?.slice(0, 34)}
                  </div>
                  <button
                    onClick={e => deletePoc(e, p.poc_id)}
                    disabled={deleting === p.poc_id}
                    style={{ background: "none", border: "none", color: C.muted,
                      cursor: "pointer", padding: "1px 4px", fontSize: 11 }}
                    title="Remove from library"
                  >
                    {deleting === p.poc_id ? "…" : "✕"}
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <Badge label={p.attack_type?.replace(/_/g, " ").slice(0, 16)} color={C.warn} />
                  <Badge label={p.severity} color={sevColor(p.severity)} />
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ color: C.muted, fontSize: 12, padding: "8px 0" }}>
                {pocs.length === 0 ? "Generate your first PoC." : "No matches."}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div>
        {loading && (
          <Card style={{ textAlign: "center", padding: 60 }}>
            <Spinner />
            <div style={{ color: C.muted, marginTop: 16, fontSize: 13 }}>
              Generating {attackType.replace(/_/g, " ")} simulation…
            </div>
          </Card>
        )}

        {selected && !loading && (
          <Card>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <Badge label={selected.severity} color={sevColor(selected.severity)} />
                  {selected.mitre_atlas && <Badge label={selected.mitre_atlas} color={C.purple} />}
                  <Badge label={selected.attack_type?.replace(/_/g, " ")} color={C.warn} />
                </div>
                <h3 style={{ color: C.text, margin: "0 0 8px", fontSize: 16 }}>{selected.title}</h3>
                <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
              </div>
              <Btn small color={C.muted} onClick={() => exportPoc(selected)} style={{ marginLeft: 12, flexShrink: 0 }}>
                ⬇ .py
              </Btn>
            </div>

            {/* Prerequisites */}
            {selected.prerequisites?.length > 0 && (
              <div style={{ marginBottom: 14, padding: "8px 12px", background: C.bg,
                borderRadius: 6, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginBottom: 6 }}>PREREQUISITES</div>
                {selected.prerequisites.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>• {p}</div>
                ))}
              </div>
            )}

            {/* Simulation code */}
            <div style={{ fontSize: 10, color: C.warn, letterSpacing: 1, marginBottom: 6 }}>SIMULATION CODE</div>
            <CodeBlock code={selected.python_code} />

            {/* Bash commands */}
            {selected.bash_commands?.filter(Boolean).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 6 }}>BASH SETUP</div>
                <CodeBlock code={selected.bash_commands.join("\n")} />
              </div>
            )}

            {/* Expected output */}
            {selected.expected_output && (
              <div style={{ marginTop: 12, padding: "8px 12px", background: C.bg,
                borderRadius: 6, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginBottom: 5 }}>EXPECTED OUTPUT</div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{selected.expected_output}</div>
              </div>
            )}

            {/* Detection */}
            {selected.detection_indicators?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: C.ok, letterSpacing: 1, marginBottom: 6 }}>DETECTION INDICATORS</div>
                {selected.detection_indicators.map((d, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.ok, marginBottom: 3 }}>⚑ {d}</div>
                ))}
              </div>
            )}

            {/* Defense */}
            {selected.defensive_notes && (
              <div style={{ marginTop: 12, padding: 12, background: C.ok + "10",
                borderRadius: 6, border: `1px solid ${C.ok}33` }}>
                <div style={{ fontSize: 10, color: C.ok, letterSpacing: 1, marginBottom: 6 }}>DEFENSE</div>
                <div style={{ fontSize: 12, color: C.text }}>{selected.defensive_notes}</div>
              </div>
            )}

            {/* References */}
            {selected.references?.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 6 }}>REFERENCES</div>
                {selected.references.map((ref, i) => (
                  <div key={i} style={{ fontSize: 11, marginBottom: 3 }}>
                    <a href={ref} target="_blank" rel="noreferrer"
                      style={{ color: C.accentDim, textDecoration: "none" }}>
                      → {ref.slice(0, 70)}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {!selected && !loading && (
          <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚗</div>
            Generate a PoC or select one from the library.
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Research ──────────────────────────────────────────────────────────────────
function Research() {
  const [topic, setTopic]     = useState("");
  const [focus, setFocus]     = useState("agent");
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);

  const focuses = [
    { value: "agent",        label: "AI Agents" },
    { value: "mcp",          label: "MCP Servers" },
    { value: "llm",          label: "LLM Models" },
    { value: "supply_chain", label: "Supply Chain" },
    { value: "general",      label: "General AI Sec" },
  ];

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    const r = await fetch(`${API}/research`);
    const d = await r.json();
    setReports(d.items || []);
  };

  const conduct = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, focus }),
      });
      const d = await r.json();
      setReports(p => [d, ...p]);
      setSelected(d);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
      <div>
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle>New Research</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input value={topic} onChange={setTopic} placeholder="Research topic..." />
            <Select value={focus} onChange={setFocus} options={focuses} />
            <Btn onClick={conduct} disabled={loading || !topic.trim()}>
              {loading ? <Spinner /> : "🔬 Conduct Research"}
            </Btn>
          </div>
        </Card>
        <Card>
          <SectionTitle>Reports ({reports.length})</SectionTitle>
          {reports.slice(0, 15).map(r => (
            <div key={r.research_id}
              onClick={() => setSelected(selected?.research_id === r.research_id ? null : r)}
              style={{
                padding: "8px 10px", borderRadius: 6, cursor: "pointer", marginBottom: 6,
                background: selected?.research_id === r.research_id ? C.dim : C.bg,
                border: `1px solid ${C.border}`,
              }}>
              <div style={{ fontSize: 11, color: C.text }}>{r.title?.slice(0, 36)}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <Badge label={r.threat_level} color={sevColor(r.threat_level)} />
                <span style={{ fontSize: 10, color: C.muted }}>Score: {r.risk_rating}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div>
        {loading && (
          <Card style={{ textAlign: "center", padding: 60 }}>
            <Spinner />
            <div style={{ color: C.muted, marginTop: 16, fontSize: 13 }}>Conducting research on {topic}...</div>
          </Card>
        )}

        {selected && !loading && (
          <Card>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <Badge label={selected.threat_level} color={sevColor(selected.threat_level)} />
                <span style={{ fontSize: 12, color: C.muted }}>Risk Score: {selected.risk_rating}/100</span>
              </div>
              <h2 style={{ color: C.text, margin: "0 0 8px", fontSize: 18 }}>{selected.title}</h2>
              <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.7 }}>{selected.abstract}</p>
            </div>

            {/* MITRE TTPs */}
            {selected.mitre_atlas_ttps?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <SectionTitle>MITRE ATLAS TTPs</SectionTitle>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selected.mitre_atlas_ttps.map(t => (
                    <div key={t.id} style={{
                      padding: "6px 10px", background: C.purple + "15",
                      border: `1px solid ${C.purple}44`, borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 11, color: C.purple }}>{t.id}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sections */}
            {selected.sections?.map((s, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: C.accent, fontWeight: 600, marginBottom: 8 }}>{s.heading}</div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.8 }}>{s.content}</div>
                {s.code_example && <CodeBlock code={s.code_example} />}
              </div>
            ))}

            {/* Key findings */}
            {selected.key_findings?.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, background: C.accent + "08", borderRadius: 6, border: `1px solid ${C.accent}22` }}>
                <SectionTitle>Key Findings</SectionTitle>
                {selected.key_findings.map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 6 }}>▸ {f}</div>
                ))}
              </div>
            )}
          </Card>
        )}

        {!selected && !loading && (
          <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
            Enter a topic and run research to see reports here.
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Security Testing ──────────────────────────────────────────────────────────
function SecurityTesting() {
  const [endpoint, setEndpoint] = useState("");
  const [suite, setSuite]       = useState("owasp_llm");
  const [modelType, setModelType] = useState("gpt");
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [tests, setTests]       = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);

  const suites = [
    { value: "owasp_llm",        label: "OWASP LLM Top 10" },
    { value: "prompt_injection",  label: "Prompt Injection Suite" },
    { value: "jailbreak",         label: "Jailbreak Suite" },
    { value: "dos",               label: "DoS / Rate Limit" },
    { value: "full",              label: "Full Red Team" },
  ];

  const models = [
    { value: "gpt",     label: "GPT (OpenAI)" },
    { value: "claude",  label: "Claude (Anthropic)" },
    { value: "gemini",  label: "Gemini (Google)" },
    { value: "llama",   label: "LLaMA (Local)" },
    { value: "custom",  label: "Custom Model" },
  ];

  useEffect(() => { loadTests(); }, []);

  const loadTests = async () => {
    const r = await fetch(`${API}/tests`);
    const d = await r.json();
    setTests(d.items || []);
  };

  const run = async () => {
    if (!endpoint.trim()) return;
    setLoading(true); setResult(null);
    try {
      const r = await fetch(`${API}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, test_suite: suite, model_type: modelType }),
      });
      const d = await r.json();
      setResult(d);
      loadTests();
    } finally { setLoading(false); }
  };

  const display = selectedTest || result;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
      <div>
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle>Test Suite</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Input value={endpoint} onChange={setEndpoint} placeholder="Target endpoint or description" />
            <Select value={suite} onChange={setSuite} options={suites} />
            <Select value={modelType} onChange={setModelType} options={models} />
            <Btn onClick={run} disabled={loading || !endpoint.trim()} color={C.danger}>
              {loading ? <Spinner /> : "🎯 Run Tests"}
            </Btn>
          </div>
        </Card>
        <Card>
          <SectionTitle>Test History ({tests.length})</SectionTitle>
          {tests.slice(0, 12).map(t => (
            <div key={t.test_id}
              onClick={() => setSelectedTest(selectedTest?.test_id === t.test_id ? null : t)}
              style={{
                padding: "8px 10px", borderRadius: 6, cursor: "pointer", marginBottom: 6,
                background: selectedTest?.test_id === t.test_id ? C.dim : C.bg,
                border: `1px solid ${C.border}`,
              }}>
              <div style={{ fontSize: 11, color: C.text }}>{t.target?.slice(0, 30)}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                {t.suite} · {t.test_cases?.length ?? 0} cases
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div>
        {loading && (
          <Card style={{ textAlign: "center", padding: 60 }}>
            <Spinner />
            <div style={{ color: C.muted, marginTop: 16 }}>Running {suite} against {endpoint}...</div>
          </Card>
        )}

        {display && !loading && (
          <div>
            <Card style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, color: C.text, fontWeight: 600 }}>{display.target}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                    Suite: {display.suite} · {display.test_cases?.length} test cases · ~{display.estimated_duration_minutes}min
                  </div>
                </div>
                <Badge label="READY" color={C.ok} />
              </div>
              {display.test_summary && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>{display.test_summary}</div>
              )}
            </Card>

            {display.automated_test_script && (
              <Card style={{ marginBottom: 12 }}>
                <SectionTitle>Automated Test Script (pytest)</SectionTitle>
                <CodeBlock code={display.automated_test_script} />
              </Card>
            )}

            {(display.test_cases || []).map(tc => (
              <Card key={tc.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{tc.id}</span>
                    <Badge label={tc.severity} color={sevColor(tc.severity)} />
                    <Badge label={tc.category} color={C.accent} />
                  </div>
                </div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 8 }}>{tc.name}</div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: C.warn, marginBottom: 4 }}>PAYLOAD</div>
                  <div style={{ fontSize: 12, fontFamily: "monospace", color: "#ff9f0a", background: C.bg, padding: "8px 12px", borderRadius: 6 }}>
                    {tc.payload}
                  </div>
                </div>
                {tc.python_test && <CodeBlock code={tc.python_test} />}
                {tc.curl_command && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>CURL</div>
                    <CodeBlock code={tc.curl_command} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {!display && !loading && (
          <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
            Configure and run a test suite to see results here.
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Remediations ──────────────────────────────────────────────────────────────
function Remediations() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API}/remediations`).then(r => r.json()).then(d => setItems(d.items || []));
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
      <Card>
        <SectionTitle>Remediation Plans ({items.length})</SectionTitle>
        {items.map(r => (
          <div key={r.remediation_id}
            onClick={() => setSelected(selected?.remediation_id === r.remediation_id ? null : r)}
            style={{
              padding: "10px", borderRadius: 6, cursor: "pointer", marginBottom: 6,
              background: selected?.remediation_id === r.remediation_id ? C.dim : C.bg,
              border: `1px solid ${C.border}`,
            }}>
            <div style={{ fontSize: 12, color: C.text }}>{r.target}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
              {r.remediations?.length ?? 0} remediations
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ fontSize: 12, color: C.muted }}>
            Remediations auto-generated from scan findings. Run a scan and click "Auto-Remediate".
          </div>
        )}
      </Card>

      <div>
        {selected ? (
          <Card>
            <h3 style={{ color: C.text, margin: "0 0 16px", fontSize: 16 }}>{selected.target}</h3>

            {selected.quick_wins?.length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, background: C.ok + "10", borderRadius: 6 }}>
                <SectionTitle>Quick Wins (24h)</SectionTitle>
                {selected.quick_wins.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.ok, marginBottom: 6 }}>✓ {w}</div>
                ))}
              </div>
            )}

            {selected.roadmap && (
              <div style={{ marginBottom: 16 }}>
                <SectionTitle>Remediation Roadmap</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {["30_day", "60_day", "90_day"].map(k => (
                    <div key={k} style={{ padding: 12, background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 10, color: C.accent, marginBottom: 6 }}>{k.replace("_", " ").toUpperCase()}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{selected.roadmap[k]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.remediations?.map((r, i) => (
              <div key={i} style={{ marginBottom: 16, padding: 14, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <Badge label={`Priority ${r.priority}`} color={C.accent} />
                  <Badge label={`Effort: ${r.effort}`} color={C.muted} />
                  <Badge label={`Impact: ${r.impact}`} color={C.ok} />
                </div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 6 }}>{r.finding_title}</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{r.strategy}</div>
                {r.python_implementation && <CodeBlock code={r.python_implementation} />}
                {r.monitoring_rules?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: C.warn, marginBottom: 4 }}>MONITORING RULES</div>
                    {r.monitoring_rules.map((m, j) => (
                      <div key={j} style={{ fontSize: 11, fontFamily: "monospace", color: C.muted, marginBottom: 3 }}>{m}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Card>
        ) : (
          <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
            Select a remediation plan to view details.
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function Settings() {
  const [key, setKey]       = useState("");
  const [model, setModel]   = useState("gpt-4o");
  const [status, setStatus] = useState(null);
  const [configured, setConfigured] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    fetch(`${API}/settings`).then(r => r.json()).then(d => {
      setConfigured(d.configured);
      setPreview(d.key_preview);
      setModel(d.model || "gpt-4o");
    });
  }, []);

  const save = async () => {
    const r = await fetch(`${API}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openai_api_key: key, model }),
    });
    const d = await r.json();
    setStatus(d.status === "saved" ? "✓ Saved" : "Error");
    if (d.status === "saved") { setConfigured(true); setPreview(`sk-...${key.slice(-4)}`); setKey(""); }
    setTimeout(() => setStatus(null), 3000);
  };

  const models = [
    { value: "gpt-4o",          label: "GPT-4o (Recommended)" },
    { value: "gpt-4o-mini",     label: "GPT-4o Mini (Fast)" },
    { value: "gpt-4-turbo",     label: "GPT-4 Turbo" },
    { value: "o1-preview",      label: "o1 Preview (Reasoning)" },
  ];

  return (
    <div style={{ maxWidth: 600 }}>
      <Card>
        <SectionTitle>OpenAI Configuration</SectionTitle>

        {configured && (
          <div style={{ marginBottom: 16, padding: 10, background: C.ok + "15", borderRadius: 6, border: `1px solid ${C.ok}44` }}>
            <span style={{ color: C.ok, fontSize: 12 }}>✓ API key configured: {preview}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>OpenAI API Key</div>
            <Input
              type="password"
              value={key}
              onChange={setKey}
              placeholder={configured ? "Enter new key to replace" : "sk-..."}
            />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Model</div>
            <Select value={model} onChange={setModel} options={models} style={{ width: "100%" }} />
          </div>
          <Btn onClick={save} disabled={!key.trim()}>
            {status || "Save Configuration"}
          </Btn>
        </div>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <SectionTitle>About</SectionTitle>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
          <div>AI Threat Detection & News Scanner v1.0</div>
          <div>Built for AI security engineering · Powered by OpenAI GPT-4</div>
          <div style={{ marginTop: 8 }}>
            Covers: MITRE ATLAS · OWASP LLM Top 10 · NIST AI RMF · EU AI Act · ISO 42001
          </div>
          <div style={{ marginTop: 8, color: C.accent }}>
            Backend: FastAPI · Data: Persistent JSON · Port: 8000
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Evaluation (OpenAI Evals: agents & GenAI apps) ──────────────────────────────
function Evaluation() {
  const [evals, setEvals] = useState([]);
  const [runs, setRuns] = useState([]);
  const [selectedEval, setSelectedEval] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [runDetail, setRunDetail] = useState(null);
  const [outputItems, setOutputItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [evalType, setEvalType] = useState("agent");
  const [runName, setRunName] = useState("");

  const loadEvals = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/evals`);
      if (!r.ok) { const err = await r.json(); throw new Error(err.detail || "Failed to list evals"); }
      const d = await r.json();
      setEvals(d.data || []);
    } catch (e) { setError(e.message); setEvals([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEvals(); }, [loadEvals]);

  const loadRuns = useCallback(async () => {
    if (!selectedEval?.id) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/evals/${selectedEval.id}/runs`);
      if (!r.ok) { const err = await r.json(); throw new Error(err.detail || "Failed to list runs"); }
      const d = await r.json();
      setRuns(d.data || []);
    } catch (e) { setError(e.message); setRuns([]); }
    finally { setLoading(false); }
  }, [selectedEval?.id]);

  useEffect(() => { if (selectedEval) loadRuns(); }, [selectedEval, loadRuns]);

  const loadRunDetail = useCallback(async () => {
    if (!selectedEval?.id || !selectedRun?.id) return;
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/evals/${selectedEval.id}/runs/${selectedRun.id}`);
      if (!r.ok) { const err = await r.json(); throw new Error(err.detail || "Failed to get run"); }
      setRunDetail(await r.json());
      const o = await fetch(`${API}/evals/${selectedEval.id}/runs/${selectedRun.id}/output_items`);
      if (o.ok) { const od = await o.json(); setOutputItems(od.data || []); }
      else setOutputItems([]);
    } catch (e) { setError(e.message); setRunDetail(null); setOutputItems([]); }
    finally { setLoading(false); }
  }, [selectedEval?.id, selectedRun?.id]);

  useEffect(() => { if (selectedEval && selectedRun) loadRunDetail(); }, [selectedEval, selectedRun, loadRunDetail]);

  const handleCreateEval = async () => {
    if (!createName.trim()) { setError("Name is required"); return; }
    setLoading(true); setError(null);
    try {
      const body = {
        name: createName.trim(),
        description: createDesc.trim() || `Evaluation for ${evalType === "agent" ? "AI agent" : "GenAI app"}`,
        data_source_config: { type: "custom", schema: { type: "object", properties: { prompt: { type: "string" }, expected: { type: "string" } }, required: ["prompt"] } },
        grading_config: { type: "model", model: "gpt-4o" },
      };
      const r = await fetch(`${API}/evals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) {
        const err = await r.json();
        const msg = err?.detail?.error?.message ?? err?.detail ?? r.statusText ?? "Create failed";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }
      await loadEvals();
      setCreateName(""); setCreateDesc("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleCreateRun = async () => {
    if (!selectedEval?.id) return;
    setLoading(true); setError(null);
    try {
      const body = {
        name: runName.trim() || `Run ${new Date().toISOString().slice(0, 16)}`,
        data_source: {
          type: "jsonl",
          source: { type: "file_content", content: [{ item: { prompt: "What is 2+2?", expected: "4" }, sample: null }] },
        },
      };
      const r = await fetch(`${API}/evals/${selectedEval.id}/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const err = await r.json(); throw new Error(typeof err?.detail === "string" ? err.detail : JSON.stringify(err?.detail ?? "Create run failed")); }
      setRunName("");
      await loadRuns();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const runStatusColor = (s) => ({ completed: C.ok, failed: C.danger, running: C.accent, pending: C.warn }[s] || C.muted);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, margin: "0 0 4px", fontSize: 22, fontWeight: 300 }}>
          Agent & GenAI <span style={{ color: C.accent, fontWeight: 700 }}>Evaluation</span>
        </h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          Evaluate AI agents and GenAI apps using the OpenAI Evals API — list evals, create runs, view results
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, background: C.danger + "15", border: `1px solid ${C.danger}44`, borderRadius: 6, color: C.danger, fontSize: 12 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, background: "none", border: "none", color: C.danger, cursor: "pointer" }}>✕</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        <Card>
          <SectionTitle>Evals</SectionTitle>
          {loading && !evals.length ? <div style={{ color: C.muted, fontSize: 12 }}><Spinner /> Loading…</div> : null}
          {evals.map(e => (
            <div
              key={e.id}
              onClick={() => { setSelectedEval(e); setSelectedRun(null); setRunDetail(null); setOutputItems([]); }}
              style={{
                padding: "10px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 6,
                background: selectedEval?.id === e.id ? C.accent + "18" : C.bg,
                border: `1px solid ${selectedEval?.id === e.id ? C.accentDim : C.border}`,
              }}
            >
              <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{e.name || e.id}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{e.id}</div>
            </div>
          ))}
          {!loading && evals.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No evals yet. Create one below.</div>}
        </Card>

        <div>
          {selectedEval ? (
            <>
              <Card style={{ marginBottom: 16 }}>
                <SectionTitle>{selectedEval.name || selectedEval.id}</SectionTitle>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{selectedEval.description || "—"}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <Input value={runName} onChange={setRunName} placeholder="Run name (optional)" style={{ width: 220 }} />
                  <Btn onClick={handleCreateRun} disabled={loading}>Start run</Btn>
                  <Btn small color={C.muted} onClick={loadRuns}>↻ Refresh runs</Btn>
                </div>
              </Card>
              <Card style={{ marginBottom: 16 }}>
                <SectionTitle>Runs ({runs.length})</SectionTitle>
                {runs.length === 0 && !loading && <div style={{ fontSize: 12, color: C.muted }}>No runs yet. Start a run above.</div>}
                {runs.map(r => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRun(selectedRun?.id === r.id ? null : r)}
                    style={{
                      padding: "10px 12px", borderRadius: 6, cursor: "pointer", marginBottom: 6,
                      background: selectedRun?.id === r.id ? C.dim : C.bg,
                      border: `1px solid ${C.border}`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 12, color: C.text }}>{r.name || r.id}</span>
                    <Badge label={r.status || "unknown"} color={runStatusColor(r.status)} />
                  </div>
                ))}
              </Card>
              {selectedRun && runDetail && (
                <Card>
                  <SectionTitle>Run: {selectedRun.name || selectedRun.id}</SectionTitle>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                    <Badge label={runDetail.status} color={runStatusColor(runDetail.status)} />
                    {runDetail.completed_at && <span style={{ fontSize: 11, color: C.muted }}>Completed: {runDetail.completed_at}</span>}
                  </div>
                  {outputItems.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: C.accent, marginBottom: 8 }}>OUTPUT ITEMS ({outputItems.length})</div>
                      <div style={{ maxHeight: 320, overflowY: "auto" }}>
                        {outputItems.slice(0, 20).map((o, i) => (
                          <pre key={o.id || i} style={{ fontSize: 10, background: C.bg, padding: 8, borderRadius: 4, marginBottom: 6, overflowX: "auto" }}>
                            {JSON.stringify(o, null, 2)}
                          </pre>
                        ))}
                        {outputItems.length > 20 && <div style={{ fontSize: 10, color: C.muted }}>… and {outputItems.length - 20} more</div>}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </>
          ) : (
            <Card>
              <SectionTitle>Create new eval</SectionTitle>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                Create an evaluation for agents or GenAI apps. You can then add runs with test cases.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Name</div>
                  <Input value={createName} onChange={setCreateName} placeholder="e.g. My Agent Eval" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Type</div>
                  <Select value={evalType} onChange={setEvalType} options={[{ value: "agent", label: "Agent" }, { value: "genai_app", label: "GenAI App" }]} style={{ width: "100%" }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Description</div>
                <Input value={createDesc} onChange={setCreateDesc} placeholder="Optional description" />
              </div>
              <Btn onClick={handleCreateEval} disabled={loading || !createName.trim()}>
                {loading ? <Spinner /> : "Create eval"}
              </Btn>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GLOBAL SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

const MODULE_COLORS = {
  scanner:     C.accent,
  threat_intel: "#ffd60a",
  poc_lab:     C.warn,
  remediation: C.ok,
  research:    C.purple,
  sec_testing: C.danger,
};

function GlobalSearch() {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [total, setTotal]       = useState(0);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const search = async () => {
    if (!query.trim() || query.length < 2) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/search?q=${encodeURIComponent(query)}&limit=50`);
      const d = await r.json();
      setResults(d.results || []);
      setTotal(d.total || 0);
      setSearched(true);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === "Enter") search(); };

  const grouped = results.reduce((acc, r) => {
    const mod = r.module || "other";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(r);
    return acc;
  }, {});

  const typeIcon = (t) => ({ scan: "🔍", finding: "⚠", news: "📡", poc: "⚗", remediation: "🔧", research: "🔬", test: "🎯" }[t] || "▸");

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, margin: "0 0 4px", fontSize: 22, fontWeight: 300 }}>
          Global <span style={{ color: C.accent, fontWeight: 700 }}>Search</span>
        </h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          Search across all findings, news, PoCs, research reports, remediations, and test suites
        </p>
      </div>

      {/* Search bar */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              color: C.muted, fontSize: 16, pointerEvents: "none",
            }}>⌕</span>
            <input
              value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKey}
              placeholder='Search anything — e.g. "prompt injection", "MCP", "critical", "CVE-2025"...'
              autoFocus
              style={{
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text, padding: "10px 14px 10px 38px",
                fontSize: 14, fontFamily: "inherit", outline: "none",
                width: "100%", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = C.accentDim}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          <Btn onClick={search} disabled={loading || query.length < 2} style={{ minWidth: 100 }}>
            {loading ? <Spinner /> : "Search"}
          </Btn>
          {results.length > 0 && (
            <Btn small color={C.muted} onClick={() => { setResults([]); setSearched(false); setQuery(""); }}>✕ Clear</Btn>
          )}
        </div>

        {/* Quick filters */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {["prompt injection", "critical", "MCP server", "jailbreak", "RAG", "CVE", "supply chain", "authentication"].map(t => (
            <button key={t} onClick={() => { setQuery(t); }} style={{
              background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
              color: C.muted, padding: "3px 10px", fontSize: 10, cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.target.style.borderColor = C.accentDim; e.target.style.color = C.accent; }}
              onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.muted; }}
            >{t}</button>
          ))}
        </div>
      </Card>

      {/* Results */}
      {searched && !loading && (
        <div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
            {total === 0
              ? `No results for "${query}"`
              : <span>Found <span style={{ color: C.accent }}>{total}</span> results for "{query}" across {Object.keys(grouped).length} modules</span>
            }
          </div>

          {Object.entries(grouped).map(([mod, items]) => (
            <div key={mod} style={{ marginBottom: 20 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                paddingBottom: 6, borderBottom: `1px solid ${C.border}`,
              }}>
                <Badge label={mod.replace("_", " ")} color={MODULE_COLORS[mod] || C.muted} />
                <span style={{ fontSize: 11, color: C.muted }}>{items.length} result{items.length !== 1 ? "s" : ""}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((r, i) => {
                  const isExp = expanded === `${mod}-${i}`;
                  return (
                    <div key={i}
                      onClick={() => setExpanded(isExp ? null : `${mod}-${i}`)}
                      style={{
                        background: isExp ? C.bg : C.panel,
                        border: `1px solid ${isExp ? C.accentDim : C.border}`,
                        borderRadius: 8, padding: "12px 16px", cursor: "pointer",
                        transition: "all 0.15s",
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 13 }}>{typeIcon(r.type)}</span>
                            <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{r.title || "Untitled"}</span>
                            {r.severity && <Badge label={r.severity} color={sevColor(r.severity)} />}
                          </div>
                          <div style={{
                            fontSize: 11, color: C.muted, fontFamily: "monospace",
                            lineHeight: 1.6, paddingLeft: 22,
                          }}>
                            {r.snippet}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", marginLeft: 12, flexShrink: 0 }}>
                          <Badge label={r.type} color={MODULE_COLORS[mod] || C.muted} />
                          <div style={{ fontSize: 9, color: C.dim, marginTop: 4, fontFamily: "monospace" }}>
                            {r.timestamp?.slice(0, 10) || ""}
                          </div>
                        </div>
                      </div>
                      {isExp && r.id && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 10, color: C.accent, fontFamily: "monospace" }}>ID: {r.id}</span>
                          <span style={{ fontSize: 10, color: C.muted, marginLeft: 16 }}>Score: {r.score}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && (
        <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⌕</div>
          <div style={{ fontSize: 14 }}>Enter a search term to find anything across the platform</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Findings · News · PoCs · Research · Remediations · Test Suites</div>
        </Card>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  SCAN COMPARE
// ═══════════════════════════════════════════════════════════════════════════════

function ScanCompare() {
  const [scans, setScans]       = useState([]);
  const [scanA, setScanA]       = useState("");
  const [scanB, setScanB]       = useState("");
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(`${API}/findings?limit=50`)
      .then(r => r.json())
      .then(d => setScans(d.items || []));
  }, []);

  const compare = async () => {
    if (!scanA || !scanB || scanA === scanB) {
      setError("Select two different scans to compare.");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await fetch(`${API}/scans/compare?scan_a=${scanA}&scan_b=${scanB}`);
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || "Compare failed"); }
      setResult(await r.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const DeltaBadge = ({ value, invert = false }) => {
    const improved = invert ? value > 0 : value < 0;
    const neutral  = value === 0;
    const color    = neutral ? C.muted : improved ? C.ok : C.danger;
    const prefix   = value > 0 ? "+" : "";
    return <Badge label={`${prefix}${value}`} color={color} />;
  };

  const scanOpts = scans.map(s => ({
    value: s.scan_id,
    label: `${s.target?.slice(0, 30)} [${s.risk_level?.toUpperCase()}] ${s.timestamp?.slice(0, 10)}`,
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, margin: "0 0 4px", fontSize: 22, fontWeight: 300 }}>
          Scan <span style={{ color: C.accent, fontWeight: 700 }}>Delta Comparison</span>
        </h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          Compare two scans of the same target to track risk posture improvement over time
        </p>
      </div>

      {/* Selector */}
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>Select Scans to Compare</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", gap: 12, alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>BASELINE SCAN (A — Older)</div>
            <Select value={scanA} onChange={setScanA}
              options={[{ value: "", label: "— Select scan A —" }, ...scanOpts]}
              style={{ width: "100%" }} />
          </div>
          <div style={{ textAlign: "center", color: C.accent, fontSize: 20, paddingTop: 20 }}>⇄</div>
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>COMPARISON SCAN (B — Newer)</div>
            <Select value={scanB} onChange={setScanB}
              options={[{ value: "", label: "— Select scan B —" }, ...scanOpts]}
              style={{ width: "100%" }} />
          </div>
        </div>

        {error && (
          <div style={{ padding: "8px 12px", background: C.danger + "15", border: `1px solid ${C.danger}44`, borderRadius: 6, fontSize: 12, color: C.danger, marginBottom: 12 }}>
            ⚠ {error}
          </div>
        )}

        <Btn onClick={compare} disabled={loading || !scanA || !scanB}>
          {loading ? <><Spinner />&nbsp; Comparing…</> : "⇄ Compare Scans"}
        </Btn>
      </Card>

      {result && (
        <div>
          {/* Score header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 1fr", gap: 12, marginBottom: 16 }}>
            {/* Scan A */}
            <Card style={{ borderColor: C.muted + "88" }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 }}>BASELINE — SCAN A</div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 600, marginBottom: 4 }}>{result.scan_a.target}</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, marginBottom: 10 }}>{result.scan_a.scan_id}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: sevColor(result.scan_a.risk_level), fontFamily: "monospace" }}>
                  {result.scan_a.risk_score}
                </span>
                <div>
                  <Badge label={result.scan_a.risk_level} color={sevColor(result.scan_a.risk_level)} />
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{result.scan_a.total_findings} findings</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>{result.scan_a.timestamp?.slice(0, 16).replace("T", " ")}</div>
            </Card>

            {/* Delta */}
            <Card style={{ textAlign: "center", background: C.bg }}>
              <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 12 }}>DELTA</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Risk Score</div>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "monospace",
                  color: result.delta.improved ? C.ok : result.delta.risk_score === 0 ? C.muted : C.danger }}>
                  {result.delta.risk_score > 0 ? "+" : ""}{result.delta.risk_score}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>New</span>
                  <Badge label={`+${result.delta.new_findings}`} color={result.delta.new_findings > 0 ? C.danger : C.muted} />
                </div>
                <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>Resolved</span>
                  <Badge label={`-${result.delta.resolved}`} color={result.delta.resolved > 0 ? C.ok : C.muted} />
                </div>
                <div style={{ fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.muted }}>Persisted</span>
                  <Badge label={`${result.delta.persisted}`} color={C.warn} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <Badge
                  label={result.delta.improved ? "IMPROVED" : result.delta.risk_score === 0 ? "UNCHANGED" : "DEGRADED"}
                  color={result.delta.improved ? C.ok : result.delta.risk_score === 0 ? C.muted : C.danger}
                />
              </div>
            </Card>

            {/* Scan B */}
            <Card style={{ borderColor: C.accent + "44" }}>
              <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1, marginBottom: 8 }}>COMPARISON — SCAN B</div>
              <div style={{ fontSize: 16, color: C.text, fontWeight: 600, marginBottom: 4 }}>{result.scan_b.target}</div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, marginBottom: 10 }}>{result.scan_b.scan_id}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: sevColor(result.scan_b.risk_level), fontFamily: "monospace" }}>
                  {result.scan_b.risk_score}
                </span>
                <div>
                  <Badge label={result.scan_b.risk_level} color={sevColor(result.scan_b.risk_level)} />
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{result.scan_b.total_findings} findings</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>{result.scan_b.timestamp?.slice(0, 16).replace("T", " ")}</div>
            </Card>
          </div>

          {/* Severity delta bar chart */}
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Severity Breakdown Comparison</SectionTitle>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={["critical", "high", "medium", "low"].map(sev => ({
                  sev,
                  "Scan A": result.scan_a.severity[sev],
                  "Scan B": result.scan_b.severity[sev],
                }))}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="sev" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
                <Bar dataKey="Scan A" fill={C.muted}  radius={[2, 2, 0, 0]} />
                <Bar dataKey="Scan B" fill={C.accent} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Finding lists */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { title: "🆕 New Findings", items: result.new_findings, color: C.danger },
              { title: "✅ Resolved",     items: result.resolved,     color: C.ok    },
              { title: "⚠ Persisted",    items: result.persisted,    color: C.warn  },
            ].map(({ title, items, color }) => (
              <Card key={title}>
                <div style={{ fontSize: 11, color, marginBottom: 10, fontWeight: 600 }}>{title} ({items.length})</div>
                {items.length === 0
                  ? <div style={{ fontSize: 11, color: C.muted }}>None</div>
                  : items.map((f, i) => (
                    <div key={i} style={{
                      padding: "6px 10px", borderRadius: 6, marginBottom: 6,
                      background: C.bg, border: `1px solid ${C.border}`,
                    }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 3 }}>
                        <Badge label={f.severity} color={sevColor(f.severity)} />
                      </div>
                      <div style={{ fontSize: 11, color: C.text }}>{f.title}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{f.affected_component}</div>
                    </div>
                  ))
                }
              </Card>
            ))}
          </div>
        </div>
      )}

      {!result && !loading && (
        <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⇄</div>
          <div style={{ fontSize: 14 }}>Select two scans above to generate a delta report</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Track risk posture improvement, new findings, and resolved issues</div>
        </Card>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

const MODULE_ICONS = {
  scanner:     "🔍",
  threat_intel:"📡",
  poc_lab:     "⚗",
  remediation: "🔧",
  research:    "🔬",
  sec_testing: "🎯",
  settings:    "⚙",
  compliance:  "🛡",
};

function AuditLog() {
  const [items, setItems]       = useState([]);
  const [filter, setFilter]     = useState("");
  const [modFilter, setModFilter] = useState("");
  const [loading, setLoading]   = useState(false);
  const [clearing, setClearing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = modFilter ? `${API}/audit?limit=200&module=${modFilter}` : `${API}/audit?limit=200`;
      const r = await fetch(url);
      const d = await r.json();
      setItems(d.items || []);
    } finally { setLoading(false); }
  }, [modFilter]);

  useEffect(() => { load(); }, [load]);

  const clear = async () => {
    if (!window.confirm("Clear the entire audit log? This cannot be undone.")) return;
    setClearing(true);
    await fetch(`${API}/audit`, { method: "DELETE" });
    setItems([]); setClearing(false);
  };

  const filtered = items.filter(i =>
    !filter || JSON.stringify(i).toLowerCase().includes(filter.toLowerCase())
  );

  const modules = [...new Set(items.map(i => i.module).filter(Boolean))];

  const outcomeColor = (o) => o === "success" ? C.ok : o === "error" ? C.danger : C.muted;

  // Activity timeline sparkline data
  const now   = new Date();
  const hourBuckets = Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now); h.setHours(h.getHours() - (23 - i)); h.setMinutes(0, 0, 0);
    const label = `${String(h.getHours()).padStart(2, "0")}:00`;
    const count = items.filter(it => {
      const d = new Date(it.timestamp);
      return d >= h && d < new Date(h.getTime() + 3600000);
    }).length;
    return { label, count };
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ color: C.text, margin: "0 0 4px", fontSize: 22, fontWeight: 300 }}>
          Platform <span style={{ color: C.accent, fontWeight: 700 }}>Audit Log</span>
        </h2>
        <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>
          Immutable record of all platform actions — every scan, generation, and configuration change
        </p>
      </div>

      {/* Stats + sparkline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Events", value: items.length,  color: C.accent },
          { label: "Success",      value: items.filter(i => i.outcome === "success").length, color: C.ok },
          { label: "Errors",       value: items.filter(i => i.outcome === "error").length,   color: C.danger },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center", padding: 14 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{s.label}</div>
          </Card>
        ))}
        <Card>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>ACTIVITY LAST 24H</div>
          <ResponsiveContainer width="100%" height={60}>
            <BarChart data={hourBuckets} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <Bar dataKey="count" fill={C.accent} radius={[1, 1, 0, 0]} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Controls */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Input value={filter} onChange={setFilter} placeholder="Filter by action, module, detail..." style={{ flex: 1 }} />
          <Select value={modFilter} onChange={setModFilter}
            options={[{ value: "", label: "All modules" }, ...modules.map(m => ({ value: m, label: m }))]}
          />
          <Btn small onClick={load} disabled={loading} color={C.muted}>↻ Reload</Btn>
          <Btn small onClick={clear} disabled={clearing} color={C.danger}>🗑 Clear</Btn>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <Card style={{ textAlign: "center", padding: 40 }}><Spinner /></Card>
      ) : filtered.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>
          {items.length === 0 ? "No audit events yet. Actions across the platform are recorded here automatically." : "No events match the filter."}
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                  {["Timestamp", "Module", "Action", "Detail", "Outcome", ""].map(h => (
                    <th key={h} style={{
                      padding: "8px 14px", textAlign: "left",
                      color: C.muted, letterSpacing: 1, fontSize: 10, fontWeight: 500, whiteSpace: "nowrap"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const isExp = expanded === item.id;
                  return (
                    <>
                      <tr key={item.id}
                        onClick={() => setExpanded(isExp ? null : item.id)}
                        style={{
                          borderBottom: `1px solid ${C.border}`,
                          cursor: "pointer",
                          background: isExp ? C.dim : i % 2 === 0 ? C.bg : "transparent",
                          transition: "background 0.1s",
                        }}>
                        <td style={{ padding: "8px 14px", color: C.muted, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {item.timestamp?.slice(0, 19).replace("T", " ")}
                        </td>
                        <td style={{ padding: "8px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ marginRight: 6 }}>{MODULE_ICONS[item.module] || "▸"}</span>
                          <Badge label={item.module?.replace("_", " ")} color={MODULE_COLORS[item.module] || C.muted} />
                        </td>
                        <td style={{ padding: "8px 14px", color: C.text, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {item.action}
                        </td>
                        <td style={{ padding: "8px 14px", color: C.muted, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.detail}
                        </td>
                        <td style={{ padding: "8px 14px" }}>
                          <Badge label={item.outcome} color={outcomeColor(item.outcome)} />
                        </td>
                        <td style={{ padding: "8px 14px", color: C.muted, fontSize: 9 }}>{isExp ? "▲" : "▼"}</td>
                      </tr>
                      {isExp && (
                        <tr key={`exp-${item.id}`}>
                          <td colSpan={6} style={{ padding: "0 14px 12px", background: C.dim }}>
                            <div style={{ paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 10, color: C.accent, marginBottom: 4 }}>EVENT ID</div>
                                <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>{item.id}</div>
                              </div>
                              {item.meta && Object.keys(item.meta).length > 0 && (
                                <div>
                                  <div style={{ fontSize: 10, color: C.accent, marginBottom: 4 }}>METADATA</div>
                                  <pre style={{ margin: 0, fontSize: 10, color: C.muted, fontFamily: "monospace" }}>
                                    {JSON.stringify(item.meta, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted }}>
            Showing {filtered.length} of {items.length} events
          </div>
        </Card>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE LOGS
// ═══════════════════════════════════════════════════════════════════════════════

const COMPLIANCE_API_BASE = "https://api.chatgpt.com/v1/compliance";

const EVENT_TYPES = [
  { value: "AUTH_LOG",            label: "AUTH_LOG — Authentication events" },
  { value: "CONVERSATION_LOG",    label: "CONVERSATION_LOG — Chat activity" },
  { value: "DATA_EXPORT_LOG",     label: "DATA_EXPORT_LOG — Data exports" },
  { value: "USER_MANAGEMENT_LOG", label: "USER_MANAGEMENT_LOG — User changes" },
  { value: "API_ACCESS_LOG",      label: "API_ACCESS_LOG — API usage" },
  { value: "POLICY_LOG",          label: "POLICY_LOG — Policy changes" },
  { value: "ADMIN_LOG",           label: "ADMIN_LOG — Admin actions" },
];

const BASH_SCRIPT = `#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <workspace_or_org_id> <event_type> <limit> <after>" >&2
  echo >&2
  echo 'Examples: ' >&2
  echo 'COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh f7f33107-5fb9-4ee1-8922-3eae76b5b5a0 AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" > output.jsonl' >&2
  echo 'COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh org-p13k3klgno5cqxbf0q8hpgrk AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" > output.jsonl' >&2
}

if [[ $# -ne 4 ]]; then usage; exit 2; fi

PRINCIPAL_ID="$1"; EVENT_TYPE="$2"; LIMIT="$3"; INITIAL_AFTER="$4"

if [[ -z "\${COMPLIANCE_API_KEY:-}" ]]; then
  echo "COMPLIANCE_API_KEY environment variable is required." >&2; exit 2
fi

API_BASE="https://api.chatgpt.com/v1/compliance"
SCOPE_SEGMENT="workspaces"
[[ "\${PRINCIPAL_ID}" == org-* ]] && SCOPE_SEGMENT="organizations"

perform_curl() {
  local description="$1"; shift
  local combined
  if ! combined=$(curl -sS -w "\\n%{http_code}" "$@"); then
    echo "Network/transport error while \${description}" >&2; exit 1
  fi
  local http_code="\${combined##*$'\\n'}"
  local body="\${combined%$'\\n'*}"
  if [[ ! "\${http_code}" =~ ^2[0-9][0-9]$ ]]; then
    echo "HTTP error \${http_code} while \${description}:" >&2
    [[ -n "\${body}" ]] && echo "\${body}" | jq . >&2; exit 1
  fi
  echo "\${body}"
}

current_after="\${INITIAL_AFTER}"; page=1; total_downloaded=0
while true; do
  echo "Fetching page \${page} with after='\${current_after}'" >&2
  response_json="\$(perform_curl "list" -G "\${API_BASE}/\${SCOPE_SEGMENT}/\${PRINCIPAL_ID}/logs" \\
    -H "Authorization: Bearer \${COMPLIANCE_API_KEY}" \\
    --data-urlencode "limit=\${LIMIT}" \\
    --data-urlencode "event_type=\${EVENT_TYPE}" \\
    --data-urlencode "after=\${current_after}")"
  page_count="\$(echo "\${response_json}" | jq '.data | length')"
  if [[ "\${page_count}" -gt 0 ]]; then
    echo "\${response_json}" | jq -r '.data[].id' | while read -r id; do
      echo "Fetching log ID: \${id}" >&2
      perform_curl "download \${id}" -G -L "\${API_BASE}/\${SCOPE_SEGMENT}/\${PRINCIPAL_ID}/logs/\${id}" \\
        -H "Authorization: Bearer \${COMPLIANCE_API_KEY}"
    done
    total_downloaded=\$((total_downloaded + page_count))
  fi
  has_more="\$(echo "\${response_json}" | jq -r '.has_more')"
  current_after="\$(echo "\${response_json}" | jq -r '.last_end_time')"
  [[ "\${has_more}" == "true" ]] && page=\$((page + 1)) || break
done
echo "Downloaded \${total_downloaded} log files up to \${current_after}" >&2`;

// ── Config Panel ──────────────────────────────────────────────────────────────
function ComplianceConfigPanel({ apiKey, setApiKey, principalId, setPrincipalId, onSave, saved }) {
  const [showKey, setShowKey] = useState(false);
  const scopeType  = principalId.startsWith("org-") ? "Organization" : principalId ? "Workspace" : "—";
  const scopeColor = principalId.startsWith("org-") ? C.purple : C.accent;
  const keyValid   = !apiKey || apiKey.startsWith("ck-") || apiKey.length < 4;
  const keyWarning = apiKey && !apiKey.startsWith("ck-") && apiKey.length > 6;

  return (
    <Card>
      <SectionTitle>API Configuration</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
            COMPLIANCE API KEY
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="ck-..."
              style={{
                background: C.bg,
                border: `1px solid ${keyWarning ? C.warn : C.border}`,
                borderRadius: 6, color: C.text, padding: "8px 38px 8px 12px",
                fontSize: 12, fontFamily: "inherit", outline: "none",
                width: "100%", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = C.accentDim}
              onBlur={e => e.target.style.borderColor = keyWarning ? C.warn : C.border}
            />
            <button onClick={() => setShowKey(s => !s)} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12,
            }}>{showKey ? "🙈" : "👁"}</button>
          </div>
          {keyWarning && (
            <div style={{ fontSize: 10, color: C.warn, marginTop: 4 }}>
              ⚠ Compliance API keys should start with ck-
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
            WORKSPACE / ORG ID &nbsp;
            <span style={{ color: scopeColor, fontSize: 10 }}>
              {scopeType !== "—" && `[${scopeType}]`}
            </span>
          </div>
          <Input value={principalId} onChange={setPrincipalId}
            placeholder="f7f33107-... or org-p13k3k..." />
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            Workspace: UUID · Org: starts with <code style={{ color: C.purple }}>org-</code>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <Btn onClick={onSave} disabled={!apiKey.trim() || !principalId.trim()} color={C.ok}>
          {saved ? "✓ Saved" : "💾 Save Config"}
        </Btn>
        {saved && apiKey && (
          <span style={{ fontSize: 11, color: C.ok }}>
            ck-...{apiKey.slice(-6)} · {principalId.slice(0, 14)}…
          </span>
        )}
      </div>

      <div style={{ marginTop: 14, padding: "10px 14px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.accent, marginBottom: 6, letterSpacing: 1 }}>PREREQUISITES</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            "Enterprise Compliance API key (ck-...)",
            "ChatGPT Workspace UUID or org- prefix ID",
            "bash, curl, jq (for shell script)",
            "ISO 8601 date for after parameter",
          ].map((p, i) => (
            <div key={i} style={{ fontSize: 11, color: C.muted }}>
              <span style={{ color: C.ok }}>✓</span> {p}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Log Query Panel ───────────────────────────────────────────────────────────
function LogQueryPanelLegacy({ apiKey, principalId, onResults, onError }) {
  const [eventType, setEventType] = useState("AUTH_LOG");
  const [limit, setLimit]         = useState("100");
  const [afterDate, setAfterDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().replace(/\.\d+Z$/, "Z");
  });
  const [beforeDate, setBeforeDate] = useState("");
  const [loading, setLoading]     = useState(false);
  const [abortCtrl, setAbortCtrl] = useState(null);
  const [page, setPage]           = useState(1);
  const [lastEndTime, setLastEndTime] = useState(null);
  const [hasMore, setHasMore]     = useState(false);
  const [totalFetched, setTotalFetched] = useState(0);
  const [statusLog, setStatusLog] = useState([]);
  const statusRef = useState(null);

  const addStatus = (msg, color = C.muted) => {
    setStatusLog(l => [...l.slice(-24), { msg, color, ts: new Date().toISOString() }]);
  };

  const scopeSegment = principalId.startsWith("org-") ? "organizations" : "workspaces";

  // Auto-scroll status terminal
  useEffect(() => {
    if (statusRef[0]) statusRef[0].scrollTop = statusRef[0].scrollHeight;
  }, [statusLog, statusRef]);

  const fetchPage = async (afterParam, pageNum, signal) => {
    if (!apiKey || !principalId) { onError("Configure API key and Principal ID first."); return; }
    setLoading(true);
    addStatus(`Fetching page ${pageNum} · ${eventType} · after=${afterParam.slice(0, 19)}`, C.accent);
    try {
      const url = new URL(`${COMPLIANCE_API_BASE}/${scopeSegment}/${principalId}/logs`);
      url.searchParams.set("limit", limit);
      url.searchParams.set("event_type", eventType);
      url.searchParams.set("after", afterParam);
      if (beforeDate) url.searchParams.set("before", beforeDate);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error?.message || errBody?.message || res.statusText;
        addStatus(`HTTP ${res.status}: ${msg}`, C.danger);
        onError(`HTTP ${res.status} — ${msg}`);
        return;
      }

      const data = await res.json();
      const count = data.data?.length ?? 0;
      addStatus(`Page ${pageNum}: ${count} log entries received`, C.ok);
      setTotalFetched(t => t + count);
      setHasMore(data.has_more === true);
      setLastEndTime(data.last_end_time || null);
      setPage(pageNum + 1);

      const logItems = [];
      for (const item of data.data || []) {
        addStatus(`  ↓ log ID: ${item.id}`, C.muted);
        try {
          const logRes = await fetch(
            `${COMPLIANCE_API_BASE}/${scopeSegment}/${principalId}/logs/${item.id}`,
            { headers: { Authorization: `Bearer ${apiKey}` }, signal }
          );
          if (logRes.ok) {
            const logData = await logRes.json();
            // Normalise — API may return array or single object
            const entries = Array.isArray(logData) ? logData : [logData];
            entries.forEach((entry, ei) => logItems.push({
              id: item.id + (entries.length > 1 ? `_${ei}` : ""),
              _source_id: item.id,
              ...entry,
            }));
          } else {
            addStatus(`  ✗ Log ${item.id}: HTTP ${logRes.status}`, C.warn);
            logItems.push({ id: item.id, _error: logRes.status, _source_id: item.id });
          }
        } catch (e) {
          if (e.name === "AbortError") { addStatus("Fetch cancelled.", C.warn); return; }
          addStatus(`  ✗ Log ${item.id}: ${e.message}`, C.danger);
          logItems.push({ id: item.id, _error: e.message, _source_id: item.id });
        }
      }
      if (logItems.length > 0) {
        addStatus(`✓ ${logItems.length} events ready`, C.ok);
        onResults(logItems, data);
      } else {
        addStatus("No events in this time range for this event type.", C.muted);
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      addStatus(`Error: ${e.message}`, C.danger);
      onError(e.message);
    } finally { setLoading(false); setAbortCtrl(null); }
  };

  const startFetch = () => {
    const ctrl = new AbortController();
    setAbortCtrl(ctrl);
    setTotalFetched(0); setPage(1); setStatusLog([]);
    fetchPage(afterDate, 1, ctrl.signal);
  };

  const fetchNext = () => {
    if (!lastEndTime) return;
    const ctrl = new AbortController();
    setAbortCtrl(ctrl);
    fetchPage(lastEndTime, page, ctrl.signal);
  };

  const cancel = () => {
    abortCtrl?.abort();
    setLoading(false);
    addStatus("Cancelled by user.", C.warn);
  };

  const curlPreview = `curl -G "${COMPLIANCE_API_BASE}/${scopeSegment}/${principalId || "<id>"}/logs" \\
  -H "Authorization: Bearer ${apiKey ? "ck-…" + apiKey.slice(-4) : "<COMPLIANCE_API_KEY>"}" \\
  --data-urlencode "limit=${limit}" \\
  --data-urlencode "event_type=${eventType}" \\
  --data-urlencode "after=${afterDate}"${beforeDate ? ` \\\n  --data-urlencode "before=${beforeDate}"` : ""}`;

  return (
    <Card>
      <SectionTitle>Log Query</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 100px", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>EVENT TYPE</div>
          <Select value={eventType} onChange={setEventType} options={EVENT_TYPES} style={{ width: "100%" }} />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>AFTER (ISO 8601)</div>
          <Input value={afterDate} onChange={setAfterDate} placeholder="2025-01-01T00:00:00Z" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>BEFORE (optional)</div>
          <Input value={beforeDate} onChange={setBeforeDate} placeholder="2025-12-31T23:59:59Z" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>LIMIT</div>
          <Select value={limit} onChange={setLimit}
            options={["10","25","50","100","200"].map(v => ({ value: v, label: v }))}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <Btn onClick={startFetch} disabled={loading || !apiKey || !principalId}>
          {loading ? <><Spinner />&nbsp; Fetching…</> : "⬇ Fetch Logs"}
        </Btn>
        {loading && (
          <Btn onClick={cancel} color={C.danger} small>✕ Cancel</Btn>
        )}
        {!loading && hasMore && (
          <Btn onClick={fetchNext} color={C.warn}>⬇ Next Page</Btn>
        )}
        {totalFetched > 0 && (
          <span style={{ fontSize: 11, color: C.ok }}>
            {totalFetched} entries · {hasMore ? "more available →" : "complete"}
          </span>
        )}
      </div>

      {/* Status terminal with auto-scroll */}
      {statusLog.length > 0 && (
        <div
          ref={el => { statusRef[0] = el; }}
          style={{
            background: C.bg, borderRadius: 6, border: `1px solid ${C.border}`,
            padding: "10px 12px", maxHeight: 130, overflowY: "auto", marginBottom: 14,
          }}
        >
          {statusLog.map((s, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: "monospace", color: s.color, marginBottom: 2 }}>
              <span style={{ color: C.dim, marginRight: 8 }}>{s.ts.slice(11, 19)}</span>{s.msg}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>EQUIVALENT CURL</div>
      <CodeBlock code={curlPreview} />
    </Card>
  );
}

// ── Log Analytics Panel ───────────────────────────────────────────────────────
function LogAnalyticsPanel({ logs }) {
  if (logs.length === 0) return null;

  const byType    = logs.reduce((a, l) => { const k = l.event_type || l.type || "unknown"; a[k] = (a[k]||0)+1; return a; }, {});
  const byStatus  = logs.reduce((a, l) => { const k = l.status || l.result || l.outcome || "unknown"; a[k] = (a[k]||0)+1; return a; }, {});
  const byPrincipal = logs.reduce((a, l) => {
    const k = l.principal_id || l.user_id || l.actor || "unknown";
    a[k] = (a[k]||0)+1; return a;
  }, {});

  const typeData      = Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value);
  const statusData    = Object.entries(byStatus).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value);
  const topPrincipals = Object.entries(byPrincipal).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const errorRate     = logs.filter(l=>l._error||l.status==="failure"||l.status==="error").length;
  const PIE_COLORS    = [C.accent, C.purple, C.warn, C.ok, C.danger, "#ffd60a", C.accentDim];
  const STATUS_COLORS = { success:C.ok, ok:C.ok, failure:C.danger, error:C.danger };

  return (
    <Card>
      <SectionTitle>Log Analytics ({logs.length} events)</SectionTitle>

      {/* Summary pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Events",  value: logs.length,               color: C.accent },
          { label: "Event Types",   value: typeData.length,           color: C.purple },
          { label: "Unique Principals", value: topPrincipals.length,  color: C.warn   },
          { label: "Errors",        value: errorRate,                 color: C.danger  },
        ].map(s => (
          <div key={s.label} style={{ padding: "8px 16px", background: C.bg,
            borderRadius: 8, border: `1px solid ${C.border}`, textAlign: "center", minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Event type distribution */}
        <div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 }}>EVENT TYPE DISTRIBUTION</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" outerRadius={68}
                dataKey="value" nameKey="name"
                label={({ name, percent }) => `${name.replace("_LOG","").slice(0,8)} ${(percent*100).toFixed(0)}%`}
                labelLine={{ stroke: C.muted }}
              >
                {typeData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown */}
        <div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 10 }}>STATUS BREAKDOWN</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 9 }} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 11 }} />
              <Bar dataKey="value" radius={[2,2,0,0]}>
                {statusData.map((s, i) => (
                  <Cell key={i} fill={STATUS_COLORS[s.name] || C.muted} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top principals */}
      {topPrincipals.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 }}>TOP PRINCIPALS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {topPrincipals.map(([principal, count]) => (
              <div key={principal} style={{ padding: "6px 10px", background: C.bg,
                borderRadius: 6, border: `1px solid ${C.border}`,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: C.text, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
                  {principal}
                </span>
                <Badge label={String(count)} color={C.accent} />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Log Viewer ────────────────────────────────────────────────────────────────
function LogViewer({ logs }) {
  const [filter, setFilter]     = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState("table");

  const eventTypes = [...new Set(logs.map(l => l.event_type || l.type).filter(Boolean))];
  const statuses   = [...new Set(logs.map(l => l.status || l.result || l.outcome).filter(Boolean))];

  const filtered = logs.filter(l => {
    const text = JSON.stringify(l).toLowerCase();
    const matchQ    = !filter || text.includes(filter.toLowerCase());
    const matchType = !typeFilter || (l.event_type || l.type) === typeFilter;
    const matchStat = !statusFilter || (l.status || l.result || l.outcome) === statusFilter;
    return matchQ && matchType && matchStat;
  });

  const exportJsonl = () => {
    const blob = new Blob([logs.map(l => JSON.stringify(l)).join("\n")], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `compliance_${new Date().toISOString().slice(0,10)}.jsonl`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `compliance_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <SectionTitle>Log Viewer ({filtered.length}/{logs.length})</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small color={C.muted} onClick={() => setViewMode(m => m === "table" ? "raw" : "table")}>
            {viewMode === "table" ? "⌨ Raw" : "⊞ Table"}
          </Btn>
          <Btn small color={C.ok} onClick={exportJsonl}>⬇ JSONL</Btn>
          <Btn small color={C.accent} onClick={exportJson}>⬇ JSON</Btn>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 160px", gap: 8, marginBottom: 12 }}>
        <Input value={filter} onChange={setFilter} placeholder="Filter by any field…" />
        <Select value={typeFilter} onChange={setTypeFilter}
          options={[{ value: "", label: "All event types" }, ...eventTypes.map(t => ({ value: t, label: t.replace("_LOG","") }))]}
          style={{ fontSize: 11 }}
        />
        <Select value={statusFilter} onChange={setStatusFilter}
          options={[{ value: "", label: "All statuses" }, ...statuses.map(s => ({ value: s, label: s }))]}
          style={{ fontSize: 11 }}
        />
      </div>

      {viewMode === "raw" ? (
        <CodeBlock code={JSON.stringify(filtered, null, 2)} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                {["ID", "Type", "Timestamp", "Principal", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.muted,
                    letterSpacing: 1, fontWeight: 500, fontSize: 9, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const isExp      = expandedId === (log.id || i);
                const evtType    = log.event_type || log.type || "—";
                const ts_        = log.timestamp || log.created_at || log.time || "—";
                const principal  = log.principal_id || log.user_id || log.actor || "—";
                const status     = log.status || log.result || log.outcome || "—";
                const statusCol  = status === "success" || status === "ok" ? C.ok
                  : status === "failure" || status === "error" ? C.danger : C.muted;
                const hasError   = !!log._error;

                return (
                  <>
                    <tr key={log.id || i}
                      onClick={() => setExpanded(isExp ? null : (log.id || i))}
                      style={{
                        borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                        background: isExp ? C.dim : i % 2 === 0 ? C.bg : "transparent",
                      }}>
                      <td style={{ padding: "7px 10px", color: C.accent, fontFamily: "monospace", fontSize: 9 }}>
                        {String(log.id || "—").slice(0, 14)}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        <Badge label={evtType.replace("_LOG","").slice(0, 12)} color={C.purple} />
                      </td>
                      <td style={{ padding: "7px 10px", color: C.muted, fontFamily: "monospace",
                        fontSize: 9, whiteSpace: "nowrap" }}>
                        {ts_ !== "—" ? ts_.slice(0, 19).replace("T"," ") : "—"}
                      </td>
                      <td style={{ padding: "7px 10px", color: C.text, fontSize: 10,
                        maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {String(principal).slice(0, 26)}
                      </td>
                      <td style={{ padding: "7px 10px" }}>
                        {hasError
                          ? <Badge label={`ERR ${log._error}`} color={C.danger} />
                          : <span style={{ color: statusCol, fontSize: 10 }}>{status}</span>}
                      </td>
                      <td style={{ padding: "7px 10px", color: C.muted, fontSize: 9 }}>
                        {isExp ? "▲" : "▼"}
                      </td>
                    </tr>
                    {isExp && (
                      <tr key={`exp-${log.id || i}`}>
                        <td colSpan={6} style={{ padding: "0 10px 12px", background: C.dim }}>
                          <CodeBlock code={JSON.stringify(log, null, 2)} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 12 }}>
              No logs match the current filters.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── SIEM Panel ────────────────────────────────────────────────────────────────
function SiemIntegrationPanel({ logs }) {
  const [siemType, setSiemType] = useState("splunk");

  const siemConfigs = {
    splunk: { label: "Splunk", color: "#FF5733", script: `# Splunk HEC ingest
curl -sk https://<SPLUNK_HOST>:8088/services/collector/event \\
  -H "Authorization: Splunk <HEC_TOKEN>" \\
  -H "Content-Type: application/json" \\
  --data-binary @compliance_logs.jsonl

# Stream directly from script
COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  <PRINCIPAL_ID> AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \\
  | while read -r line; do
      curl -sk https://<SPLUNK_HOST>:8088/services/collector/event \\
        -H "Authorization: Splunk <HEC_TOKEN>" \\
        -d "{\\"event\\":$line}"
    done` },
    sentinel: { label: "Microsoft Sentinel", color: "#0078D4", script: `# Azure Sentinel — Log Analytics Workspace
WORKSPACE_ID="<LOG_ANALYTICS_WORKSPACE_ID>"
SHARED_KEY="<PRIMARY_KEY>"
LOG_TYPE="OpenAICompliance"

cat compliance_logs.jsonl | jq -sc '.' | while read -r batch; do
  length=$(echo -n "$batch" | wc -c)
  date=$(date -u +%a,\\ %d\\ %b\\ %Y\\ %H:%M:%S\\ GMT)
  sig=$(echo -n "POST\\n$length\\napplication/json\\nx-ms-date:$date\\n/api/logs" \\
    | openssl dgst -sha256 -mac HMAC -macopt "key:$(echo $SHARED_KEY | base64 -d)" -binary | base64)
  curl -s -X POST "https://$WORKSPACE_ID.ods.opinsights.azure.com/api/logs?api-version=2016-04-01" \\
    -H "Authorization: SharedKey $WORKSPACE_ID:$sig" \\
    -H "Log-Type: $LOG_TYPE" -H "Content-Type: application/json" -d "$batch"
done` },
    elastic: { label: "Elastic / OpenSearch", color: "#FEC514", script: `# Elastic Bulk API
curl -X PUT "https://<ES_HOST>:9200/openai-compliance" \\
  -H "Content-Type: application/json" -u elastic:<PASSWORD> \\
  -d '{"mappings":{"properties":{"timestamp":{"type":"date"},"event_type":{"type":"keyword"},"principal_id":{"type":"keyword"},"status":{"type":"keyword"}}}}'

COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  <ID> AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \\
  | while read -r line; do
      echo '{"index":{"_index":"openai-compliance"}}'
      echo "$line"
    done | curl -s -X POST "https://<ES_HOST>:9200/_bulk" \\
      -H "Content-Type: application/x-ndjson" -u elastic:<PW> --data-binary @-` },
    datadog: { label: "Datadog", color: "#632CA6", script: `# Datadog Logs API
DD_API_KEY="<DATADOG_API_KEY>"
DD_SITE="datadoghq.com"

COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  <ID> AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \\
  | jq -c '. + {"ddsource":"openai","ddtags":"env:prod","hostname":"compliance-collector"}' \\
  | curl -s -X POST "https://http-intake.logs.$DD_SITE/api/v2/logs" \\
      -H "DD-API-KEY: $DD_API_KEY" \\
      -H "Content-Type: application/json" --data-binary @-` },
    s3: { label: "AWS S3", color: "#FF9900", script: `# AWS S3 — Hive-partitioned data lake
BUCKET="s3://your-security-data-lake"
DATE=$(date -u +%Y/%m/%d)

COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  <ID> AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \\
  > /tmp/compliance_$(date +%s).jsonl

aws s3 cp /tmp/compliance_*.jsonl \\
  "$BUCKET/openai_compliance/event_type=AUTH_LOG/dt=$DATE/" \\
  --storage-class STANDARD_IA` },
  };

  const cfg = siemConfigs[siemType];

  return (
    <Card>
      <SectionTitle>SIEM / Data Lake Integration</SectionTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {Object.entries(siemConfigs).map(([k, v]) => (
          <button key={k} onClick={() => setSiemType(k)} style={{
            padding: "5px 13px", borderRadius: 6, cursor: "pointer",
            background: siemType === k ? v.color + "22" : C.bg,
            border: `1px solid ${siemType === k ? v.color : C.border}`,
            color: siemType === k ? v.color : C.muted,
            fontSize: 11, fontFamily: "inherit", transition: "all 0.15s",
          }}>{v.label}</button>
        ))}
      </div>
      {logs.length > 0 && (
        <div style={{ fontSize: 11, color: C.ok, marginBottom: 8 }}>
          ✓ {logs.length} fetched logs ready to ingest into{" "}
          <span style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      )}
      <CodeBlock code={cfg.script} />
    </Card>
  );
}

// ── Script Reference ──────────────────────────────────────────────────────────
function ScriptReferencePanel() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle>Shell Script — download_compliance_files.sh</SectionTitle>
        <Btn small color={C.muted} onClick={() => setOpen(o => !o)}>
          {open ? "▲ Hide" : "▼ Show Script"}
        </Btn>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: open ? 12 : 0, lineHeight: 1.7 }}>
        Save as <code style={{ color: C.accent }}>download_compliance_files.sh</code>,
        mark executable with <code style={{ color: C.accent }}>chmod +x</code>, then run:
      </div>
      {open && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: C.warn, marginBottom: 6, letterSpacing: 1 }}>USAGE</div>
            <CodeBlock code={`# Workspace
COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  f7f33107-5fb9-4ee1-8922-3eae76b5b5a0 AUTH_LOG 100 \\
  "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" > output.jsonl

# Organization
COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  org-p13k3klgno5cqxbf0q8hpgrk AUTH_LOG 100 \\
  "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" > output.jsonl`} />
          </div>
          <div style={{ fontSize: 10, color: C.accent, marginBottom: 6, letterSpacing: 1 }}>FULL SCRIPT</div>
          <CodeBlock code={BASH_SCRIPT} />
        </>
      )}
    </Card>
  );
}

// ── API Reference ─────────────────────────────────────────────────────────────
function ApiReferencePanel() {
  const [open, setOpen] = useState(false);
  const endpoints = [
    { method: "GET", path: "/v1/compliance/workspaces/{id}/logs",
      desc: "List log metadata for a workspace (paginated).",
      params: "limit · event_type · after (ISO 8601) · before (ISO 8601, optional)",
      response: `{"data":[{"id":"log_abc","event_type":"AUTH_LOG","start_time":"...","end_time":"..."}],"has_more":true,"last_end_time":"..."}` },
    { method: "GET", path: "/v1/compliance/organizations/{org_id}/logs",
      desc: "List log metadata for an organization (org- prefix IDs).",
      params: "limit · event_type · after · before",
      response: `{"data":[...],"has_more":false,"last_end_time":"..."}` },
    { method: "GET", path: "/v1/compliance/workspaces/{id}/logs/{log_id}",
      desc: "Download full JSONL log file. Follows redirect — use -L in curl.",
      params: "(none)",
      response: "[JSONL stream of log events]" },
    { method: "GET", path: "/v1/compliance/organizations/{org_id}/logs/{log_id}",
      desc: "Download org-scoped JSONL log file. Follows redirect.",
      params: "(none)",
      response: "[JSONL stream of log events]" },
  ];
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle>API Reference</SectionTitle>
        <Btn small color={C.muted} onClick={() => setOpen(o => !o)}>{open ? "▲ Hide" : "▼ Show"}</Btn>
      </div>
      {open && (
        <div>
          <div style={{ marginBottom: 12, fontSize: 11, color: C.muted }}>
            Base: <code style={{ color: C.accent }}>https://api.chatgpt.com/v1/compliance</code>
            &nbsp;·&nbsp;Auth: <code style={{ color: C.accent }}>Authorization: Bearer &lt;COMPLIANCE_API_KEY&gt;</code>
          </div>
          {endpoints.map((ep, i) => (
            <div key={i} style={{ marginBottom: 12, padding: 12, background: C.bg,
              borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <Badge label={ep.method} color={C.ok} />
                <code style={{ fontSize: 11, color: C.accent }}>{ep.path}</code>
              </div>
              <div style={{ fontSize: 11, color: C.text, marginBottom: 5 }}>{ep.desc}</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>
                <span style={{ color: C.purple }}>Params: </span>{ep.params}
              </div>
              <div style={{ fontSize: 9, fontFamily: "monospace", color: "#7ec8e3",
                background: "#020608", padding: "7px 10px", borderRadius: 5 }}>
                {ep.response}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Main ComplianceLogs Page ──────────────────────────────────────────────────
function ComplianceLogs() {
  const STORAGE_KEY = "compliance_config_v2";

  const loadStored = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  };

  const [apiKey, setApiKey]           = useState(() => loadStored().apiKey || "");
  const [principalId, setPrincipalId] = useState(() => loadStored().principalId || "");
  const [saved, setSaved]             = useState(false);
  const [allLogs, setAllLogs]         = useState([]);
  const [errorMsg, setErrorMsg]       = useState(null);
  const [subTab, setSubTab]           = useState("fetch");

  const subTabs = [
    { id: "fetch",    label: "⬇ Fetch Logs" },
    { id: "analytics",label: "📊 Analytics",  badge: allLogs.length || null },
    { id: "viewer",   label: "⊞ Log Viewer",  badge: allLogs.length || null },
    { id: "siem",     label: "⬆ SIEM Export", disabled: allLogs.length === 0 },
    { id: "script",   label: "⌨ Shell Script" },
    { id: "api_ref",  label: "📖 API Ref" },
  ];

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey, principalId }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResults = (newLogs) => {
    if (!newLogs || newLogs.length === 0) return;
    setAllLogs(prev => {
      const existingIds = new Set(prev.map(l => l.id).filter(Boolean));
      const deduped = newLogs.filter(l => !l.id || !existingIds.has(l.id));
      const merged = [...prev, ...deduped];
      return merged;
    });
    setErrorMsg(null);
    // Only auto-navigate if we have real logs
    const realLogs = newLogs.filter(l => !l._error);
    if (realLogs.length > 0) setSubTab("analytics");
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ color: C.text, margin: "0 0 4px", fontSize: 22, fontWeight: 300 }}>
              OpenAI <span style={{ color: C.accent, fontWeight: 700 }}>Compliance Logs</span> Platform
            </h2>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: "monospace" }}>
              Enterprise compliance log ingestion · analytics · SIEM integration
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="https://help.openai.com" target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: C.accentDim, textDecoration: "none",
                padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
              Help Center ↗
            </a>
            <a href="https://platform.openai.com/docs/api-reference" target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: C.accentDim, textDecoration: "none",
                padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
              API Reference ↗
            </a>
          </div>
        </div>

        {/* Stats bar */}
        {allLogs.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center" }}>
            {[
              { label: "Total Events",  value: allLogs.length,                                        color: C.accent },
              { label: "Event Types",   value: [...new Set(allLogs.map(l=>l.event_type||l.type).filter(Boolean))].length, color: C.purple },
              { label: "Errors",        value: allLogs.filter(l => l._error).length,                  color: C.danger },
              { label: "Success",       value: allLogs.filter(l => !l._error).length,                 color: C.ok },
            ].map(s => (
              <div key={s.label} style={{ padding: "7px 14px", background: C.panel,
                borderRadius: 8, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                <div style={{ fontSize: 9, color: C.muted }}>{s.label}</div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <Btn small color={C.danger} onClick={() => setAllLogs([])}>✕ Clear Logs</Btn>
          </div>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div style={{ marginBottom: 14, padding: "10px 14px",
          background: C.danger + "15", border: `1px solid ${C.danger}44`, borderRadius: 6,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.danger }}>⚠ {errorMsg}</span>
          <Btn small color={C.danger} onClick={() => setErrorMsg(null)}>✕</Btn>
        </div>
      )}

      {/* Config — always visible */}
      <div style={{ marginBottom: 16 }}>
        <ComplianceConfigPanel
          apiKey={apiKey} setApiKey={setApiKey}
          principalId={principalId} setPrincipalId={setPrincipalId}
          onSave={handleSave} saved={saved}
        />
      </div>

      {/* Sub-nav */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16,
        borderBottom: `1px solid ${C.border}`, paddingBottom: 8, flexWrap: "wrap" }}>
        {subTabs.map(t => (
          <button key={t.id}
            onClick={() => !t.disabled && setSubTab(t.id)}
            style={{
              background: subTab === t.id ? C.accent + "18" : "transparent",
              color: t.disabled ? C.dim : subTab === t.id ? C.accent : C.muted,
              border: `1px solid ${subTab === t.id ? C.accentDim : "transparent"}`,
              borderRadius: 6, padding: "5px 12px", cursor: t.disabled ? "not-allowed" : "pointer",
              fontSize: 11, fontFamily: "inherit", transition: "all 0.15s",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
            {t.label}
            {t.badge ? (
              <span style={{ background: C.accent+"30", color: C.accent,
                padding: "1px 5px", borderRadius: 10, fontSize: 8 }}>{t.badge}</span>
            ) : null}
            {t.disabled && (
              <span style={{ fontSize: 9, color: C.dim }}>need logs</span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === "fetch" && (
        <LogQueryPanel apiKey={apiKey} principalId={principalId}
          onResults={handleResults} onError={setErrorMsg} />
      )}
      {subTab === "analytics" && (
        allLogs.length === 0
          ? <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>Fetch logs first.</Card>
          : <LogAnalyticsPanel logs={allLogs} />
      )}
      {subTab === "viewer" && (
        allLogs.length === 0
          ? <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>No logs fetched yet.</Card>
          : <LogViewer logs={allLogs} />
      )}
      {subTab === "siem" && <SiemIntegrationPanel logs={allLogs} />}
      {subTab === "script" && <ScriptReferencePanel />}
      {subTab === "api_ref" && <ApiReferencePanel />}
    </div>
  );
}

// ── Sub-components (duplicate legacy definitions; not used) ───────────────────

function ComplianceConfigPanelLegacy({ apiKey, setApiKey, principalId, setPrincipalId, onSave, saved }) {
  const [showKey, setShowKey] = useState(false);
  const scopeType = principalId.startsWith("org-") ? "Organization" : principalId ? "Workspace" : "—";
  const scopeColor = principalId.startsWith("org-") ? C.purple : C.accent;

  return (
    <Card>
      <SectionTitle>API Configuration</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, letterSpacing: 0.5 }}>
            COMPLIANCE API KEY
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="ck-..."
              style={{
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.text, padding: "8px 40px 8px 12px", fontSize: 12,
                fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = C.accentDim}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <button onClick={() => setShowKey(s => !s)} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 12,
            }}>{showKey ? "🙈" : "👁"}</button>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, letterSpacing: 0.5 }}>
            WORKSPACE / ORG ID &nbsp;
            <span style={{ color: scopeColor, fontSize: 10 }}>
              {scopeType !== "—" && `[${scopeType}]`}
            </span>
          </div>
          <Input
            value={principalId}
            onChange={setPrincipalId}
            placeholder="f7f33107-... or org-p13k3k..."
          />
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            Workspace: UUID format · Organization: starts with <code style={{ color: C.purple }}>org-</code>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <Btn onClick={onSave} disabled={!apiKey.trim() || !principalId.trim()} color={C.ok}>
          {saved ? "✓ Saved" : "💾 Save Config"}
        </Btn>
        {saved && apiKey && (
          <span style={{ fontSize: 11, color: C.ok }}>
            Key: ck-...{apiKey.slice(-6)} · ID: {principalId.slice(0, 14)}...
          </span>
        )}
      </div>

      <div style={{ marginTop: 14, padding: "10px 14px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.accent, marginBottom: 6, letterSpacing: 1 }}>PREREQUISITES</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            "Enterprise Compliance API key",
            "ChatGPT account ID or API Platform Org ID",
            "bash, curl, sed, date (for shell script)",
            "ISO 8601 date string for after parameter",
          ].map((p, i) => (
            <div key={i} style={{ fontSize: 11, color: C.muted }}>
              <span style={{ color: C.ok }}>✓</span> {p}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function LogQueryPanel({ apiKey, principalId, onResults, onError }) {
  const [eventType, setEventType]   = useState("AUTH_LOG");
  const [limit, setLimit]           = useState("100");
  const [afterDate, setAfterDate]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().replace(/\.\d+Z$/, "Z");
  });
  const [loading, setLoading]       = useState(false);
  const [page, setPage]             = useState(1);
  const [lastEndTime, setLastEndTime] = useState(null);
  const [hasMore, setHasMore]       = useState(false);
  const [totalFetched, setTotalFetched] = useState(0);
  const [statusLog, setStatusLog]   = useState([]);

  const addStatus = (msg, color = C.muted) => setStatusLog(l => [...l.slice(-19), { msg, color, ts: new Date().toISOString() }]);

  const scopeSegment = principalId.startsWith("org-") ? "organizations" : "workspaces";

  const fetchPage = async (afterParam, pageNum) => {
    if (!apiKey || !principalId) { onError("Configure API key and Principal ID first."); return; }
    setLoading(true);
    addStatus(`Fetching page ${pageNum} · event_type=${eventType} · after=${afterParam}`, C.accent);
    try {
      const url = new URL(`${COMPLIANCE_API_BASE}/${scopeSegment}/${principalId}/logs`);
      url.searchParams.set("limit", limit);
      url.searchParams.set("event_type", eventType);
      url.searchParams.set("after", afterParam);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.error?.message || res.statusText;
        addStatus(`HTTP ${res.status}: ${msg}`, C.danger);
        onError(`HTTP ${res.status} — ${msg}`);
        return;
      }

      const data = await res.json();
      const count = data.data?.length ?? 0;
      addStatus(`Page ${pageNum}: received ${count} log entries`, C.ok);
      setTotalFetched(t => t + count);
      setHasMore(data.has_more === true);
      setLastEndTime(data.last_end_time || null);
      setPage(pageNum + 1);

      // Fetch each log file
      const logItems = [];
      for (const item of data.data || []) {
        addStatus(`  Fetching log ID: ${item.id}`, C.muted);
        try {
          const logRes = await fetch(
            `${COMPLIANCE_API_BASE}/${scopeSegment}/${principalId}/logs/${item.id}`,
            { headers: { Authorization: `Bearer ${apiKey}` } }
          );
          if (logRes.ok) {
            const logData = await logRes.json();
            logItems.push({ id: item.id, ...logData });
          } else {
            addStatus(`  Log ${item.id}: HTTP ${logRes.status}`, C.warn);
            logItems.push({ id: item.id, _error: logRes.status });
          }
        } catch (e) {
          addStatus(`  Log ${item.id}: fetch failed`, C.danger);
          logItems.push({ id: item.id, _error: e.message });
        }
      }
      onResults(logItems, data);
    } catch (e) {
      const msg = e.message || "Network error";
      addStatus(`Error: ${msg}`, C.danger);
      onError(msg);
    } finally { setLoading(false); }
  };

  const startFetch = () => {
    setTotalFetched(0); setPage(1); setStatusLog([]);
    fetchPage(afterDate, 1);
  };
  const fetchNext = () => { if (lastEndTime) fetchPage(lastEndTime, page); };

  return (
    <Card>
      <SectionTitle>Log Query</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>EVENT TYPE</div>
          <Select value={eventType} onChange={setEventType} options={EVENT_TYPES} style={{ width: "100%" }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>AFTER (ISO 8601)</div>
          <Input value={afterDate} onChange={setAfterDate} placeholder="2025-01-01T00:00:00Z" />
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>LIMIT</div>
          <Select value={limit} onChange={setLimit}
            options={["10","25","50","100","200"].map(v => ({ value: v, label: v }))}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <Btn onClick={startFetch} disabled={loading || !apiKey || !principalId}>
          {loading ? <><Spinner />&nbsp; Fetching...</> : "⬇ Fetch Logs"}
        </Btn>
        {hasMore && (
          <Btn onClick={fetchNext} disabled={loading} color={C.warn}>
            ⬇ Fetch Next Page
          </Btn>
        )}
        {totalFetched > 0 && (
          <span style={{ fontSize: 11, color: C.ok }}>
            {totalFetched} entries fetched · {hasMore ? "more available" : "complete"}
          </span>
        )}
      </div>

      {/* Status log */}
      {statusLog.length > 0 && (
        <div style={{
          background: C.bg, borderRadius: 6, border: `1px solid ${C.border}`,
          padding: "10px 12px", maxHeight: 140, overflowY: "auto",
        }}>
          {statusLog.map((s, i) => (
            <div key={i} style={{ fontSize: 10, fontFamily: "monospace", color: s.color, marginBottom: 2 }}>
              <span style={{ color: C.dim, marginRight: 8 }}>{s.ts.slice(11, 19)}</span>{s.msg}
            </div>
          ))}
        </div>
      )}

      {/* Curl equivalent */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, letterSpacing: 1 }}>EQUIVALENT CURL</div>
        <CodeBlock code={`curl -G "https://api.chatgpt.com/v1/compliance/${scopeSegment}/${principalId || "<id>"}/logs" \\
  -H "Authorization: Bearer ${apiKey ? "ck-..." + apiKey.slice(-4) : "<COMPLIANCE_API_KEY>"}" \\
  --data-urlencode "limit=${limit}" \\
  --data-urlencode "event_type=${eventType}" \\
  --data-urlencode "after=${afterDate}"`} />
      </div>
    </Card>
  );
}

function LogViewerLegacy({ logs, onExport }) {
  const [filter, setFilter]     = useState("");
  const [expandedId, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" | "raw"

  const filtered = logs.filter(l => {
    if (!filter) return true;
    return JSON.stringify(l).toLowerCase().includes(filter.toLowerCase());
  });

  const exportJsonl = () => {
    const jsonl = logs.map(l => JSON.stringify(l)).join("\n");
    const blob = new Blob([jsonl], { type: "application/x-ndjson" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `compliance_logs_${new Date().toISOString().slice(0,10)}.jsonl`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `compliance_logs_${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (logs.length === 0) return null;

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <SectionTitle>Log Viewer ({logs.length} entries)</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small color={C.muted}
            onClick={() => setViewMode(m => m === "table" ? "raw" : "table")}>
            {viewMode === "table" ? "⌨ Raw JSON" : "⊞ Table"}
          </Btn>
          <Btn small color={C.ok} onClick={exportJsonl}>⬇ JSONL</Btn>
          <Btn small color={C.accent} onClick={exportJson}>⬇ JSON</Btn>
        </div>
      </div>

      <Input value={filter} onChange={setFilter} placeholder="Filter logs..." style={{ marginBottom: 12 }} />

      {viewMode === "raw" ? (
        <CodeBlock code={JSON.stringify(filtered, null, 2)} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["ID", "Type", "Timestamp", "Principal", "Status", "Details"].map(h => (
                  <th key={h} style={{
                    padding: "6px 10px", textAlign: "left", color: C.muted,
                    letterSpacing: 1, fontWeight: 500, fontSize: 10,
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => {
                const isExpanded = expandedId === (log.id || i);
                const evtType = log.event_type || log.type || "—";
                const ts_ = log.timestamp || log.created_at || log.time || "—";
                const principal = log.principal_id || log.user_id || log.actor || "—";
                const status = log.status || log.result || log.outcome || "—";
                const statusCol = status === "success" || status === "ok" ? C.ok
                  : status === "failure" || status === "error" ? C.danger : C.muted;
                const hasError = !!log._error;

                return (
                  <>
                    <tr key={log.id || i}
                      onClick={() => setExpanded(isExpanded ? null : (log.id || i))}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        cursor: "pointer",
                        background: isExpanded ? C.dim : (i % 2 === 0 ? C.bg : "transparent"),
                        transition: "background 0.1s",
                      }}>
                      <td style={{ padding: "8px 10px", color: C.accent, fontFamily: "monospace", fontSize: 10 }}>
                        {(log.id || "—").slice(0, 12)}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Badge label={evtType.slice(0, 16)} color={C.purple} />
                      </td>
                      <td style={{ padding: "8px 10px", color: C.muted, fontFamily: "monospace", fontSize: 10, whiteSpace: "nowrap" }}>
                        {ts_ !== "—" ? ts_.slice(0, 19).replace("T", " ") : "—"}
                      </td>
                      <td style={{ padding: "8px 10px", color: C.text, fontSize: 10, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {String(principal).slice(0, 24)}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {hasError
                          ? <Badge label={`ERR ${log._error}`} color={C.danger} />
                          : <span style={{ color: statusCol, fontSize: 10 }}>{status}</span>}
                      </td>
                      <td style={{ padding: "8px 10px", color: C.muted, fontSize: 10 }}>
                        {isExpanded ? "▲ collapse" : "▼ expand"}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`exp-${log.id || i}`}>
                        <td colSpan={6} style={{ padding: "0 10px 12px", background: C.dim }}>
                          <CodeBlock code={JSON.stringify(log, null, 2)} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: C.muted, fontSize: 12 }}>
              No logs match the filter.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SiemIntegrationPanelLegacy({ logs }) {
  const [siemType, setSiemType] = useState("splunk");

  const siemConfigs = {
    splunk: {
      label: "Splunk",
      script: `# Splunk HEC ingest — pipe compliance JSONL
curl -sk https://<SPLUNK_HOST>:8088/services/collector/event \\
  -H "Authorization: Splunk <HEC_TOKEN>" \\
  -H "Content-Type: application/json" \\
  --data-binary @compliance_logs.jsonl

# Or stream directly:
COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  <PRINCIPAL_ID> AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \\
  | while read -r line; do
      curl -sk https://<SPLUNK_HOST>:8088/services/collector/event \\
        -H "Authorization: Splunk <HEC_TOKEN>" \\
        -d "{\\"event\\":$line}"
    done`,
      color: "#FF5733",
    },
    sentinel: {
      label: "Microsoft Sentinel",
      script: `# Azure Sentinel — Log Analytics Workspace ingest via Data Collector API
WORKSPACE_ID="<LOG_ANALYTICS_WORKSPACE_ID>"
SHARED_KEY="<PRIMARY_KEY>"
LOG_TYPE="OpenAICompliance"

# Build signature
build_signature() {
  local date=$(date -u +%a,\\ %d\\ %b\\ %Y\\ %H:%M:%S\\ GMT)
  local content_length=$1
  local string_to_hash="POST\\n$content_length\\napplication/json\\nx-ms-date:$date\\n/api/logs"
  local decoded_key=$(echo "$SHARED_KEY" | base64 -d | xxd -p -c 256)
  local signature=$(echo -n "$string_to_hash" | openssl dgst -sha256 -mac HMAC -macopt hexkey:$decoded_key -binary | base64)
  echo "SharedKey $WORKSPACE_ID:$signature"
}

# Post each batch
cat compliance_logs.jsonl | jq -sc '.' | while read -r batch; do
  length=$(echo -n "$batch" | wc -c)
  sig=$(build_signature $length)
  curl -s -X POST "https://$WORKSPACE_ID.ods.opinsights.azure.com/api/logs?api-version=2016-04-01" \\
    -H "Authorization: $sig" \\
    -H "Log-Type: $LOG_TYPE" \\
    -H "Content-Type: application/json" \\
    -d "$batch"
done`,
      color: "#0078D4",
    },
    elastic: {
      label: "Elastic / OpenSearch",
      script: `# Elastic Bulk API ingest
# First, create index mapping
curl -X PUT "https://<ES_HOST>:9200/openai-compliance-logs" \\
  -H "Content-Type: application/json" \\
  -u elastic:<PASSWORD> \\
  -d '{"mappings":{"properties":{"timestamp":{"type":"date"},"event_type":{"type":"keyword"},"principal_id":{"type":"keyword"},"status":{"type":"keyword"}}}}'

# Stream logs into Elastic bulk API
COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  <PRINCIPAL_ID> AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \\
  | while read -r line; do
      echo '{"index":{"_index":"openai-compliance-logs"}}'
      echo "$line"
    done | curl -s -X POST "https://<ES_HOST>:9200/_bulk" \\
      -H "Content-Type: application/x-ndjson" \\
      -u elastic:<PASSWORD> \\
      --data-binary @-`,
      color: "#FEC514",
    },
    datadog: {
      label: "Datadog",
      script: `# Datadog Logs API ingest
DD_API_KEY="<DATADOG_API_KEY>"
DD_SITE="datadoghq.com"  # or datadoghq.eu

COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  <PRINCIPAL_ID> AUTH_LOG 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \\
  | jq -c '. + {"ddsource":"openai","ddtags":"env:prod,service:openai-compliance","hostname":"compliance-collector"}' \\
  | curl -s -X POST "https://http-intake.logs.$DD_SITE/api/v2/logs" \\
      -H "DD-API-KEY: $DD_API_KEY" \\
      -H "Content-Type: application/json" \\
      --data-binary @-`,
      color: "#632CA6",
    },
    s3: {
      label: "AWS S3 / Data Lake",
      script: `# AWS S3 data lake — partition by date and event type
BUCKET="s3://your-security-data-lake"
DATE=$(date -u +%Y/%m/%d)
EVENT_TYPE="AUTH_LOG"

COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  <PRINCIPAL_ID> $EVENT_TYPE 100 "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \\
  > /tmp/compliance_$EVENT_TYPE_$(date +%s).jsonl

# Upload to S3 with Hive-compatible partitioning
aws s3 cp /tmp/compliance_$EVENT_TYPE_*.jsonl \\
  "$BUCKET/openai_compliance/event_type=$EVENT_TYPE/dt=$DATE/" \\
  --storage-class STANDARD_IA

# Optional: register as Athena/Glue table partition
aws glue create-partition \\
  --database-name security_logs \\
  --table-name openai_compliance \\
  --partition-input "Values=['$EVENT_TYPE','$DATE'],StorageDescriptor={Location:'$BUCKET/openai_compliance/event_type=$EVENT_TYPE/dt=$DATE/',InputFormat:'org.apache.hadoop.mapred.TextInputFormat',OutputFormat:'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',SerdeInfo:{SerializationLibrary:'org.openx.data.jsonserde.JsonSerDe'}}"`,
      color: "#FF9900",
    },
  };

  const cfg = siemConfigs[siemType];

  return (
    <Card>
      <SectionTitle>SIEM / Data Lake Integration</SectionTitle>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {Object.entries(siemConfigs).map(([k, v]) => (
          <button key={k} onClick={() => setSiemType(k)}
            style={{
              padding: "6px 14px", borderRadius: 6, cursor: "pointer",
              background: siemType === k ? v.color + "25" : C.bg,
              border: `1px solid ${siemType === k ? v.color : C.border}`,
              color: siemType === k ? v.color : C.muted,
              fontSize: 11, fontFamily: "inherit", transition: "all 0.15s",
            }}>
            {v.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
        {logs.length > 0 && (
          <span style={{ color: C.ok }}>✓ {logs.length} fetched logs ready to ingest &nbsp;·&nbsp; </span>
        )}
        Ingest script for <span style={{ color: cfg.color }}>{cfg.label}</span>
      </div>
      <CodeBlock code={cfg.script} />
    </Card>
  );
}

function ScriptReferencePanelLegacy() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle>Shell Script Reference — download_compliance_files.sh</SectionTitle>
        <Btn small color={C.muted} onClick={() => setOpen(o => !o)}>
          {open ? "▲ Hide" : "▼ Show Script"}
        </Btn>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: open ? 12 : 0, lineHeight: 1.7 }}>
        Save as <code style={{ color: C.accent }}>download_compliance_files.sh</code>, mark executable with{" "}
        <code style={{ color: C.accent }}>chmod +x</code>, then run:
      </div>
      {open && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: C.warn, marginBottom: 6, letterSpacing: 1 }}>USAGE</div>
            <CodeBlock code={`# Workspace (UUID format)
COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  f7f33107-5fb9-4ee1-8922-3eae76b5b5a0 AUTH_LOG 100 \\
  "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" > output.jsonl

# Organization (org- prefix)
COMPLIANCE_API_KEY=<KEY> ./download_compliance_files.sh \\
  org-p13k3klgno5cqxbf0q8hpgrk AUTH_LOG 100 \\
  "$(date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" > output.jsonl`} />
          </div>
          <div style={{ fontSize: 11, color: C.accent, marginBottom: 6, letterSpacing: 1 }}>FULL SCRIPT</div>
          <CodeBlock code={BASH_SCRIPT} />
        </>
      )}
    </Card>
  );
}

function ApiReferencePanelLegacy() {
  const [open, setOpen] = useState(false);

  const endpoints = [
    {
      method: "GET", path: "/v1/compliance/workspaces/{id}/logs",
      desc: "List log metadata for a workspace. Returns paginated log IDs and metadata.",
      params: ["limit (int)", "event_type (string)", "after (ISO 8601 datetime)"],
      response: `{ "data": [{ "id": "log_abc123", "event_type": "AUTH_LOG", "start_time": "...", "end_time": "..." }], "has_more": true, "last_end_time": "..." }`,
    },
    {
      method: "GET", path: "/v1/compliance/organizations/{org_id}/logs",
      desc: "List log metadata for an organization (use org- prefix IDs).",
      params: ["limit (int)", "event_type (string)", "after (ISO 8601 datetime)"],
      response: `{ "data": [...], "has_more": false, "last_end_time": "..." }`,
    },
    {
      method: "GET", path: "/v1/compliance/workspaces/{id}/logs/{log_id}",
      desc: "Download the full JSONL log file for a specific log ID.",
      params: ["Follows redirect (use -L in curl)"],
      response: `[JSONL stream of log events]`,
    },
    {
      method: "GET", path: "/v1/compliance/organizations/{org_id}/logs/{log_id}",
      desc: "Download the full JSONL log file for an org-scoped log.",
      params: ["Follows redirect"],
      response: `[JSONL stream of log events]`,
    },
  ];

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle>API Reference</SectionTitle>
        <Btn small color={C.muted} onClick={() => setOpen(o => !o)}>{open ? "▲ Hide" : "▼ Show"}</Btn>
      </div>
      {open && (
        <div>
          <div style={{ marginBottom: 12, fontSize: 12, color: C.muted }}>
            Base URL: <code style={{ color: C.accent }}>https://api.chatgpt.com/v1/compliance</code>
            &nbsp;·&nbsp;Auth: <code style={{ color: C.accent }}>Authorization: Bearer &lt;COMPLIANCE_API_KEY&gt;</code>
          </div>
          {endpoints.map((ep, i) => (
            <div key={i} style={{
              marginBottom: 14, padding: 14, background: C.bg,
              borderRadius: 8, border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <Badge
                  label={ep.method}
                  color={ep.method === "GET" ? C.ok : ep.method === "POST" ? C.accent : C.warn}
                />
                <code style={{ fontSize: 12, color: C.accent }}>{ep.path}</code>
              </div>
              <div style={{ fontSize: 12, color: C.text, marginBottom: 8 }}>{ep.desc}</div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                <span style={{ color: C.purple }}>Parameters: </span>
                {ep.params.join(" · ")}
              </div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#7ec8e3", background: "#020608", padding: "8px 12px", borderRadius: 6 }}>
                {ep.response}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Main ComplianceLogs page (legacy variant, unused) ─────────────────────────
function ComplianceLogsLegacy() {
  const STORAGE_KEY_CONFIG = "compliance_config";

  const loadStored = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || "{}"); } catch { return {}; }
  };

  const [apiKey, setApiKey]           = useState(() => loadStored().apiKey || "");
  const [principalId, setPrincipalId] = useState(() => loadStored().principalId || "");
  const [saved, setSaved]             = useState(false);
  const [logs, setLogs]               = useState([]);
  const [errorMsg, setErrorMsg]       = useState(null);
  const [allLogs, setAllLogs]         = useState([]); // accumulate across pages
  const [subTab, setSubTab]           = useState("fetch");

  const subTabs = [
    { id: "fetch",    label: "⬇ Fetch Logs" },
    { id: "viewer",   label: "⊞ Log Viewer" },
    { id: "siem",     label: "⬆ SIEM Export" },
    { id: "script",   label: "⌨ Shell Script" },
    { id: "api_ref",  label: "📖 API Reference" },
  ];

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ apiKey, principalId }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResults = (newLogs) => {
    setAllLogs(prev => {
      const existingIds = new Set(prev.map(l => l.id));
      const deduped = newLogs.filter(l => !existingIds.has(l.id));
      return [...prev, ...deduped];
    });
    setLogs(newLogs);
    setErrorMsg(null);
    if (newLogs.length > 0) setSubTab("viewer");
  };

  const handleError = (msg) => setErrorMsg(msg);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ color: C.text, margin: "0 0 4px", fontSize: 22, fontWeight: 300 }}>
              OpenAI <span style={{ color: C.accent, fontWeight: 700 }}>Compliance Logs</span> Platform
            </h2>
            <p style={{ color: C.muted, fontSize: 12, margin: 0, fontFamily: "monospace" }}>
              Enterprise compliance log ingestion · SIEM integration · Audit trail management
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="https://help.openai.com" target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: C.accentDim, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
              Help Center
            </a>
            <a href="https://platform.openai.com/docs/api-reference" target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: C.accentDim, textDecoration: "none", padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6 }}>
              API Reference
            </a>
          </div>
        </div>

        {/* Stats bar */}
        {allLogs.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            {[
              { label: "Total Fetched", value: allLogs.length, color: C.accent },
              { label: "Event Types", value: [...new Set(allLogs.map(l => l.event_type || l.type).filter(Boolean))].length, color: C.purple },
              { label: "Errors", value: allLogs.filter(l => l._error).length, color: C.danger },
              { label: "Success", value: allLogs.filter(l => !l._error).length, color: C.ok },
            ].map(s => (
              <div key={s.label} style={{
                padding: "8px 14px", background: C.panel, borderRadius: 8,
                border: `1px solid ${C.border}`, textAlign: "center",
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{s.label}</div>
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <Btn small color={C.danger} onClick={() => { setAllLogs([]); setLogs([]); }}>✕ Clear</Btn>
          </div>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div style={{
          marginBottom: 14, padding: "10px 14px", background: C.danger + "15",
          border: `1px solid ${C.danger}44`, borderRadius: 6,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 12, color: C.danger }}>⚠ {errorMsg}</span>
          <Btn small color={C.danger} onClick={() => setErrorMsg(null)}>✕</Btn>
        </div>
      )}

      {/* Config panel always visible */}
      <div style={{ marginBottom: 16 }}>
        <ComplianceConfigPanel
          apiKey={apiKey} setApiKey={setApiKey}
          principalId={principalId} setPrincipalId={setPrincipalId}
          onSave={handleSave} saved={saved}
        />
      </div>

      {/* Sub-nav */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 16,
        borderBottom: `1px solid ${C.border}`, paddingBottom: 8,
      }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            style={{
              background: subTab === t.id ? C.accent + "18" : "transparent",
              color: subTab === t.id ? C.accent : C.muted,
              border: `1px solid ${subTab === t.id ? C.accentDim : "transparent"}`,
              borderRadius: 6, padding: "5px 12px", cursor: "pointer",
              fontSize: 11, fontFamily: "inherit", transition: "all 0.15s",
            }}>
            {t.label}
            {t.id === "viewer" && allLogs.length > 0 && (
              <span style={{ marginLeft: 6, background: C.accent + "30", color: C.accent, padding: "1px 6px", borderRadius: 10, fontSize: 9 }}>
                {allLogs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === "fetch" && (
        <LogQueryPanel
          apiKey={apiKey} principalId={principalId}
          onResults={handleResults} onError={handleError}
        />
      )}
      {subTab === "viewer" && (
        allLogs.length === 0
          ? <Card style={{ textAlign: "center", padding: 60, color: C.muted }}>No logs fetched yet. Use the Fetch Logs tab.</Card>
          : <LogViewer logs={allLogs} />
      )}
      {subTab === "siem" && <SiemIntegrationPanel logs={allLogs} />}
      {subTab === "script" && <ScriptReferencePanel />}
      {subTab === "api_ref" && <ApiReferencePanel />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  APP SHELL
// ═══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "dashboard",   label: "Dashboard",    icon: "◈" },
  { id: "news",        label: "Threat Intel", icon: "📡" },
  { id: "scanner",     label: "Scanner",      icon: "🔍" },
  { id: "compare",     label: "Compare",      icon: "⇄" },
  { id: "pocs",        label: "PoC Lab",      icon: "⚗" },
  { id: "research",    label: "Research",     icon: "🔬" },
  { id: "testing",     label: "Sec Testing",  icon: "🎯" },
  { id: "evals",       label: "Evaluation",   icon: "📊" },
  { id: "remediation", label: "Remediation",  icon: "🔧" },
  { id: "compliance",  label: "Compliance",   icon: "🛡" },
  { id: "audit",       label: "Audit Log",    icon: "📋" },
  { id: "search",      label: "Search",       icon: "⌕" },
  { id: "settings",    label: "Settings",     icon: "⚙" },
];

export default function App() {
  const [tab, setTab]       = useState("dashboard");
  const [stats, setStats]   = useState({});
  const [connected, setConnected] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/stats`);
      if (r.ok) { setStats(await r.json()); setConnected(true); }
      else setConnected(false);
    } catch { setConnected(false); }
  }, []);

  useEffect(() => { loadStats(); const t = setInterval(loadStats, 30000); return () => clearInterval(t); }, [loadStats]);

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        select option { background: ${C.panel}; }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: `1px solid ${C.border}`,
        background: C.surface, position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            fontSize: 18, fontWeight: 700, color: C.accent, letterSpacing: 2,
          }}>
            ⬡ AI-THREAT-SCANNER
          </div>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: connected ? C.ok : C.danger,
            boxShadow: `0 0 8px ${connected ? C.ok : C.danger}`,
          }} />
          <span style={{ fontSize: 10, color: C.muted }}>
            {connected ? "BACKEND CONNECTED" : "BACKEND OFFLINE · start uvicorn"}
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          {stats.total_findings ?? 0} findings · {stats.critical ?? 0} critical
        </div>
      </div>

      {/* Nav */}
      <div style={{
        display: "flex", gap: 2, padding: "8px 24px",
        borderBottom: `1px solid ${C.border}`, background: C.surface,
        overflowX: "auto",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? C.accent + "20" : "transparent",
              color: tab === t.id ? C.accent : C.muted,
              border: `1px solid ${tab === t.id ? C.accentDim : "transparent"}`,
              borderRadius: 6, padding: "6px 14px", cursor: "pointer",
              fontSize: 11, fontFamily: "inherit", letterSpacing: 0.5,
              whiteSpace: "nowrap", transition: "all 0.15s",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
        {tab === "dashboard"   && <Dashboard stats={stats} onRefresh={loadStats} />}
        {tab === "news"        && <ThreatNews />}
        {tab === "scanner"     && <SecurityScanner />}
        {tab === "compare"     && <ScanCompare />}
        {tab === "pocs"        && <PocLibrary />}
        {tab === "research"    && <Research />}
        {tab === "testing"     && <SecurityTesting />}
        {tab === "evals"       && <Evaluation />}
        {tab === "remediation" && <Remediations />}
        {tab === "compliance"  && <ComplianceLogs />}
        {tab === "audit"       && <AuditLog />}
        {tab === "search"      && <GlobalSearch />}
        {tab === "settings"    && <Settings />}
      </div>
    </div>
  );
}
