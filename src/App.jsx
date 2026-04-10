import { useState, useEffect } from "react";

// ── CONFIG — replace with your own values ──────────────────────────────
const SUPABASE_URL = "https://mlawmxukpdwbvfkvrhqk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXdteHVrcGR3YnZma3ZyaHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NTI4MDgsImV4cCI6MjA5MTMyODgwOH0.pJABHykJW2fbJdhS_D5bc2kjv02EwQeacuWJX0_u16A";
const COOKIE_NAME = "genz_survey_done";
const COOKIE_DAYS = 365;

// ── Palette ────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F4F0", card: "#FFFFFF", ink: "#1A1A2E", sub: "#6B6F83",
  mil: "#E8826A", genz: "#B8E829", milLight: "#FAE4DC",
  genzLight: "#E8F7B0", border: "#E2E1DC", mid: "#8A8FA3",
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
  {
    id: 1,
    q: 'Your company announces "Back to office, 5 days a week." You feel\u2026',
    options: [
      { text: "Okay. Not ideal, but work means work.", score: 0 },
      { text: "Depends on commute, flexibility, and coffee quality.", score: 1 },
      { text: "This could've been an email. From home.", score: 2 },
    ],
    tag: "WFH",
  },
  {
    id: 2,
    q: "You get a Slack message from your manager late at night. You\u2026",
    options: [
      { text: "Reply. Responsiveness matters.", score: 0 },
      { text: "Read it\u2026 respond tomorrow.", score: 1 },
      { text: "Silently judge. Boundaries exist.", score: 2 },
    ],
    tag: "BOUNDARIES",
  },
  {
    id: 3,
    q: 'You\'re offered "great exposure" instead of higher pay. You think\u2026',
    options: [
      { text: "Stability beats hype.", score: 0 },
      { text: "Exposure is fine \u2014 if it leads somewhere.", score: 1 },
      { text: "Exposure doesn't pay rent.", score: 2 },
    ],
    tag: "COMPENSATION",
  },
  {
    id: 4,
    q: "You're invited to a 1-hour meeting with zero agenda. Your inner reaction:",
    options: [
      { text: "Let's see where this goes.", score: 0 },
      { text: "Why am I here?", score: 1 },
      { text: "I'm mentally redesigning the company structure.", score: 2 },
    ],
    tag: "MEETINGS",
  },
  {
    id: 5,
    q: 'HR sends an email about "professional attire." You\u2026',
    options: [
      { text: "Nod and adjust wardrobe.", score: 0 },
      { text: "Follow it, mostly.", score: 1 },
      { text: 'Define "professional". Emotionally.', score: 2 },
    ],
    tag: "DRESS CODE",
  },
  {
    id: 6,
    q: "Your colleague has 2 startups, a podcast, and a smoothie brand. You feel\u2026",
    options: [
      { text: "Focus on one thing properly.", score: 0 },
      { text: "Impressive but exhausting.", score: 1 },
      { text: "This is the correct way to live.", score: 2 },
    ],
    tag: "HUSTLE",
  },
  {
    id: 7,
    q: 'You see a viral post: "The system is broken \u2014 hard work alone doesn\'t guarantee success." You think\u2026',
    options: [
      { text: "Discipline and consistency still get you ahead.", score: 0 },
      { text: "There's truth in it, but effort still matters.", score: 1 },
      { text: "Exactly. The rules themselves need fixing.", score: 2 },
    ],
    tag: "SYSTEM",
  },
  {
    id: 8,
    q: "You've been swiping on dating apps for weeks with no luck. Your reaction:",
    options: [
      { text: "Maybe dating apps aren't for me.", score: 0 },
      { text: "It ebbs and flows.", score: 1 },
      { text: "Delete. Reinstall in 3 months.", score: 2 },
    ],
    tag: "DATING",
  },
  {
    id: 9,
    q: 'Family starts asking about marriage "casually but aggressively." You\u2026',
    options: [
      { text: "Start thinking about timelines.", score: 0 },
      { text: "Deflect with humor.", score: 1 },
      { text: "Ask why happiness has a deadline.", score: 2 },
    ],
    tag: "MARRIAGE",
  },
  {
    id: 10,
    q: 'Someone asks, "So how many kids do you want?" You reply\u2026',
    options: [
      { text: "That's part of the plan.", score: 0 },
      { text: "Still figuring life out.", score: 1 },
      { text: "Have you seen the economy?", score: 2 },
    ],
    tag: "KIDS",
  },
  {
    id: 11,
    q: "Your dream job looks like\u2026",
    options: [
      { text: "Stable role, steady growth, long-term security.", score: 0 },
      { text: "Meaningful work with balance.", score: 1 },
      { text: "Purpose, flexibility, and the option to quit if it stops serving me.", score: 2 },
    ],
    tag: "DREAM JOB",
  },
  {
    id: 12,
    q: 'Free snacks are announced as a "major benefit." You think\u2026',
    options: [
      { text: "Nice perk!", score: 0 },
      { text: "Cool, but\u2026", score: 1 },
      { text: "This is not compensation.", score: 2 },
    ],
    tag: "PERKS",
  },
];

