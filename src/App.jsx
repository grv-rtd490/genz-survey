import { useState, useEffect } from "react";

// ── CONFIG ─────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mlawmxukpdwbvfkvrhqk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXdteHVrcGR3YnZma3ZyaHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTI4MDgsImV4cCI6MjA5MTMyODgwOH0.pJABHykJW2fbJdhS_D5bc2kjv02EwQeacuWJX0_u16A";
const COOKIE_NAME = "genz_survey_done";
const COOKIE_DAYS = 365;

// ── Scheme B: Deep Blue + Amber on Warm White ──────────────────────────
const C = {
  bg:        "#F7F5F0",   // warm white page
  card:      "#FFFFFF",   // card surface
  ink:       "#0F172A",   // near-black text
  sub:       "#475569",   // secondary text
  border:    "#E2DDD6",   // subtle border
  // Millennial accent — deep blue
  mil:       "#2563EB",
  milLight:  "#DBEAFE",
  // Gen Z accent — amber
  genz:      "#F59E0B",
  genzLight: "#FEF3C7",
  // middle
  mid:       "#64748B",
  midLight:  "#F1F5F9",
};

// ── Cookie helpers ─────────────────────────────────────────────────────
function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}
function getCookie(name) {
  return document.cookie.split("; ").reduce((acc, part) => {
    const [k, v] = part.split("=");
    return k === name ? v : acc;
  }, null);
}

// ── Questions ──────────────────────────────────────────────────────────
const QUESTIONS = [
  { id:1, tag:"WFH",        q:'Your company announces "Back to office, 5 days a week." You feel\u2026',
    options:[{text:"Okay. Not ideal, but work means work.",score:0},{text:"Depends on commute, flexibility, and coffee quality.",score:1},{text:"This could\u2019ve been an email. From home.",score:2}]},
  { id:2, tag:"BOUNDARIES",  q:"You get a Slack message from your manager late at night. You\u2026",
    options:[{text:"Reply. Responsiveness matters.",score:0},{text:"Read it\u2026 respond tomorrow.",score:1},{text:"Silently judge. Boundaries exist.",score:2}]},
  { id:3, tag:"COMPENSATION",q:'You\'re offered "great exposure" instead of higher pay. You think\u2026',
    options:[{text:"Stability beats hype.",score:0},{text:"Exposure is fine \u2014 if it leads somewhere.",score:1},{text:"Exposure doesn\u2019t pay rent.",score:2}]},
  { id:4, tag:"MEETINGS",    q:"You\u2019re invited to a 1-hour meeting with zero agenda. Your inner reaction:",
    options:[{text:"Let\u2019s see where this goes.",score:0},{text:"Why am I here?",score:1},{text:"I\u2019m mentally redesigning the company structure.",score:2}]},
  { id:5, tag:"DRESS CODE",  q:'HR sends an email about "professional attire." You\u2026',
    options:[{text:"Nod and adjust wardrobe.",score:0},{text:"Follow it, mostly.",score:1},{text:'Define \u201cprofessional\u201d. Emotionally.',score:2}]},
  { id:6, tag:"HUSTLE",      q:"Your colleague has 2 startups, a podcast, and a smoothie brand. You feel\u2026",
    options:[{text:"Focus on one thing properly.",score:0},{text:"Impressive but exhausting.",score:1},{text:"This is the correct way to live.",score:2}]},
  { id:7, tag:"SYSTEM",      q:'You see a viral post: \u201cThe system is broken \u2014 hard work alone doesn\u2019t guarantee success.\u201d You think\u2026',
    options:[{text:"Discipline and consistency still get you ahead.",score:0},{text:"There\u2019s truth in it, but effort still matters.",score:1},{text:"Exactly. The rules themselves need fixing.",score:2}]},
  { id:8, tag:"DATING",      q:"You\u2019ve been swiping on dating apps for weeks with no luck. Your reaction:",
    options:[{text:"Maybe dating apps aren\u2019t for me.",score:0},{text:"It ebbs and flows.",score:1},{text:"Delete. Reinstall in 3 months.",score:2}]},
  { id:9, tag:"MARRIAGE",    q:'Family starts asking about marriage \u201ccasually but aggressively.\u201d You\u2026',
    options:[{text:"Start thinking about timelines.",score:0},{text:"Deflect with humor.",score:1},{text:"Ask why happiness has a deadline.",score:2}]},
  { id:10,tag:"KIDS",        q:'Someone asks, \u201cSo how many kids do you want?\u201d You reply\u2026',
    options:[{text:"That\u2019s part of the plan.",score:0},{text:"Still figuring life out.",score:1},{text:"Have you seen the economy?",score:2}]},
  { id:11,tag:"DREAM JOB",   q:"Your dream job looks like\u2026",
    options:[{text:"Stable role, steady growth, long-term security.",score:0},{text:"Meaningful work with balance.",score:1},{text:"Purpose, flexibility, and the option to quit if it stops serving me.",score:2}]},
  { id:12,tag:"PERKS",       q:'Free snacks are announced as a \u201cmajor benefit.\u201d You think\u2026',
    options:[{text:"Nice perk!",score:0},{text:"Cool, but\u2026",score:1},{text:"This is not compensation.",score:2}]},
];

