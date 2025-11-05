import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Tool = { id:string; name:string; category:string; available?:boolean; condition?:string; damaged?:boolean; repaired?:boolean; };
type Loan = { id:string; toolId:string; action:"loan"|"return"; timestamp:string };
type Incident = { id:string; toolId:string; type:string; timestamp:string };

export default function History() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState("전체");

  useEffect(()=>{(async()=>{
    const [t,l,i]=await Promise.all([
      fetch("/api/tools").then(r=>r.json()),
      fetch("/api/loans").then(r=>r.json()),
      fetch("/api/incidents").then(r=>r.json()),
    ]);
    setTools(t); setLoans(l); setIncidents(i);
  })()},[]);

  const allActivities = useMemo(()=>{
    const lx = loans.map(l=>({
      id: l.id, 
      type: "loan" as const,
      label: l.action==="loan"?"대여":"반납", 
      ts: l.timestamp, 
      toolId: l.toolId, 
      tone: l.action==="loan"?"amber":"emerald" as const
    }));
    
    const ix = incidents.map(i=>{
      const labelMap: Record<string, string> = {
        'new': '신규',
        'broken': '고장', 
        'damaged': '파손',
        'lost': '분실',
        'disposed': '폐기',
        'restored': '복원'
      };
      return {
        id: i.id,
        type: "incident" as const,
        label: labelMap[i.type] || i.type, 
        ts: i.timestamp, 
        toolId: i.toolId, 
        tone: "red" as const
      };
    });
    
    return [...lx,...ix].sort((a,b)=>b.ts.localeCompare(a.ts));
  },[loans,incidents]);

  const filteredActivities = useMemo(() => {
    if (filter === "전체") return allActivities;
    if (filter === "대여/반납") return allActivities.filter(a => a.type === "loan");
    if (filter === "사고/사건") return allActivities.filter(a => a.type === "incident");
    return allActivities;
  }, [allActivities, filter]);

  return (
    <div className="min-h-screen app-bg text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="max-w-screen-md mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/" className="btn-ghost text-sm px-3 py-2">
            🏠 홈
          </Link>
          <div className="font-extrabold text-xl tracking-tight ml-2 mr-auto">
            📋 전체 활동 히스토리
          </div>
        </div>
      </header>

      {/* 필터 */}
      <section className="max-w-screen-md mx-auto px-4 py-4">
        <div className="flex gap-2">
          {["전체", "대여/반납", "사고/사건"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f 
                  ? "bg-[var(--r-500)] text-white" 
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="mt-2 text-sm text-white/60">
          총 {filteredActivities.length}개 활동
        </div>
      </section>

      {/* 활동 목록 */}
      <section className="max-w-screen-md mx-auto px-4 pb-6">
        <div className="app-card p-4">
          <div className="space-y-0 divide-y divide-white/10">
            {filteredActivities.length === 0 && (
              <div className="text-white/60 py-8 text-center">활동 내역이 없습니다.</div>
            )}
            {filteredActivities.map(activity => {
              const tool = tools.find(t => t.id === activity.toolId);
              const toolName = tool ? tool.name : '알 수 없음';
              return (
                <div key={activity.id} className="py-3 flex items-center gap-3 text-sm">
                  <div className="flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full border text-xs font-medium
                      ${activity.tone==="red"?"bg-red-500/15 border-red-500/40 text-red-300":
                        activity.tone==="amber"?"bg-amber-500/15 border-amber-500/40 text-amber-300":
                        "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"}`}>
                      {activity.label}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium">{toolName}</div>
                    <div className="text-white/60 text-xs">툴 #{activity.toolId}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-white/60 text-xs">
                      {new Date(activity.ts).toLocaleDateString()}
                    </div>
                    <div className="text-white/60 text-xs">
                      {new Date(activity.ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}