const LOADING_QUIPS = [
  "Consulting the algorithm\u2026",
  "Fact-checking your vibe\u2026",
  "Running diagnostics on your work-life balance\u2026",
  "Calculating your boundary strength\u2026",
  "Validating your hustle credentials\u2026",
];

const FOOTER_QUIPS = [
  "your commute just called. it's not happy.",
  "boundaries loading\u2026",
  "rent \u2260 exposure.",
  "time is a flat circle. this meeting is flatter.",
  "business casual is a scam.",
  "side-hustle culture has entered the chat.",
  "the system: exposed.",
  "the algorithm is judging you too.",
  "aunties have entered the chat.",
  "have you seen this economy tho.",
  "purpose \u2014 check. flexibility \u2014 check. exit plan \u2014 check.",
  "trail mix is not equity.",
];

// ── Result archetypes ──────────────────────────────────────────────────
function getResult(totalScore) {
  const max = QUESTIONS.length * 2;
  const pct = Math.round((totalScore / max) * 100);
  if (pct <= 20) return {
    pct, label: "The Corporate Loyalist", gen: "Pure Millennial",
    color: C.mil, lightColor: C.milLight, archetype: "MILLENNIAL CLASSIC",
    desc: "You survived dial-up internet and you'll survive hot-desking too. Reliability is your superpower, even if it occasionally costs you your evenings.",
    traits: ["Replies to emails before 8 AM", "Has a 5-year plan (and a backup)", "Genuinely likes their manager"],
  };
  if (pct <= 40) return {
    pct, label: "The Pragmatic Adapter", gen: "Millennial-leaning",
    color: C.mil, lightColor: C.milLight, archetype: "MILLENNIAL+",
    desc: "You know the rules well enough to bend them strategically. You'll go back to office \u2014 but only if there's good coffee and parking.",
    traits: ["Has strong opinions about work-life balance", "Reads hustle content but sleeps 8 hours", "Owns exactly one plant"],
  };
  if (pct <= 60) return {
    pct, label: "The Enlightened Middle", gen: "Generationally Fluid",
    color: C.mid, lightColor: "#ECEDF2", archetype: "THE BRIDGE",
    desc: "Neither fully plugged in nor fully checked out. You understand both sides of the generational debate, which means you're exhausted at every team lunch.",
    traits: ["Agrees with the rant but still files TPS reports", "Uses 'work-life harmony' not 'balance'", "Mutes the Slack channel but doesn't leave it"],
  };
  if (pct <= 80) return {
    pct, label: "The Quiet Disruptor", gen: "Gen Z-leaning",
    color: C.genz, lightColor: C.genzLight, archetype: "GEN Z+",
    desc: "You're polite in meetings but mentally you're already restructuring the org chart. Boundaries are not a personality trait \u2014 they're a constitutional right.",
    traits: ["Has opinions about the system (backed by data)", "Keeps the camera off, still delivers", "Doesn't eat the free snacks. On principle."],
  };
  return {
    pct, label: "The Boundary Prophet", gen: "Full Gen Z",
    color: C.genz, lightColor: C.genzLight, archetype: "GEN Z CLASSIC",
    desc: "Boundary-setting, system-questioning, and mildly allergic to meetings. You believe in purpose-driven work, and by 'purpose' you mean not destroying your mental health.",
    traits: ["Will quit if the vibes are off", "Has already read the employment contract", "The economy is a personality trait"],
  };
}

