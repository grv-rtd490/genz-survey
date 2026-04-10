import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell, PieChart, Pie, Legend } from "recharts";

// ── CONFIG ─────────────────────────────────────────────────────────────
const SUPABASE_URL      = "https://mlawmxukpdwbvfkvrhqk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXdteHVrcGR3YnZma3ZyaHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTI4MDgsImV4cCI6MjA5MTMyODgwOH0.pJABHykJW2fbJdhS_D5bc2kjv02EwQeacuWJX0_u16A";

// ── Scheme B palette ───────────────────────────────────────────────────
const C = {
  bg:"#F7F5F0", card:"#FFFFFF", ink:"#0F172A", sub:"#475569",
  border:"#E2DDD6", mil:"#2563EB", milLight:"#DBEAFE",
  genz:"#F59E0B", genzLight:"#FEF3C7", mid:"#64748B", midLight:"#F1F5F9",
};

const TAGS = ["WFH","BOUNDARIES","COMPENSATION","MEETINGS","DRESS CODE","HUSTLE","SYSTEM","DATING","MARRIAGE","KIDS","DREAM JOB","PERKS"];
const Q_SHORT = ["Back to office?","Late Slack msg?","Exposure vs pay?","Meeting no agenda?","Professional attire?","Hustle colleague?","System broken?","Dating apps?","Marriage pressure?","How many kids?","Dream job?","Free snacks benefit?"];
const ARCHETYPES = ["MILLENNIAL CLASSIC","MILLENNIAL+","THE BRIDGE","GEN Z+","GEN Z CLASSIC"];
const ARCH_COLORS = { "MILLENNIAL CLASSIC":C.mil, "MILLENNIAL+":"#60A5FA", "THE BRIDGE":C.mid, "GEN Z+":"#FCD34D", "GEN Z CLASSIC":C.genz };

// ── Helpers ────────────────────────────────────────────────────────────
function buildQuestionData(records) {
  return TAGS.map((tag,qi)=>{
    const counts={A:0,B:0,C:0};
    records.forEach(r=>{ const v=r.answers[qi]; if(v===0)counts.A++; else if(v===1)counts.B++; else if(v===2)counts.C++; });
    const t=records.length||1;
    return { tag, short:Q_SHORT[qi],
      milPct:Math.round((counts.A/t)*100), midPct:Math.round((counts.B/t)*100), genzPct:Math.round((counts.C/t)*100),
      milCount:counts.A, midCount:counts.B, genzCount:counts.C };
  });
}
function buildArchetypeData(records) {
  const counts={}; ARCHETYPES.forEach(a=>{counts[a]=0;});
  records.forEach(r=>{ if(counts[r.archetype]!==undefined) counts[r.archetype]++; });
  return ARCHETYPES.map(a=>({name:a,value:counts[a],color:ARCH_COLORS[a]}));
}
function buildScoreHistogram(records) {
  const buckets=Array.from({length:11},(_,i)=>({range:`${i*10}\u2013${i*10+9}%`,count:0}));
  records.forEach(r=>{ const idx=Math.min(Math.floor(r.pctGenZ/10),10); buckets[idx].count++; });
  return buckets;
}
function buildRadarData(records) {
  if(!records.length) return [];
  return TAGS.map((tag,qi)=>({ tag, avg:Math.round((records.reduce((s,r)=>s+r.answers[qi],0)/records.length/2)*100) }));
}
function toTSV(records) {
  if(!records.length) return "";
  const header=["timestamp","totalScore","pctGenZ","archetype",...TAGS.map((t,i)=>`Q${i+1}_${t}`)].join("\t");
  const rows=records.map(r=>[new Date(r.ts).toISOString(),r.totalScore,r.pctGenZ,r.archetype,...r.answers].join("\t"));
  return [header,...rows].join("\n");
}
function buildEmailSummary(records, qData, archetypeData, avgGenZ) {
  const top=[...archetypeData].sort((a,b)=>b.value-a.value);
  const bar=pct=>{ const f=Math.round(pct/5); return "\u2588".repeat(f)+"\u2591".repeat(20-f)+` ${pct}%`; };
  const date=new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  let t=`MILLENNIAL VS GEN Z \u2014 OFFICE SURVEY RESULTS\n${"=".repeat(46)}\nPublished: ${date}  |  Total responses: ${records.length}\n\n`;
  t+=`HEADLINE\n${"─".repeat(20)}\nAverage Gen Z score: ${avgGenZ}%\nMost common archetype: ${top[0]?.name||"\u2014"} (${top[0]?.value||0} respondents)\n\n`;
  t+=`ARCHETYPE BREAKDOWN\n${"─".repeat(20)}\n`;
  top.forEach(a=>{ if(a.value>0){ const p=Math.round((a.value/records.length)*100); t+=`${a.name.padEnd(22)} ${bar(p)}\n`; } });
  t+=`\nGEN Z LEAN BY TOPIC (0% = fully Millennial, 100% = fully Gen Z)\n${"─".repeat(46)}\n`;
  qData.forEach((q,i)=>{ t+=`Q${String(i+1).padStart(2,"0")} ${q.tag.padEnd(16)} ${bar(q.genzPct)}\n`; });
  t+=`\nMOST POLARISING QUESTIONS\n${"─".repeat(26)}\n`;
  [...qData].sort((a,b)=>Math.abs(b.genzPct-b.milPct)-Math.abs(a.genzPct-a.milPct)).slice(0,3).forEach((q,i)=>{
    t+=`${i+1}. ${q.short}\n   Millennial: ${q.milPct}%  |  Mixed: ${q.midPct}%  |  Gen Z: ${q.genzPct}%\n\n`;
  });
  t+=`${"=".repeat(46)}\nResults are aggregate and anonymous.\n`;
  return t;
}

