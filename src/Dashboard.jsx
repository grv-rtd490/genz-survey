import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  Cell, PieChart, Pie, Legend,
} from "recharts";

// ── Palette ────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F4F0", card: "#FFFFFF", ink: "#1A1A2E", sub: "#6B6F83",
  mil: "#E8826A", genz: "#B8E829", mid: "#8A8FA3",
  milLight: "#FAE4DC", genzLight: "#E8F7B0", border: "#E2E1DC",
};

const TAGS = ["WFH","BOUNDARIES","COMPENSATION","MEETINGS","DRESS CODE",
               "HUSTLE","SYSTEM","DATING","MARRIAGE","KIDS","DREAM JOB","PERKS"];

const Q_SHORT = [
  "Back to office?",
  "Late Slack msg?",
  "Exposure vs pay?",
  "Meeting no agenda?",
  "Professional attire?",
  "Hustle colleague?",
  "System broken?",
  "Dating apps?",
  "Marriage pressure?",
  "How many kids?",
  "Dream job?",
  "Free snacks benefit?",
];

const ARCHETYPES = [
  "MILLENNIAL CLASSIC",
  "MILLENNIAL+",
  "THE BRIDGE",
  "GEN Z+",
  "GEN Z CLASSIC",
];

const ARCHETYPE_COLORS = {
  "MILLENNIAL CLASSIC": C.mil,
  "MILLENNIAL+": "#EFA080",
  "THE BRIDGE": C.mid,
  "GEN Z+": "#A8D620",
  "GEN Z CLASSIC": C.genz,
};

// ── Parse raw records ──────────────────────────────────────────────────
function parseRecords(rawMap) {
  const records = [];
  for (const [key, val] of Object.entries(rawMap)) {
    if (!key.startsWith("response:")) continue;
    try {
      const r = JSON.parse(val);
      if (r && Array.isArray(r.answers) && r.answers.length === 12) {
        records.push(r);
      }
    } catch (_) {}
  }
  // sort by timestamp ascending
  return records.sort((a, b) => a.ts - b.ts);
}

// ── Aggregate helpers ──────────────────────────────────────────────────
function buildQuestionData(records) {
  return TAGS.map((tag, qi) => {
    const counts = { A: 0, B: 0, C: 0 };
    records.forEach(r => {
      const v = r.answers[qi];
      if (v === 0) counts.A++;
      else if (v === 1) counts.B++;
      else if (v === 2) counts.C++;
    });
    const total = records.length || 1;
    return {
      tag,
      short: Q_SHORT[qi],
      milPct: Math.round((counts.A / total) * 100),
      midPct: Math.round((counts.B / total) * 100),
      genzPct: Math.round((counts.C / total) * 100),
      milCount: counts.A,
      midCount: counts.B,
      genzCount: counts.C,
    };
  });
}

function buildArchetypeData(records) {
  const counts = {};
  ARCHETYPES.forEach(a => { counts[a] = 0; });
  records.forEach(r => { if (counts[r.archetype] !== undefined) counts[r.archetype]++; });
  return ARCHETYPES.map(a => ({ name: a, value: counts[a], color: ARCHETYPE_COLORS[a] }));
}

function buildScoreHistogram(records) {
  const buckets = Array.from({ length: 11 }, (_, i) => ({
    range: `${i * 10}-${i * 10 + 9}%`,
    count: 0,
  }));
  records.forEach(r => {
    const idx = Math.min(Math.floor(r.pctGenZ / 10), 10);
    buckets[idx].count++;
  });
  return buckets;
}

function buildRadarData(records) {
  if (!records.length) return [];
  return TAGS.map((tag, qi) => {
    const avg = records.reduce((sum, r) => sum + r.answers[qi], 0) / records.length;
    return { tag, avg: Math.round((avg / 2) * 100) }; // normalise to 0–100
  });
}

function toTSV(records) {
  if (!records.length) return "";
  const header = ["timestamp", "totalScore", "pctGenZ", "archetype",
    ...TAGS.map((t, i) => `Q${i + 1}_${t}`)].join("\t");
  const rows = records.map(r =>
    [
      new Date(r.ts).toISOString(),
      r.totalScore, r.pctGenZ, r.archetype,
      ...r.answers,
    ].join("\t")
  );
  return [header, ...rows].join("\n");
}

