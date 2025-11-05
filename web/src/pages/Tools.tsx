import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Tool = {
  id:string; name:string; category:string;
  manufacturer?:string; model?:string; condition?: "new"|"used"|string;
  purchaseDate?:string; lifespanMonths?:number; available?:boolean;
  loanStatus?:string; damaged?:boolean; repaired?:boolean;
  imageUrl?:string; notes?:string; status?:string;
};

const fileOnly = (p?:string)=> p? p.replace(/^.*[\\/]/,"") : "";
const imgSrc = (p?:string)=> p? `/tools/${fileOnly(p)}` : "";

const getStatusColor = (tool: Tool) => {
  if (tool.status === "disposed") return "bg-red-500/15 border-red-500/40 text-red-300";
  if (tool.damaged && !tool.repaired) return "bg-red-500/15 border-red-500/40 text-red-300";
  if (tool.status === "repairing") return "bg-orange-500/15 border-orange-500/40 text-orange-300";
  if (tool.loanStatus === "대출중") return "bg-amber-500/15 border-amber-500/40 text-amber-300";
  if (tool.repaired || (tool.damaged && tool.repaired)) return "bg-blue-500/15 border-blue-500/40 text-blue-300";
  return "bg-emerald-500/15 border-emerald-500/40 text-emerald-300";
};

const getStatusText = (tool: Tool) => {
  if (tool.status === "disposed") return "폐기";
  if (tool.damaged && !tool.repaired) return "파손";
  if (tool.status === "repairing") return "수리중";
  if (tool.loanStatus === "대출중") return "대여중";
  if (tool.repaired || (tool.damaged && tool.repaired)) return "수리완료";
  return "정상";
};

