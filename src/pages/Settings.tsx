import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function Settings() {
  const [autoSaveImages, setAutoSaveImages] = useState(false);
  const [tempImageRetention, setTempImageRetention] = useState(60); // 분 단위
  const [autoAnalysis, setAutoAnalysis] = useState(true);
  const [imageQuality, setImageQuality] = useState('medium');

  // 설정 로드
  useEffect(() => {
    const savedSettings = localStorage.getItem('gonggubanjang-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setAutoSaveImages(settings.autoSaveImages ?? false);
      setTempImageRetention(settings.tempImageRetention ?? 60);
      setAutoAnalysis(settings.autoAnalysis ?? false); // 기본값을 false로 변경
      setImageQuality(settings.imageQuality ?? 'medium');
    }
  }, []);

  // 설정 저장
  const saveSettings = () => {
    const settings = {
      autoSaveImages,
      tempImageRetention,
      autoAnalysis,
      imageQuality
    };
    localStorage.setItem('gonggubanjang-settings', JSON.stringify(settings));
    alert('설정이 저장되었습니다.');
  };

  // 설정 초기화
  const resetSettings = () => {
    if (confirm('모든 설정을 초기화하시겠습니까?')) {
      localStorage.removeItem('gonggubanjang-settings');
      setAutoSaveImages(false);
      setTempImageRetention(60);
      setAutoAnalysis(false); // 초기화시에도 false로 설정
      setImageQuality('medium');
      alert('설정이 초기화되었습니다.');
    }
  };

  return (
    <div className="min-h-screen app-bg text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="max-w-screen-sm mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/" className="btn-ghost text-sm px-3 py-2">
            🏠 홈
          </Link>
          <div className="font-black text-xl ml-2 mr-auto">⚙️ 설정</div>
          <Link to="/tools" className="btn-red-outline text-sm px-3 py-2">
            📋 목록
          </Link>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        
        {/* 이미지 저장 설정 */}
        <section className="app-card p-4">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            📸 이미지 저장 설정
          </h3>
          
          <div className="space-y-4">
            {/* 자동 저장 옵션 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">모든 촬영 이미지 자동 저장</div>
                <div className="text-sm muted">촬영한 모든 이미지를 즉시 저장합니다</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={autoSaveImages}
                  onChange={(e) => setAutoSaveImages(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* 임시 이미지 보관 시간 */}
            <div>
              <label className="block font-semibold mb-2">
                임시 이미지 보관 시간
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl bg-[var(--panel)] border border-[var(--line)] text-white"
                value={tempImageRetention}
                onChange={(e) => setTempImageRetention(Number(e.target.value))}
              >
                <option value={30}>30분</option>
                <option value={60}>1시간</option>
                <option value={120}>2시간</option>
                <option value={360}>6시간</option>
                <option value={720}>12시간</option>
                <option value={1440}>24시간</option>
              </select>
              <div className="text-sm muted mt-1">
                미확정 이미지가 자동 삭제되는 시간입니다
              </div>
            </div>

            {/* 이미지 품질 */}
            <div>
              <label className="block font-semibold mb-2">
                저장 이미지 품질
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl bg-[var(--panel)] border border-[var(--line)] text-white"
                value={imageQuality}
                onChange={(e) => setImageQuality(e.target.value)}
              >
                <option value="low">낮음 (빠른 업로드, 작은 용량)</option>
                <option value="medium">보통 (균형잡힌 품질)</option>
                <option value="high">높음 (고화질, 큰 용량)</option>
              </select>
            </div>
          </div>
        </section>

        {/* AI 분석 설정 */}
        <section className="app-card p-4">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            🤖 AI 분석 설정
          </h3>
          
          <div className="space-y-4">
            {/* 자동 분석 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">촬영 후 자동 AI 분석</div>
                <div className="text-sm muted">사진 촬영 즉시 AI 분석을 시작합니다</div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={autoAnalysis}
                  onChange={(e) => setAutoAnalysis(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* 데이터 관리 */}
        <section className="app-card p-4">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            💾 데이터 관리
          </h3>
          
          <div className="space-y-3">
            <button className="w-full btn-red-outline py-3 text-left px-4">
              📊 공구 데이터 백업
            </button>
            <button className="w-full btn-red-outline py-3 text-left px-4">
              📁 임시 데이터 삭제
            </button>
            <button className="w-full btn-red-outline py-3 text-left px-4">
              📈 앱 사용 통계 보기
            </button>
          </div>
        </section>

        {/* 앱 정보 */}
        <section className="app-card p-4">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            ℹ️ 앱 정보
          </h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="muted">버전</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="muted">개발자</span>
              <span>유콘크리에이티브(주) 공구반장</span>
            </div>
            <div className="flex justify-between">
              <span className="muted">문의</span>
              <span>mail@uconcreative.com</span>
            </div>
          </div>
        </section>

        {/* 설정 버튼 */}
        <div className="flex gap-3">
          <button 
            onClick={saveSettings}
            className="flex-1 btn-red py-3"
          >
            💾 설정 저장
          </button>
          <button 
            onClick={resetSettings}
            className="flex-1 btn-red-outline py-3"
          >
            🔄 초기화
          </button>
        </div>

        <div className="pb-20"></div> {/* 하단 탭바 여백 */}
      </main>

      {/* 하단 탭바 */}
      <nav className="tabbar">
        <Link to="/capture" className="tab">📷 촬영</Link>
        <Link to="/tools" className="tab">🧰 목록</Link>
        <Link to="/settings" className="tab tab--primary">⚙️ 설정</Link>
      </nav>
    </div>
  );
}