const LOADING_QUIPS = [
  "Consulting the algorithm\u2026","Fact-checking your vibe\u2026",
  "Running diagnostics on your work-life balance\u2026",
  "Calculating your boundary strength\u2026","Validating your hustle credentials\u2026",
];
const FOOTER_QUIPS = [
  "your commute just called. it\u2019s not happy.","boundaries loading\u2026","rent \u2260 exposure.",
  "time is a flat circle. this meeting is flatter.","business casual is a scam.",
  "side-hustle culture has entered the chat.","the system: exposed.",
  "the algorithm is judging you too.","aunties have entered the chat.",
  "have you seen this economy tho.","purpose \u2014 check. flexibility \u2014 check. exit plan \u2014 check.",
  "trail mix is not equity.",
];

// ── Result archetypes ──────────────────────────────────────────────────
function getResult(totalScore) {
  const max = QUESTIONS.length * 2;
  const pct = Math.round((totalScore / max) * 100);
  if (pct <= 20) return { pct, label:"The Corporate Loyalist",  gen:"Pure Millennial",      color:C.mil,  lightColor:C.milLight,  archetype:"MILLENNIAL CLASSIC",
    desc:"You survived dial-up internet and you\u2019ll survive hot-desking too. Reliability is your superpower, even if it occasionally costs you your evenings.",
    traits:["Replies to emails before 8 AM","Has a 5-year plan (and a backup)","Genuinely likes their manager"]};
  if (pct <= 40) return { pct, label:"The Pragmatic Adapter",   gen:"Millennial-leaning",   color:C.mil,  lightColor:C.milLight,  archetype:"MILLENNIAL+",
    desc:"You know the rules well enough to bend them strategically. You\u2019ll go back to office \u2014 but only if there\u2019s good coffee and parking.",
    traits:["Has strong opinions about work-life balance","Reads hustle content but sleeps 8 hours","Owns exactly one plant"]};
  if (pct <= 60) return { pct, label:"The Enlightened Middle",  gen:"Generationally Fluid", color:C.mid,  lightColor:C.midLight,  archetype:"THE BRIDGE",
    desc:"Neither fully plugged in nor fully checked out. You understand both sides of the generational debate, which means you\u2019re exhausted at every team lunch.",
    traits:["Agrees with the rant but still files TPS reports","Uses \u2018work-life harmony\u2019 not \u2018balance\u2019","Mutes the Slack channel but doesn\u2019t leave it"]};
  if (pct <= 80) return { pct, label:"The Quiet Disruptor",     gen:"Gen Z-leaning",        color:C.genz, lightColor:C.genzLight, archetype:"GEN Z+",
    desc:"You\u2019re polite in meetings but mentally you\u2019re already restructuring the org chart. Boundaries are not a personality trait \u2014 they\u2019re a constitutional right.",
    traits:["Has opinions about the system (backed by data)","Keeps the camera off, still delivers","Doesn\u2019t eat the free snacks. On principle."]};
  return       { pct, label:"The Boundary Prophet",    gen:"Full Gen Z",           color:C.genz, lightColor:C.genzLight, archetype:"GEN Z CLASSIC",
    desc:"Boundary-setting, system-questioning, and mildly allergic to meetings. You believe in purpose-driven work, and by \u2018purpose\u2019 you mean not destroying your mental health.",
    traits:["Will quit if the vibes are off","Has already read the employment contract","The economy is a personality trait"]};
}