// ── Custom tooltip ─────────────────────────────────────────────────────
function QTooltip({ active, payload, label }) {
  if(!active||!payload?.length) return null;
  return (
    <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:10, padding:"12px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:14, boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight:700, color:C.ink, marginBottom:8 }}>{label}</p>
      {payload.map(p=>( <p key={p.name} style={{ color:p.fill, margin:"3px 0" }}>{p.name}: {p.value}%</p> ))}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"20px 24px", flex:1, minWidth:120 }}>
      <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.sub, marginBottom:8, letterSpacing:"0.07em" }}>{label}</div>
      <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:36, fontWeight:700, color:accent||C.ink, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.sub, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────
export default function Dashboard() {
  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [tab,         setTab]         = useState("overview");
  const [copied,      setCopied]      = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const res  = await fetch(`${SUPABASE_URL}/rest/v1/responses?select=*&order=ts.asc`,
        { headers:{ "apikey":SUPABASE_ANON_KEY, "Authorization":`Bearer ${SUPABASE_ANON_KEY}` } });
      const data = await res.json();
      setRecords((Array.isArray(data)?data:[]).map(r=>({ ts:r.ts, totalScore:r.total_score, pctGenZ:r.pct_genz, archetype:r.archetype, answers:r.answers })));
      setLastRefresh(new Date().toLocaleTimeString());
    } catch(e){ console.warn("Load failed:",e); }
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const qData        = buildQuestionData(records);
  const archetypeData= buildArchetypeData(records);
  const histogram    = buildScoreHistogram(records);
  const radarData    = buildRadarData(records);
  const avgGenZ      = records.length ? Math.round(records.reduce((s,r)=>s+r.pctGenZ,0)/records.length) : 0;
  const topArchetype = [...archetypeData].sort((a,b)=>b.value-a.value)[0];

  function downloadTSV() {
    const blob=new Blob([toTSV(records)],{type:"text/tab-separated-values"});
    const url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download="survey_responses.tsv"; a.click(); URL.revokeObjectURL(url);
  }
  function copyEmail() {
    navigator.clipboard.writeText(buildEmailSummary(records,qData,archetypeData,avgGenZ))
      .then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2500); });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        html { font-size:17px; }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${C.bg}; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        .fu { animation:fadeUp 0.4s ease both; }

        .tab {
          padding:10px 22px; border-radius:10px; border:1.5px solid ${C.border};
          font-family:'DM Mono',monospace; font-size:13px; letter-spacing:0.05em;
          cursor:pointer; background:${C.card}; color:${C.sub}; transition:all 0.15s;
        }
        .tab.on  { background:${C.ink}; color:#fff; border-color:${C.ink}; }
        .tab:hover:not(.on) { border-color:${C.ink}; color:${C.ink}; }

        .action-btn {
          padding:11px 22px; border-radius:10px; border:1.5px solid transparent;
          font-family:'DM Mono',monospace; font-size:13px; font-weight:500; letter-spacing:0.05em;
          cursor:pointer; transition:all 0.15s;
        }
        .action-btn:disabled { opacity:0.35; cursor:not-allowed; }
        .action-btn:not(:disabled):hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(0,0,0,0.12); }

        .sec { font-family:'DM Mono',monospace; font-size:12px; color:${C.sub}; letter-spacing:0.08em; margin-bottom:16px; text-transform:uppercase; }
        .chart-card { background:${C.card}; border-radius:16px; border:1.5px solid ${C.border}; padding:24px 20px; }
      `}</style>

      <div style={{ minHeight:"100vh", background:C.bg, padding:"32px 24px 56px" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>

          {/* Header */}
          <div className="fu" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:C.mil }}/>
                <div style={{ width:12, height:12, borderRadius:"50%", background:C.genz }}/>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.sub, letterSpacing:"0.08em" }}>SURVEY DASHBOARD</span>
              </div>
              <h1 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1.8rem", fontWeight:700, color:C.ink }}>Millennial vs Gen Z — Results</h1>
              {lastRefresh && <p style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:C.sub, marginTop:6 }}>Last refreshed {lastRefresh}</p>}
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <button className="tab" onClick={load}>{"\u21bb"} Refresh</button>
              <button className="action-btn" onClick={copyEmail} disabled={!records.length}
                style={{ background:copied?"#D1FAE5":C.milLight, color:copied?"#065F46":C.mil, borderColor:copied?"#6EE7B7":C.mil }}>
                {copied?"✓ Copied!":"\u2709 Copy for email"}
              </button>
              <button className="action-btn" onClick={downloadTSV} disabled={!records.length}
                style={{ background:C.genzLight, color:"#92400E", borderColor:C.genz }}>
                {"\u2193"} Download TSV
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", gap:10, marginBottom:28 }}>
            {[["overview","Overview"],["questions","By Question"],["raw","Raw Data"]].map(([id,label])=>(
              <button key={id} className={`tab${tab===id?" on":""}`} onClick={()=>setTab(id)}>{label}</button>
            ))}
          </div>

          {loading && (
            <div style={{ textAlign:"center", padding:"72px 0", color:C.sub, fontFamily:"'DM Mono',monospace", fontSize:16 }}>
              Loading responses…
            </div>
          )}

          {!loading && records.length===0 && (
            <div style={{ textAlign:"center", padding:"72px 24px", background:C.card, borderRadius:18, border:`1.5px solid ${C.border}` }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📭</div>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1.2rem", fontWeight:600, color:C.ink, marginBottom:10 }}>No responses yet</p>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:14, color:C.sub }}>Share the survey to start collecting data.</p>
            </div>
          )}

          {/* ── OVERVIEW ──────────────────────────────────────────── */}
          {!loading && records.length>0 && tab==="overview" && (
            <div className="fu">
              <div style={{ display:"flex", gap:14, marginBottom:22, flexWrap:"wrap" }}>
                <StatCard label="TOTAL RESPONSES" value={records.length} sub="all time"/>
                <StatCard label="AVG GEN Z SCORE"  value={`${avgGenZ}%`} sub="higher = more Gen Z" accent={avgGenZ>50?C.genz:C.mil}/>
                <StatCard label="TOP ARCHETYPE"    value={topArchetype?.value||0} sub={topArchetype?.name||"—"} accent={ARCH_COLORS[topArchetype?.name]}/>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:22 }}>
                <div className="chart-card">
                  <p className="sec">Archetype distribution</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={archetypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88}
                        label={({percent})=>percent>0.05?`${Math.round(percent*100)}%`:""} labelLine={false}>
                        {archetypeData.map((e,i)=>(<Cell key={i} fill={e.color}/>))}
                      </Pie>
                      <Tooltip contentStyle={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, borderRadius:10, border:`1.5px solid ${C.border}` }}/>
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <p className="sec">Gen Z score distribution</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={histogram} margin={{ top:4, right:4, bottom:4, left:-16 }}>
                      <XAxis dataKey="range" tick={{ fontFamily:"'DM Mono',monospace", fontSize:11 }}/>
                      <YAxis tick={{ fontFamily:"'DM Mono',monospace", fontSize:12 }} allowDecimals={false}/>
                      <Tooltip contentStyle={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, borderRadius:10, border:`1.5px solid ${C.border}` }}/>
                      <Bar dataKey="count" name="Responses" radius={[5,5,0,0]}>
                        {histogram.map((e,i)=>(<Cell key={i} fill={i<4?C.mil:i>6?C.genz:C.mid}/>))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card">
                <p className="sec">Gen Z lean by topic (avg — 0 = Millennial, 100 = Gen Z)</p>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={C.border}/>
                    <PolarAngleAxis dataKey="tag" tick={{ fontFamily:"'DM Mono',monospace", fontSize:12, fill:C.sub }}/>
                    <Radar name="Avg" dataKey="avg" stroke={C.mil} fill={C.mil} fillOpacity={0.2} strokeWidth={2.5}/>
                    <Tooltip contentStyle={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, borderRadius:10, border:`1.5px solid ${C.border}` }} formatter={v=>[`${v}%`,"Gen Z lean"]}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── BY QUESTION ───────────────────────────────────────── */}
          {!loading && records.length>0 && tab==="questions" && (
            <div className="fu">
              <div className="chart-card" style={{ marginBottom:20 }}>
                <p className="sec">Option breakdown per question (% of respondents)</p>
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={qData} layout="vertical" margin={{ top:0, right:24, bottom:0, left:8 }}>
                    <XAxis type="number" domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}/>
                    <YAxis type="category" dataKey="short" width={136} tick={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fill:C.ink }}/>
                    <Tooltip content={<QTooltip/>}/>
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontFamily:"'DM Mono',monospace", fontSize:12 }}/>
                    <Bar dataKey="milPct"  name="Millennial (A)" fill={C.mil}  stackId="a"/>
                    <Bar dataKey="midPct"  name="Mixed (B)"      fill={C.mid}  stackId="a"/>
                    <Bar dataKey="genzPct" name="Gen Z (C)"      fill={C.genz} stackId="a" radius={[0,5,5,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:14 }}>
                {qData.map((q,i)=>(
                  <div key={i} style={{ background:C.card, borderRadius:14, border:`1.5px solid ${C.border}`, padding:"16px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.sub, letterSpacing:"0.06em" }}>Q{i+1} · {q.tag}</span>
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:600, color:q.genzPct>q.milPct?C.genz:C.mil }}>
                        {q.genzPct>q.milPct?"\u2191 Gen Z":q.milPct>q.genzPct?"\u2191 Mil":"Tied"}
                      </span>
                    </div>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:C.ink, marginBottom:14, lineHeight:1.45 }}>{q.short}</p>
                    {[{label:"A \u2014 Millennial",pct:q.milPct,count:q.milCount,color:C.mil,light:C.milLight},
                      {label:"B \u2014 Mixed",     pct:q.midPct,count:q.midCount,color:C.mid,light:C.midLight},
                      {label:"C \u2014 Gen Z",     pct:q.genzPct,count:q.genzCount,color:C.genz,light:C.genzLight}].map(row=>(
                      <div key={row.label} style={{ marginBottom:8 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:C.sub }}>{row.label}</span>
                          <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:row.color, fontWeight:600 }}>{row.pct}% ({row.count})</span>
                        </div>
                        <div style={{ height:6, background:C.border, borderRadius:99, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${row.pct}%`, background:row.color, borderRadius:99, transition:"width 0.6s ease" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RAW DATA ──────────────────────────────────────────── */}
          {!loading && records.length>0 && tab==="raw" && (
            <div className="fu">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <p className="sec" style={{ marginBottom:0 }}>{records.length} responses · tab-delimited</p>
                <button className="action-btn" onClick={downloadTSV}
                  style={{ background:C.genzLight, color:"#92400E", borderColor:C.genz }}>
                  {"\u2193"} Download TSV
                </button>
              </div>
              <div style={{ background:C.ink, borderRadius:16, overflow:"auto", maxHeight:500, padding:"20px 22px" }}>
                <pre style={{ fontFamily:"'DM Mono',monospace", fontSize:13, color:"#CBD5E1", lineHeight:1.8, whiteSpace:"pre" }}>
                  <span style={{ color:C.genz }}>
                    {["timestamp","totalScore","pctGenZ","archetype",...TAGS.map((t,i)=>`Q${i+1}_${t}`)].join("\t")}
                  </span>{"\n"}
                  {records.map((r,i)=>(
                    <span key={i}>{[new Date(r.ts).toISOString(),r.totalScore,r.pctGenZ,r.archetype,...r.answers].join("\t")}{"\n"}</span>
                  ))}
                </pre>
              </div>
              <p style={{ marginTop:14, fontFamily:"'DM Mono',monospace", fontSize:12, color:C.sub }}>
                Answer codes: 0 = Millennial option · 1 = Mixed option · 2 = Gen Z option
              </p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}