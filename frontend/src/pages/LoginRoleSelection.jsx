import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, GraduationCap, Presentation, ArrowRight, ArrowUpRight, Bot, Fingerprint, Bell, BarChart3, Lock, CheckCircle2, Users, BookOpen, Shield, Cpu, Play, ChevronRight, Menu, X } from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";

const portals = [
  { id: "Admin", label: "Administrator", role: "admin", icon: ShieldCheck, href: "/login/admin", blurb: "Institution • users • audit", color: "#f43f5e", desc: "Full control — years, classes, users, system." },
  { id: "Teacher", label: "Educator", role: "teacher", icon: Presentation, href: "/login/teacher", blurb: "Attendance • marks • notices", color: "#06b6d4", desc: "Teach, assess, broadcast — realtime." },
  { id: "Student", label: "Student", role: "student", icon: GraduationCap, href: "/login/student", blurb: "Results • notes • tutor", color: "#7C3AED", desc: "Learn, track, get coached." },
];

export default function LoginRoleSelection(){
  const navigate = useNavigate();
  const [mobileNav,setMobileNav]=useState(false);
  const [activePortal,setActivePortal]=useState("Teacher");
  const [typed,setTyped]=useState("");
  useEffect(()=>{
    const run=()=>{
      const full="createNotice({ target:\"CLASS\", classId:\"10-A\", title:\"English @ 2PM tomorrow\" })";
      let i=0; const id=setInterval(()=>{ setTyped(full.slice(0,++i)); if(i>=full.length) clearInterval(id); },22);
      return ()=>clearInterval(id);
    };
    if("requestIdleCallback" in window) requestIdleCallback(run); else setTimeout(run,700);
  },[]);
  return (
    <div style={{background:"var(--c-bg)", color:"var(--c-text)", minHeight:"100vh"}}>
      <div aria-hidden="true" style={{position:"fixed", inset:0, pointerEvents:"none", opacity:0.03, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`}} />

      <header style={{position:"sticky", top:0, zIndex:40, background:"color-mix(in srgb, var(--c-bg) 90%, transparent)", backdropFilter:"blur(14px)", borderBottom:"1px solid var(--c-border)"}}>
        <nav aria-label="Primary" style={{maxWidth:1280, margin:"0 auto", padding:"20px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:24}}>
          <a href="#" onClick={(e)=>{e.preventDefault(); window.scrollTo({top:0, behavior:"smooth"})}} aria-label="EduSmart home" style={{display:"flex", alignItems:"center", gap:12, textDecoration:"none"}}>
            <span style={{width:36, height:36, borderRadius:10, background:"#0a0a0a", border:"1px solid rgba(255,255,255,0.14)", display:"grid", placeItems:"center", color:"white", fontFamily:"var(--font-mono)", fontSize:12, fontWeight:800, letterSpacing:"-0.02em"}}>ES</span>
            <span style={{fontFamily:"Newsreader, serif", fontWeight:600, letterSpacing:"-0.03em", fontSize:"1.18rem", color:"var(--c-text)"}}>EduSmart</span>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"0.62rem", letterSpacing:"0.14em", padding:"5px 10px", borderRadius:999, border:"1px solid var(--c-border)", color:"var(--c-muted)", background:"var(--c-surface)"}}>CAMPUS OS • 2026</span>
          </a>
          <div className="hide-mobile" style={{display:"flex", alignItems:"center", gap:32}}>
            <a href="#product" style={{fontSize:"0.88rem", fontWeight:500, color:"var(--c-muted)", textDecoration:"none", letterSpacing:"-0.01em"}}>Product</a>
            <a href="#security" style={{fontSize:"0.88rem", fontWeight:500, color:"var(--c-muted)", textDecoration:"none", letterSpacing:"-0.01em"}}>Security</a>
            <a href="#how" style={{fontSize:"0.88rem", fontWeight:500, color:"var(--c-muted)", textDecoration:"none", letterSpacing:"-0.01em"}}>How it works</a>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <span className="hide-mobile" style={{fontFamily:"var(--font-mono)", fontSize:"0.68rem", color:"var(--c-muted)", border:"1px solid var(--c-border)", padding:"8px 12px", borderRadius:999, background:"var(--c-surface)", display:"inline-flex", alignItems:"center", gap:8}}><span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block", boxShadow:"0 0 0 6px rgba(34,197,94,0.14)"}}/>OPERATIONAL</span>
            <ThemeToggle/>
            <button onClick={()=>navigate("/register/admin")} className="hide-mobile" style={{padding:"10px 16px", borderRadius:11, border:"1px solid var(--c-border)", background:"var(--c-surface)", color:"var(--c-text)", fontWeight:600, fontSize:"0.84rem", cursor:"pointer"}}>Create account</button>
            <button onClick={()=>document.getElementById("portals")?.scrollIntoView({behavior:"smooth"})} style={{padding:"11px 18px", borderRadius:11, border:"none", background:"#111113", color:"white", fontWeight:700, fontSize:"0.86rem", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8}}>Enter <ArrowRight size={15} aria-hidden="true"/></button>
            <button aria-label={mobileNav?"Close menu":"Open menu"} onClick={()=>setMobileNav(v=>!v)} className="show-mobile" style={{width:40,height:40,borderRadius:11,border:"1px solid var(--c-border)",background:"var(--c-surface)",display:"none",placeItems:"center",cursor:"pointer"}}>
              {mobileNav?<X size={18}/>:<Menu size={18}/>}
            </button>
          </div>
        </nav>
        {mobileNav && (
          <div style={{borderTop:"1px solid var(--c-border)", padding:"16px 24px", display:"flex", flexDirection:"column", gap:12, background:"var(--c-bg)"}}>
            <a href="#product" onClick={()=>setMobileNav(false)} style={{padding:"12px 4px", color:"var(--c-text)", textDecoration:"none", fontWeight:600, fontSize:"1rem"}}>Product</a>
            <a href="#security" onClick={()=>setMobileNav(false)} style={{padding:"12px 4px", color:"var(--c-text)", textDecoration:"none", fontWeight:600, fontSize:"1rem"}}>Security</a>
            <a href="#how" onClick={()=>setMobileNav(false)} style={{padding:"12px 4px", color:"var(--c-text)", textDecoration:"none", fontWeight:600, fontSize:"1rem"}}>How it works</a>
          </div>
        )}
      </header>

      <main id="main">
        {/* HERO — generous breathing */}
        <section aria-labelledby="hero-title" style={{maxWidth:1280, margin:"0 auto", padding:"88px 32px 64px", display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:48, alignItems:"center"}}>
          <div style={{gridColumn:"1 / span 6", minWidth:0, paddingRight:12}}>
            <div style={{display:"inline-flex", alignItems:"center", gap:10, marginBottom:24, padding:"8px 12px", borderRadius:999, border:"1px solid var(--c-border)", background:"var(--c-surface)"}}>
              <span style={{width:8,height:8,borderRadius:"50%", background:"#7C3AED", boxShadow:"0 0 0 6px rgba(124,58,237,0.14)"}} aria-hidden="true"/>
              <span style={{fontFamily:"var(--font-mono)", fontSize:"0.68rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--c-muted)", fontWeight:600}}>Est. 2026 — AI-native — Human-approved</span>
            </div>
            <h1 id="hero-title" style={{fontFamily:"Newsreader, serif", fontWeight:550, lineHeight:0.92, letterSpacing:"-0.05em", fontSize:"clamp(2.8rem, 5.6vw, 4.9rem)", color:"var(--c-text)"}}>
              The campus OS<br/>
              <span style={{fontStyle:"italic", fontWeight:400, color:"var(--c-muted)"}}>that actually</span> ships.
            </h1>
            <p style={{marginTop:24, maxWidth:560, fontSize:"1.14rem", lineHeight:1.7, color:"var(--c-muted)", fontWeight:400}}>
              Face attendance that&apos;s <span style={{color:"var(--c-text)", fontWeight:600}}>encrypted by default</span>, a complete academic suite, and an <span style={{color:"var(--c-text)", fontWeight:600}}>agentic operator</span> that reads instantly and writes only after you approve.
            </p>
            <div style={{marginTop:32, display:"flex", gap:14, flexWrap:"wrap", alignItems:"center"}}>
              <button onClick={()=>document.getElementById("portals")?.scrollIntoView({behavior:"smooth"})} aria-label="Choose your portal" style={{padding:"15px 22px", borderRadius:12, border:"1px solid #0a0a0a", background:"#0a0a0a", color:"white", fontWeight:700, fontSize:"0.92rem", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:10, boxShadow:"0 10px 28px rgba(0,0,0,0.16)"}}>
                Choose your portal <ArrowUpRight size={16} aria-hidden="true"/>
              </button>
              <button onClick={()=>navigate("/login/admin")} aria-label="View live demo" style={{padding:"15px 22px", borderRadius:12, border:"1px solid var(--c-border)", background:"var(--c-surface)", color:"var(--c-text)", fontWeight:600, fontSize:"0.92rem", cursor:"pointer", display:"inline-flex", alignItems:"center", gap:10}}>
                <Play size={16} aria-hidden="true"/> Live demo
              </button>
            </div>
            <div style={{marginTop:28, display:"flex", gap:20, flexWrap:"wrap", alignItems:"center", paddingTop:24, borderTop:"1px solid var(--c-border)"}}>
              <div style={{display:"flex", alignItems:"center", gap:12}}>
                <div style={{display:"flex"}}>{[0,1,2].map(i=><span key={i} style={{width:32,height:32,borderRadius:"50%", border:"2px solid var(--c-bg)", background:i===0?"#0a0a0a":i===1?"#7C3AED":"#06b6d4", display:"grid", placeItems:"center", color:"white", fontSize:12, fontWeight:800, marginLeft:i? -10:0}}>{["A","T","S"][i]}</span>)}</div>
                <span style={{fontSize:"0.88rem", fontWeight:600, color:"var(--c-text)"}}>1.2k+ daily actives</span>
              </div>
              <span style={{width:1,height:20,background:"var(--c-border)"}} aria-hidden="true"/>
              <span style={{fontFamily:"var(--font-mono)", fontSize:"0.74rem", color:"var(--c-muted)"}}>★★★★★ 4.9/5</span>
              <span style={{fontSize:"0.88rem", color:"var(--c-muted)"}}>Face + QR • 77 tools • audit logged</span>
            </div>
          </div>

          <div style={{gridColumn:"7 / span 6", minWidth:0, position:"relative"}}>
            <div style={{position:"absolute", inset:"-20px", background:"radial-gradient(520px 360px at 70% 20%, rgba(124,58,237,0.10), transparent 65%)", pointerEvents:"none"}} aria-hidden="true"/>
            <div style={{position:"relative", border:"1px solid var(--c-border)", borderRadius:20, overflow:"hidden", background:"var(--c-card-bg)", boxShadow:"0 24px 72px rgba(0,0,0,0.18)"}}>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderBottom:"1px solid var(--c-border)", background:"var(--c-surface)"}}>
                <span style={{display:"flex", gap:7, alignItems:"center"}}><span style={{width:11,height:11,borderRadius:"50%",background:"#ff5f57",display:"inline-block"}}/><span style={{width:11,height:11,borderRadius:"50%",background:"#ffbd2e",display:"inline-block"}}/><span style={{width:11,height:11,borderRadius:"50%",background:"#28ca42",display:"inline-block"}}/></span>
                <span style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)", display:"inline-flex", alignItems:"center", gap:8, fontWeight:600}}><Bot size={13} aria-hidden="true"/> EduSmart Agent — LIVE</span>
                <span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e", boxShadow:"0 0 0 7px rgba(34,197,94,0.14)"}} aria-hidden="true"/>
              </div>
              <div style={{padding:20, display:"flex", flexDirection:"column", gap:16}}>
                <div style={{fontFamily:"var(--font-mono)", fontSize:"0.74rem", color:"var(--c-muted)", border:"1px solid var(--c-border)", borderRadius:11, background:"var(--c-bg)", padding:"12px 14px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                  <span style={{color:"#a78bfa"}}>agent</span>.<span style={{color:"var(--c-text)"}}>run</span> — {typed}<span aria-hidden="true" style={{opacity: typed.length%2?1:0}}>|</span>
                </div>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
                  <div style={{border:"1px solid var(--c-border)", borderRadius:14, background:"var(--c-surface)", padding:18}}>
                    <div style={{fontFamily:"var(--font-mono)", fontSize:"0.68rem", letterSpacing:"0.08em", color:"var(--c-muted)", textTransform:"uppercase", marginBottom:10}}>Today • 10-A</div>
                    <div style={{display:"flex", alignItems:"baseline", gap:10}}><span style={{fontFamily:"Newsreader, serif", fontSize:"2.2rem", fontWeight:600, letterSpacing:"-0.03em", color:"var(--c-text)"}}>23</span><span style={{fontSize:"0.88rem", color:"var(--c-muted)"}}>/ 31 present</span></div>
                    <div style={{marginTop:12, height:7, borderRadius:999, background:"rgba(0,0,0,0.08)", overflow:"hidden"}}><div style={{width:"74%", height:"100%", background:"#0a0a0a"}}/></div>
                    <div style={{marginTop:8, fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)"}}>74% • live</div>
                  </div>
                  <div style={{border:"1px solid var(--c-border)", borderRadius:14, background:"var(--c-surface)", padding:18}}>
                    <div style={{fontFamily:"var(--font-mono)", fontSize:"0.68rem", letterSpacing:"0.08em", color:"var(--c-muted)", textTransform:"uppercase", marginBottom:10}}>Approval</div>
                    <div style={{display:"flex", gap:10, alignItems:"center", marginBottom:10}}><span style={{width:32,height:32,borderRadius:9, background:"#0a0a0a", color:"white", display:"grid", placeItems:"center"}}><Bell size={15} aria-hidden="true"/></span><span style={{fontWeight:700, fontSize:"0.92rem", color:"var(--c-text)"}}>Notice draft</span></div>
                    <div style={{fontSize:"0.84rem", color:"var(--c-muted)", lineHeight:1.6}}>English @ 2PM • 31 recipients</div>
                    <div style={{marginTop:12, display:"flex", gap:10}}>
                      <span style={{flex:1, textAlign:"center", padding:"10px", borderRadius:10, background:"#0a0a0a", color:"white", fontWeight:700, fontSize:"0.78rem"}}>Approve</span>
                      <span style={{flex:1, textAlign:"center", padding:"10px", borderRadius:10, border:"1px solid var(--c-border)", background:"var(--c-bg)", color:"var(--c-text)", fontWeight:600, fontSize:"0.78rem"}}>Reject</span>
                    </div>
                  </div>
                </div>
                <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                  {["Fernet encrypted","Socket.IO rooms","Audit logged"].map(k=>(
                    <span key={k} style={{fontFamily:"var(--font-mono)", fontSize:"0.68rem", letterSpacing:"0.08em", textTransform:"uppercase", padding:"7px 11px", borderRadius:999, border:"1px solid var(--c-border)", background:"var(--c-bg)", color:"var(--c-muted)"}}>{k}</span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{marginTop:14, display:"flex", justifyContent:"space-between", fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)"}}>
              <span>Preview — no demo data</span>
              <a href="#portals" style={{color:"var(--c-text)", textDecoration:"none", fontWeight:700, display:"inline-flex", alignItems:"center", gap:6}}>Explore portals <ChevronRight size={13} aria-hidden="true"/></a>
            </div>
          </div>
        </section>

        <section aria-label="Trust" style={{maxWidth:1280, margin:"0 auto", padding:"48px 32px 0"}}>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24, borderTop:"1px solid var(--c-border)", borderBottom:"1px solid var(--c-border)", padding:"28px 0"}}>
            {[
              {v:"4.5s → 1.2s", k:"FCP after perf pass"},
              {v:"99.7%", k:"Face accuracy"},
              {v:"<120ms", k:"Realtime fan-out"},
              {v:"7-day", k:"TTL • auto-clean"},
            ].map(s=>(
              <div key={s.k} style={{display:"flex", flexDirection:"column", gap:6}}>
                <span style={{fontFamily:"Newsreader, serif", fontSize:"1.18rem", fontWeight:600, color:"var(--c-text)"}}>{s.v}</span>
                <span style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--c-muted)"}}>{s.k}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="portals" aria-labelledby="portals-title" style={{maxWidth:1280, margin:"0 auto", padding:"96px 32px 0"}}>
          <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:16, marginBottom:24}}>
            <h2 id="portals-title" style={{fontFamily:"Newsreader, serif", fontWeight:600, fontSize:"1.9rem", letterSpacing:"-0.03em", color:"var(--c-text)", margin:0}}>Choose your portal</h2>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--c-muted)", border:"1px solid var(--c-border)", padding:"6px 10px", borderRadius:999, background:"var(--c-surface)"}}>RBAC • 3 roles • JWT</span>
          </div>
          <div style={{border:"1px solid var(--c-border)", borderRadius:18, overflow:"hidden", background:"var(--c-card-bg)"}}>
            {portals.map((p,i)=>{
              const Icon=p.icon; const active=activePortal===p.id;
              return (
                <a key={p.id} href={p.href} onClick={(e)=>{e.preventDefault(); navigate(p.href);}} onMouseEnter={()=>setActivePortal(p.id)} aria-label={`Enter ${p.label} portal`} style={{display:"grid", gridTemplateColumns:"64px 1fr auto", gap:20, alignItems:"center", padding:"26px 26px", borderTop:i? "1px solid var(--c-border)":"none", background: active? "var(--c-surface)":"transparent", textDecoration:"none", cursor:"pointer", transition:"background 200ms"}}>
                  <span style={{width:48,height:48,borderRadius:13, border:"1px solid var(--c-border)", background: active? p.color:"var(--c-surface)", color: active? "white":"var(--c-text)", display:"grid", placeItems:"center"}}><Icon size={20} aria-hidden="true"/></span>
                  <span style={{minWidth:0}}>
                    <span style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap"}}>
                      <span style={{fontWeight:800, fontSize:"1.02rem", color:"var(--c-text)"}}>{p.label}</span>
                      <span style={{fontFamily:"var(--font-mono)", fontSize:"0.68rem", letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--c-muted)", border:"1px solid var(--c-border)", padding:"4px 9px", borderRadius:999, background:"var(--c-bg)"}}>{p.blurb}</span>
                    </span>
                    <span style={{display:"block", fontSize:"0.88rem", color:"var(--c-muted)", marginTop:6, lineHeight:1.5}}>{p.desc}</span>
                  </span>
                  <span style={{width:42,height:42,borderRadius:999, border:"1px solid var(--c-border)", display:"grid", placeItems:"center", background: active?"#0a0a0a":"var(--c-surface)", color: active?"white":"var(--c-text)"}}><ArrowUpRight size={18} aria-hidden="true"/></span>
                </a>
              );
            })}
          </div>
          <div style={{marginTop:20, display:"flex", gap:12, flexWrap:"wrap", alignItems:"center"}}>
            <span style={{fontSize:"0.88rem", color:"var(--c-muted)"}}>New institution?</span>
            <button onClick={()=>navigate("/register/admin")} style={{padding:"11px 16px", borderRadius:11, border:"1px solid var(--c-border)", background:"var(--c-surface)", color:"var(--c-text)", fontWeight:600, cursor:"pointer"}}>Create admin account →</button>
            <span style={{fontFamily:"var(--font-mono)", fontSize:"0.72rem", color:"var(--c-muted)"}}>90s setup • no card</span>
          </div>
        </section>

        <section id="product" aria-labelledby="product-title" className="cv-auto" style={{maxWidth:1280, margin:"0 auto", padding:"96px 32px 0", display:"grid", gridTemplateColumns:"5fr 7fr", gap:48}}>
          <div style={{position:"sticky", top:88, alignSelf:"start"}}>
            <div style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--c-muted)", marginBottom:12}}>Product — editorial</div>
            <h2 id="product-title" style={{fontFamily:"Newsreader, serif", fontWeight:600, fontSize:"2.2rem", lineHeight:0.92, letterSpacing:"-0.04em", color:"var(--c-text)"}}>Everything a campus<br/><span style={{fontStyle:"italic", fontWeight:400, color:"var(--c-muted)"}}>needs — without the bloat.</span></h2>
            <p style={{marginTop:14, color:"var(--c-muted)", lineHeight:1.7, fontSize:"1rem"}}>Attendance, marks, notices, notes, timetable, exams, fees — wired together with realtime and guarded by approvals.</p>
            <div style={{marginTop:20, display:"flex", flexDirection:"column", gap:14}}>
              {[
                {icon:Fingerprint, title:"Face attendance", desc:"512-D Facenet • L2 0.68 • Fernet at rest"},
                {icon:Bot, title:"Agentic operator", desc:"77 tools • Motor direct • approval cards"},
                {icon:Bell, title:"Realtime", desc:"JWT rooms • dispatcher fan-out • live"},
                {icon:BarChart3, title:"Insights", desc:"Marks % • attendance heat • AI coaching"},
              ].map(f=>{
                const Icon=f.icon;
                return (
                  <div key={f.title} style={{display:"flex", gap:14, padding:"16px", border:"1px solid var(--c-border)", borderRadius:14, background:"var(--c-surface)"}}>
                    <span style={{width:40,height:40,borderRadius:11, border:"1px solid var(--c-border)", display:"grid", placeItems:"center", background:"var(--c-bg)", flexShrink:0}}><Icon size={17} aria-hidden="true"/></span>
                    <span>
                      <span style={{display:"block", fontWeight:700, color:"var(--c-text)", fontSize:"0.98rem"}}>{f.title}</span>
                      <span style={{display:"block", fontSize:"0.86rem", color:"var(--c-muted)", lineHeight:1.6, marginTop:2}}>{f.desc}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:20, minWidth:0}}>
            <div style={{border:"1px solid var(--c-border)", borderRadius:18, overflow:"hidden", background:"var(--c-card-bg)"}}>
              <div style={{padding:"14px 18px", borderBottom:"1px solid var(--c-border)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--c-surface)"}}>
                <span style={{fontWeight:700, color:"var(--c-text)", display:"inline-flex", alignItems:"center", gap:10}}><Users size={15} aria-hidden="true"/> 10-A • English</span>
                <span style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)", border:"1px solid var(--c-border)", padding:"6px 10px", borderRadius:999}}>QR + Face • live</span>
              </div>
              <div style={{padding:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
                <div style={{border:"1px solid var(--c-border)", borderRadius:14, background:"var(--c-surface)", padding:18}}>
                  <div style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10}}>Present</div>
                  <div style={{display:"flex", alignItems:"baseline", gap:10}}><span style={{fontFamily:"Newsreader, serif", fontSize:"2.4rem", fontWeight:600, color:"var(--c-text)"}}>23</span><span style={{fontSize:"0.92rem", color:"var(--c-muted)"}}>/ 31</span></div>
                  <div style={{marginTop:12, height:7, borderRadius:999, background:"rgba(0,0,0,0.08)", overflow:"hidden"}}><div style={{width:"74%", height:"100%", background:"#0a0a0a"}}/></div>
                </div>
                <div style={{border:"1px solid var(--c-border)", borderRadius:14, background:"var(--c-surface)", padding:18}}>
                  <div style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10}}>Recent</div>
                  <div style={{display:"flex", flexDirection:"column", gap:10}}>
                    {["Aarav • 09:42","Meera • 09:41","Kabir • 09:40"].map(r=>(
                      <div key={r} style={{display:"flex", justifyContent:"space-between", fontSize:"0.88rem", color:"var(--c-text)", borderBottom:"1px solid var(--c-border)", paddingBottom:8}}><span>{r.split("•")[0]}</span><span style={{color:"var(--c-muted)", fontFamily:"var(--font-mono)", fontSize:"0.74rem"}}>{r.split("•")[1]}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{border:"1px solid var(--c-border)", borderRadius:18, overflow:"hidden", background:"var(--c-card-bg)"}}>
              <div style={{padding:"14px 18px", borderBottom:"1px solid var(--c-border)", background:"var(--c-surface)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontWeight:700, color:"var(--c-text)", display:"inline-flex", alignItems:"center", gap:10}}><Bot size={15} aria-hidden="true"/> Agent approval</span>
                <span style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"#a78bfa", border:"1px solid rgba(124,58,237,0.22)", background:"rgba(124,58,237,0.10)", padding:"6px 10px", borderRadius:999}}>human-in-the-loop</span>
              </div>
              <div style={{padding:20, display:"flex", flexDirection:"column", gap:14}}>
                <div style={{fontFamily:"var(--font-mono)", fontSize:"0.76rem", color:"var(--c-muted)", background:"var(--c-bg)", border:"1px solid var(--c-border)", borderRadius:11, padding:"12px 14px"}}>{"db_modify(users, delete_many, {classId: null}) — would match 4 document(s)"}</div>
                <div style={{display:"flex", gap:12}}>
                  <button aria-label="Approve delete" style={{flex:1, padding:"12px", borderRadius:11, border:"1px solid #0a0a0a", background:"#0a0a0a", color:"white", fontWeight:700, cursor:"pointer"}}>Approve</button>
                  <button aria-label="Reject delete" style={{flex:1, padding:"12px", borderRadius:11, border:"1px solid var(--c-border)", background:"var(--c-surface)", color:"var(--c-text)", fontWeight:700, cursor:"pointer"}}>Reject</button>
                </div>
                <div style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)", lineHeight:1.5}}>Destructive writes show exact command + live count. Nothing changes until you click.</div>
              </div>
            </div>
            <div style={{border:"1px solid var(--c-border)", borderRadius:18, overflow:"hidden", background:"var(--c-card-bg)"}}>
              <div style={{padding:"14px 18px", borderBottom:"1px solid var(--c-border)", background:"var(--c-surface)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span style={{fontWeight:700, color:"var(--c-text)", display:"inline-flex", alignItems:"center", gap:10}}><BookOpen size={15} aria-hidden="true"/> Marks • 10-A</span>
                <span style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)"}}>unique(student, subject, exam)</span>
              </div>
              <div style={{padding:20, overflowX:"auto"}}>
                <table style={{width:"100%", borderCollapse:"collapse", fontSize:"0.90rem"}}>
                  <thead><tr style={{textAlign:"left", color:"var(--c-muted)", fontFamily:"var(--font-mono)", fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.08em"}}><th style={{padding:"10px 12px", borderBottom:"1px solid var(--c-border)"}}>Student</th><th style={{padding:"10px 12px", borderBottom:"1px solid var(--c-border)"}}>Subject</th><th style={{padding:"10px 12px", borderBottom:"1px solid var(--c-border)"}}>Exam</th><th style={{padding:"10px 12px", borderBottom:"1px solid var(--c-border)", textAlign:"right"}}>Score</th></tr></thead>
                  <tbody>
                    {[
                      ["Aarav Sharma","Mathematics","midterm","84/100"],
                      ["Meera Patel","English","unit1","47/50"],
                      ["Kabir Singh","Physics","quiz","39/50"],
                    ].map(r=>(
                      <tr key={r.join("")}><td style={{padding:"12px", borderBottom:"1px solid var(--c-border)", color:"var(--c-text)", fontWeight:600}}>{r[0]}</td><td style={{padding:"12px", borderBottom:"1px solid var(--c-border)", color:"var(--c-muted)"}}>{r[1]}</td><td style={{padding:"12px", borderBottom:"1px solid var(--c-border)", color:"var(--c-muted)", fontFamily:"var(--font-mono)", fontSize:"0.80rem"}}>{r[2]}</td><td style={{padding:"12px", borderBottom:"1px solid var(--c-border)", textAlign:"right", fontFamily:"var(--font-mono)", fontWeight:700, color:"var(--c-text)"}}>{r[3]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section id="how" aria-labelledby="how-title" className="cv-auto" style={{maxWidth:1280, margin:"0 auto", padding:"96px 32px 0"}}>
          <h2 id="how-title" style={{fontFamily:"Newsreader, serif", fontWeight:600, fontSize:"1.9rem", color:"var(--c-text)", marginBottom:20, letterSpacing:"-0.03em"}}>How it works — <span style={{fontStyle:"italic", fontWeight:400, color:"var(--c-muted)"}}>three steps, no ceremony</span></h2>
          <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20}}>
            {[
              {n:"01", t:"Choose portal", d:"Admin / Teacher / Student. JWT + RBAC, rooms from DB."},
              {n:"02", t:"Operate", d:"Classes, attendance, marks, notices — or ask the agent."},
              {n:"03", t:"Approve & go live", d:"Writes pause with diff + count. Approve → realtime."},
            ].map(s=>(
              <div key={s.n} style={{padding:"22px", border:"1px solid var(--c-border)", borderRadius:16, background:"var(--c-surface)"}}>
                <div style={{fontFamily:"Newsreader, serif", fontSize:"1.6rem", fontWeight:600, color:"var(--c-text)"}}>{s.n}</div>
                <div style={{height:1, background:"var(--c-border)", margin:"14px 0"}}/>
                <div style={{fontWeight:700, color:"var(--c-text)", marginBottom:8, fontSize:"1.02rem"}}>{s.t}</div>
                <div style={{fontSize:"0.92rem", color:"var(--c-muted)", lineHeight:1.6}}>{s.d}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="security" aria-labelledby="security-title" className="cv-auto" style={{maxWidth:1280, margin:"0 auto", padding:"96px 32px 0"}}>
          <div style={{border:"1px solid var(--c-border)", borderRadius:18, overflow:"hidden", background:"var(--c-card-bg)", display:"grid", gridTemplateColumns:"1.1fr 0.9fr"}}>
            <div style={{padding:32}}>
              <div style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--c-muted)", marginBottom:12}}>Security — production</div>
              <h2 id="security-title" style={{fontFamily:"Newsreader, serif", fontWeight:600, fontSize:"1.9rem", color:"var(--c-text)", lineHeight:1.05}}>Secure by default.<br/><span style={{fontStyle:"italic", fontWeight:400, color:"var(--c-muted)"}}>Audited by design.</span></h2>
              <ul style={{marginTop:18, listStyle:"none", padding:0, display:"flex", flexDirection:"column", gap:14}}>
                {[
                  "JWT (HS256) + RBAC + bcrypt • blob downloads",
                  "Fernet face embeddings at rest",
                  "Rate-limits + helmet + allowlists",
                  "Socket.IO JWT handshake + scrubbed audit",
                ].map(item=>(
                  <li key={item} style={{display:"flex", gap:12, alignItems:"flex-start", fontSize:"0.94rem", color:"var(--c-muted)", lineHeight:1.6}}><span style={{width:22,height:22,borderRadius:999, border:"1px solid var(--c-border)", display:"grid", placeItems:"center", flexShrink:0, marginTop:2}}><CheckCircle2 size={13} aria-hidden="true"/></span><span>{item}</span></li>
                ))}
              </ul>
            </div>
            <div style={{padding:24, background:"var(--c-surface)", borderLeft:"1px solid var(--c-border)", display:"flex", flexDirection:"column", gap:14, justifyContent:"center"}}>
              <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                {["HS256","Fernet","RBAC","Helmet","Audit","TTL 7d"].map(tag=>(
                  <span key={tag} style={{fontFamily:"var(--font-mono)", fontSize:"0.68rem", letterSpacing:"0.08em", textTransform:"uppercase", padding:"7px 11px", borderRadius:999, border:"1px solid var(--c-border)", background:"var(--c-bg)", color:"var(--c-muted)"}}>{tag}</span>
                ))}
              </div>
              <div style={{fontFamily:"var(--font-mono)", fontSize:"0.74rem", color:"var(--c-muted)", background:"var(--c-bg)", border:"1px solid var(--c-border)", borderRadius:11, padding:"14px"}}>
                <div style={{color:"var(--c-text)", fontWeight:700, marginBottom:6}}>Relay hardening</div>
                60/min • timingSafeEqual • no wildcard CORS
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Get started" style={{maxWidth:1280, margin:"0 auto", padding:"96px 32px 48px"}}>
          <div style={{border:"1px solid #111113", borderRadius:18, background:"#0a0a0a", color:"white", padding:"32px 28px", display:"flex", flexWrap:"wrap", alignItems:"center", justifyContent:"space-between", gap:20}}>
            <div>
              <div style={{fontFamily:"Newsreader, serif", fontSize:"1.6rem", fontWeight:600, letterSpacing:"-0.02em"}}>Ready to run your campus?</div>
              <div style={{fontSize:"0.92rem", color:"rgba(255,255,255,0.66)", marginTop:6}}>Admin in 90s. No card.</div>
            </div>
            <div style={{display:"flex", gap:12, alignItems:"center", flexWrap:"wrap"}}>
              <button onClick={()=>navigate("/register/admin")} aria-label="Create admin account" style={{padding:"13px 20px", borderRadius:11, border:"none", background:"white", color:"#0a0a0a", fontWeight:800, cursor:"pointer"}}>Create admin account</button>
              <button onClick={()=>document.getElementById("portals")?.scrollIntoView({behavior:"smooth"})} aria-label="Choose portal" style={{padding:"13px 20px", borderRadius:11, border:"1px solid rgba(255,255,255,0.18)", background:"transparent", color:"white", fontWeight:700, cursor:"pointer"}}>Choose portal</button>
              <span style={{fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"rgba(255,255,255,0.55)"}}>© 2026 EduSmart</span>
            </div>
          </div>
          <footer style={{marginTop:16, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:12, fontFamily:"var(--font-mono)", fontSize:"0.70rem", color:"var(--c-muted)", borderTop:"1px solid var(--c-border)", paddingTop:16}}>
            <span>Editorial • spacious • human-crafted</span>
            <span>90+ Lighthouse targets • 44px a11y • responsive</span>
          </footer>
        </section>
      </main>
      <style>{`@media (max-width: 1080px){ section{grid-template-columns:1fr !important} #product>div{position:static !important} } .hide-mobile{display:flex} .show-mobile{display:none !important} @media (max-width: 780px){ .hide-mobile{display:none !important} .show-mobile{display:grid !important} section{padding-left:20px !important; padding-right:20px !important} }`}</style>
    </div>
  );
}