export default function Tools(){
  const [tools,setTools] = useState<Tool[]>([]);
  const [q,setQ] = useState(""); 
  const [cat,setCat]=useState("공구분류(전체)");
  const [statusFilter, setStatusFilter] = useState("공구현황(전체)");
  const [sel,setSel] = useState<Tool|null>(null);

  useEffect(()=>{ (async()=>{
    const data:Tool[] = await fetch("/api/tools").then(r=>r.json());
    setTools(data);
  })() },[]);

  const cats = useMemo(()=>["공구분류(전체)",...Array.from(new Set(tools.map(t=>t.category||"기타")))], [tools]);
  const statusOptions = ["공구현황(전체)", "정상", "대여중", "파손", "수리중", "수리완료", "폐기"];
  
  const filtered = useMemo(()=>{
    const kw=q.trim().toLowerCase();
    return tools.filter(t=>{
      const okCat = cat==="공구분류(전체)" || t.category===cat;
      const okStatus = statusFilter==="공구현황(전체)" || getStatusText(t)===statusFilter;
      const hay = `${t.name} ${t.category} ${t.manufacturer??""} ${t.model??""}`.toLowerCase();
      return okCat && okStatus && (!kw || hay.includes(kw));
    });
  },[tools,q,cat,statusFilter]);

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=> e.key==="Escape" && setSel(null);
    window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey);
  },[]);

  return (
    <div className="min-h-screen app-bg">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-black/30 backdrop-blur">
        <div className="max-w-screen-sm mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/" className="btn-ghost text-sm px-3 py-2">
            🏠 홈
          </Link>
          <div className="text-white text-xl font-black tracking-tight flex-1">🔍 공구 둘러보기</div>
          <Link to="/my-loans" className="btn-blue text-sm px-2 py-1 whitespace-nowrap">
            📦 나의 대출현황
          </Link>
          <Link to="/available-tools" className="btn-red-outline text-sm px-2 py-1 whitespace-nowrap">
            🔧 사용
          </Link>
        </div>
        
        {/* 필터 */}
        <div className="max-w-screen-sm mx-auto px-3 pb-3 space-y-2">
          <div className="flex gap-2">
            <select className="pill flex-1 bg-gray-700 text-white" value={cat} onChange={e=>setCat(e.target.value)}>
              {cats.map(c=><option key={c} value={c} className="bg-gray-700 text-white">{c}</option>)}
            </select>
            <select className="pill flex-1 bg-gray-700 text-white" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              {statusOptions.map(s=><option key={s} value={s} className="bg-gray-700 text-white">{s}</option>)}
            </select>
          </div>
          <input
            className="w-full rounded-2xl px-3 py-2 bg-[var(--panel)] border border-[var(--line)] text-white placeholder:muted"
            placeholder="이름/제조사/모델 검색"
            value={q} onChange={e=>setQ(e.target.value)}
          />
        </div>
      </header>

      {/* 리스트 */}
      <main className="max-w-screen-sm mx-auto px-2 pb-28 space-y-2">
        <div className="text-center py-2">
          <span className="text-emerald-400 text-sm font-semibold">총 {filtered.length}개 공구</span>
        </div>
        
        {filtered.map(t=>(
          <article key={t.id} className="tool-card">
            <div className="thumb">
              {t.imageUrl
                ? <img src={imgSrc(t.imageUrl)} alt={t.name} className="max-h-full max-w-full object-contain" loading="lazy"/>
                : <span className="muted text-xs">이미지 없음</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <h2 className="text-white font-bold text-[15px] leading-tight line-clamp-2">{t.name}</h2>
                <span className="pill ml-auto">{t.category}</span>
              </div>
              
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(t)}`}>
                  {getStatusText(t)}
                </span>
                <span className="text-xs text-white/60">#{t.id}</span>
              </div>
              
              <div className="meta-row mt-1">
                <Meta label="상태" val={t.condition==="new"?"신품":"중고"} />
                <Meta label="제조사" val={t.manufacturer??"-"} />
                <Meta label="모델" val={t.model??"-"} />
              </div>
              <div className="mt-2 flex justify-end">
                <button className="btn-red-outline text-sm" onClick={()=>setSel(t)}>🔍 자세히 보기</button>
              </div>
            </div>
          </article>
        ))}
        {filtered.length===0 && <div className="text-center muted py-16">검색/필터 조건에 맞는 항목이 없습니다.</div>}
      </main>

      {/* 바텀시트 (큰 이미지) */}
      {sel && (
        <>
          <div className="sheet-backdrop" onClick={()=>setSel(null)} />
          <section className="sheet" role="dialog" aria-modal="true" aria-label={`${sel.name} 상세`}>
            <div className="sheet-header">
              <div className="sheet-handle" />
              <button className="sheet-close" onClick={()=>setSel(null)} aria-label="닫기">✕</button>

              <div className="w-full h-56 bg-[#0f1318] rounded-2xl overflow-hidden flex items-center justify-center">
                {sel.imageUrl
                  ? <img src={imgSrc(sel.imageUrl)} alt={sel.name} className="object-contain max-h-full w-auto"/>
                  : <span className="muted text-sm">이미지 없음</span>}
              </div>

              <div className="mt-3 px-1">
                <h3 className="text-[18px] font-extrabold leading-tight">{sel.name}</h3>
                <div className="mt-1 flex gap-2 items-center flex-wrap">
                  <span className="pill">{sel.category}</span>
                  <span className="pill">{sel.condition==="new"?"신품":"중고"}</span>
                  <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(sel)}`}>
                    {getStatusText(sel)}
                  </span>
                </div>
              </div>
            </div>

            <div className="sheet-body">
              <div className="grid grid-cols-2 gap-y-1 text-[13px]">
                <Meta label="공구 ID" val={sel.id} />
                <Meta label="제조사" val={sel.manufacturer??"-"} />
                <Meta label="모델" val={sel.model??"-"} />
                <Meta label="구입일" val={sel.purchaseDate??"-"} />
                <Meta label="수명(개월)" val={sel.lifespanMonths?String(sel.lifespanMonths):"-"} />
                <Meta label="대출상태" val={sel.loanStatus??"반납"} />
                <Meta label="대출 가능" val={sel.available?"가능":"불가"} />
                <Meta label="파손" val={sel.damaged?"예":"아니오"} />
                <Meta label="수리" val={sel.repaired?"예":"아니오"} />
              </div>
              {sel.notes && (
                <div className="mt-2 text-[13px]">
                  <div className="font-semibold mb-1">비고</div>
                  <div className="whitespace-pre-wrap text-[#dfe5ec]">{sel.notes}</div>
                </div>
              )}
            </div>

            <div className="sheet-footer">
              {getStatusText(sel) === "정상" ? (
                <button className="btn-red w-full text-[16px] py-3">📤 이 공구 대출하기</button>
              ) : (
                <button className="btn-ghost w-full text-[16px] py-3" disabled>
                  {getStatusText(sel)} 상태로 대출 불가
                </button>
              )}
            </div>
          </section>
        </>
      )}

      {/* 하단 탭바 */}
      <nav className="tabbar">
        <Link to="/capture" className="tab">📷 촬영</Link>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="tab tab--primary"
        >
          🔍 둘러보기
        </button>
        <Link to="/settings" className="tab">⚙️ 설정</Link>
      </nav>
    </div>
  );
}

function Meta({label,val}:{label:string; val?:string}){
  return <div className="text-[#d0d6dd]"><span className="muted">{label}:</span> {val??"-"}</div>;
}