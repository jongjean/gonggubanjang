import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Tool = {
  id:string; name:string; category:string;
  manufacturer?:string; model?:string; condition?: "new"|"used"|string;
  purchaseDate?:string; lifespanMonths?:number; available?:boolean;
  loanStatus?:string; damaged?:boolean; repaired?:boolean;
  imageUrl?:string; notes?:string;
};

const fileOnly = (p?:string)=> p? p.replace(/^.*[\\/]/,"") : "";
const imgSrc = (p?:string)=> p? `/tools/${fileOnly(p)}` : "";

export default function ToolList(){
  const [tools,setTools] = useState<Tool[]>([]);
  const [q,setQ] = useState(""); const [cat,setCat]=useState("전체");
  const [sel,setSel] = useState<Tool|null>(null);

  useEffect(()=>{ (async()=>{
    const data:Tool[] = await fetch("/api/tools").then(r=>r.json());
    setTools(data);
  })() },[]);

  const cats = useMemo(()=>["전체",...Array.from(new Set(tools.map(t=>t.category||"기타")))], [tools]);
  const filtered = useMemo(()=>{
    const kw=q.trim().toLowerCase();
    return tools.filter(t=>{
      const okCat = cat==="전체" || t.category===cat;
      const hay = `${t.name} ${t.category} ${t.manufacturer??""} ${t.model??""}`.toLowerCase();
      return okCat && (!kw || hay.includes(kw));
    });
  },[tools,q,cat]);

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
          <div className="text-white text-xl font-black tracking-tight ml-2 mr-auto">🔧 공구 목록</div>
          <select className="pill" value={cat} onChange={e=>setCat(e.target.value)}>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="max-w-screen-sm mx-auto px-3 pb-3">
          <input
            className="w-full rounded-2xl px-3 py-2 bg-[var(--panel)] border border-[var(--line)] text-white placeholder:muted"
            placeholder="이름/제조사/모델 검색"
            value={q} onChange={e=>setQ(e.target.value)}
          />
        </div>
      </header>

      {/* 리스트 */}
      <main className="max-w-screen-sm mx-auto px-2 pb-28 space-y-2">
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
              <div className="meta-row mt-1">
                <Meta label="상태" val={t.condition==="new"?"신품":"중고"} />
                <Meta label="제조사" val={t.manufacturer??"-"} />
                <Meta label="모델" val={t.model??"-"} />
                <Meta label="구입일" val={t.purchaseDate??"-"} />
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
                </div>
              </div>
            </div>

            <div className="sheet-body">
              <div className="grid grid-cols-2 gap-y-1 text-[13px]">
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
              <button className="btn-red w-full text-[16px] py-3">📤 이 공구 대출하기</button>
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
          🧰 목록
        </button>
        <Link to="/settings" className="tab">⚙️ 설정</Link>
      </nav>
    </div>
  );
}

function Meta({label,val}:{label:string; val?:string}){
  return <div className="text-[#d0d6dd]"><span className="muted">{label}:</span> {val??"-"}</div>;
}
