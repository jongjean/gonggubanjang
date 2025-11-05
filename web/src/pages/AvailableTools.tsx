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

export default function AvailableTools(){
  const [tools,setTools] = useState<Tool[]>([]);
  const [q,setQ] = useState(""); 
  const [cat,setCat]=useState("전체");
  const [sel,setSel] = useState<Tool|null>(null);
  const [cart, setCart] = useState<string[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(()=>{ (async()=>{
    const data:Tool[] = await fetch("/api/tools").then(r=>r.json());
    setTools(data);
  })() },[]);

  const handleAddToCart = (toolId: string) => {
    if (!cart.includes(toolId)) {
      setCart(prev => [...prev, toolId]);
      alert('공구상자에 담았습니다!');
    }
  };

  const handleRemoveFromCart = (toolId: string) => {
    setCart(prev => prev.filter(id => id !== toolId));
  };

  const handleLoan = async () => {
    if (cart.length === 0) {
      alert('대출할 공구를 선택해주세요.');
      return;
    }

    const loanData = {
      toolIds: cart,
      days: 3,
      startDate: new Date().toISOString().split('T')[0]
    };

    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanData)
      });

      if (response.ok) {
        setCart([]);
        setShowCart(false);
        alert(`${cart.length}개 공구가 3일간 대출되었습니다.`);
        // 페이지 새로고침으로 상태 업데이트
        window.location.reload();
      }
    } catch (error) {
      alert('대출 처리에 실패했습니다.');
    }
  };

  const cats = useMemo(()=>["전체",...Array.from(new Set(tools.map(t=>t.category||"기타")))], [tools]);
  
  // 사용 가능한 공구만 필터링
  const availableTools = useMemo(() => {
    return tools.filter(t => 
      t.available !== false && 
      !t.damaged && 
      t.loanStatus !== "대출중" && 
      t.status !== "disposed"
    );
  }, [tools]);
  
  const filtered = useMemo(()=>{
    const kw=q.trim().toLowerCase();
    return availableTools.filter(t=>{
      const okCat = cat==="전체" || t.category===cat;
      const hay = `${t.name} ${t.category} ${t.manufacturer??""} ${t.model??""}`.toLowerCase();
      return okCat && (!kw || hay.includes(kw));
    });
  },[availableTools,q,cat]);

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
          <div className="text-white text-xl font-black tracking-tight ml-2 mr-auto">🔧 공구 사용</div>
          {cart.length > 0 && (
            <button 
              className="btn-blue text-sm px-3 py-2 mr-2 relative"
              onClick={() => setShowCart(true)}
            >
              🧰 공구상자 ({cart.length})
            </button>
          )}
          <Link to="/tools" className="btn-red-outline text-sm px-3 py-2">
            🔍 둘러보기
          </Link>
        </div>
        
        {/* 필터 */}
        <div className="max-w-screen-sm mx-auto px-3 pb-3 space-y-2">
          <select className="pill w-full" value={cat} onChange={e=>setCat(e.target.value)}>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
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
          <span className="text-emerald-400 text-sm font-semibold">사용 가능한 공구 {filtered.length}개</span>
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
                <span className="px-2 py-1 rounded-full text-xs border bg-emerald-500/15 border-emerald-500/40 text-emerald-300">
                  대여 가능
                </span>
                <span className="text-xs text-white/60">#{t.id}</span>
              </div>
              
              <div className="meta-row mt-1">
                <Meta label="상태" val={t.condition==="new"?"신품":"중고"} />
                <Meta label="제조사" val={t.manufacturer??"-"} />
                <Meta label="모델" val={t.model??"-"} />
              </div>
              <div className="mt-2 flex justify-between">
                <button className="btn-ghost text-sm" onClick={()=>setSel(t)}>🔍 자세히 보기</button>
                {cart.includes(t.id) ? (
                  <button className="btn-gray text-sm" disabled>
                    ✓ 담김
                  </button>
                ) : (
                  <button className="btn-blue text-sm" onClick={() => handleAddToCart(t.id)}>
                    🧰 담기
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
        {filtered.length===0 && <div className="text-center muted py-16">사용 가능한 공구가 없습니다.</div>}
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
                  <span className="px-2 py-1 rounded-full text-xs border bg-emerald-500/15 border-emerald-500/40 text-emerald-300">
                    대여 가능
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
              </div>
              {sel.notes && (
                <div className="mt-2 text-[13px]">
                  <div className="font-semibold mb-1">비고</div>
                  <div className="whitespace-pre-wrap text-[#dfe5ec]">{sel.notes}</div>
                </div>
              )}
            </div>

            <div className="sheet-footer">
              {sel && cart.includes(sel.id) ? (
                <button className="btn-gray w-full text-[16px] py-3" disabled>
                  ✓ 이미 공구상자에 담음
                </button>
              ) : (
                <button 
                  className="btn-blue w-full text-[16px] py-3"
                  onClick={() => sel && handleAddToCart(sel.id)}
                >
                  🧰 공구상자에 담기
                </button>
              )}
            </div>
          </section>
        </>
      )}

      {/* 공구상자 모달 */}
      {showCart && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowCart(false)} />
          <section className="sheet" role="dialog" aria-modal="true" aria-label="공구상자">
            <div className="sheet-header">
              <div className="sheet-handle" />
              <button className="sheet-close" onClick={() => setShowCart(false)} aria-label="닫기">✕</button>
              
              <div className="mt-3 px-1">
                <h3 className="text-[18px] font-extrabold leading-tight">🧰 공구상자</h3>
                <p className="text-white/70 text-sm mt-1">대출 기간: 3일 (연장 가능)</p>
              </div>
            </div>

            <div className="sheet-body">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-white/60">
                  공구상자가 비어있습니다
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(toolId => {
                    const tool = availableTools.find(t => t.id === toolId);
                    if (!tool) return null;
                    return (
                      <div key={toolId} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                          {tool.imageUrl ? (
                            <img src={imgSrc(tool.imageUrl)} alt={tool.name} className="w-full h-full object-cover rounded" />
                          ) : (
                            <span className="text-gray-400">🔧</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white text-sm">{tool.name}</h4>
                          <p className="text-white/60 text-xs">{tool.category}</p>
                        </div>
                        <button 
                          className="text-red-400 hover:text-red-300 text-sm"
                          onClick={() => handleRemoveFromCart(toolId)}
                        >
                          ✕ 제거
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sheet-footer">
              {cart.length > 0 && (
                <button 
                  className="btn-red w-full text-[16px] py-3"
                  onClick={handleLoan}
                >
                  📤 {cart.length}개 공구 대출하기 (3일)
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
          🔧 공구사용
        </button>
        <Link to="/settings" className="tab">⚙️ 설정</Link>
      </nav>
    </div>
  );
}

function Meta({label,val}:{label:string; val?:string}){
  return <div className="text-[#d0d6dd]"><span className="muted">{label}:</span> {val??"-"}</div>;
}