// ── SVG Illustrations ──────────────────────────────────────────────────
function Illustration({ qId, accent }) {
  const a = accent;
  const svgs = {
    1: (<svg viewBox="0 0 200 160" fill="none">
      <rect x="60" y="40" width="80" height="90" fill={a} opacity="0.15" rx="2"/>
      <rect x="60" y="40" width="80" height="90" stroke={a} strokeWidth="2" rx="2"/>
      {[55,70,85,100,115].map(y => [75,100,125].map(x => (
        <rect key={`${x}-${y}`} x={x} y={y} width="12" height="10" fill={a} opacity="0.4" rx="1"/>
      )))}
      <rect x="88" y="103" width="24" height="27" fill={C.ink} rx="1"/>
      <polygon points="165,80 185,80 175,65" fill={a} opacity="0.6"/>
      <rect x="165" y="80" width="20" height="20" fill={a} opacity="0.4" rx="1"/>
      <rect x="172" y="87" width="6" height="13" fill={C.ink}/>
      <text x="100" y="148" textAnchor="middle" fill={C.sub} fontSize="9" fontFamily="sans-serif">{"\u2192 home"}</text>
    </svg>),
    2: (<svg viewBox="0 0 200 160" fill="none">
      <rect x="75" y="20" width="50" height="90" rx="8" fill={C.ink}/>
      <rect x="79" y="26" width="42" height="72" rx="5" fill="#0F0F1A"/>
      <rect x="84" y="45" width="32" height="20" rx="4" fill={a} opacity="0.85"/>
      <text x="100" y="59" textAnchor="middle" fill={C.ink} fontSize="8" fontFamily="sans-serif" fontWeight="bold">@ you</text>
      <text x="100" y="75" textAnchor="middle" fill={C.sub} fontSize="7" fontFamily="sans-serif">11:47 PM</text>
      <text x="140" y="70" fill={a} fontSize="14" fontFamily="sans-serif" opacity="0.7">z</text>
      <text x="150" y="58" fill={a} fontSize="10" fontFamily="sans-serif" opacity="0.5">z</text>
      <text x="158" y="48" fill={a} fontSize="7" fontFamily="sans-serif" opacity="0.35">z</text>
    </svg>),
    3: (<svg viewBox="0 0 200 160" fill="none">
      <rect x="30" y="60" width="60" height="40" rx="4" fill={C.ink}/>
      <rect x="30" y="60" width="60" height="40" stroke={a} strokeWidth="1.5" rx="4"/>
      <text x="60" y="84" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">{"\u20b9 0.00"}</text>
      <text x="100" y="88" textAnchor="middle" fill={C.border} fontSize="18" fontFamily="sans-serif">{"\u2260"}</text>
      <polygon points="140,30 160,30 175,110 125,110" fill={a} opacity="0.15"/>
      <polygon points="140,30 160,30 175,110 125,110" stroke={a} strokeWidth="1" opacity="0.5"/>
      <circle cx="150" cy="22" r="8" fill={a} opacity="0.8"/>
      <text x="150" y="130" textAnchor="middle" fill={a} fontSize="7" fontFamily="sans-serif">EXPOSURE</text>
    </svg>),
    4: (<svg viewBox="0 0 200 160" fill="none">
      <circle cx="100" cy="78" r="45" fill={a} opacity="0.1" stroke={a} strokeWidth="2"/>
      <circle cx="100" cy="78" r="3" fill={a}/>
      <text x="100" y="83" textAnchor="middle" fill={C.sub} fontSize="7" fontFamily="sans-serif">no agenda</text>
      {[0,60,120,180,240,300].map((deg,i) => {
        const rad = (deg * Math.PI) / 180;
        const x = 100 + 55 * Math.cos(rad);
        const y = 78 + 55 * Math.sin(rad);
        return <circle key={i} cx={x} cy={y} r="4" fill={C.ink} opacity="0.3"/>;
      })}
      <text x="100" y="148" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">1 hour. no reason.</text>
    </svg>),
    5: (<svg viewBox="0 0 200 160" fill="none">
      <path d="M55 100 L65 55 L85 70 L80 100Z" fill={C.ink}/>
      <path d="M85 100 L85 70 L75 55 L95 55 L95 70 L85 100Z" fill="#2A2A3E"/>
      <path d="M115 100 L115 70 L105 55 L125 55 L125 70 L115 100Z" fill={a} opacity="0.7"/>
      <path d="M115 100 L125 55 L135 70 L145 100Z" fill={a} opacity="0.5"/>
      <line x1="110" y1="68" x2="107" y2="85" stroke={C.ink} strokeWidth="1.5"/>
      <line x1="120" y1="68" x2="123" y2="85" stroke={C.ink} strokeWidth="1.5"/>
      <text x="70" y="120" textAnchor="middle" fill={C.sub} fontSize="7" fontFamily="sans-serif">FORMAL</text>
      <text x="130" y="120" textAnchor="middle" fill={a} fontSize="7" fontFamily="sans-serif">EMOTIONALLY</text>
    </svg>),
    6: (<svg viewBox="0 0 200 160" fill="none">
      <circle cx="80" cy="70" r="35" fill={a} opacity="0.2" stroke={a} strokeWidth="1.5"/>
      <circle cx="120" cy="70" r="35" fill={C.mil} opacity="0.2" stroke={C.mil} strokeWidth="1.5"/>
      <circle cx="100" cy="100" r="35" fill={C.ink} opacity="0.1" stroke={C.ink} strokeWidth="1" strokeDasharray="3 2"/>
      <text x="68" y="56" textAnchor="middle" fill={C.sub} fontSize="6.5" fontFamily="sans-serif">startup</text>
      <text x="132" y="56" textAnchor="middle" fill={C.sub} fontSize="6.5" fontFamily="sans-serif">podcast</text>
      <text x="100" y="120" textAnchor="middle" fill={C.sub} fontSize="6.5" fontFamily="sans-serif">smoothie</text>
      <text x="100" y="87" textAnchor="middle" fill={C.ink} fontSize="7" fontFamily="sans-serif" fontWeight="bold">still answering</text>
      <text x="100" y="96" textAnchor="middle" fill={C.ink} fontSize="7" fontFamily="sans-serif" fontWeight="bold">emails</text>
    </svg>),
    7: (<svg viewBox="0 0 200 160" fill="none">
      <line x1="80" y1="140" x2="70" y2="20" stroke={C.ink} strokeWidth="3"/>
      <line x1="120" y1="140" x2="130" y2="20" stroke={C.ink} strokeWidth="3"/>
      {[130,110,90,70,50].map((y,i) => (
        <line key={i} x1={80-i*2} y1={y} x2={120+i*2} y2={y} stroke={C.ink} strokeWidth="2" opacity={i===2?"0.2":"1"}/>
      ))}
      <text x="100" y="90" textAnchor="middle" fill={a} fontSize="9" fontFamily="sans-serif">{"\u2715"}</text>
      <text x="100" y="155" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">the system</text>
    </svg>),
    8: (<svg viewBox="0 0 200 160" fill="none">
      <rect x="72" y="18" width="56" height="96" rx="8" fill={C.ink}/>
      <rect x="76" y="24" width="48" height="80" rx="5" fill="#1A1A2E"/>
      <rect x="86" y="35" width="28" height="40" rx="3" fill={a} opacity="0.8"/>
      <text x="100" y="62" textAnchor="middle" fill={C.ink} fontSize="22" fontFamily="sans-serif" fontWeight="bold">{"\u2715"}</text>
      <text x="55" y="72" fill={C.mil} fontSize="16" fontFamily="sans-serif" opacity="0.6">{"\u2190"}</text>
      <text x="138" y="72" fill={C.genz} fontSize="16" fontFamily="sans-serif" opacity="0.6">{"\u2192"}</text>
      <text x="100" y="130" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">reinstall in 3 months</text>
    </svg>),
    9: (<svg viewBox="0 0 200 160" fill="none">
      <path d="M80 20 L120 20 L100 75 L120 130 L80 130 L100 75 Z" fill={a} opacity="0.12" stroke={a} strokeWidth="1.5"/>
      <path d="M80 20 L120 20 L100 75Z" fill={a} opacity="0.3"/>
      <line x1="78" y1="20" x2="122" y2="20" stroke={a} strokeWidth="2"/>
      <line x1="78" y1="130" x2="122" y2="130" stroke={a} strokeWidth="2"/>
      <text x="148" y="60" fill={C.mil} fontSize="18" fontFamily="sans-serif" opacity="0.5">?</text>
      <text x="40" y="80" fill={C.mil} fontSize="14" fontFamily="sans-serif" opacity="0.35">?</text>
      <text x="100" y="152" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">why does love have a deadline?</text>
    </svg>),
    10: (<svg viewBox="0 0 200 160" fill="none">
      <circle cx="70" cy="65" r="18" fill={a} opacity="0.2" stroke={a} strokeWidth="1.5"/>
      <circle cx="70" cy="58" r="8" fill={a} opacity="0.4"/>
      <path d="M55 75 Q70 90 85 75" stroke={a} strokeWidth="1.5" fill="none"/>
      <text x="100" y="72" textAnchor="middle" fill={C.sub} fontSize="10" fontFamily="sans-serif">vs</text>
      <polyline points="118,45 135,55 148,50 162,70 175,90 180,110" stroke={C.mil} strokeWidth="2" fill="none"/>
      <circle cx="180" cy="110" r="3" fill={C.mil}/>
      <text x="148" y="130" textAnchor="middle" fill={C.mil} fontSize="7" fontFamily="sans-serif">{"\u2193 the economy"}</text>
    </svg>),
    11: (<svg viewBox="0 0 200 160" fill="none">
      <line x1="100" y1="140" x2="100" y2="95" stroke={C.ink} strokeWidth="2"/>
      <path d="M100 95 Q70 70 50 40" stroke={C.ink} strokeWidth="2" strokeDasharray="4 2"/>
      <text x="38" y="35" fill={C.sub} fontSize="7" fontFamily="sans-serif">stable</text>
      <path d="M100 95 L100 30" stroke={a} strokeWidth="2"/>
      <text x="86" y="26" fill={a} fontSize="7" fontFamily="sans-serif">balanced</text>
      <path d="M100 95 Q130 70 155 40" stroke={C.mil} strokeWidth="2" strokeDasharray="4 2"/>
      <text x="148" y="35" fill={C.mil} fontSize="7" fontFamily="sans-serif">quit</text>
      <circle cx="100" cy="95" r="5" fill={C.ink}/>
    </svg>),
    12: (<svg viewBox="0 0 200 160" fill="none">
      <line x1="60" y1="70" x2="140" y2="80" stroke={C.ink} strokeWidth="2"/>
      <line x1="100" y1="40" x2="100" y2="75" stroke={C.ink} strokeWidth="2"/>
      <circle cx="100" cy="38" r="4" fill={C.ink}/>
      <line x1="70" y1="75" x2="70" y2="90" stroke={C.ink} strokeWidth="1.5"/>
      <ellipse cx="70" cy="92" rx="18" ry="5" fill={a} opacity="0.3" stroke={a} strokeWidth="1"/>
      <text x="70" y="91" textAnchor="middle" fontSize="14" fontFamily="sans-serif">🍪</text>
      <line x1="130" y1="80" x2="130" y2="108" stroke={C.ink} strokeWidth="1.5"/>
      <ellipse cx="130" cy="110" rx="18" ry="5" fill={C.mil} opacity="0.4" stroke={C.mil} strokeWidth="1"/>
      <text x="130" y="107" textAnchor="middle" fill={C.ink} fontSize="8" fontFamily="sans-serif" fontWeight="bold">{"\u20b9\u20b9\u20b9"}</text>
      <text x="100" y="145" textAnchor="middle" fill={C.sub} fontSize="8" fontFamily="sans-serif">this is not compensation</text>
    </svg>),
  };
  return svgs[qId] || null;
}