// ── SVG Illustrations (colour-adapted) ────────────────────────────────
function Illustration({ qId, accent, lightBg }) {
  const a = accent;
  const svgs = {
    1:(<svg viewBox="0 0 200 160" fill="none">
      <rect x="60" y="35" width="80" height="95" fill={a} opacity="0.12" rx="2"/>
      <rect x="60" y="35" width="80" height="95" stroke={a} strokeWidth="2" rx="2"/>
      {[52,67,82,97,112].map(y=>[73,98,123].map(x=>(
        <rect key={`${x}${y}`} x={x} y={y} width="13" height="11" fill={a} opacity="0.35" rx="1"/>
      )))}
      <rect x="88" y="103" width="24" height="27" fill={C.ink} rx="1"/>
      <polygon points="162,78 182,78 172,62" fill={a} opacity="0.55"/>
      <rect x="162" y="78" width="20" height="22" fill={a} opacity="0.3" rx="1"/>
      <rect x="169" y="86" width="6" height="14" fill={C.ink}/>
      <text x="100" y="150" textAnchor="middle" fill={C.sub} fontSize="10" fontFamily="sans-serif">{"\u2192 home"}</text>
    </svg>),
    2:(<svg viewBox="0 0 200 160" fill="none">
      <rect x="74" y="18" width="52" height="94" rx="9" fill={C.ink}/>
      <rect x="78" y="24" width="44" height="76" rx="6" fill="#1E293B"/>
      <rect x="83" y="43" width="34" height="22" rx="5" fill={a} opacity="0.9"/>
      <text x="100" y="58" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="sans-serif" fontWeight="bold">@ you</text>
      <text x="100" y="77" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">11:47 PM</text>
      <text x="142" y="68" fill={a} fontSize="16" fontFamily="sans-serif" opacity="0.7">z</text>
      <text x="152" y="55" fill={a} fontSize="11" fontFamily="sans-serif" opacity="0.5">z</text>
      <text x="160" y="44" fill={a} fontSize="8"  fontFamily="sans-serif" opacity="0.3">z</text>
    </svg>),
    3:(<svg viewBox="0 0 200 160" fill="none">
      <rect x="28" y="58" width="62" height="42" rx="5" fill={C.ink}/>
      <rect x="28" y="58" width="62" height="42" stroke={a} strokeWidth="1.5" rx="5"/>
      <text x="59" y="83" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="sans-serif">{"\u20b9 0.00"}</text>
      <text x="100" y="87" textAnchor="middle" fill={C.border} fontSize="20" fontFamily="sans-serif">{"\u2260"}</text>
      <polygon points="138,28 160,28 176,112 122,112" fill={a} opacity="0.12"/>
      <polygon points="138,28 160,28 176,112 122,112" stroke={a} strokeWidth="1.5" opacity="0.5"/>
      <circle cx="149" cy="20" r="9" fill={a} opacity="0.85"/>
      <text x="149" y="132" textAnchor="middle" fill={a} fontSize="8" fontFamily="sans-serif" fontWeight="600">EXPOSURE</text>
    </svg>),
    4:(<svg viewBox="0 0 200 160" fill="none">
      <circle cx="100" cy="76" r="46" fill={a} opacity="0.08" stroke={a} strokeWidth="2"/>
      <circle cx="100" cy="76" r="4"  fill={a}/>
      <text x="100" y="81" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">no agenda</text>
      {[0,60,120,180,240,300].map((deg,i)=>{
        const r=deg*Math.PI/180, x=100+56*Math.cos(r), y=76+56*Math.sin(r);
        return <circle key={i} cx={x} cy={y} r="5" fill={C.ink} opacity="0.25"/>;
      })}
      <text x="100" y="148" textAnchor="middle" fill={C.sub} fontSize="9" fontFamily="sans-serif">1 hour. no reason.</text>
    </svg>),
    5:(<svg viewBox="0 0 200 160" fill="none">
      <path d="M52 102 L63 52 L84 68 L78 102Z" fill={C.ink}/>
      <path d="M84 102 L84 68 L73 52 L96 52 L96 68 L84 102Z" fill="#1E293B"/>
      <path d="M116 102 L116 68 L104 52 L127 52 L127 68 L116 102Z" fill={a} opacity="0.65"/>
      <path d="M116 102 L127 52 L138 68 L148 102Z" fill={a} opacity="0.45"/>
      <line x1="111" y1="67" x2="108" y2="86" stroke={C.ink} strokeWidth="2"/>
      <line x1="121" y1="67" x2="124" y2="86" stroke={C.ink} strokeWidth="2"/>
      <text x="68"  y="122" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">FORMAL</text>
      <text x="132" y="122" textAnchor="middle" fill={a}    fontSize="8" fontFamily="sans-serif">EMOTIONALLY</text>
    </svg>),
    6:(<svg viewBox="0 0 200 160" fill="none">
      <circle cx="78"  cy="68" r="36" fill={a}    opacity="0.15" stroke={a}    strokeWidth="1.5"/>
      <circle cx="122" cy="68" r="36" fill={C.mil} opacity="0.15" stroke={C.mil} strokeWidth="1.5"/>
      <circle cx="100" cy="100" r="36" fill={C.ink} opacity="0.07" stroke={C.ink} strokeWidth="1" strokeDasharray="3 2"/>
      <text x="66"  y="54" textAnchor="middle" fill={C.sub} fontSize="7" fontFamily="sans-serif">startup</text>
      <text x="134" y="54" textAnchor="middle" fill={C.sub} fontSize="7" fontFamily="sans-serif">podcast</text>
      <text x="100" y="122" textAnchor="middle" fill={C.sub} fontSize="7" fontFamily="sans-serif">smoothie</text>
      <text x="100" y="85" textAnchor="middle" fill={C.ink} fontSize="8" fontFamily="sans-serif" fontWeight="bold">still answering</text>
      <text x="100" y="95" textAnchor="middle" fill={C.ink} fontSize="8" fontFamily="sans-serif" fontWeight="bold">emails</text>
    </svg>),
    7:(<svg viewBox="0 0 200 160" fill="none">
      <line x1="82" y1="142" x2="72" y2="18"  stroke={C.ink} strokeWidth="3"/>
      <line x1="118" y1="142" x2="128" y2="18" stroke={C.ink} strokeWidth="3"/>
      {[132,110,88,66,44].map((y,i)=>(
        <line key={i} x1={82-i*2} y1={y} x2={118+i*2} y2={y} stroke={C.ink} strokeWidth="2.5" opacity={i===2?"0.15":"1"}/>
      ))}
      <text x="100" y="91" textAnchor="middle" fill={a} fontSize="11" fontFamily="sans-serif" fontWeight="bold">{"\u2715"}</text>
      <text x="100" y="156" textAnchor="middle" fill={C.sub} fontSize="9" fontFamily="sans-serif">the system</text>
    </svg>),
    8:(<svg viewBox="0 0 200 160" fill="none">
      <rect x="74" y="16" width="52" height="98" rx="9" fill={C.ink}/>
      <rect x="78" y="22" width="44" height="82" rx="6" fill="#1E293B"/>
      <rect x="84" y="32" width="32" height="44" rx="4" fill={a} opacity="0.75"/>
      <text x="100" y="60" textAnchor="middle" fill={C.ink} fontSize="24" fontFamily="sans-serif" fontWeight="bold">{"\u2715"}</text>
      <text x="54"  y="74" fill={C.mil}  fontSize="18" fontFamily="sans-serif" opacity="0.55">{"\u2190"}</text>
      <text x="138" y="74" fill={C.genz} fontSize="18" fontFamily="sans-serif" opacity="0.55">{"\u2192"}</text>
      <text x="100" y="132" textAnchor="middle" fill={C.sub} fontSize="9" fontFamily="sans-serif">reinstall in 3 months</text>
    </svg>),
    9:(<svg viewBox="0 0 200 160" fill="none">
      <path d="M80 18 L120 18 L100 76 L120 132 L80 132 L100 76 Z" fill={a} opacity="0.1" stroke={a} strokeWidth="1.5"/>
      <path d="M80 18 L120 18 L100 76Z" fill={a} opacity="0.28"/>
      <line x1="78" y1="18"  x2="122" y2="18"  stroke={a} strokeWidth="2.5"/>
      <line x1="78" y1="132" x2="122" y2="132" stroke={a} strokeWidth="2.5"/>
      <text x="150" y="58" fill={C.sub} fontSize="20" fontFamily="sans-serif" opacity="0.45">?</text>
      <text x="38"  y="78" fill={C.sub} fontSize="15" fontFamily="sans-serif" opacity="0.3">?</text>
      <text x="100" y="152" textAnchor="middle" fill={C.sub} fontSize="9" fontFamily="sans-serif">why does love have a deadline?</text>
    </svg>),
    10:(<svg viewBox="0 0 200 160" fill="none">
      <circle cx="68" cy="64" r="20" fill={a} opacity="0.18" stroke={a} strokeWidth="1.5"/>
      <circle cx="68" cy="56" r="9"  fill={a} opacity="0.4"/>
      <path d="M53 74 Q68 90 83 74" stroke={a} strokeWidth="2" fill="none"/>
      <text x="100" y="72" textAnchor="middle" fill={C.sub} fontSize="11" fontFamily="sans-serif">vs</text>
      <polyline points="118,43 136,54 150,48 164,70 177,92 182,112" stroke={C.mil} strokeWidth="2.5" fill="none"/>
      <circle cx="182" cy="112" r="4" fill={C.mil}/>
      <text x="150" y="132" textAnchor="middle" fill={C.mil} fontSize="8" fontFamily="sans-serif">{"\u2193 the economy"}</text>
    </svg>),
    11:(<svg viewBox="0 0 200 160" fill="none">
      <line x1="100" y1="142" x2="100" y2="96" stroke={C.ink} strokeWidth="2.5"/>
      <path d="M100 96 Q68 70 46 38" stroke={C.ink}  strokeWidth="2" strokeDasharray="4 2"/>
      <path d="M100 96 L100 28"       stroke={a}      strokeWidth="2.5"/>
      <path d="M100 96 Q132 70 156 38" stroke={C.mil}  strokeWidth="2" strokeDasharray="4 2"/>
      <text x="36"  y="34" fill={C.sub} fontSize="8" fontFamily="sans-serif">stable</text>
      <text x="86"  y="24" fill={a}     fontSize="8" fontFamily="sans-serif">balanced</text>
      <text x="150" y="34" fill={C.mil} fontSize="8" fontFamily="sans-serif">quit</text>
      <circle cx="100" cy="96" r="6" fill={C.ink}/>
    </svg>),
    12:(<svg viewBox="0 0 200 160" fill="none">
      <line x1="58" y1="68" x2="142" y2="80" stroke={C.ink} strokeWidth="2.5"/>
      <line x1="100" y1="36" x2="100" y2="74" stroke={C.ink} strokeWidth="2.5"/>
      <circle cx="100" cy="34" r="5" fill={C.ink}/>
      <line x1="68"  y1="74" x2="68"  y2="92"  stroke={C.ink} strokeWidth="2"/>
      <ellipse cx="68"  cy="94"  rx="20" ry="6" fill={a}    opacity="0.25" stroke={a}    strokeWidth="1.5"/>
      <text x="68"  y="93"  textAnchor="middle" fontSize="15">🍪</text>
      <line x1="132" y1="80" x2="132" y2="110" stroke={C.ink} strokeWidth="2"/>
      <ellipse cx="132" cy="112" rx="20" ry="6" fill={C.mil} opacity="0.35" stroke={C.mil} strokeWidth="1.5"/>
      <text x="132" y="109" textAnchor="middle" fill={C.ink} fontSize="9" fontFamily="sans-serif" fontWeight="bold">{"\u20b9\u20b9\u20b9"}</text>
      <text x="100" y="147" textAnchor="middle" fill={C.sub} fontSize="9" fontFamily="sans-serif">this is not compensation</text>
    </svg>),
  };
  return svgs[qId] || null;
}

