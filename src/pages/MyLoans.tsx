import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Loan = {
  id: string;
  toolId: string;
  toolName?: string;
  toolCategory?: string;
  toolImageUrl?: string;
  startDate: string;
  endDate: string;
  status: "active" | "overdue" | "returned";
  extendCount?: number;
};

type Tool = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
};

const fileOnly = (p?: string) => p ? p.replace(/^.*[\\/]/, "") : "";
const imgSrc = (p?: string) => p ? `/tools/${fileOnly(p)}` : "";

const getDaysLeft = (endDate: string) => {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getStatusColor = (loan: Loan) => {
  const daysLeft = getDaysLeft(loan.endDate);
  if (loan.status === "returned") return "bg-gray-500/15 border-gray-500/40 text-gray-300";
  if (daysLeft < 0) return "bg-red-500/15 border-red-500/40 text-red-300";
  if (daysLeft === 0) return "bg-amber-500/15 border-amber-500/40 text-amber-300";
  return "bg-emerald-500/15 border-emerald-500/40 text-emerald-300";
};

const getStatusText = (loan: Loan) => {
  const daysLeft = getDaysLeft(loan.endDate);
  if (loan.status === "returned") return "반납완료";
  if (daysLeft < 0) return `${Math.abs(daysLeft)}일 연체`;
  if (daysLeft === 0) return "오늘 반납";
  return `${daysLeft}일 남음`;
};

export default function MyLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loansRes, toolsRes] = await Promise.all([
          fetch("/api/my-loans"),
          fetch("/api/tools")
        ]);
        
        const loansData = await loansRes.json();
        const toolsData = await toolsRes.json();
        
        // 대출 정보에 공구 정보 매핑
        const enrichedLoans = loansData.map((loan: Loan) => {
          const tool = toolsData.find((t: Tool) => t.id === loan.toolId);
          return {
            ...loan,
            toolName: tool?.name || "알 수 없는 공구",
            toolCategory: tool?.category || "기타",
            toolImageUrl: tool?.imageUrl
          };
        });
        
        setLoans(enrichedLoans);
        setTools(toolsData);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        // 임시 데이터 (개발용)
        setLoans([
          {
            id: "loan1",
            toolId: "G001",
            toolName: "드릴 드라이버",
            toolCategory: "전동공구",
            toolImageUrl: "drilldriver.jpg",
            startDate: "2025-11-02",
            endDate: "2025-11-05",
            status: "active",
            extendCount: 0
          },
          {
            id: "loan2", 
            toolId: "G019",
            toolName: "전기 앵글 그라인더",
            toolCategory: "전동공구",
            toolImageUrl: "handgrinder.avif",
            startDate: "2025-10-30",
            endDate: "2025-11-02",
            status: "overdue",
            extendCount: 1
          }
        ]);
      }
      setLoading(false);
    };
    
    loadData();
  }, []);

  const handleExtend = async (loanId: string) => {
    try {
      const response = await fetch(`/api/loans/${loanId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 3 })
      });
      
      if (response.ok) {
        const updatedLoan = await response.json();
        setLoans(prev => prev.map(loan => 
          loan.id === loanId ? { ...loan, ...updatedLoan } : loan
        ));
        alert("대출 기간이 3일 연장되었습니다.");
      }
    } catch (error) {
      alert("연장에 실패했습니다.");
    }
  };

  const handleReturn = async (loanId: string) => {
    if (!confirm("이 공구를 반납하시겠습니까?")) return;
    
    try {
      const response = await fetch(`/api/loans/${loanId}/return`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setLoans(prev => prev.map(loan => 
          loan.id === loanId ? { ...loan, status: "returned" as const } : loan
        ));
        alert("공구가 반납되었습니다.");
      }
    } catch (error) {
      alert("반납에 실패했습니다.");
    }
  };

  const activeLoans = loans.filter(loan => loan.status !== "returned");
  const returnedLoans = loans.filter(loan => loan.status === "returned");

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="text-white">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-black/30 backdrop-blur">
        <div className="max-w-screen-sm mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/" className="btn-ghost text-sm px-3 py-2">
            🏠 홈
          </Link>
          <div className="text-white text-xl font-black tracking-tight ml-2 mr-auto">📦 나의 대출현황</div>
          <Link to="/tools" className="btn-red-outline text-sm px-3 py-2">
            🔍 둘러보기
          </Link>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-screen-sm mx-auto px-2 pb-28 space-y-4">
        
        {/* 현재 대출 중 */}
        <section className="mt-4">
          <h2 className="text-white font-bold text-lg mb-3 px-2">현재 대출 중 ({activeLoans.length}개)</h2>
          
          {activeLoans.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white/60 mb-4">현재 대출 중인 공구가 없습니다</div>
              <Link to="/available-tools" className="btn-red">
                🔧 공구 대출하기
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeLoans.map(loan => (
                <article key={loan.id} className="app-card p-4">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {loan.toolImageUrl ? (
                        <img src={imgSrc(loan.toolImageUrl)} alt={loan.toolName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-2xl">🔧</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="font-bold text-white">{loan.toolName}</h3>
                        <span className="pill">{loan.toolCategory}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(loan)}`}>
                          {getStatusText(loan)}
                        </span>
                        <span className="text-xs text-white/60">#{loan.toolId}</span>
                      </div>
                      
                      <div className="text-sm text-white/70 mb-3">
                        <div>대출일: {new Date(loan.startDate).toLocaleDateString()}</div>
                        <div>반납일: {new Date(loan.endDate).toLocaleDateString()}</div>
                        {(loan.extendCount || 0) > 0 && (
                          <div className="text-blue-400">연장횟수: {loan.extendCount}회</div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button 
                          className="btn-blue text-sm"
                          onClick={() => handleExtend(loan.id)}
                        >
                          📅 3일 연장
                        </button>
                        <button 
                          className="btn-red text-sm"
                          onClick={() => handleReturn(loan.id)}
                        >
                          📤 반납하기
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* 반납 완료 */}
        {returnedLoans.length > 0 && (
          <section>
            <h2 className="text-white font-bold text-lg mb-3 px-2">반납 완료 ({returnedLoans.length}개)</h2>
            <div className="space-y-2">
              {returnedLoans.map(loan => (
                <article key={loan.id} className="app-card p-4 opacity-60">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-700 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {loan.toolImageUrl ? (
                        <img src={imgSrc(loan.toolImageUrl)} alt={loan.toolName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-2xl">🔧</span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="font-bold text-white">{loan.toolName}</h3>
                        <span className="pill">{loan.toolCategory}</span>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(loan)}`}>
                        반납완료
                      </span>
                      
                      <div className="text-sm text-white/50 mt-2">
                        <div>대출: {new Date(loan.startDate).toLocaleDateString()} ~ {new Date(loan.endDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 하단 탭바 */}
      <nav className="tabbar">
        <Link to="/capture" className="tab">📷 촬영</Link>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="tab tab--primary"
        >
          📦 나의대출
        </button>
        <Link to="/settings" className="tab">⚙️ 설정</Link>
      </nav>
    </div>
  );
}