function ResultIllustration({ archetype, color }) {
  if (archetype === "MILLENNIAL CLASSIC" || archetype === "MILLENNIAL+") return (
    <svg viewBox="0 0 200 160" fill="none">
      <rect x="50" y="30" width="100" height="80" rx="4" fill={color} opacity="0.15" stroke={color} strokeWidth="2"/>
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={70+i*13} y={80-i*7} width="10" height={i*7+5} fill={color} opacity={0.3+i*0.14} rx="1"/>
      ))}
      <text x="100" y="130" textAnchor="middle" fill={color} fontSize="9" fontFamily="sans-serif" fontWeight="bold">STEADY ASCENT</text>
    </svg>
  );
  if (archetype === "THE BRIDGE") return (
    <svg viewBox="0 0 200 160" fill="none">
      <path d="M30 110 Q100 40 170 110" stroke={color} strokeWidth="3" fill="none"/>
      <line x1="30" y1="110" x2="170" y2="110" stroke={C.ink} strokeWidth="1.5" opacity="0.3"/>
      {[50,80,110,140].map(x => (
        <line key={x} x1={x} y1={110} x2={x} y2={110-(x===80||x===110?45:30)} stroke={color} strokeWidth="1.5" opacity="0.5"/>
      ))}
      <text x="100" y="148" textAnchor="middle" fill={color} fontSize="9" fontFamily="sans-serif" fontWeight="bold">BRIDGING THE GAP</text>
    </svg>
  );
  return (
    <svg viewBox="0 0 200 160" fill="none">
      {[0,45,90,135,180,225,270,315].map((deg,i) => {
        const rad = deg*Math.PI/180;
        return <line key={i} x1={100} y1={80} x2={100+55*Math.cos(rad)} y2={80+55*Math.sin(rad)} stroke={color} strokeWidth="1.5" opacity="0.5" strokeDasharray={i%2===0?"4 2":"none"}/>;
      })}
      <circle cx="100" cy="80" r="22" fill={color} opacity="0.2" stroke={color} strokeWidth="2"/>
      <text x="100" y="84" textAnchor="middle" fill={color} fontSize="8" fontFamily="sans-serif" fontWeight="bold">BOUNDARY</text>
      <text x="100" y="148" textAnchor="middle" fill={color} fontSize="9" fontFamily="sans-serif" fontWeight="bold">SET. PROTECTED. UNBOTHERED.</text>
    </svg>
  );
}

