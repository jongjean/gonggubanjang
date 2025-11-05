import React, { useEffect, useMemo, useState } from "react";

type Tool = {
  id: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  condition?: "new" | "used" | string;
  purchaseDate?: string;
  lifespanMonths?: number;
  available?: boolean;
  loanStatus?: string;
  damaged?: boolean;
  repaired?: boolean;
  imageUrl?: string;
  notes?: string;
};

const fileOnly = (p?: string) => (p ? p.replace(/^.*[\\/]/, "") : "");
const imgSrc = (p?: string) => (p ? `/tools/${fileOnly(p)}` : "");

export default function App() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("전체");
  const [sel, setSel] = useState<Tool | null>(null);

  useEffect(() => {
    // API 서버 없이 바로 더미 데이터 사용
    console.log("더미 데이터 로딩...");
    const dummyTools: Tool[] = [
          {
            id: "G001",
            name: "드릴 드라이버",
            category: "전동공구",
            manufacturer: "DeWalt",
            model: "XR-18V",
            condition: "used",
            purchaseDate: "2023-01-15",
            lifespanMonths: 36,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "drilldriver.jpg",
            notes: "배터리 2개 포함"
          },
          {
            id: "G002",
            name: "원형톱",  
            category: "전동공구",
            manufacturer: "Makita",
            model: "5007MG",
            condition: "new",
            purchaseDate: "2023-03-10",
            lifespanMonths: 48,
            available: true,
            loanStatus: "반납", 
            damaged: false,
            repaired: false,
            imageUrl: "circularsaw.jpg",
            notes: "날 교체 필요시 연락"
          },
          {
            id: "G003",
            name: "해머",
            category: "수공구",
            manufacturer: "Stanley",
            model: "STHT51512",
            condition: "used",
            purchaseDate: "2022-08-20",
            lifespanMonths: 60,
            available: false,
            loanStatus: "대출중",
            damaged: false,
            repaired: false,
            imageUrl: "hammer.jpg",
            notes: "무게 450g"
          },
          {
            id: "G004",
            name: "각도절단기",
            category: "전동공구",
            manufacturer: "BOSCH",
            model: "GWS 7-115",
            condition: "used",
            purchaseDate: "2023-02-20",
            lifespanMonths: 36,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "anglegrinder.jpg",
            notes: "보안경 착용 필수"
          },
          {
            id: "G005",
            name: "줄자",
            category: "측정공구",
            manufacturer: "Stanley",
            model: "STHT30825",
            condition: "new",
            purchaseDate: "2023-04-05",
            lifespanMonths: 24,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "tape-measure.jpg",
            notes: "5m 길이"
          },
          {
            id: "G006",
            name: "전동 임팩트",
            category: "전동공구",
            manufacturer: "Milwaukee",
            model: "M18 FUEL",
            condition: "used",
            purchaseDate: "2023-06-10",
            lifespanMonths: 36,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "impact-driver.jpg",
            notes: "토크 조절 가능"
          },
          {
            id: "G007",
            name: "레벨기",
            category: "측정공구",
            manufacturer: "Stabila",
            model: "70-2",
            condition: "new",
            purchaseDate: "2023-05-15",
            lifespanMonths: 60,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "level.jpg",
            notes: "60cm 길이"
          },
          {
            id: "G008",
            name: "사포기",
            category: "전동공구",
            manufacturer: "Bosch",
            model: "GEX 125-1 AE",
            condition: "used",
            purchaseDate: "2022-11-20",
            lifespanMonths: 48,
            available: false,
            loanStatus: "대출중",
            damaged: false,
            repaired: false,
            imageUrl: "orbital-sander.jpg",
            notes: "먼지 수집 기능"
          },
          {
            id: "G009",
            name: "스패너 세트",
            category: "수공구",
            manufacturer: "Gedore",
            model: "UD-19",
            condition: "used",
            purchaseDate: "2023-01-25",
            lifespanMonths: 120,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "wrench-set.jpg",
            notes: "8-19mm 세트"
          },
          {
            id: "G010",
            name: "멀티미터",
            category: "측정공구",
            manufacturer: "Fluke",
            model: "87V",
            condition: "new",
            purchaseDate: "2023-08-12",
            lifespanMonths: 120,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "multimeter.jpg",
            notes: "고급형 디지털"
          },
          {
            id: "G011",
            name: "안전장갑",
            category: "안전용품",
            manufacturer: "3M",
            model: "Comfort Grip",
            condition: "new",
            purchaseDate: "2023-09-01",
            lifespanMonths: 6,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "safety-gloves.jpg",
            notes: "L 사이즈"
          },
          {
            id: "G012",
            name: "보안경",
            category: "안전용품",
            manufacturer: "Uvex",
            model: "Sportstyle",
            condition: "new",
            purchaseDate: "2023-07-15",
            lifespanMonths: 24,
            available: true,
            loanStatus: "반납",
            damaged: false,
            repaired: false,
            imageUrl: "safety-glasses.jpg",
            notes: "김서림 방지"
          }
        ];
        setTools(dummyTools);
        console.log("더미 데이터 로딩 완료:", dummyTools.length, "개");
  }, []);

  const cats = useMemo(() => ["전체", ...Array.from(new Set(tools.map(t => t.category || "기타공구")))], [tools]);
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return tools.filter(t => {
      const okCat = cat === "전체" || t.category === cat;
      const hay = `${t.name} ${t.category} ${t.manufacturer ?? ""} ${t.model ?? ""}`.toLowerCase();
      return okCat && (!kw || hay.includes(kw));
    });
  }, [tools, q, cat]);

  // ESC로 바텀시트 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* 상단바 */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-screen-sm px-3 py-3 flex items-center gap-2">
          <div className="text-[22px] font-black tracking-tight mr-auto">
            <span className="text-[26px]">🧰</span> 공구반장 — 공구 목록
            <span className="ml-1 text-rose-600">({filtered.length})</span>
          </div>
          <select className="pill" value={cat} onChange={(e)=>setCat(e.target.value)}>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="mx-auto max-w-screen-sm px-3 pb-3">
          <input
            className="w-full rounded-2xl border px-3 py-2 text-[14px] bg-white"
            placeholder="이름/제조사/모델 검색"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
        </div>
      </header>

      {/* 목록 (모바일 컴팩트) */}
      <main className="mx-auto max-w-screen-sm px-2 pb-24 space-y-2">
        {filtered.map(t => (
          <article key={t.id} className="tool-card">
            {/* 썸네일 (좌측) */}
            <div className="thumb">
              {t.imageUrl
                ? <img src={imgSrc(t.imageUrl)} alt={t.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                : <span className="text-gray-400 text-xs">이미지 없음</span>}
            </div>

            {/* 정보 (우측) */}
            <div className="flex-1">
              <div className="flex items-start gap-2">
                <h2 className="font-bold text-[15px] leading-tight line-clamp-2">{t.name}</h2>
                <span className="pill ml-auto">{t.category}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-y-0.5 text-[12px] text-gray-700">
                <Info label="상태" value={t.condition === "new" ? "신품" : "중고"} />
                <Info label="제조사" value={t.manufacturer ?? "-"} />
                <Info label="모델" value={t.model ?? "-"} />
                <Info label="구입일" value={t.purchaseDate ?? "-"} />
              </div>

              {/* 하단 액션 */}
              <div className="mt-2 flex justify-end">
                <button className="btn-red-outline text-[13px]" onClick={()=>setSel(t)}>
  🔍 자세히 보기
</button>
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-16">검색/필터 조건에 맞는 항목이 없습니다.</div>
        )}
      </main>

      {/* 바텀시트 상세 */}
{sel && (
  <>
    <div className="sheet-backdrop" onClick={() => setSel(null)} />
    <section className="sheet" role="dialog" aria-modal="true" aria-label={`${sel.name} 상세`}>
      {/* Header */}
      <div className="sheet-header relative">
        <div className="sheet-handle" />
        <button
          className="sheet-close"
          onClick={() => setSel(null)}
          aria-label="닫기"
        >
          ✕
        </button>

        {/* 큰 이미지 */}
        <div className="w-full h-52 sm:h-64 bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center">
          {sel.imageUrl ? (
            <img
              src={imgSrc(sel.imageUrl)}
              alt={sel.name}
              className="object-contain max-h-full w-auto"
            />
          ) : (
            <span className="text-gray-400 text-sm">이미지 없음</span>
          )}
        </div>

        {/* 이름 / 카테고리 */}
        <div className="mt-3 px-2">
          <h3 className="text-lg font-bold leading-tight">{sel.name}</h3>
          <div className="mt-1 flex gap-2 items-center flex-wrap">
            <span className="pill">{sel.category}</span>
            <span className="pill">{sel.condition === "new" ? "신품" : "중고"}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="sheet-body">
        <div className="grid grid-cols-2 gap-y-1 text-[13px]">
          <Info label="제조사" value={sel.manufacturer ?? "-"} />
          <Info label="모델" value={sel.model ?? "-"} />
          <Info label="구입일" value={sel.purchaseDate ?? "-"} />
          <Info label="수명(개월)" value={sel.lifespanMonths ? String(sel.lifespanMonths) : "-"} />
          <Info label="대출상태" value={sel.loanStatus ?? "반납"} />
          <Info label="대출 가능" value={sel.available ? "가능" : "불가"} />
          <Info label="파손" value={sel.damaged ? "예" : "아니오"} />
          <Info label="수리" value={sel.repaired ? "예" : "아니오"} />
        </div>

        {sel.notes && (
          <div className="mt-3 text-[13px]">
            <div className="font-semibold mb-1">비고</div>
            <div className="whitespace-pre-wrap text-gray-700">{sel.notes}</div>
          </div>
        )}
      </div>

      {/* Footer (고정) */}
      <div className="sheet-footer">
        <button className="btn-red w-full text-[16px] py-3">
          📤 이 공구 대출하기
        </button>
      </div>
    </section>
  </>
)}
    </div>
  );
}

/* helpers */
function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="text-gray-700">
      <span className="text-gray-500">{label}:</span> {value ?? "-"}
    </div>
  );
}