function ResultIllustration({ archetype, color }) {
  if (archetype==="MILLENNIAL CLASSIC"||archetype==="MILLENNIAL+") return (
    <svg viewBox="0 0 200 160" fill="none">
      <rect x="48" y="28" width="104" height="84" rx="5" fill={color} opacity="0.12" stroke={color} strokeWidth="2"/>
      {[0,1,2,3,4].map(i=>(
        <rect key={i} x={68+i*14} y={82-i*8} width="11" height={i*8+6} fill={color} opacity={0.25+i*0.15} rx="2"/>
      ))}
      <text x="100" y="132" textAnchor="middle" fill={color} fontSize="10" fontFamily="sans-serif" fontWeight="bold">STEADY ASCENT</text>
    </svg>
  );
  if (archetype==="THE BRIDGE") return (
    <svg viewBox="0 0 200 160" fill="none">
      <path d="M28 112 Q100 38 172 112" stroke={color} strokeWidth="3.5" fill="none"/>
      <line x1="28" y1="112" x2="172" y2="112" stroke={C.ink} strokeWidth="1.5" opacity="0.2"/>
      {[52,82,112,142].map(x=>(
        <line key={x} x1={x} y1={112} x2={x} y2={112-(x===82||x===112?48:32)} stroke={color} strokeWidth="2" opacity="0.55"/>
      ))}
      <text x="100" y="148" textAnchor="middle" fill={color} fontSize="10" fontFamily="sans-serif" fontWeight="bold">BRIDGING THE GAP</text>
    </svg>
  );
  return (
    <svg viewBox="0 0 200 160" fill="none">
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const r=deg*Math.PI/180;
        return <line key={i} x1={100} y1={80} x2={100+58*Math.cos(r)} y2={80+58*Math.sin(r)} stroke={color} strokeWidth="1.5" opacity="0.45" strokeDasharray={i%2===0?"5 3":"none"}/>;
      })}
      <circle cx="100" cy="80" r="24" fill={color} opacity="0.18" stroke={color} strokeWidth="2.5"/>
      <text x="100" y="84" textAnchor="middle" fill={color} fontSize="9" fontFamily="sans-serif" fontWeight="bold">BOUNDARY</text>
      <text x="100" y="148" textAnchor="middle" fill={color} fontSize="10" fontFamily="sans-serif" fontWeight="bold">SET. PROTECTED. UNBOTHERED.</text>
    </svg>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  return (
    <div style={{ width:"100%", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:15, color:C.sub, fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em" }}>Q{current} of {total}</span>
        <span style={{ fontSize:15, color:C.sub, fontFamily:"'DM Mono',monospace" }}>{Math.round((current/total)*100)}%</span>
      </div>
      <div style={{ height:5, background:C.border, borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${(current/total)*100}%`, background:`linear-gradient(90deg,${C.mil},${C.genz})`, borderRadius:99, transition:"width 0.4s cubic-bezier(0.4,0,0.2,1)" }}/>
      </div>
    </div>
  );
}

function LoadingScreen({ quip }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:C.bg, gap:24 }}>
      <div style={{ width:56, height:56, border:`3px solid ${C.border}`, borderTop:`3px solid ${C.mil}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <p style={{ color:C.sub, fontFamily:"'DM Mono',monospace", fontSize:16, textAlign:"center", maxWidth:300 }}>{quip}</p>
    </div>
  );
}

function AlreadyTaken() {
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"28px 24px" }}>
      <div style={{ maxWidth:480, width:"100%", textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:"50%", background:C.milLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", fontSize:36 }}>✌️</div>
        <h1 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"2rem", fontWeight:700, color:C.ink, marginBottom:16, lineHeight:1.2 }}>
          You've already weighed in.
        </h1>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1.1rem", color:C.sub, lineHeight:1.7 }}>
          Your response has been recorded.<br/>Results will be shared with the team soon.
        </p>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────
export default function App() {
  const [phase,    setPhase]    = useState("checking");
  const [current,  setCurrent]  = useState(0);
  const [answers,  setAnswers]  = useState([]);
  const [selected, setSelected] = useState(null);
  const [quip,     setQuip]     = useState(LOADING_QUIPS[0]);
  const [visible,  setVisible]  = useState(true);

  useEffect(() => { setPhase(getCookie(COOKIE_NAME) ? "already" : "intro"); }, []);

  const totalScore = answers.reduce((a,b)=>a+b,0);
  const result     = getResult(totalScore);
  const accent     = current < 6 ? C.mil : C.genz;
  const accentLight= current < 6 ? C.milLight : C.genzLight;

  async function saveResponse(finalAnswers) {
    try {
      const ts    = Date.now();
      const score = finalAnswers.reduce((a,b)=>a+b,0);
      const pct   = Math.round((score/(QUESTIONS.length*2))*100);
      const res   = getResult(score);
      await fetch(`${SUPABASE_URL}/rest/v1/responses`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", "apikey":SUPABASE_ANON_KEY, "Authorization":`Bearer ${SUPABASE_ANON_KEY}`, "Prefer":"return=minimal" },
        body:JSON.stringify({ ts, total_score:score, pct_genz:pct, archetype:res.archetype, answers:finalAnswers }),
      });
      setCookie(COOKIE_NAME, "1", COOKIE_DAYS);
    } catch(e) { console.warn("Save failed:",e); }
  }

  const q = QUESTIONS[current];

  if (phase==="checking") return null;
  if (phase==="already")  return <AlreadyTaken/>;
  if (phase==="loading")  return <LoadingScreen quip={quip}/>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        html { font-size: 18px; }
        * { box-sizing:border-box; margin:0; padding:0; }
        body { background:${C.bg}; }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation:fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) both; }

        .opt {
          width:100%; padding:18px 22px;
          background:#fff; border:2px solid ${C.border};
          border-radius:14px; cursor:pointer;
          font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:400;
          color:${C.ink}; text-align:left; line-height:1.5;
          transition:all 0.17s ease; outline:none;
          display:flex; align-items:center; gap:16px;
        }
        .opt:hover { border-color:var(--acc); background:var(--acc-light); }
        .opt.sel   { border-color:var(--acc); background:var(--acc-light); }
        .opt-idx {
          min-width:30px; height:30px; border-radius:8px;
          display:flex; align-items:center; justify-content:center;
          font-family:'DM Mono',monospace; font-size:0.75rem; font-weight:500;
          background:${C.border}; color:${C.sub}; transition:all 0.17s; flex-shrink:0;
        }
        .opt.sel .opt-idx { background:var(--acc); color:#fff; }

        .pill {
          display:inline-block; padding:5px 14px; border-radius:99px;
          font-family:'DM Mono',monospace; font-size:0.65rem; font-weight:500; letter-spacing:0.08em;
        }
        .btn {
          padding:18px 44px; border-radius:14px; border:none;
          font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:700;
          cursor:pointer; letter-spacing:0.03em; transition:all 0.17s ease;
        }
        .btn:disabled { opacity:0.3; cursor:not-allowed; }
        .btn:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.13); }
        .trait {
          padding:14px 18px; background:var(--acc-light);
          border-radius:12px; font-size:0.95rem; color:${C.ink};
          font-family:'DM Sans',sans-serif; border-left:4px solid var(--acc);
        }
      `}</style>

      {/* ── INTRO ─────────────────────────────────────────────────── */}
      {phase==="intro" && (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:C.bg, padding:"32px 24px" }}>
          <div className="fade-up" style={{ maxWidth:540, width:"100%", textAlign:"center" }}>
            <div style={{ display:"flex", justifyContent:"center", gap:12, marginBottom:32 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:C.mil,  display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>🧿</div>
              <div style={{ width:56, height:56, borderRadius:16, background:C.genz, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>⚡</div>
            </div>

            <span className="pill" style={{ background:C.ink, color:"#fff", marginBottom:22, display:"inline-block" }}>OFFICE EDITION</span>

            <h1 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"2.4rem", fontWeight:700, color:C.ink, lineHeight:1.15, marginBottom:18 }}>
              Millennial or<br/>
              <span style={{ color:C.genz }}>Gen Z</span>
              <span style={{ color:C.mil }}>?</span>
            </h1>

            <p style={{ color:C.sub, fontFamily:"'DM Sans',sans-serif", fontSize:"1.05rem", lineHeight:1.7, margin:"0 auto 36px", maxWidth:400 }}>
              12 workplace (and life) questions.<br/>
              Brutally honest results. Zero judgment.<br/>
              <em style={{ fontSize:"0.9rem" }}>Well, maybe a little.</em>
            </p>

            <div style={{ display:"flex", gap:16, justifyContent:"center", marginBottom:40 }}>
              {[["⏱️","3 minutes","12 questions"],["🎯","Accurate™","probably"]].map(([icon,title,sub])=>(
                <div key={title} style={{ padding:"14px 20px", background:"#fff", borderRadius:14, border:`1.5px solid ${C.border}`, textAlign:"center", minWidth:120 }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
                  <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"0.9rem", fontWeight:600, color:C.ink }}>{title}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.72rem", color:C.sub, marginTop:2 }}>{sub}</div>
                </div>
              ))}
            </div>

            <button className="btn" onClick={()=>setPhase("survey")} style={{ background:C.ink, color:"#fff", width:"100%", maxWidth:360 }}>
              Find out who you are {"\u2192"}
            </button>
          </div>
        </div>
      )}

      {/* ── SURVEY ────────────────────────────────────────────────── */}
      {phase==="survey" && (
        <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", padding:"34px 24px 52px", "--acc":accent, "--acc-light":accentLight }}>
          <div style={{ width:"100%", maxWidth:540 }}>
            <ProgressBar current={current+1} total={QUESTIONS.length}/>

            <div className={visible?"fade-up":""} style={{ background:"#fff", borderRadius:20, border:`1.5px solid ${C.border}`, overflow:"hidden", marginTop:24, opacity:visible?1:0, transition:"opacity 0.25s ease", boxShadow:"0 2px 28px rgba(0,0,0,0.06)" }}>

              {/* illustration panel */}
              <div style={{ background:accentLight, height:200, display:"flex", alignItems:"center", justifyContent:"center", borderBottom:`1.5px solid ${C.border}`, position:"relative" }}>
                <div style={{ width:220, height:175 }}>
                  <Illustration qId={q.id} accent={accent} lightBg={accentLight}/>
                </div>
                <div style={{ position:"absolute", top:16, right:16 }}>
                  <span className="pill" style={{ background:accent, color:"#fff", fontSize:"0.7rem" }}>{q.tag}</span>
                </div>
              </div>

              {/* question + options */}
              <div style={{ padding:"28px 26px 30px" }}>
                <h2 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1.1rem", fontWeight:600, color:C.ink, lineHeight:1.55, marginBottom:24 }}>{q.q}</h2>
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {q.options.map((opt,i)=>(
                    <button key={i} className={`opt${selected===i?" sel":""}`}
                      style={{ "--acc":accent, "--acc-light":accentLight }}
                      onClick={()=>setSelected(i)}>
                      <span className="opt-idx">{["A","B","C"][i]}</span>
                      <span>{opt.text}</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop:26, display:"flex", justifyContent:"flex-end" }}>
                  <button className="btn" disabled={selected===null}
                    onClick={()=>{
                      if(selected===null) return;
                      const score=q.options[selected].score;
                      setVisible(false);
                      setTimeout(()=>{
                        const na=[...answers,score];
                        setAnswers(na); setSelected(null);
                        if(current+1>=QUESTIONS.length){
                          setQuip(LOADING_QUIPS[Math.floor(Math.random()*LOADING_QUIPS.length)]);
                          setPhase("loading"); saveResponse(na);
                          setTimeout(()=>setPhase("result"),2200);
                        } else { setCurrent(c=>c+1); }
                        setVisible(true);
                      },280);
                    }}
                    style={{ background:accent, color:"#fff" }}>
                    {current+1===QUESTIONS.length?"See results \u2192":"Next \u2192"}
                  </button>
                </div>
              </div>
            </div>

            <p style={{ textAlign:"center", marginTop:22, fontFamily:"'DM Mono',monospace", fontSize:"0.75rem", color:C.border }}>
              {FOOTER_QUIPS[current]}
            </p>
          </div>
        </div>
      )}

      {/* ── RESULT ────────────────────────────────────────────────── */}
      {phase==="result" && (
        <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", padding:"38px 24px 56px", "--acc":result.color, "--acc-light":result.lightColor }}>
          <div className="fade-up" style={{ maxWidth:540, width:"100%" }}>

            <div style={{ textAlign:"center", marginBottom:28 }}>
              <span className="pill" style={{ background:result.color, color:"#fff", marginBottom:18, display:"inline-block", fontSize:"0.7rem" }}>RESULT</span>
              <h1 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"2rem", fontWeight:700, color:C.ink, lineHeight:1.2, marginBottom:10 }}>{result.label}</h1>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.78rem", color:result.color, letterSpacing:"0.1em", fontWeight:500 }}>{result.archetype}</p>
            </div>

            <div style={{ background:"#fff", borderRadius:20, border:`1.5px solid ${C.border}`, overflow:"hidden", boxShadow:"0 2px 32px rgba(0,0,0,0.07)" }}>
              <div style={{ background:result.lightColor, height:200, display:"flex", alignItems:"center", justifyContent:"center", borderBottom:`1.5px solid ${C.border}` }}>
                <div style={{ width:220, height:175 }}><ResultIllustration archetype={result.archetype} color={result.color}/></div>
              </div>

              <div style={{ padding:"28px 26px" }}>
                {/* score bar */}
                <div style={{ marginBottom:26 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.75rem", color:C.mil, fontWeight:500 }}>MILLENNIAL</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.75rem", color:C.genz, fontWeight:500 }}>GEN Z</span>
                  </div>
                  <div style={{ height:12, background:C.border, borderRadius:99, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${result.pct}%`, background:`linear-gradient(90deg,${C.mil},${C.genz})`, borderRadius:99, transition:"width 1.3s cubic-bezier(0.4,0,0.2,1)" }}/>
                  </div>
                  <div style={{ textAlign:"right", marginTop:8 }}>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.85rem", color:result.color, fontWeight:600 }}>{result.pct}% {result.gen}</span>
                  </div>
                </div>

                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1rem", color:C.ink, lineHeight:1.75, marginBottom:26 }}>{result.desc}</p>

                <div>
                  <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:C.sub, letterSpacing:"0.08em", marginBottom:14 }}>KNOWN TRAITS</p>
                  <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                    {result.traits.map((t,i)=>(
                      <div key={i} className="trait" style={{ "--acc":result.color, "--acc-light":result.lightColor }}>{t}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* answer grid */}
            <div style={{ marginTop:22, padding:"20px 22px", background:"#fff", borderRadius:16, border:`1.5px solid ${C.border}` }}>
              <p style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:C.sub, marginBottom:16, letterSpacing:"0.08em" }}>YOUR ANSWERS AT A GLANCE</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {answers.map((score,i)=>(
                  <div key={i} style={{ width:40, height:40, borderRadius:10,
                    background:score===0?C.milLight:score===2?C.genzLight:C.midLight,
                    border:`2px solid ${score===0?C.mil:score===2?C.genz:C.mid}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", fontWeight:500,
                    color:score===0?C.mil:score===2?"#92400E":C.mid,
                  }}>Q{i+1}</div>
                ))}
              </div>
              <div style={{ display:"flex", gap:24, marginTop:16 }}>
                {[{label:"Millennial",color:C.mil,count:answers.filter(a=>a===0).length},
                  {label:"Mixed",     color:C.mid,count:answers.filter(a=>a===1).length},
                  {label:"Gen Z",     color:C.genz,count:answers.filter(a=>a===2).length}].map(({label,color,count})=>(
                  <div key={label} style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:"1.5rem", fontWeight:700, color }}>{count}</div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"0.68rem", color:C.sub, marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop:26 }}>
              <button className="btn"
                onClick={()=>{
                  const text=`I took the office Millennial vs Gen Z survey \u2014 I\u2019m \u201c${result.label}\u201d (${result.pct}% ${result.gen}). ${result.desc.slice(0,80)}\u2026`;
                  if(navigator.clipboard) navigator.clipboard.writeText(text);
                }}
                style={{ width:"100%", background:result.lightColor, color:result.color, border:`2px solid ${result.color}` }}>
                Copy my result
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}