function ProgressBar({ current, total }) {
  return (
    <div style={{ width: "100%", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.sub, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>Q{current} of {total}</span>
        <span style={{ fontSize: 13, color: C.sub, fontFamily: "'DM Mono', monospace" }}>{Math.round((current/total)*100)}%</span>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(current/total)*100}%`, background: `linear-gradient(90deg, ${C.mil}, ${C.genz})`, borderRadius: 99, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)" }}/>
      </div>
    </div>
  );
}

function LoadingScreen({ quip }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.bg, gap: 20 }}>
      <div style={{ width: 52, height: 52, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.genz}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
      <p style={{ color: C.sub, fontFamily: "'DM Mono', monospace", fontSize: 15, textAlign: "center", maxWidth: 280 }}>{quip}</p>
    </div>
  );
}

function AlreadyTaken() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 22 }}>✌️</div>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: C.ink, marginBottom: 16, lineHeight: 1.2 }}>
          You've already weighed in.
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.05rem", color: C.sub, lineHeight: 1.7 }}>
          Your response has been recorded.<br/>Results will be shared with the team soon.
        </p>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────
export default function App() {
  const [phase, setPhase] = useState("checking");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [quip, setQuip] = useState(LOADING_QUIPS[0]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const done = getCookie(COOKIE_NAME);
    setPhase(done ? "already" : "intro");
  }, []);

  const totalScore = answers.reduce((a, b) => a + b, 0);
  const result = getResult(totalScore);
  const accent = current < 6 ? C.mil : C.genz;

  async function saveResponse(finalAnswers) {
    try {
      const ts = Date.now();
      const score = finalAnswers.reduce((a, b) => a + b, 0);
      const max = QUESTIONS.length * 2;
      const pct = Math.round((score / max) * 100);
      const res = getResult(score);
      await fetch(`${SUPABASE_URL}/rest/v1/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          ts, total_score: score, pct_genz: pct,
          archetype: res.archetype, answers: finalAnswers,
        }),
      });
      setCookie(COOKIE_NAME, "1", COOKIE_DAYS);
    } catch (e) {
      console.warn("Save failed:", e);
    }
  }

  const q = QUESTIONS[current];

  if (phase === "checking") return null;
  if (phase === "already") return <AlreadyTaken />;
  if (phase === "loading") return <LoadingScreen quip={quip} />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
        html { font-size: 18px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.45s cubic-bezier(0.4,0,0.2,1) both; }
        .option-btn {
          width: 100%; padding: 16px 20px;
          background: white; border: 1.5px solid ${C.border};
          border-radius: 12px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 1rem;
          color: ${C.ink}; text-align: left; line-height: 1.45;
          transition: all 0.18s ease; outline: none;
          display: flex; align-items: center; gap: 14px;
        }
        .option-btn:hover { border-color: var(--accent); transform: translateX(3px); }
        .option-btn.selected { border-color: var(--accent); background: var(--accent-light); }
        .option-idx {
          min-width: 28px; height: 28px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Mono', monospace; font-size: 0.72rem; font-weight: 500;
          background: ${C.border}; color: ${C.sub}; transition: all 0.18s; flex-shrink: 0;
        }
        .option-btn.selected .option-idx { background: var(--accent); color: ${C.ink}; }
        .next-btn {
          padding: 16px 40px; border-radius: 12px; border: none;
          font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700;
          cursor: pointer; letter-spacing: 0.03em; transition: all 0.18s ease;
        }
        .next-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .next-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
        .tag-pill {
          display: inline-block; padding: 4px 12px; border-radius: 99px;
          font-family: 'DM Mono', monospace; font-size: 0.65rem; font-weight: 500; letter-spacing: 0.08em;
        }
        .trait-item {
          padding: 12px 16px; background: var(--accent-light); border-radius: 10px;
          font-size: 0.9rem; color: ${C.ink}; font-family: 'DM Sans', sans-serif;
          border-left: 3px solid var(--accent);
        }
      `}</style>

      {/* ── INTRO ─────────────────────────────────────────────────── */}
      {phase === "intro" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, padding: "28px 24px" }}>
          <div className="fade-up" style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 30 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: C.mil, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 22 }}>🧿</span></div>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: C.genz, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 22 }}>⚡</span></div>
            </div>
            <div className="tag-pill" style={{ background: C.ink, color: C.bg, marginBottom: 20 }}>OFFICE EDITION</div>
            <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "2.2rem", fontWeight: 700, color: C.ink, lineHeight: 1.2, marginBottom: 16 }}>
              Millennial or<br/>
              <span style={{ color: C.genz, WebkitTextStroke: `1px ${C.ink}` }}>Gen Z</span>
              <span style={{ color: C.mil }}>?</span>
            </h1>
            <p style={{ color: C.sub, fontFamily: "'DM Sans', sans-serif", fontSize: "1rem", lineHeight: 1.65, margin: "0 auto 36px", maxWidth: 380 }}>
              12 workplace (and life) questions.<br/>
              Brutally honest results. Zero judgment.<br/>
              <em style={{ fontSize: "0.9rem" }}>Well, maybe a little.</em>
            </p>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 36 }}>
              {[["⏱️ 3 minutes","12 questions"],["🎯 Accurate™","probably"]].map(([title, sub]) => (
                <div key={title} style={{ padding: "12px 18px", background: "white", borderRadius: 12, border: `1px solid ${C.border}`, textAlign: "center" }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", fontWeight: 600, color: C.ink }}>{title}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.7rem", color: C.sub }}>{sub}</div>
                </div>
              ))}
            </div>
            <button className="next-btn" onClick={() => setPhase("survey")} style={{ background: C.ink, color: C.bg, width: "100%", maxWidth: 340 }}>
              Find out who you are {"\u2192"}
            </button>
          </div>
        </div>
      )}

      {/* ── SURVEY ────────────────────────────────────────────────── */}
      {phase === "survey" && (
        <div style={{
          minHeight: "100vh", background: C.bg,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "32px 24px 48px",
          "--accent": accent,
          "--accent-light": current < 6 ? C.milLight : C.genzLight,
        }}>
          <div style={{ width: "100%", maxWidth: 520 }}>
            <ProgressBar current={current+1} total={QUESTIONS.length}/>
            <div className={visible ? "fade-up" : ""} style={{
              background: "white", borderRadius: 18, border: `1px solid ${C.border}`,
              overflow: "hidden", marginTop: 22,
              opacity: visible ? 1 : 0, transition: "opacity 0.25s ease",
              boxShadow: "0 2px 24px rgba(0,0,0,0.05)",
            }}>
              <div style={{
                background: current < 6 ? C.milLight : C.genzLight,
                height: 186, display: "flex", alignItems: "center", justifyContent: "center",
                borderBottom: `1px solid ${C.border}`, position: "relative",
              }}>
                <div style={{ width: 200, height: 160 }}><Illustration qId={q.id} accent={accent}/></div>
                <div style={{ position: "absolute", top: 14, right: 14 }}>
                  <span className="tag-pill" style={{ background: accent, color: C.ink }}>{q.tag}</span>
                </div>
              </div>
              <div style={{ padding: "26px 24px 28px" }}>
                <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.05rem", fontWeight: 600, color: C.ink, lineHeight: 1.5, marginBottom: 22 }}>
                  {q.q}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {q.options.map((opt, i) => (
                    <button key={i} className={`option-btn${selected===i?" selected":""}`}
                      style={{ "--accent": accent, "--accent-light": current<6?C.milLight:C.genzLight }}
                      onClick={() => setSelected(i)}>
                      <span className="option-idx">{["A","B","C"][i]}</span>
                      <span>{opt.text}</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                  <button className="next-btn" disabled={selected===null}
                    onClick={() => {
                      if (selected===null) return;
                      const score = q.options[selected].score;
                      setVisible(false);
                      setTimeout(() => {
                        const newAnswers = [...answers, score];
                        setAnswers(newAnswers);
                        setSelected(null);
                        if (current+1 >= QUESTIONS.length) {
                          setQuip(LOADING_QUIPS[Math.floor(Math.random()*LOADING_QUIPS.length)]);
                          setPhase("loading");
                          saveResponse(newAnswers);
                          setTimeout(() => setPhase("result"), 2200);
                        } else {
                          setCurrent(c => c+1);
                        }
                        setVisible(true);
                      }, 280);
                    }}
                    style={{ background: accent, color: C.ink, letterSpacing: "0.04em" }}>
                    {current+1===QUESTIONS.length ? "See results \u2192" : "Next \u2192"}
                  </button>
                </div>
              </div>
            </div>
            <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: C.border }}>
              {FOOTER_QUIPS[current]}
            </p>
          </div>
        </div>
      )}

      {/* ── RESULT ────────────────────────────────────────────────── */}
      {phase === "result" && (
        <div style={{
          minHeight: "100vh", background: C.bg,
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "36px 24px 52px",
          "--accent": result.color, "--accent-light": result.lightColor,
        }}>
          <div className="fade-up" style={{ maxWidth: 520, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <span className="tag-pill" style={{ background: result.color, color: C.ink, marginBottom: 16, display: "inline-block" }}>RESULT</span>
              <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.8rem", fontWeight: 700, color: C.ink, lineHeight: 1.2, marginBottom: 8 }}>
                {result.label}
              </h1>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.75rem", color: result.color, letterSpacing: "0.1em" }}>
                {result.archetype}
              </p>
            </div>

            <div style={{ background: "white", borderRadius: 18, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 28px rgba(0,0,0,0.06)" }}>
              <div style={{ background: result.lightColor, height: 190, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 200, height: 160 }}><ResultIllustration archetype={result.archetype} color={result.color}/></div>
              </div>
              <div style={{ padding: "26px 24px" }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: C.mil }}>MILLENNIAL</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.72rem", color: C.genz }}>GEN Z</span>
                  </div>
                  <div style={{ height: 10, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${result.pct}%`, background: `linear-gradient(90deg, ${C.mil}, ${C.genz})`, borderRadius: 99, transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)" }}/>
                  </div>
                  <div style={{ textAlign: "right", marginTop: 8 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.8rem", color: result.color, fontWeight: 600 }}>{result.pct}% {result.gen}</span>
                  </div>
                </div>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.95rem", color: C.ink, lineHeight: 1.7, marginBottom: 24 }}>{result.desc}</p>
                <div>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: C.sub, letterSpacing: "0.08em", marginBottom: 12 }}>KNOWN TRAITS</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.traits.map((t,i) => (
                      <div key={i} className="trait-item" style={{ "--accent": result.color, "--accent-light": result.lightColor }}>{t}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: "18px 20px", background: "white", borderRadius: 14, border: `1px solid ${C.border}` }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: C.sub, marginBottom: 14, letterSpacing: "0.08em" }}>YOUR ANSWERS AT A GLANCE</p>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {answers.map((score,i) => (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: score===0?C.milLight:score===2?C.genzLight:C.border,
                    border: `1.5px solid ${score===0?C.mil:score===2?C.genz:C.mid}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'DM Mono', monospace", fontSize: "0.65rem",
                    color: score===0?C.mil:score===2?"#6B8800":C.mid,
                  }}>Q{i+1}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 14 }}>
                {[
                  { label: "Millennial", color: C.mil, count: answers.filter(a=>a===0).length },
                  { label: "Mixed", color: C.mid, count: answers.filter(a=>a===1).length },
                  { label: "Gen Z", color: C.genz, count: answers.filter(a=>a===2).length },
                ].map(({ label, color, count }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1.3rem", fontWeight: 700, color }}>{count}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", color: C.sub }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button className="next-btn"
                onClick={() => {
                  const text = `I took the office Millennial vs Gen Z survey \u2014 I'm "${result.label}" (${result.pct}% ${result.gen}). ${result.desc.slice(0,80)}\u2026`;
                  if (navigator.clipboard) navigator.clipboard.writeText(text);
                }}
                style={{ width: "100%", background: result.lightColor, color: C.ink, border: `1.5px solid ${result.color}` }}>
                Copy my result
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}