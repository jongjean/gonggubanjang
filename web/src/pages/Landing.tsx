import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Tool = { id:string; name:string; category:string; available?:boolean; condition?:string; damaged?:boolean; repaired?:boolean; status?:string; loanStatus?:string; };
type Loan = { id:string; toolId:string; startDate:string; endDate:string; status:"active"|"returned"; createdAt:string; };
type Incident = { id:string; toolId:string; type:string; timestamp:string };

export default function Landing() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(()=>{(async()=>{
    try {
      const [t,l,i]=await Promise.all([
        fetch("/api/tools").then(r=>r.json()).catch(()=>[]),
        fetch("/api/my-loans").then(r=>r.json()).catch(()=>[]),
        fetch("/api/incidents").then(r=>r.json()).catch(()=>[]),
      ]);
      setTools(t || []); setLoans(l || []); setIncidents(i || []);
    } catch (error) {
      console.log('API 호출 실패, 기본 데이터 사용');
      // Fallback 더미 데이터
      setTools([
        { id: "G001", name: "전동 드릴", category: "전동공구", available: true, loanStatus: "반납" },
        { id: "G002", name: "해머", category: "수공구", available: true, loanStatus: "반납" },
        { id: "G003", name: "줄자", category: "측정공구", available: false, loanStatus: "대출중" }
      ]);
      setLoans([]);
      setIncidents([]);
    }
  })()},[]);

  const stats = useMemo(()=>{
    const total = tools.length;
    
    // 대출현황 = 대출중 상태인 공구
    const onLoan = tools.filter(t => t.loanStatus === "대출중").length;
    
    // 망실 = 폐기 + 파손(수리되지 않은) + 수리중
    const damaged = tools.filter(t =>
      t.status === "disposed" || 
      (t.damaged && !t.repaired) || 
      t.status === "repairing"
    ).length;
    
    // 대여가능 = 정상 상태 공구 (파손X, 폐기X, 수리중X, 대출중X)
    const available = tools.filter(t =>
      t.status !== "disposed" &&           // 폐기 아님
      t.status !== "repairing" &&          // 수리중 아님  
      !(t.damaged && !t.repaired) &&      // 파손상태 아님(수리완료는 OK)
      t.loanStatus !== "대출중"             // 대출중 아님
    ).length;
    
    return { total, onLoan, damaged, available };
  },[tools,loans]);

  const recent = useMemo(()=>{
    const lx = loans.map(l=>({k:l.id, label:l.status==="active"?"대여":"반납", ts:l.createdAt, toolId:l.toolId, tone:l.status==="active"?"amber":"emerald"}));
    const ix = incidents.map(i=>{
      const labelMap: Record<string, string> = {
        'new': '신규',
        'broken': '고장', 
        'damaged': '파손',
        'lost': '분실',
        'disposed': '폐기',
        'restored': '복원'
      };
      return {k:i.id, label:labelMap[i.type] || i.type, ts:i.timestamp, toolId:i.toolId, tone:"red"};
    });
    return [...lx,...ix].sort((a,b)=>b.ts.localeCompare(a.ts)).slice(0,5);
  },[loans,incidents]);

  return (
    <div className="min-h-screen app-bg text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="max-w-screen-md mx-auto flex items-center gap-3 px-4 py-3">
          <div className="font-extrabold text-xl tracking-tight">
            <span className="text-[var(--r-500)]">🏠</span> 공구반장
          </div>
          <nav className="ml-auto flex gap-2">
            <Link to="/capture" className="nav-tab">📷 촬영</Link>
            <Link to="/tool-editor" className="nav-tab">📋 목록</Link>
            <Link to="/settings" className="nav-tab">⚙️ 설정</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="max-w-screen-md mx-auto px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            MAXIMIZE YOUR<br/>
            <span className="text-[var(--r-500)]">TOOL MANAGEMENT</span>
          </h1>
          <p className="mt-2 text-white/85 max-w-[48ch]">
            촬영만으로 AI분석과 자동인식<br/>
            대여반납 공구현황, 망실기록관리, 100%무료
          </p>
          <div className="mt-5 flex gap-2">
            <Link to="/tools" className="btn-red">� 공구 둘러보기</Link>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section id="dashboard" className="max-w-screen-md mx-auto px-4 py-6 space-y-4">
        {/* Dashboard Title */}
        <h2 className="text-xl font-bold text-center mb-4 text-white">공구현황</h2>
        
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi title="총 보유" value={stats.total}/>
          <Kpi title="대출 현황" value={stats.onLoan} tone="amber"/>
          <Kpi title="대여 가능" value={stats.available} tone="emerald"/>
          <Kpi title="망실" value={stats.damaged} tone="red"/>
        </div>

{/* Quick tiles */}
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  <Tile title="촬영 등록" desc="AI이미지분석" to="/capture" icon="📷" />
  <Tile title="공구 사용" desc="사용 가능한 공구만" to="/available-tools" icon="📦" />
  <Tile title="망실 현황" desc="파손분실고장 현황" to="/incidents" icon="🚨" />
  <Tile title="공구 목록" desc="정보 수정 가능" to="/tool-editor" icon="🗂️" />
</div>

        {/* Recent activity */}
        <div className="app-card p-3">
          <div className="flex items-center mb-2">
            <h3 className="font-bold">최근 활동</h3>
            <Link to="/history" className="ml-auto text-sm text-[var(--r-300)] hover:text-white/90">전체 보기</Link>
          </div>
          <div className="divide-y divide-white/10">
            {recent.length===0 && <div className="text-white/60 py-3">최근 활동이 없습니다.</div>}
            {recent.map(r=>{
              const tool = tools.find(t => t.id === r.toolId);
              const toolName = tool ? tool.name : '알 수 없음';
              return (
                <div key={r.k} className="py-2 flex items-center gap-2 text-sm">
                  <span className={`px-2 py-[2px] rounded-full border text-xs
                    ${r.tone==="red"?"bg-red-500/15 border-red-500/40 text-red-300":
                      r.tone==="amber"?"bg-amber-500/15 border-amber-500/40 text-amber-300":
                      "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"}`}>
                    {r.label}
                  </span>
                  <span className="text-white/80">툴 #{r.toolId} {toolName}</span>
                  <span className="ml-auto text-white/60">{new Date(r.ts).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 mt-6">
        <div className="max-w-screen-md mx-auto px-4 py-6 text-center text-white/60 text-sm">
          © 2025 유콘크리에이티브(주) 공구반장
        </div>
      </footer>
    </div>
  );
}

function Kpi({title, value, tone}:{title:string; value:number|string; tone?:"red"|"amber"|"emerald"}) {
  const map = {
    red:     "bg-red-500/15 border-red-500/30 text-red-200",
    amber:   "bg-amber-500/15 border-amber-500/30 text-amber-200",
    emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-200",
  } as const;
  const cls = tone ? map[tone] : "bg-white/5 border-white/15 text-white";
  return (
    <div className={`app-card ${cls} px-3 py-4 text-center`}>
      <div className="text-xs text-white/70">{title}</div>
      <div className="text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Tile({title, desc, icon, to}:{title:string; desc:string; icon:string; to:string}) {
  return (
    <Link to={to} className="app-card px-3 py-4 hover:bg-white/5">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 font-semibold">{title}</div>
      <div className="text-xs text-white/70">{desc}</div>
    </Link>
  );
}