// ── Custom Tooltip ─────────────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "10px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: C.ink, marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill, margin: "2px 0" }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "16px 20px", flex: 1, minWidth: 100,
    }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.sub, marginBottom: 6, letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 700, color: accent || C.ink }}>{value}</div>
      {sub && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.sub, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tab, setTab] = useState("overview"); // overview | questions | raw

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listed = await window.storage.list("response:", true);
      const keys = listed?.keys || [];
      const rawMap = {};
      await Promise.all(keys.map(async key => {
        try {
          const res = await window.storage.get(key, true);
          if (res?.value) rawMap[key] = res.value;
        } catch (_) {}
      }));
      setRecords(parseRecords(rawMap));
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn("Load failed:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const qData = buildQuestionData(records);
  const archetypeData = buildArchetypeData(records);
  const histogram = buildScoreHistogram(records);
  const radarData = buildRadarData(records);
  const avgGenZ = records.length
    ? Math.round(records.reduce((s, r) => s + r.pctGenZ, 0) / records.length)
    : 0;
  const topArchetype = archetypeData.sort((a, b) => b.value - a.value)[0];

  function downloadTSV() {
    const tsv = toTSV(records);
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "survey_responses.tsv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px);} to {opacity:1; transform:translateY(0);} }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .tab-btn {
          padding: 8px 18px; border-radius: 8px; border: 1.5px solid ${C.border};
          font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.06em;
          cursor: pointer; background: ${C.card}; color: ${C.sub};
          transition: all 0.15s ease;
        }
        .tab-btn.active { background: ${C.ink}; color: ${C.bg}; border-color: ${C.ink}; }
        .tab-btn:hover:not(.active) { border-color: ${C.ink}; color: ${C.ink}; }
        .dl-btn {
          padding: 9px 20px; border-radius: 8px; border: none;
          font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500;
          letter-spacing: 0.06em; cursor: pointer;
          background: ${C.genz}; color: ${C.ink};
          transition: all 0.15s ease;
        }
        .dl-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
        .section-title {
          font-family: 'DM Mono', monospace; font-size: 11px; color: ${C.sub};
          letter-spacing: 0.08em; margin-bottom: 14px; text-transform: uppercase;
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 20px 48px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>

          {/* Header */}
          <div className="fade-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.mil }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.genz }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.sub, letterSpacing: "0.08em" }}>SURVEY DASHBOARD</span>
              </div>
              <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 700, color: C.ink }}>
                Millennial vs Gen Z — Results
              </h1>
              {lastRefresh && (
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.sub, marginTop: 4 }}>
                  Last refreshed {lastRefresh}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className="tab-btn" onClick={load} title="Refresh">↻ Refresh</button>
              <button className="dl-btn" onClick={downloadTSV} disabled={!records.length}>
                ↓ Download TSV
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {[["overview","Overview"],["questions","By Question"],["raw","Raw Data"]].map(([id, label]) => (
              <button key={id} className={`tab-btn${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.sub, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
              Loading responses…
            </div>
          )}

          {!loading && records.length === 0 && (
            <div style={{
              textAlign: "center", padding: "60px 24px",
              background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 8 }}>No responses yet</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.sub }}>Share the survey to start collecting data.</p>
            </div>
          )}

          {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
          {!loading && records.length > 0 && tab === "overview" && (
            <div className="fade-up">
              {/* Stat row */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <StatCard label="TOTAL RESPONSES" value={records.length} sub="all time" />
                <StatCard label="AVG GEN Z SCORE" value={`${avgGenZ}%`} sub="higher = more Gen Z" accent={avgGenZ > 50 ? C.genz : C.mil} />
                <StatCard label="TOP ARCHETYPE" value={topArchetype?.value || 0} sub={topArchetype?.name || "—"} accent={ARCHETYPE_COLORS[topArchetype?.name]} />
              </div>

              {/* Archetype pie + score histogram side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {/* Pie */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "20px 16px" }}>
                  <p className="section-title">Archetype Distribution</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={archetypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => percent > 0.05 ? `${Math.round(percent * 100)}%` : ""} labelLine={false}>
                        {archetypeData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Histogram */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "20px 16px" }}>
                  <p className="section-title">Gen Z Score Distribution</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={histogram} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                      <XAxis dataKey="range" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 8 }} />
                      <YAxis tick={{ fontFamily: "'DM Mono', monospace", fontSize: 9 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` }} />
                      <Bar dataKey="count" name="Responses" radius={[4, 4, 0, 0]}>
                        {histogram.map((entry, i) => (
                          <Cell key={i} fill={i < 4 ? C.mil : i > 6 ? C.genz : C.mid} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Radar */}
              <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "20px 16px" }}>
                <p className="section-title">Gen Z Lean by Topic (avg, 0 = Millennial, 100 = Gen Z)</p>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={C.border} />
                    <PolarAngleAxis dataKey="tag" tick={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fill: C.sub }} />
                    <Radar name="Avg" dataKey="avg" stroke={C.genz} fill={C.genz} fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip contentStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` }} formatter={v => [`${v}%`, "Gen Z lean"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── BY QUESTION TAB ───────────────────────────────────── */}
          {!loading && records.length > 0 && tab === "questions" && (
            <div className="fade-up">
              <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "20px 16px", marginBottom: 16 }}>
                <p className="section-title">Option breakdown per question (% of respondents)</p>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={qData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontFamily: "'DM Mono', monospace", fontSize: 9 }} />
                    <YAxis type="category" dataKey="short" width={120} tick={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fill: C.ink }} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend iconType="square" iconSize={8} wrapperStyle={{ fontFamily: "'DM Mono', monospace", fontSize: 10 }} />
                    <Bar dataKey="milPct" name="Millennial (A)" fill={C.mil} stackId="a" />
                    <Bar dataKey="midPct" name="Mixed (B)" fill={C.mid} stackId="a" />
                    <Bar dataKey="genzPct" name="Gen Z (C)" fill={C.genz} stackId="a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Per-question detail cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {qData.map((q, i) => (
                  <div key={i} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.sub, letterSpacing: "0.07em" }}>Q{i + 1} · {q.tag}</span>
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600,
                        color: q.genzPct > q.milPct ? "#6B8800" : C.mil,
                      }}>
                        {q.genzPct > q.milPct ? "↑ Gen Z" : q.milPct > q.genzPct ? "↑ Mil" : "Tied"}
                      </span>
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: C.ink, marginBottom: 10, lineHeight: 1.4 }}>{q.short}</p>
                    {[
                      { label: "A — Millennial", pct: q.milPct, count: q.milCount, color: C.mil, light: C.milLight },
                      { label: "B — Mixed", pct: q.midPct, count: q.midCount, color: C.mid, light: "#ECEDF2" },
                      { label: "C — Gen Z", pct: q.genzPct, count: q.genzCount, color: C.genz, light: C.genzLight },
                    ].map(row => (
                      <div key={row.label} style={{ marginBottom: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.sub }}>{row.label}</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: row.color, fontWeight: 600 }}>{row.pct}% ({row.count})</span>
                        </div>
                        <div style={{ height: 5, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${row.pct}%`, background: row.color, borderRadius: 99, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RAW DATA TAB ──────────────────────────────────────── */}
          {!loading && records.length > 0 && tab === "raw" && (
            <div className="fade-up">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p className="section-title" style={{ marginBottom: 0 }}>{records.length} responses · tab-delimited format</p>
                <button className="dl-btn" onClick={downloadTSV}>↓ Download TSV</button>
              </div>
              <div style={{
                background: C.ink, borderRadius: 14, overflow: "auto",
                maxHeight: 480, padding: "16px 18px",
              }}>
                <pre style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: "#E2E1DC",
                  lineHeight: 1.7, whiteSpace: "pre",
                }}>
                  {/* Header */}
                  <span style={{ color: C.genz }}>
                    {["timestamp","totalScore","pctGenZ","archetype",...TAGS.map((t,i) => `Q${i+1}_${t}`)].join("\t")}
                  </span>
                  {"\n"}
                  {records.map((r, i) => (
                    <span key={i}>
                      {[
                        new Date(r.ts).toISOString(),
                        r.totalScore, r.pctGenZ, r.archetype,
                        ...r.answers,
                      ].join("\t")}
                      {"\n"}
                    </span>
                  ))}
                </pre>
              </div>
              <p style={{ marginTop: 12, fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.sub }}>
                Answer codes: 0 = Millennial option · 1 = Mixed option · 2 = Gen Z option
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}