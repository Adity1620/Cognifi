import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

// ═══════════════════════════════════════════════════════════════════
//  CONFIG & CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const API = "http://localhost:8000";
const PC  = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#f97316","#ec4899"];
const CATS = ["Food","Transport","Rent","Shopping","Health","Utilities","Entertainment","Education","Pet Care","Others"];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
*, *::before, *::after { box-sizing:border-box; }
html, body { margin:0; padding:0; font-family:'Plus Jakarta Sans',sans-serif; }
.mono { font-family:'Space Mono',monospace !important; }
::-webkit-scrollbar { width:4px; height:4px; }
::-webkit-scrollbar-track { background:#07090f; }
::-webkit-scrollbar-thumb { background:#1e293b; border-radius:6px; }
@keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
.fade-up { animation:fadeUp 0.35s ease forwards; }
@keyframes spin { to{transform:rotate(360deg)} }
.spin { animation:spin 0.7s linear infinite; display:inline-block; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
.blink { animation:blink 1.2s ease infinite; }
.card { background:rgba(13,22,45,0.85); border:1px solid rgba(255,255,255,0.07); border-radius:18px; }
.card-hover { transition:border-color 0.2s, box-shadow 0.2s; }
.card-hover:hover { border-color:rgba(16,185,129,0.25); box-shadow:0 8px 32px rgba(16,185,129,0.08); }
.input-f { width:100%; background:#07090f; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:10px 14px; color:#e2e8f0; font-size:14px; outline:none; font-family:inherit; transition:border-color 0.2s; }
.input-f:focus { border-color:#10b981; }
.input-f::placeholder { color:#334155; }
.btn { border:none; cursor:pointer; font-family:inherit; font-weight:600; border-radius:10px; transition:all 0.15s; display:inline-flex; align-items:center; gap:6px; }
.btn:disabled { opacity:0.5; cursor:not-allowed; }
.btn-primary { background:linear-gradient(135deg,#10b981,#059669); color:white; padding:10px 20px; font-size:14px; }
.btn-primary:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); box-shadow:0 6px 20px rgba(16,185,129,0.3); }
.btn-ghost { background:transparent; color:#64748b; padding:8px 14px; font-size:13px; border:1px solid rgba(255,255,255,0.08); }
.btn-ghost:hover { border-color:#334155; color:#94a3b8; background:rgba(255,255,255,0.03); }
.btn-danger { background:rgba(239,68,68,0.08); color:#f87171; padding:7px 12px; font-size:13px; border:1px solid rgba(239,68,68,0.15); }
.btn-danger:hover { background:rgba(239,68,68,0.15); border-color:rgba(239,68,68,0.3); }
.btn-amber { background:rgba(245,158,11,0.1); color:#fbbf24; padding:7px 12px; font-size:13px; border:1px solid rgba(245,158,11,0.2); }
.btn-amber:hover { background:rgba(245,158,11,0.18); }
.nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:10px; border:none; cursor:pointer; background:transparent; color:#475569; width:100%; text-align:left; font-family:inherit; font-size:14px; font-weight:500; transition:all 0.15s; white-space:nowrap; }
.nav-item:hover { background:rgba(255,255,255,0.04); color:#94a3b8; }
.nav-item.active { background:rgba(16,185,129,0.12); color:#10b981; font-weight:700; border-left:3px solid #10b981; padding-left:9px; }
.tag { display:inline-flex; align-items:center; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; }
.tag-expense { background:rgba(239,68,68,0.12); color:#fca5a5; }
.tag-income { background:rgba(16,185,129,0.12); color:#6ee7b7; }
.tag-cat { background:rgba(59,130,246,0.1); color:#93c5fd; }
.tag-voice { background:rgba(139,92,246,0.12); color:#c4b5fd; }
.tag-ocr { background:rgba(249,115,22,0.12); color:#fdba74; }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(6px); z-index:100; display:flex; align-items:center; justify-content:center; padding:16px; }
.modal { background:#0d1629; border:1px solid rgba(255,255,255,0.1); border-radius:20px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 40px 80px rgba(0,0,0,0.6); }
.tab { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-family:inherit; font-size:13px; font-weight:600; transition:all 0.15s; }
.tab.active { background:rgba(16,185,129,0.15); color:#10b981; }
.tab:not(.active) { background:transparent; color:#475569; }
.tab:not(.active):hover { color:#94a3b8; }
select.input-f option { background:#0d1629; }
.toast { position:fixed; bottom:24px; right:24px; padding:12px 20px; border-radius:12px; font-size:14px; font-weight:600; z-index:200; animation:fadeUp 0.3s ease; max-width:320px; }
.toast-success { background:#064e3b; color:#6ee7b7; border:1px solid rgba(16,185,129,0.3); }
.toast-error { background:#450a0a; color:#fca5a5; border:1px solid rgba(239,68,68,0.3); }
.stat-card { position:relative; overflow:hidden; padding:24px; }
.stat-card::after { content:''; position:absolute; top:-30px; right:-30px; width:100px; height:100px; border-radius:50%; opacity:0.06; }
.sc-green::after { background:#10b981; }
.sc-blue::after { background:#3b82f6; }
.sc-rose::after { background:#ef4444; }
.sc-amber::after { background:#f59e0b; }
.scrollable-list { overflow-y:auto; max-height:calc(100vh - 200px); }
`;

// ═══════════════════════════════════════════════════════════════════
//  API + UTILS
// ═══════════════════════════════════════════════════════════════════
const call = async (path, opts={}, token=null) => {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      ...(!isForm && {"Content-Type":"application/json"}),
      ...(token && {Authorization:`Bearer ${token}`}),
      ...opts.headers,
    }
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.detail || JSON.stringify(j); } catch {}
    throw new Error(msg);
  }
  const t = await res.text();
  try { return JSON.parse(t); } catch { return t; }
};

const inr = n => `₹${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:0})}`;
const fmtDt = s => new Date(s).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"});
const daysDiff = s => Math.ceil((new Date(s) - new Date())/(1000*60*60*24));
const today = () => new Date().toISOString().split("T")[0];

// ═══════════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════════
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return ()=>clearTimeout(t); }, []);
  return <div className={`toast toast-${type}`}>{msg}</div>;
}

// ═══════════════════════════════════════════════════════════════════
//  AUTH PAGE
// ═══════════════════════════════════════════════════════════════════
function AuthPage({ onLogin }) {
  const [mode,setMode] = useState("login");
  const [email,setEmail] = useState("");
  const [pw,setPw] = useState("");
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");

  const submit = async () => {
    if (!email||!pw) return setErr("Please fill all fields.");
    setLoading(true); setErr("");
    try {
      if (mode==="register") {
        await call("/register",{method:"POST",body:JSON.stringify({email,password:pw})});
        setMode("login"); setPw(""); setErr(""); alert("Account created! Sign in.");
      } else {
        const fd = new FormData();
        fd.append("username",email); fd.append("password",pw);
        const d = await call("/token",{method:"POST",body:fd});
        onLogin(d.access_token, email);
      }
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#07090f",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",position:"relative",overflow:"hidden"}}>
      <style>{CSS}</style>
      <div style={{position:"absolute",top:"15%",left:"10%",width:"500px",height:"500px",borderRadius:"50%",background:"radial-gradient(circle,rgba(16,185,129,0.07),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"15%",right:"10%",width:"400px",height:"400px",borderRadius:"50%",background:"radial-gradient(circle,rgba(59,130,246,0.05),transparent 70%)",pointerEvents:"none"}}/>
      
      <div className="card fade-up" style={{width:"100%",maxWidth:"420px",padding:"40px",boxShadow:"0 30px 60px rgba(0,0,0,0.6)"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
            <div style={{width:"38px",height:"38px",background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"800",color:"white",fontSize:"20px"}}>C</div>
            <span style={{color:"white",fontSize:"26px",fontWeight:"800",letterSpacing:"-0.5px"}}>CogniFi</span>
          </div>
          <p style={{color:"#475569",fontSize:"13px",margin:0}}>AI-Powered Financial Intelligence</p>
        </div>

        <div style={{display:"flex",background:"#07090f",borderRadius:"12px",padding:"4px",marginBottom:"24px",gap:"4px"}}>
          {["login","register"].map(m => (
            <button key={m} onClick={()=>{setMode(m);setErr("");}}
              style={{flex:1,padding:"9px",borderRadius:"9px",border:"none",cursor:"pointer",fontWeight:"700",fontSize:"13px",transition:"all 0.2s",fontFamily:"inherit",
                background:mode===m?"#10b981":"transparent",color:mode===m?"white":"#475569"}}>
              {m==="login"?"Sign In":"Create Account"}
            </button>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
          <div>
            <label style={{display:"block",color:"#64748b",fontSize:"12px",fontWeight:"600",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Email</label>
            <input className="input-f" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>
          </div>
          <div>
            <label style={{display:"block",color:"#64748b",fontSize:"12px",fontWeight:"600",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Password</label>
            <input className="input-f" type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="••••••••"/>
          </div>
          {err && <div style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:"10px",padding:"11px 14px",color:"#fca5a5",fontSize:"13px"}}>{err}</div>}
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{width:"100%",justifyContent:"center",padding:"13px",fontSize:"15px",marginTop:"4px"}}>
            {loading ? <><span className="spin">◌</span> Please wait…</> : mode==="login" ? "Sign In →" : "Create Account →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SIDEBAR
// ═══════════════════════════════════════════════════════════════════
const ICONS = {
  dashboard: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  transactions: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  chat: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  reminders: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  trash: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  logout: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};
const NAV_ITEMS = [
  {id:"dashboard",   label:"Dashboard"},
  {id:"transactions",label:"Transactions"},
  {id:"chat",        label:"AI Chat"},
  {id:"reminders",   label:"Reminders"},
  {id:"trash",       label:"Trash"},
];

function Sidebar({page,setPage,email,onLogout,trashCount}) {
  const [open,setOpen] = useState(true);
  return (
    <div style={{width:open?"216px":"60px",background:"#07090f",borderRight:"1px solid rgba(255,255,255,0.05)",display:"flex",flexDirection:"column",transition:"width 0.22s ease",overflow:"hidden",flexShrink:0,height:"100vh",position:"sticky",top:0}}>
      <div onClick={()=>setOpen(!open)} style={{padding:"18px 14px",display:"flex",alignItems:"center",gap:"10px",borderBottom:"1px solid rgba(255,255,255,0.05)",cursor:"pointer",flexShrink:0}}>
        <div style={{width:"30px",height:"30px",background:"linear-gradient(135deg,#10b981,#059669)",borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"800",color:"white",fontSize:"15px",flexShrink:0}}>C</div>
        {open && <span style={{color:"white",fontWeight:"800",fontSize:"16px",whiteSpace:"nowrap"}}>CogniFi</span>}
      </div>
      <nav style={{flex:1,padding:"10px 7px",display:"flex",flexDirection:"column",gap:"2px",overflowY:"auto"}}>
        {NAV_ITEMS.map(({id,label})=>(
          <button key={id} onClick={()=>setPage(id)} className={`nav-item${page===id?" active":""}`}>
            <span style={{flexShrink:0}}>{ICONS[id]}</span>
            {open && <span style={{flex:1}}>{label}</span>}
            {/* Trash count badge */}
            {id==="trash" && trashCount>0 && (
              <span style={{
                background:"rgba(239,68,68,0.15)",color:"#f87171",
                fontSize:"10px",fontWeight:"800",padding:"1px 6px",
                borderRadius:"20px",border:"1px solid rgba(239,68,68,0.2)",
                flexShrink:0,minWidth:"18px",textAlign:"center",
              }}>{trashCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div style={{padding:"10px 7px",borderTop:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
        {open && <div style={{padding:"6px 12px",marginBottom:"4px",color:"#334155",fontSize:"12px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{email}</div>}
        <button onClick={onLogout} className="nav-item" style={{color:"#475569"}}
          onMouseEnter={e=>{e.currentTarget.style.color="#f87171";e.currentTarget.style.background="rgba(239,68,68,0.08)"}}
          onMouseLeave={e=>{e.currentTarget.style.color="#475569";e.currentTarget.style.background="transparent"}}>
          {ICONS.logout}{open&&"Sign Out"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function StatCard({label,value,sub,color,icon}) {
  const colors = {green:"#10b981",blue:"#3b82f6",rose:"#ef4444",amber:"#f59e0b"};
  const c = colors[color]||colors.green;
  return (
    <div className={`card card-hover stat-card sc-${color}`} style={{flex:1,minWidth:"180px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"16px"}}>
        <span style={{fontSize:"13px",color:"#475569",fontWeight:"600"}}>{label}</span>
        <div style={{width:"36px",height:"36px",borderRadius:"10px",background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>{icon}</div>
      </div>
      <div className="mono" style={{fontSize:"26px",fontWeight:"700",color:"white",letterSpacing:"-0.5px",marginBottom:"6px"}}>{value}</div>
      <div style={{fontSize:"12px",color:"#334155"}}>{sub}</div>
    </div>
  );
}

// ─── PinnedWidget: uses data already executed by /dashboard/view ────
// Backend returns: { id, title, chart_type, data: [...], config: { series_keys } }
// No secondary API call needed — render immediately.
function PinnedWidget({widget, onUnpin}) {
  const chartData  = widget.data  || [];
  const seriesKeys = widget.config?.series_keys || [];
  const chartType  = widget.chart_type;

  const CHART_COLORS = {line:"#3b82f6",bar:"#10b981",pie:"#8b5cf6",donut:"#f59e0b",area:"#06b6d4"};
  const typeColor = CHART_COLORS[chartType] || "#475569";

  return (
    <div className="card card-hover" style={{padding:"22px",display:"flex",flexDirection:"column",gap:"14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h3 style={{color:"white",fontSize:"14px",fontWeight:"700",margin:"0 0 6px"}}>{widget.title}</h3>
          <span style={{fontSize:"10px",fontWeight:"700",color:typeColor,background:`${typeColor}18`,padding:"2px 9px",borderRadius:"20px",textTransform:"uppercase",letterSpacing:"0.5px"}}>
            {chartType}
          </span>
        </div>
        {onUnpin && (
          <button className="btn btn-danger" onClick={()=>onUnpin(widget.id)}
            style={{padding:"4px 9px",fontSize:"11px",opacity:0.55}} title="Remove from dashboard">
            ✕
          </button>
        )}
      </div>

      {chartData.length > 0
        ? <ChatChart data={chartData} chart_type={chartType} series_keys={seriesKeys}/>
        : <div style={{height:"140px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"8px",color:"#334155",fontSize:"13px",textAlign:"center"}}>
            <span style={{fontSize:"24px"}}>📭</span>
            No data available yet
          </div>
      }
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────
function Dashboard({token, toast, setPage}) {
  const [txs,     setTxs]     = useState([]);
  const [txLoad,  setTxLoad]  = useState(true);
  const [widgets, setWidgets] = useState([]);
  const [wLoad,   setWLoad]   = useState(true);

  const loadWidgets = () => {
    setWLoad(true);
    call("/dashboard/view",{},token)
      .then(d=>setWidgets(Array.isArray(d)?d:[]))
      .catch(()=>setWidgets([]))
      .finally(()=>setWLoad(false));
  };

  useEffect(()=>{
    call("/transactions/",{},token)
      .then(setTxs).catch(()=>{}).finally(()=>setTxLoad(false));
    loadWidgets();
  },[token]);

  // ── stat card numbers only — no hardcoded charts ──
  const now = new Date();
  const thisMonth = txs.filter(t=>{
    const d=new Date(t.date);
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  });
  const income   = txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expenses = txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const mInc = thisMonth.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const mExp = thisMonth.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const recent = [...txs].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);

  if (txLoad) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"300px",color:"#475569",gap:"10px"}}>
      <span className="spin" style={{fontSize:"20px",color:"#10b981"}}>◌</span> Loading dashboard…
    </div>
  );

  return (
    <div className="fade-up" style={{padding:"28px",display:"flex",flexDirection:"column",gap:"24px"}}>

      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"10px"}}>
        <div>
          <h1 style={{color:"white",fontSize:"22px",fontWeight:"800",margin:0,letterSpacing:"-0.3px"}}>Dashboard</h1>
          <p style={{color:"#475569",fontSize:"13px",margin:"4px 0 0"}}>Your financial overview at a glance</p>
        </div>
        <button className="btn btn-ghost" onClick={loadWidgets} title="Refresh charts"
          style={{fontSize:"13px",gap:"6px"}}>
          ↺ Refresh Charts
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
        <StatCard label="Net Balance"          value={inr(income-expenses)} sub="All time"  color="green" icon="💰"/>
        <StatCard label="This Month Income"    value={inr(mInc)} sub={`${thisMonth.filter(t=>t.type==="income").length} transactions`}  color="blue"  icon="📈"/>
        <StatCard label="This Month Expenses"  value={inr(mExp)} sub={`${thisMonth.filter(t=>t.type==="expense").length} transactions`} color="rose"  icon="📉"/>
        <StatCard label="Savings Rate"         value={mInc>0?`${Math.round(((mInc-mExp)/mInc)*100)}%`:"N/A"} sub="This month" color="amber" icon="🎯"/>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="card" style={{padding:"22px"}}>
        <h3 style={{color:"white",fontSize:"15px",fontWeight:"700",margin:"0 0 16px"}}>Recent Transactions</h3>
        {recent.length===0 ? (
          <div style={{color:"#334155",fontSize:"13px",padding:"20px 0",textAlign:"center"}}>No transactions yet. Add your first one!</div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"2px"}}>
            {recent.map(tx=>(
              <div key={tx.id} style={{display:"flex",alignItems:"center",gap:"14px",padding:"11px 12px",borderRadius:"10px",transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:"36px",height:"36px",borderRadius:"10px",background:tx.type==="income"?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"15px"}}>
                  {tx.type==="income"?"↑":"↓"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:"#e2e8f0",fontSize:"14px",fontWeight:"600",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.merchant||"Unknown"}</div>
                  <div style={{color:"#334155",fontSize:"12px"}}>{tx.category} · {fmtDt(tx.date)}</div>
                </div>
                <div className="mono" style={{color:tx.type==="income"?"#34d399":"#f87171",fontWeight:"700",fontSize:"15px",flexShrink:0}}>
                  {tx.type==="income"?"+":"-"}{inr(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pinned Charts — ALL from /dashboard/view, zero hardcoding ── */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <h2 style={{color:"white",fontSize:"16px",fontWeight:"800",margin:0,letterSpacing:"-0.2px"}}>
            📌 Pinned Charts
          </h2>
          <span style={{color:"#334155",fontSize:"12px"}}>
            Pin charts from the AI Chat tab
          </span>
        </div>

        {wLoad ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"48px",color:"#475569",gap:"8px"}}>
            <span className="spin" style={{fontSize:"16px",color:"#10b981"}}>◌</span> Loading your charts…
          </div>
        ) : widgets.length===0 ? (
          /* ── Empty state ── */
          <div className="card" style={{padding:"52px",textAlign:"center"}}>
            <div style={{fontSize:"40px",marginBottom:"14px"}}>📊</div>
            <div style={{color:"#94a3b8",fontSize:"15px",fontWeight:"600",marginBottom:"6px"}}>No charts pinned yet</div>
            <div style={{color:"#334155",fontSize:"13px",marginBottom:"20px",lineHeight:"1.6"}}>
              Go to the AI Chat tab, ask a financial question,<br/>and click <strong style={{color:"#f59e0b"}}>📌 Pin to Dashboard</strong> on any chart.
            </div>
            <button className="btn btn-primary" onClick={()=>setPage("chat")}>
              Open AI Chat →
            </button>
          </div>
        ) : (
          /* ── Widget grid — each card self-hydrates via /chat/ ── */
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(360px,1fr))",gap:"16px"}}>
            {widgets.map(w=>(
              <PinnedWidget key={w.id} widget={w} onUnpin={null}/>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  ADD TRANSACTION MODAL
// ═══════════════════════════════════════════════════════════════════
function AddTransactionModal({token,onClose,onAdded}) {
  const [tab,setTab] = useState("manual");
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const [form,setForm] = useState({amount:"",type:"expense",category:"Food",merchant:"",description:"",date:today()});
  const [recording,setRecording] = useState(false);
  const [audioBlob,setAudioBlob] = useState(null);
  const recRef = useRef(null); const chunksRef = useRef([]);
  const [scanFile,setScanFile] = useState(null);
  const [scanImg,setScanImg] = useState(null);
  const [scanData,setScanData] = useState(null);
  const [scanLoading,setScanLoading] = useState(false);

  const setF = (k,v) => setForm(f=>({...f,[k]:v}));

  const submitManual = async () => {
    if (!form.amount||!form.merchant) return setErr("Amount and merchant are required.");
    setLoading(true); setErr("");
    try {
      await call("/transactions/confirm-ocr",{method:"POST",body:JSON.stringify({...form,amount:parseFloat(form.amount),date:form.date?new Date(form.date).toISOString():new Date().toISOString()})},token);
      onAdded("Transaction added!");
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      chunksRef.current = [];
      recRef.current = new MediaRecorder(stream);
      recRef.current.ondataavailable = e=>chunksRef.current.push(e.data);
      recRef.current.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current,{type:"audio/webm"}));
        stream.getTracks().forEach(t=>t.stop());
      };
      recRef.current.start();
      setRecording(true);
    } catch(e) { setErr("Microphone access denied."); }
  };

  const stopRec = () => { recRef.current?.stop(); setRecording(false); };

  const submitVoice = async () => {
    if (!audioBlob) return setErr("Record audio first.");
    setLoading(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file",audioBlob,"audio.webm");
      await call("/voice-transaction/",{method:"POST",body:fd},token);
      onAdded("Voice transaction created!");
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const handleScanFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setScanFile(f); setScanData(null);
    const reader = new FileReader(); reader.onload=ev=>setScanImg(ev.target.result); reader.readAsDataURL(f);
  };

  const analyzeScan = async () => {
    if (!scanFile) return setErr("Upload an image first.");
    setScanLoading(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file",scanFile);
      const d = await call("/transactions/scan-receipt",{method:"POST",body:fd},token);
      setScanData({...d, date:d.date||today()});
    } catch(e) { setErr(e.message); }
    finally { setScanLoading(false); }
  };

  const confirmScan = async () => {
    setLoading(true); setErr("");
    try {
      await call("/transactions/confirm-ocr",{method:"POST",body:JSON.stringify({...scanData,amount:parseFloat(scanData.amount),date:scanData.date?new Date(scanData.date).toISOString():new Date().toISOString()})},token);
      onAdded("Receipt scanned & saved!");
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{padding:"22px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{color:"white",margin:0,fontSize:"18px",fontWeight:"800"}}>Add Transaction</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{padding:"6px 10px"}}>✕</button>
        </div>
        <div style={{padding:"0 24px",paddingTop:"16px",display:"flex",gap:"6px"}}>
          {["manual","voice","scan"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setErr("");}} className={`tab${tab===t?" active":""}`} style={{textTransform:"capitalize"}}>
              {t==="manual"?"✏️ Manual":t==="voice"?"🎤 Voice":"📷 Scan Receipt"}
            </button>
          ))}
        </div>

        <div style={{padding:"20px 24px 24px"}}>
          {err && <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"10px",padding:"10px 14px",color:"#fca5a5",fontSize:"13px",marginBottom:"16px"}}>{err}</div>}

          {tab==="manual" && (
            <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
              <div style={{display:"flex",gap:"12px"}}>
                <div style={{flex:1}}>
                  <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Amount (₹)</label>
                  <input className="input-f" type="number" placeholder="0.00" value={form.amount} onChange={e=>setF("amount",e.target.value)}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Type</label>
                  <select className="input-f" value={form.type} onChange={e=>setF("type",e.target.value)}>
                    <option value="expense">Expense</option><option value="income">Income</option>
                  </select>
                </div>
              </div>
              <div style={{display:"flex",gap:"12px"}}>
                <div style={{flex:1}}>
                  <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Merchant</label>
                  <input className="input-f" placeholder="e.g. Zomato, Amazon" value={form.merchant} onChange={e=>setF("merchant",e.target.value)}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Category</label>
                  <select className="input-f" value={form.category} onChange={e=>setF("category",e.target.value)}>
                    {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:"flex",gap:"12px"}}>
                <div style={{flex:1}}>
                  <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Date</label>
                  <input className="input-f" type="date" value={form.date} onChange={e=>setF("date",e.target.value)}/>
                </div>
              </div>
              <div>
                <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Description (optional)</label>
                <input className="input-f" placeholder="Short note about this transaction" value={form.description} onChange={e=>setF("description",e.target.value)}/>
              </div>
              <button className="btn btn-primary" onClick={submitManual} disabled={loading} style={{justifyContent:"center",marginTop:"4px"}}>
                {loading?<><span className="spin">◌</span> Saving…</>:"Save Transaction"}
              </button>
            </div>
          )}

          {tab==="voice" && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"20px",padding:"10px 0"}}>
              <p style={{color:"#64748b",fontSize:"13px",textAlign:"center",lineHeight:"1.6",margin:0}}>
                Speak naturally about your transaction.<br/>
                <span style={{color:"#334155"}}>e.g. "Spent 350 rupees on lunch at Domino's yesterday"</span>
              </p>
              <button onClick={recording?stopRec:startRec}
                style={{width:"90px",height:"90px",borderRadius:"50%",border:`3px solid ${recording?"#ef4444":"#10b981"}`,background:recording?"rgba(239,68,68,0.1)":"rgba(16,185,129,0.1)",cursor:"pointer",fontSize:"32px",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"}}>
                {recording ? <span className="blink">⏹</span> : "🎤"}
              </button>
              <span style={{color:recording?"#f87171":"#475569",fontSize:"13px",fontWeight:"600"}}>
                {recording?"Recording… click to stop":"Click to start recording"}
              </span>
              {audioBlob && !recording && (
                <>
                  <div style={{color:"#34d399",fontSize:"13px",fontWeight:"600"}}>✓ Audio recorded — ready to submit</div>
                  <audio controls src={URL.createObjectURL(audioBlob)} style={{width:"100%",borderRadius:"8px"}}/>
                  <button className="btn btn-primary" onClick={submitVoice} disabled={loading} style={{justifyContent:"center",width:"100%"}}>
                    {loading?<><span className="spin">◌</span> Processing…</>:"Submit Voice Transaction"}
                  </button>
                </>
              )}
            </div>
          )}

          {tab==="scan" && (
            <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
              {!scanData ? (
                <>
                  <div style={{border:"2px dashed rgba(255,255,255,0.1)",borderRadius:"14px",padding:"28px",textAlign:"center",cursor:"pointer",transition:"border-color 0.2s"}}
                    onClick={()=>document.getElementById("scanInput").click()}
                    onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(16,185,129,0.4)"}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.1)"}>
                    <input id="scanInput" type="file" accept="image/*" style={{display:"none"}} onChange={handleScanFile}/>
                    {scanImg ? <img src={scanImg} alt="receipt" style={{maxHeight:"160px",borderRadius:"10px",objectFit:"contain"}}/> : (
                      <><div style={{fontSize:"36px",marginBottom:"8px"}}>📷</div>
                      <div style={{color:"#475569",fontSize:"13px"}}>Click to upload receipt image</div></>
                    )}
                  </div>
                  {scanFile && (
                    <button className="btn btn-primary" onClick={analyzeScan} disabled={scanLoading} style={{justifyContent:"center"}}>
                      {scanLoading?<><span className="spin">◌</span> Analyzing receipt…</>:"🔍 Analyze Receipt with AI"}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div style={{color:"#34d399",fontSize:"13px",fontWeight:"600",marginBottom:"4px"}}>✓ Receipt analyzed — review and confirm</div>
                  {[["merchant","Merchant"],["amount","Amount"],["category","Category"],["description","Description"],["date","Date"]].map(([k,l])=>(
                    <div key={k}>
                      <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{l}</label>
                      {k==="category"?(
                        <select className="input-f" value={scanData[k]||""} onChange={e=>setScanData(d=>({...d,[k]:e.target.value}))}>
                          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                      ):(
                        <input className="input-f" value={scanData[k]||""} onChange={e=>setScanData(d=>({...d,[k]:e.target.value}))} type={k==="amount"?"number":k==="date"?"date":"text"}/>
                      )}
                    </div>
                  ))}
                  <div style={{display:"flex",gap:"10px"}}>
                    <button className="btn btn-ghost" onClick={()=>{setScanData(null);setScanFile(null);setScanImg(null);}} style={{flex:1,justifyContent:"center"}}>← Re-scan</button>
                    <button className="btn btn-primary" onClick={confirmScan} disabled={loading} style={{flex:2,justifyContent:"center"}}>
                      {loading?<><span className="spin">◌</span> Saving…</>:"✓ Confirm & Save"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  BULK EDIT MODAL  (Fix 4: PUT /transactions/bulk-update)
// ═══════════════════════════════════════════════════════════════════
function BulkEditModal({token, selectedTxs, onClose, onDone}) {
  // Build a local editable copy of all selected transactions
  const [rows, setRows] = useState(selectedTxs.map(t=>({
    id: t.id,
    amount: t.amount,
    category: t.category||"Food",
    merchant: t.merchant||"",
    description: t.description||"",
    type: t.type||"expense",
  })));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const setCell = (id, key, val) =>
    setRows(r=>r.map(row=>row.id===id ? {...row,[key]:val} : row));

  const submit = async () => {
    setLoading(true); setErr("");
    try {
      const payload = rows.map(r=>({...r, amount:parseFloat(r.amount)}));
      await call("/transactions/bulk-update", {method:"PUT", body:JSON.stringify(payload)}, token);
      onDone(`${rows.length} transaction${rows.length>1?"s":""}  updated!`);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:"760px"}}>
        <div style={{padding:"22px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h2 style={{color:"white",margin:0,fontSize:"18px",fontWeight:"800"}}>Bulk Edit Transactions</h2>
            <p style={{color:"#475569",fontSize:"13px",margin:"4px 0 0"}}>{rows.length} transaction{rows.length>1?"s":""} selected</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{padding:"6px 10px"}}>✕</button>
        </div>

        <div style={{padding:"16px 24px 24px",display:"flex",flexDirection:"column",gap:"14px"}}>
          {err && <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"10px",padding:"10px 14px",color:"#fca5a5",fontSize:"13px"}}>{err}</div>}

          {/* Quick-apply all rows to same category or type */}
          <div style={{display:"flex",gap:"10px",padding:"12px 14px",background:"rgba(16,185,129,0.05)",borderRadius:"12px",border:"1px solid rgba(16,185,129,0.12)",alignItems:"center",flexWrap:"wrap"}}>
            <span style={{color:"#64748b",fontSize:"12px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>Apply to all:</span>
            <select className="input-f" style={{width:"160px"}} onChange={e=>{if(e.target.value)setRows(r=>r.map(row=>({...row,category:e.target.value})))}}>
              <option value="">— Set Category —</option>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input-f" style={{width:"140px"}} onChange={e=>{if(e.target.value)setRows(r=>r.map(row=>({...row,type:e.target.value})))}}>
              <option value="">— Set Type —</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          {/* Per-row editing table */}
          <div style={{overflowX:"auto"}}>
            <div style={{minWidth:"620px"}}>
              {/* Header */}
              <div style={{display:"grid",gridTemplateColumns:"120px 1fr 130px 100px 80px",gap:"8px",padding:"8px 10px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                {["Merchant","Description","Category","Amount","Type"].map(h=>(
                  <span key={h} style={{color:"#334155",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>{h}</span>
                ))}
              </div>
              {/* Rows */}
              <div style={{maxHeight:"360px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"4px",paddingTop:"6px"}}>
                {rows.map(row=>(
                  <div key={row.id} style={{display:"grid",gridTemplateColumns:"120px 1fr 130px 100px 80px",gap:"8px",padding:"6px 10px",borderRadius:"8px",background:"rgba(255,255,255,0.02)"}}>
                    <input className="input-f" style={{fontSize:"12px",padding:"7px 10px"}} value={row.merchant} onChange={e=>setCell(row.id,"merchant",e.target.value)}/>
                    <input className="input-f" style={{fontSize:"12px",padding:"7px 10px"}} value={row.description} onChange={e=>setCell(row.id,"description",e.target.value)} placeholder="optional"/>
                    <select className="input-f" style={{fontSize:"12px",padding:"7px 10px"}} value={row.category} onChange={e=>setCell(row.id,"category",e.target.value)}>
                      {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="input-f" type="number" style={{fontSize:"12px",padding:"7px 10px"}} value={row.amount} onChange={e=>setCell(row.id,"amount",e.target.value)}/>
                    <select className="input-f" style={{fontSize:"12px",padding:"7px 10px"}} value={row.type} onChange={e=>setCell(row.id,"type",e.target.value)}>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:"10px",justifyContent:"flex-end",paddingTop:"4px"}}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading?<><span className="spin">◌</span> Saving…</>:`💾 Save ${rows.length} Transaction${rows.length>1?"s":""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════
function Transactions({token,toast}) {
  const [txs,setTxs] = useState([]);
  const [loading,setLoading] = useState(true);
  const [showAdd,setShowAdd] = useState(false);
  const [search,setSearch] = useState("");
  const [filterType,setFilterType] = useState("all");
  const [filterCat,setFilterCat] = useState("all");
  // Fix 4: track selected rows for bulk edit
  const [selected,setSelected] = useState(new Set());
  const [showBulk,setShowBulk] = useState(false);

  const load = () => {
    setLoading(true);
    call("/transactions/",{},token).then(setTxs).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[token]);

  const del = async id => {
    try { await call(`/transactions/${id}`,{method:"DELETE"},token); toast("Transaction deleted","success"); load(); }
    catch(e) { toast(e.message,"error"); }
  };

  // Fix 4: selection helpers
  const toggleSelect = id => setSelected(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll    = () => setSelected(s=>s.size===filtered.length ? new Set() : new Set(filtered.map(t=>t.id)));
  const selectedTxs  = txs.filter(t=>selected.has(t.id));

  const filtered = txs.filter(t=>{
    if (filterType!=="all"&&t.type!==filterType) return false;
    if (filterCat!=="all"&&t.category!==filterCat) return false;
    if (search&&!(t.merchant||"").toLowerCase().includes(search.toLowerCase())&&!(t.description||"").toLowerCase().includes(search.toLowerCase())&&!(t.category||"").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const METHOD_TAG = m => m==="voice"?<span className="tag tag-voice">🎤 Voice</span>:m==="ocr"?<span className="tag tag-ocr">📷 OCR</span>:<span className="tag" style={{background:"rgba(100,116,139,0.1)",color:"#94a3b8"}}>✏️ Manual</span>;

  return (
    <div className="fade-up" style={{padding:"28px",display:"flex",flexDirection:"column",gap:"20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 style={{color:"white",fontSize:"22px",fontWeight:"800",margin:0,letterSpacing:"-0.3px"}}>Transactions</h1>
          <p style={{color:"#475569",fontSize:"13px",margin:"4px 0 0"}}>{txs.length} total · {filtered.length} shown</p>
        </div>
        <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
          {/* Fix 4: show Bulk Edit button whenever rows are selected */}
          {selected.size>0 && (
            <button className="btn btn-amber" onClick={()=>setShowBulk(true)}>
              ✏️ Edit {selected.size} Selected
            </button>
          )}
          <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Transaction</button>
        </div>
      </div>

      <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
        <div style={{position:"relative",flex:"2",minWidth:"200px"}}>
          <span style={{position:"absolute",left:"12px",top:"50%",transform:"translateY(-50%)",color:"#334155",fontSize:"14px"}}>🔍</span>
          <input className="input-f" style={{paddingLeft:"36px"}} placeholder="Search merchant, category…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="input-f" style={{flex:1,minWidth:"130px"}} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="all">All Types</option><option value="expense">Expenses</option><option value="income">Income</option>
        </select>
        <select className="input-f" style={{flex:1,minWidth:"140px"}} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        {loading ? (
          <div style={{padding:"40px",textAlign:"center",color:"#475569"}}>Loading transactions…</div>
        ) : filtered.length===0 ? (
          <div style={{padding:"48px",textAlign:"center",color:"#334155",fontSize:"14px"}}>No transactions match your filters.</div>
        ) : (
          <div>
            <div style={{display:"grid",gridTemplateColumns:"36px 1fr 1fr 100px 90px 80px 36px",gap:"8px",padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              {/* Fix 4: select-all checkbox */}
              <input type="checkbox" checked={filtered.length>0&&selected.size===filtered.length}
                onChange={toggleAll} style={{accentColor:"#10b981",width:"15px",height:"15px",cursor:"pointer"}}/>
              {["Merchant","Category","Amount","Date","Method",""].map((h,i)=>
                <span key={i} style={{color:"#334155",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>{h}</span>
              )}
            </div>
            <div className="scrollable-list">
              {filtered.map(tx=>(
                <div key={tx.id} style={{display:"grid",gridTemplateColumns:"36px 1fr 1fr 100px 90px 80px 36px",gap:"8px",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)",alignItems:"center",transition:"background 0.1s",background:selected.has(tx.id)?"rgba(16,185,129,0.04)":"transparent"}}
                  onMouseEnter={e=>{if(!selected.has(tx.id))e.currentTarget.style.background="rgba(255,255,255,0.02)"}}
                  onMouseLeave={e=>{if(!selected.has(tx.id))e.currentTarget.style.background="transparent"}}>
                  {/* Fix 4: per-row checkbox */}
                  <input type="checkbox" checked={selected.has(tx.id)} onChange={()=>toggleSelect(tx.id)}
                    style={{accentColor:"#10b981",width:"15px",height:"15px",cursor:"pointer"}}/>
                  <div>
                    <div style={{color:"#e2e8f0",fontSize:"14px",fontWeight:"600",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.merchant||"Unknown"}</div>
                    <div style={{color:"#334155",fontSize:"11px",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description||"—"}</div>
                  </div>
                  <span className="tag tag-cat" style={{alignSelf:"center"}}>{tx.category||"—"}</span>
                  <span className={`mono tag ${tx.type==="income"?"tag-income":"tag-expense"}`} style={{fontSize:"13px",padding:"4px 8px"}}>
                    {tx.type==="income"?"+":"-"}{inr(tx.amount)}
                  </span>
                  <span style={{color:"#475569",fontSize:"12px"}}>{fmtDt(tx.date)}</span>
                  <div>{METHOD_TAG(tx.method)}</div>
                  <button className="btn btn-danger" onClick={()=>del(tx.id)} style={{padding:"5px 8px",fontSize:"12px"}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAdd && <AddTransactionModal token={token} onClose={()=>setShowAdd(false)} onAdded={msg=>{setShowAdd(false);toast(msg,"success");load();}}/>}
      {/* Fix 4: mount bulk edit modal */}
      {showBulk && <BulkEditModal token={token} selectedTxs={selectedTxs} onClose={()=>setShowBulk(false)} onDone={msg=>{setShowBulk(false);setSelected(new Set());toast(msg,"success");load();}}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════════════════
function ChatChart({data,chart_type,series_keys}) {
  if (!data||!data.length) return null;
  const keys = Object.keys(data[0]);
  const xKey = keys.find(k=>!series_keys.includes(k))||keys[0];
  const TT = ({active,payload,label})=>active&&payload?.length?<div style={{background:"#0d1629",border:"1px solid #1e293b",borderRadius:"10px",padding:"10px 14px",fontSize:"12px"}}><div style={{color:"#94a3b8",marginBottom:"4px"}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.color||"#10b981"}}>{p.name}: {inr(p.value)}</div>)}</div>:null;

  if (chart_type==="pie"||chart_type==="donut") {
    const pd = data.map(d=>({name:String(d[xKey]),value:parseFloat(d[series_keys[0]]||0)}));
    return <ResponsiveContainer width="100%" height={180}><PieChart><Pie data={pd} cx="50%" cy="50%" innerRadius={chart_type==="donut"?45:0} outerRadius={70} dataKey="value">{pd.map((_,i)=><Cell key={i} fill={PC[i%PC.length]}/>)}</Pie><Tooltip formatter={v=>inr(v)} contentStyle={{background:"#0d1629",border:"1px solid #1e293b",borderRadius:"8px",fontSize:"12px"}}/></PieChart></ResponsiveContainer>;
  }
  if (chart_type==="bar") {
    return <ResponsiveContainer width="100%" height={180}><BarChart data={data}><XAxis dataKey={xKey} tick={{fill:"#475569",fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#475569",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>inr(v)}/><Tooltip content={<TT/>}/>{series_keys.map((k,i)=><Bar key={k} dataKey={k} fill={PC[i%PC.length]} radius={[4,4,0,0]}/>)}</BarChart></ResponsiveContainer>;
  }
  const IsArea = chart_type==="area";
  const ChartC = IsArea ? AreaChart : LineChart;
  const DataC = IsArea ? Area : Line;
  return <ResponsiveContainer width="100%" height={180}><ChartC data={data}><defs>{series_keys.map((k,i)=><linearGradient key={k} id={`g${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={PC[i%PC.length]} stopOpacity={0.3}/><stop offset="95%" stopColor={PC[i%PC.length]} stopOpacity={0}/></linearGradient>)}</defs><XAxis dataKey={xKey} tick={{fill:"#475569",fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#475569",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>inr(v)}/><Tooltip content={<TT/>}/>{series_keys.map((k,i)=><DataC key={k} type="monotone" dataKey={k} stroke={PC[i%PC.length]} fill={IsArea?`url(#g${i})`:"none"} strokeWidth={2} dot={false}/>)}</ChartC></ResponsiveContainer>;
}

function Chat({token, toast, email}) {
  // ── Persist messages in localStorage keyed by user email ──────────
  const STORAGE_KEY = `cognifi_chat_${email}`;
  const WELCOME = {
    role:"assistant",
    text:"Hi! I'm your CogniFi AI assistant. Ask me anything about your finances — spending trends, category breakdowns, income vs expenses, or anything else! 💰\n\nTip: When I show you a chart, click 📌 Pin to Dashboard to save it.",
    ts: Date.now(),
  };

  const [msgs, setMsgs] = useState(()=>{
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [WELCOME];
  });

  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [pinning, setPinning] = useState(null);
  const bottomRef = useRef(null);

  // Save to localStorage whenever msgs changes (keep last 40 messages = ~20 pairs)
  useEffect(()=>{
    try {
      const toSave = msgs.slice(-40);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [msgs]);

  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),[msgs]);

  const send = async () => {
    if (!input.trim()||loading) return;
    const q = input.trim(); setInput("");
    setMsgs(m=>[...m,{role:"user", text:q, ts:Date.now()}]);
    setLoading(true);
    try {
      const r = await call("/chat/",{method:"POST",body:JSON.stringify({query:q})},token);
      setMsgs(m=>[...m,{
        role:       "assistant",
        text:       r.answer,
        isVisual:   r.is_visual,
        chartType:  r.chart_type,
        chartTitle: r.title,
        chartData:  r.data,
        seriesKeys: r.series_keys || [],
        sqlUsed:    r.sql_used   || "",
        pinned:     false,
        ts:         Date.now(),
      }]);
    } catch(e) {
      setMsgs(m=>[...m,{role:"assistant", text:`Sorry, something went wrong: ${e.message}`, ts:Date.now()}]);
    } finally { setLoading(false); }
  };

  const pinChart = async (idx) => {
    const m = msgs[idx];
    if (!m?.isVisual || !m.sqlUsed) return;
    setPinning(idx);
    try {
      await call("/dashboard/pin",{
        method:"POST",
        body:JSON.stringify({
          title:       m.chartTitle || "Pinned Chart",
          chart_type:  m.chartType,
          sql_query:   m.sqlUsed,
          series_keys: m.seriesKeys,
        })
      },token);
      setMsgs(ms=>ms.map((msg,i)=>i===idx?{...msg,pinned:true}:msg));
      toast("Chart pinned to dashboard! 📌","success");
    } catch(e) {
      toast(`Pin failed: ${e.message}`,"error");
    } finally { setPinning(null); }
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMsgs([WELCOME]);
  };

  // Format timestamp for message
  const fmtTs = ts => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) +
           " · " + d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  };

  return (
    <div className="fade-up" style={{height:"100%",display:"flex",flexDirection:"column",padding:"28px",gap:"16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <h1 style={{color:"white",fontSize:"22px",fontWeight:"800",margin:0,letterSpacing:"-0.3px"}}>AI Chat</h1>
          <p style={{color:"#475569",fontSize:"13px",margin:"4px 0 0"}}>
            Ask anything · history saved · pin charts to dashboard
          </p>
        </div>
        <button className="btn btn-ghost" onClick={clearHistory}
          style={{fontSize:"12px",color:"#334155",border:"1px solid rgba(255,255,255,0.06)"}}
          title="Clear chat history">
          🗑 Clear History
        </button>
      </div>

      <div className="card" style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
        <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:"14px"}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"82%",display:"flex",flexDirection:"column",gap:"6px"}}>

                {m.role==="assistant" && (
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"2px"}}>
                    <div style={{width:"26px",height:"26px",borderRadius:"8px",background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",flexShrink:0}}>C</div>
                    {m.ts && <span style={{color:"#1e293b",fontSize:"10px"}}>{fmtTs(m.ts)}</span>}
                  </div>
                )}

                <div style={{
                  background:  m.role==="user"?"linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.1))":"rgba(255,255,255,0.04)",
                  border:      `1px solid ${m.role==="user"?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.06)"}`,
                  borderRadius: m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                  padding:"12px 16px",color:"#e2e8f0",fontSize:"14px",lineHeight:"1.7",
                  whiteSpace:"pre-wrap",
                }}>
                  {m.text}
                </div>

                {m.role==="user" && m.ts && (
                  <div style={{textAlign:"right",color:"#1e293b",fontSize:"10px",marginTop:"2px"}}>{fmtTs(m.ts)}</div>
                )}

                {/* Chart + Pin button */}
                {m.isVisual && m.chartData?.length>0 && (
                  <div className="card" style={{padding:"16px",minWidth:"360px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",gap:"10px"}}>
                      {m.chartTitle && (
                        <div style={{color:"#94a3b8",fontSize:"13px",fontWeight:"600",flex:1}}>{m.chartTitle}</div>
                      )}
                      {m.sqlUsed && (
                        <button onClick={()=>pinChart(i)} disabled={m.pinned||pinning===i} className="btn"
                          style={{
                            padding:"5px 12px",fontSize:"12px",fontWeight:"700",flexShrink:0,
                            background:m.pinned?"rgba(16,185,129,0.12)":"rgba(245,158,11,0.1)",
                            color:m.pinned?"#34d399":"#fbbf24",
                            border:`1px solid ${m.pinned?"rgba(16,185,129,0.2)":"rgba(245,158,11,0.25)"}`,
                            borderRadius:"8px",cursor:m.pinned?"default":"pointer",
                          }}>
                          {pinning===i?<><span className="spin">◌</span> Pinning…</>:m.pinned?"✓ Pinned":"📌 Pin to Dashboard"}
                        </button>
                      )}
                    </div>
                    <ChatChart data={m.chartData} chart_type={m.chartType} series_keys={m.seriesKeys||[]}/>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{width:"26px",height:"26px",borderRadius:"8px",background:"linear-gradient(135deg,#10b981,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px"}}>C</div>
              <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"16px 16px 16px 4px",padding:"12px 18px",display:"flex",gap:"5px",alignItems:"center"}}>
                {[0,1,2].map(j=><div key={j} style={{width:"6px",height:"6px",borderRadius:"50%",background:"#10b981",animation:`blink 1.4s ${j*0.2}s ease infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        <div style={{padding:"16px 20px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:"10px"}}>
          <input className="input-f" style={{flex:1}} placeholder="Ask about your spending, income, trends…"
            value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}/>
          <button className="btn btn-primary" onClick={send} disabled={loading||!input.trim()} style={{padding:"10px 20px",flexShrink:0}}>
            Send →
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  ADD REMINDER MODAL
// ═══════════════════════════════════════════════════════════════════
function AddReminderModal({token,onClose,onAdded}) {
  const [form,setForm] = useState({merchant:"",amount:"",due_date:"",is_recursive:false,frequency_type:"months",frequency_value:"1"});
  const [loading,setLoading] = useState(false);
  const [err,setErr] = useState("");
  const setF = (k,v)=>setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.merchant||!form.amount||!form.due_date) return setErr("Merchant, amount & due date are required.");
    setLoading(true); setErr("");
    try {
      const payload = {
        merchant:form.merchant, amount:parseFloat(form.amount),
        due_date:new Date(form.due_date).toISOString(),
        is_recursive:form.is_recursive,
        frequency_type:form.is_recursive?form.frequency_type:null,
        frequency_value:form.is_recursive?parseInt(form.frequency_value):null,
      };
      await call("/reminders/",{method:"POST",body:JSON.stringify(payload)},token);
      onAdded("Reminder created!");
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{padding:"22px 24px",borderBottom:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h2 style={{color:"white",margin:0,fontSize:"18px",fontWeight:"800"}}>Create Reminder</h2>
          <button onClick={onClose} className="btn btn-ghost" style={{padding:"6px 10px"}}>✕</button>
        </div>
        <div style={{padding:"22px 24px",display:"flex",flexDirection:"column",gap:"14px"}}>
          {err && <div style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"10px",padding:"10px 14px",color:"#fca5a5",fontSize:"13px"}}>{err}</div>}
          {[["merchant","Merchant / Bill Name","text","e.g. Netflix, Electricity Bill"],["amount","Amount (₹)","number","0.00"],["due_date","Due Date","date",""]].map(([k,l,t,p])=>(
            <div key={k}>
              <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{l}</label>
              <input className="input-f" type={t} placeholder={p} value={form[k]} onChange={e=>setF(k,e.target.value)}/>
            </div>
          ))}
          <label style={{display:"flex",alignItems:"center",gap:"10px",cursor:"pointer",padding:"10px 14px",background:"rgba(255,255,255,0.03)",borderRadius:"10px",border:"1px solid rgba(255,255,255,0.06)"}}>
            <input type="checkbox" checked={form.is_recursive} onChange={e=>setF("is_recursive",e.target.checked)} style={{width:"16px",height:"16px",accentColor:"#10b981"}}/>
            <span style={{color:"#94a3b8",fontSize:"14px",fontWeight:"500"}}>This is a recurring bill</span>
          </label>
          {form.is_recursive && (
            <div style={{display:"flex",gap:"10px",padding:"14px",background:"rgba(16,185,129,0.05)",borderRadius:"10px",border:"1px solid rgba(16,185,129,0.12)"}}>
              <div style={{flex:1}}>
                <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Repeat every</label>
                <input className="input-f" type="number" min="1" value={form.frequency_value} onChange={e=>setF("frequency_value",e.target.value)}/>
              </div>
              <div style={{flex:1}}>
                <label style={{display:"block",color:"#64748b",fontSize:"11px",fontWeight:"700",marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Period</label>
                {/* Fix 3: values MUST be plural: "days"/"weeks"/"months" — matches Python relativedelta kwargs */}
                <select className="input-f" value={form.frequency_type} onChange={e=>setF("frequency_type",e.target.value)}>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          )}
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{justifyContent:"center",marginTop:"4px"}}>
            {loading?<><span className="spin">◌</span> Creating…</>:"Create Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  REMINDERS
// ═══════════════════════════════════════════════════════════════════
function Reminders({token,toast}) {
  const [reminders,setReminders] = useState([]);
  const [loading,setLoading] = useState(true);
  const [showAdd,setShowAdd] = useState(false);

  const load = () => {
    setLoading(true);
    call("/reminders/",{},token).then(setReminders).catch(()=>{}).finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[token]);

  const pay = async id => {
    try { await call(`/reminders/${id}/pay`,{method:"POST"},token); toast("Reminder marked as paid!","success"); load(); }
    catch(e) { toast(e.message,"error"); }
  };
  const del = async id => {
    try { await call(`/reminders/${id}`,{method:"DELETE"},token); toast("Reminder deleted","success"); load(); }
    catch(e) { toast(e.message,"error"); }
  };

  const getStatus = r => {
    const d = daysDiff(r.due_date);
    if (d<0) return {label:"Overdue",color:"#f87171",bg:"rgba(239,68,68,0.1)",border:"rgba(239,68,68,0.2)"};
    if (d<=3) return {label:"Due Soon",color:"#fbbf24",bg:"rgba(245,158,11,0.1)",border:"rgba(245,158,11,0.2)"};
    return {label:"Upcoming",color:"#34d399",bg:"rgba(16,185,129,0.08)",border:"rgba(16,185,129,0.15)"};
  };

  return (
    <div className="fade-up" style={{padding:"28px",display:"flex",flexDirection:"column",gap:"20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 style={{color:"white",fontSize:"22px",fontWeight:"800",margin:0,letterSpacing:"-0.3px"}}>Reminders</h1>
          <p style={{color:"#475569",fontSize:"13px",margin:"4px 0 0"}}>{reminders.length} active reminder{reminders.length!==1?"s":""}</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowAdd(true)}>+ Add Reminder</button>
      </div>

      {loading ? <div style={{color:"#475569",textAlign:"center",padding:"40px"}}>Loading reminders…</div> :
       reminders.length===0 ? (
        <div className="card" style={{padding:"60px",textAlign:"center"}}>
          <div style={{fontSize:"40px",marginBottom:"12px"}}>🔔</div>
          <div style={{color:"#475569",fontSize:"14px"}}>No active reminders. Add bills & subscriptions to track them.</div>
        </div>
       ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"14px"}}>
          {reminders.map(r=>{
            const s = getStatus(r);
            const d = daysDiff(r.due_date);
            return (
              <div key={r.id} className="card card-hover" style={{padding:"20px",border:`1px solid ${s.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                  <div>
                    <div style={{color:"white",fontSize:"15px",fontWeight:"700",marginBottom:"4px"}}>{r.title||r.merchant}</div>
                    <div style={{fontSize:"11px",fontWeight:"700",color:s.color,background:s.bg,padding:"3px 9px",borderRadius:"20px",display:"inline-block"}}>{s.label} {d<0?`(${Math.abs(d)}d overdue)`:d===0?"(Today)":d===1?"(Tomorrow)":`(${d}d)`}</div>
                  </div>
                  <div className="mono" style={{fontSize:"20px",fontWeight:"800",color:"white"}}>{inr(r.amount)}</div>
                </div>
                <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"14px",flexWrap:"wrap"}}>
                  <span className="tag tag-cat">{r.category}</span>
                  <span className="tag" style={{background:"rgba(100,116,139,0.1)",color:"#64748b"}}>{r.merchant}</span>
                  {r.is_recursive && <span className="tag" style={{background:"rgba(139,92,246,0.1)",color:"#c4b5fd"}}>🔄 {r.frequency_value} {r.frequency_type}</span>}
                </div>
                <div style={{color:"#334155",fontSize:"12px",marginBottom:"14px"}}>
                  Due: {fmtDt(r.due_date)}
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button className="btn btn-amber" onClick={()=>pay(r.id)} style={{flex:1,justifyContent:"center"}}>✓ Mark Paid</button>
                  <button className="btn btn-danger" onClick={()=>del(r.id)} style={{padding:"7px 14px"}}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
       )}
      {showAdd && <AddReminderModal token={token} onClose={()=>setShowAdd(false)} onAdded={msg=>{setShowAdd(false);toast(msg,"success");load();}}/>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TRASH
// ═══════════════════════════════════════════════════════════════════
function Trash({token, toast, onCountChange}) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);

  const load = () => {
    setLoading(true);
    call("/transactions/trash",{},token)
      .then(d=>{ setItems(d); onCountChange(d.length); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{ load(); },[token]);

  const restore = async id => {
    setRestoring(id);
    try {
      await call(`/transactions/${id}/restore`,{method:"POST"},token);
      toast("Transaction restored!","success");
      load();
    } catch(e) { toast(e.message,"error"); }
    finally { setRestoring(null); }
  };

  // Calculate days remaining before permanent deletion (30-day window)
  const daysLeft = deletedAt => {
    if (!deletedAt) return 30;
    const deleted = new Date(deletedAt);
    const purgeDate = new Date(deleted.getTime() + 30*24*60*60*1000);
    const diff = Math.ceil((purgeDate - new Date()) / (1000*60*60*24));
    return Math.max(0, diff);
  };

  const urgencyStyle = days => {
    if (days <= 3)  return {color:"#f87171", bg:"rgba(239,68,68,0.1)",  border:"rgba(239,68,68,0.2)"};
    if (days <= 7)  return {color:"#fbbf24", bg:"rgba(245,158,11,0.08)", border:"rgba(245,158,11,0.18)"};
    return            {color:"#64748b",  bg:"rgba(100,116,139,0.08)", border:"rgba(100,116,139,0.15)"};
  };

  return (
    <div className="fade-up" style={{padding:"28px",display:"flex",flexDirection:"column",gap:"20px"}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"12px"}}>
        <div>
          <h1 style={{color:"white",fontSize:"22px",fontWeight:"800",margin:0,letterSpacing:"-0.3px"}}>Trash</h1>
          <p style={{color:"#475569",fontSize:"13px",margin:"4px 0 0"}}>
            Deleted transactions are permanently removed after <strong style={{color:"#f87171"}}>30 days</strong>
          </p>
        </div>
        {items.length>0 && (
          <div style={{display:"flex",alignItems:"center",gap:"8px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:"10px",padding:"8px 14px"}}>
            <span style={{fontSize:"14px"}}>🗑</span>
            <span style={{color:"#fca5a5",fontSize:"13px",fontWeight:"600"}}>{items.length} item{items.length!==1?"s":""} in trash</span>
          </div>
        )}
      </div>

      {/* Info banner */}
      <div style={{display:"flex",gap:"10px",padding:"12px 16px",background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",borderRadius:"12px",alignItems:"flex-start"}}>
        <span style={{fontSize:"16px",flexShrink:0}}>ℹ️</span>
        <div style={{color:"#94a3b8",fontSize:"13px",lineHeight:"1.6"}}>
          Transactions deleted within the last 30 days are listed here. You can restore them at any time before they are permanently removed. The countdown starts from when each transaction was deleted.
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px",color:"#475569",gap:"8px"}}>
          <span className="spin" style={{fontSize:"16px",color:"#10b981"}}>◌</span> Loading trash…
        </div>
      ) : items.length===0 ? (
        <div className="card" style={{padding:"64px",textAlign:"center"}}>
          <div style={{fontSize:"48px",marginBottom:"14px"}}>✨</div>
          <div style={{color:"#94a3b8",fontSize:"16px",fontWeight:"600",marginBottom:"6px"}}>Trash is empty</div>
          <div style={{color:"#334155",fontSize:"13px"}}>Deleted transactions will appear here for 30 days before being permanently removed.</div>
        </div>
      ) : (
        <div className="card" style={{overflow:"hidden"}}>
          {/* Table header */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 100px 100px 130px 100px",gap:"8px",padding:"10px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
            {["Merchant","Category","Amount","Deleted On","Time Left",""].map((h,i)=>(
              <span key={i} style={{color:"#334155",fontSize:"11px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"0.5px"}}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div style={{maxHeight:"calc(100vh - 320px)",overflowY:"auto"}}>
            {items.map(tx=>{
              const days = daysLeft(tx.deleted_at);
              const urg  = urgencyStyle(days);
              return (
                <div key={tx.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 100px 100px 130px 100px",gap:"8px",padding:"13px 20px",borderBottom:"1px solid rgba(255,255,255,0.03)",alignItems:"center",transition:"background 0.1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.015)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                  {/* Merchant + description */}
                  <div>
                    <div style={{color:"#94a3b8",fontSize:"14px",fontWeight:"600",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {tx.merchant||"Unknown"}
                    </div>
                    <div style={{color:"#1e293b",fontSize:"11px",marginTop:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {tx.description||"—"}
                    </div>
                  </div>

                  {/* Category */}
                  <span className="tag tag-cat" style={{alignSelf:"center",opacity:0.7}}>{tx.category||"—"}</span>

                  {/* Amount */}
                  <span className="mono" style={{color:"#475569",fontSize:"13px",fontWeight:"600"}}>
                    {tx.type==="income"?"+":"-"}{inr(tx.amount)}
                  </span>

                  {/* Deleted on */}
                  <span style={{color:"#334155",fontSize:"12px"}}>
                    {tx.deleted_at ? fmtDt(tx.deleted_at) : fmtDt(tx.date)}
                  </span>

                  {/* Days left countdown */}
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <div style={{
                      display:"inline-flex",alignItems:"center",gap:"5px",
                      padding:"4px 10px",borderRadius:"20px",
                      background:urg.bg, border:`1px solid ${urg.border}`,
                    }}>
                      {days<=3 && <span className="blink" style={{fontSize:"8px",color:urg.color}}>●</span>}
                      <span style={{color:urg.color,fontSize:"11px",fontWeight:"700"}}>
                        {days===0 ? "Deleting soon" : `${days}d left`}
                      </span>
                    </div>
                  </div>

                  {/* Restore button */}
                  <button
                    className="btn"
                    onClick={()=>restore(tx.id)}
                    disabled={restoring===tx.id}
                    style={{
                      padding:"6px 12px",fontSize:"12px",fontWeight:"700",
                      background:"rgba(16,185,129,0.1)",color:"#34d399",
                      border:"1px solid rgba(16,185,129,0.2)",borderRadius:"8px",
                      justifyContent:"center",
                    }}>
                    {restoring===tx.id
                      ? <><span className="spin">◌</span></>
                      : "↺ Restore"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer summary */}
          <div style={{padding:"12px 20px",borderTop:"1px solid rgba(255,255,255,0.04)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#1e293b",fontSize:"12px"}}>{items.length} item{items.length!==1?"s":""} · auto-purged after 30 days</span>
            <span style={{color:"#1e293b",fontSize:"12px"}}>
              {items.filter(t=>daysLeft(t.deleted_at)<=7).length} item{items.filter(t=>daysLeft(t.deleted_at)<=7).length!==1?"s":""} expiring within 7 days
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  APP ROOT  (Fix 1: Token Persistence via localStorage)
// ═══════════════════════════════════════════════════════════════════
export default function CogniFi() {
  const [token,setToken]   = useState(()=>localStorage.getItem("cognifi_token")||null);
  const [email,setEmail]   = useState(()=>localStorage.getItem("cognifi_email")||"");
  const [page,setPage]     = useState("dashboard");
  const [toastState,setToastState] = useState(null);
  const [trashCount,setTrashCount] = useState(0);

  const toast = (msg, type="success") => { setToastState({msg,type}); };

  const handleLogin = (t, e) => {
    localStorage.setItem("cognifi_token", t);
    localStorage.setItem("cognifi_email", e);
    setToken(t); setEmail(e); setPage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("cognifi_token");
    localStorage.removeItem("cognifi_email");
    setToken(null); setEmail("");
  };

  if (!token) return <AuthPage onLogin={handleLogin}/>;

  return (
    <div style={{display:"flex",height:"100vh",background:"#07090f",overflow:"hidden"}}>
      <style>{CSS}</style>
      <Sidebar page={page} setPage={setPage} email={email} onLogout={handleLogout} trashCount={trashCount}/>
      <main style={{flex:1,overflowY:"auto"}}>
        {page==="dashboard"    && <Dashboard    token={token} toast={toast} setPage={setPage}/>}
        {page==="transactions" && <Transactions token={token} toast={toast}/>}
        {page==="chat"         && <Chat         token={token} toast={toast} email={email}/>}
        {page==="reminders"    && <Reminders    token={token} toast={toast}/>}
        {page==="trash"        && <Trash        token={token} toast={toast} onCountChange={setTrashCount}/>}
      </main>
      {toastState && <Toast msg={toastState.msg} type={toastState.type} onClose={()=>setToastState(null)}/>}
    </div>
  );
}
