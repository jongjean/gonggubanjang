import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Tool = {
  id:string; name:string; category:string;
  manufacturer?:string; model?:string; condition?: "new"|"used"|string;
  purchaseDate?:string; lifespanMonths?:number; available?:boolean;
  loanStatus?:string; damaged?:boolean; repaired?:boolean;
  imageUrl?:string; notes?:string; status?:string;
  tempImageId?:string; tempImageName?:string; tempDataURL?:string; // 임시 이미지 정보
};

const fileOnly = (p?:string)=> p? p.replace(/^.*[\\/]/,"") : "";
const imgSrc = (p?:string, tempImageName?:string, tempDataURL?:string)=> {
  console.log('🔍 imgSrc called with:', {
    imageUrl: p,
    tempImageName: tempImageName,
    tempDataURL: tempDataURL ? tempDataURL.substring(0, 50) + '...' : null
  });
  
  // 임시 이미지가 있으면 우선 사용 (서버에 업로드된 안정적인 이미지)
  if (tempImageName) {
    const tempUrl = `/temp/${tempImageName}`;
    console.log('�️ Using temp image:', tempUrl);
    return tempUrl;
  }
  
  // tempImageName이 없고 tempDataURL이 있는 경우에만 DataURL 사용
  if (tempDataURL && !tempDataURL.startsWith('blob:')) {
    // DataURL이 있으면 사용 (단, blob URL은 제외)
    console.log('� Using tempDataURL (not blob)');
    return tempDataURL;
  }
  
  if (p) {
    const toolUrl = `/tools/${fileOnly(p)}`;
    console.log('📁 Using tools image:', toolUrl);
    return toolUrl;
  }
  
  console.log('❌ No image source available');
  return "";
};

export default function ToolEditor(){
  const [tools,setTools] = useState<Tool[]>([]);
  const [q,setQ] = useState(""); 
  const [cat,setCat]=useState("전체");
  const [sel,setSel] = useState<Tool|null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Tool|null>(null);

  useEffect(()=>{ (async()=>{
    const data:Tool[] = await fetch("/api/tools").then(r=>r.json());
    setTools(data);
  })() },[]);

  // URL 파라미터 처리를 위한 별도 useEffect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const isTemp = urlParams.get('temp');
    
    if (isTemp === 'true') {
      // 임시 데이터에서 편집 시작
      const tempDataStr = localStorage.getItem('temp-edit-data');
      console.log('🔍 Checking temp data:', tempDataStr ? 'found' : 'not found');
      
      if (tempDataStr) {
        try {
          const tempData = JSON.parse(tempDataStr);
          console.log('📄 Temp data loaded:', tempData);
          console.log('🖼️ Temp image info:', {
            tempImageId: tempData.tempImageId,
            tempImageName: tempData.tempImageName,
            imageUrl: tempData.imageUrl,
            tempDataURL: tempData.tempDataURL ? tempData.tempDataURL.substring(0, 50) + '...' : null
          });
          
          // 임시 이미지 URL 접근성 테스트
          if (tempData.tempImageName) {
            const testUrl = `/temp/${tempData.tempImageName}`;
            console.log('🧪 Testing temp image URL:', testUrl);
            
            // 직접 fetch로 이미지 존재 확인
            fetch(testUrl, { method: 'HEAD' })
              .then(response => {
                console.log('🌐 Temp image HEAD request result:', {
                  status: response.status,
                  ok: response.ok,
                  headers: Object.fromEntries(response.headers.entries())
                });
                
                if (response.ok) {
                  console.log('✅ Temp image accessible via fetch');
                } else {
                  console.error('❌ Temp image not found on server:', response.status);
                }
              })
              .catch(error => {
                console.error('❌ Temp image fetch failed:', error);
              });
            
            // 이미지 로드 테스트
            const testImg = new Image();
            testImg.onload = () => console.log('✅ Temp image loaded via Image()');
            testImg.onerror = (e) => console.error('❌ Temp image load failed via Image():', e);
            testImg.src = testUrl;
          }
          
          setEditData(tempData);
          setEditMode(true);
          setSel(tempData);
          // localStorage에서 임시 데이터 제거
          localStorage.removeItem('temp-edit-data');
        } catch (e) {
          console.error('임시 데이터 파싱 실패:', e);
        }
      }
      // URL에서 temp 파라미터 제거
      window.history.replaceState({}, '', '/tool-editor');
    } else if (editId && tools.length > 0) {
      // 기존 도구 편집
      const toolToEdit = tools.find(t => t.id === editId);
      if (toolToEdit) {
        setEditData({...toolToEdit});
        setEditMode(true);
        setSel(toolToEdit);
        // URL에서 edit 파라미터 제거
        window.history.replaceState({}, '', '/tool-editor');
      }
    }
  }, [tools]);

  const cats = useMemo(()=>["전체",...Array.from(new Set(tools.map(t=>t.category||"기타")))], [tools]);
  
  const filtered = useMemo(()=>{
    const kw=q.trim().toLowerCase();
    return tools.filter(t=>{
      const okCat = cat==="전체" || t.category===cat;
      const hay = `${t.name} ${t.category} ${t.manufacturer??""} ${t.model??""}`.toLowerCase();
      return okCat && (!kw || hay.includes(kw));
    });
  },[tools,q,cat]);

  const handleEdit = (tool: Tool) => {
    setEditData({...tool});
    setEditMode(true);
    setSel(tool);
  };

  const handleSave = async () => {
    if (!editData) return;
    
    try {
      // 임시 데이터인지 확인 (ID가 temp_로 시작하거나 기존 도구 목록에 없는 경우)
      const isNewTool = !editData.id || editData.id.startsWith('temp_') || !tools.find(t => t.id === editData.id);
      
      if (isNewTool) {
        console.log('💾 Saving new tool with data:', {
          id: editData.id,
          name: editData.name,
          tempImageId: editData.tempImageId,
          tempImageName: editData.tempImageName,
          hasTempDataURL: !!editData.tempDataURL
        });
        
        // 새 도구 생성
        const response = await fetch('/api/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editData)
        });
        
        if (response.ok) {
          const createdTool = await response.json();
          console.log('✅ Tool created successfully:', createdTool);
          setTools(prev => [...prev, createdTool]);
          setEditMode(false);
          setEditData(null);
          setSel(createdTool);
          alert('새 공구가 등록되었습니다.');
        } else {
          const errorData = await response.json();
          console.error('❌ Save failed:', errorData);
          alert('저장 실패: ' + (errorData.error || response.statusText));
        }
      } else {
        // 기존 도구 업데이트
        const response = await fetch(`/api/tools/${editData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editData)
        });
        
        if (response.ok) {
          const updatedTool = await response.json();
          setTools(prev => prev.map(t => t.id === editData.id ? updatedTool : t));
          setEditMode(false);
          setEditData(null);
          setSel(updatedTool);
          alert('공구 정보가 업데이트되었습니다.');
        }
      }
    } catch (error) {
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (tool: Tool) => {
    const confirmed = confirm(
      `"${tool.name}" 공구를 정말로 삭제하시겠습니까?\n\n` +
      `이 작업은 되돌릴 수 없으며, 삭제 이력은 히스토리에 기록됩니다.`
    );
    
    if (!confirmed) return;
    
    try {
      // 1. 삭제 이력을 incidents에 기록
      const incidentResponse = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: tool.id,
          type: 'disposed',
          timestamp: new Date().toISOString(),
          description: `공구 삭제: ${tool.name} (${tool.manufacturer || '제조사 미상'} ${tool.model || ''})`
        })
      });
      
      if (!incidentResponse.ok) {
        throw new Error('이력 기록 실패');
      }
      
      // 2. 실제 공구 데이터 삭제
      const deleteResponse = await fetch(`/api/tools/${tool.id}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        throw new Error('삭제 실패');
      }
      
      // 3. 로컬 상태 업데이트
      setTools(prevTools => prevTools.filter(t => t.id !== tool.id));
      setSel(null);
      setEditMode(false);
      setEditData(null);
      
      alert(`"${tool.name}" 공구가 삭제되었습니다.\n삭제 이력이 히스토리에 기록되었습니다.`);
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제에 실패했습니다: ' + (error as Error).message);
    }
  };

  const handleAIAnalysis = async (tool: Tool) => {
    console.log('🤖 AI 분석 시작:', tool);
    
    if (!tool.imageUrl && !tool.tempImageName && !tool.tempDataURL) {
      alert('AI 분석을 위해서는 이미지가 필요합니다.');
      console.log('❌ 이미지 없음');
      return;
    }
    
    try {
      // AI 분석 상태 체크
      console.log('📡 AI 상태 확인 중...');
      const statusResponse = await fetch('/api/ai/status');
      const statusData = await statusResponse.json();
      console.log('📊 AI 상태:', statusData);
      
      if (statusData.status !== 'ready') {
        console.log('❌ AI 서비스 사용 불가:', statusData);
        alert('AI 분석 서비스를 사용할 수 없습니다.\nGoogle AI API 키가 설정되지 않았습니다.');
        return;
      }
      
      console.log('✅ AI 서비스 준비됨');
      
      const confirmed = confirm(
        `"${tool.name}" 공구의 이미지를 AI로 재분석하시겠습니까?\n\n` +
        `기존 정보가 AI 분석 결과로 업데이트될 수 있습니다.`
      );
      
      if (!confirmed) {
        console.log('🚫 사용자 취소');
        return;
      }
      
      // 이미지 파일을 서버에 전송하여 AI 분석
      console.log('🖼️ 이미지 처리 시작...');
      let imageBlob: Blob;
      
      if (tool.tempImageName) {
        console.log('📁 임시 이미지 사용:', tool.tempImageName);
        const imageResponse = await fetch(`/temp/${tool.tempImageName}`);
        imageBlob = await imageResponse.blob();
      } else if (tool.imageUrl) {
        console.log('📁 기존 이미지 사용:', tool.imageUrl);
        const imageResponse = await fetch(`/tools/${tool.imageUrl.replace(/^.*[\\/]/, "")}`);
        imageBlob = await imageResponse.blob();
      } else if (tool.tempDataURL) {
        console.log('📁 DataURL 사용');
        const response = await fetch(tool.tempDataURL);
        imageBlob = await response.blob();
      } else {
        throw new Error('이미지를 찾을 수 없습니다.');
      }
      
      console.log('📦 이미지 Blob 생성:', {
        size: imageBlob.size,
        type: imageBlob.type
      });
      
      // FormData로 이미지 전송
      const formData = new FormData();
      formData.append('image', imageBlob, `reanalysis_${tool.id}.jpg`);
      
      console.log('📤 서버로 AI 분석 요청 전송...');
      
      const analysisResponse = await fetch('/api/tools/extract', {
        method: 'POST',
        body: formData
      });
      
      console.log('📥 서버 응답 상태:', analysisResponse.status, analysisResponse.statusText);
      
      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('❌ 서버 에러 응답:', errorText);
        throw new Error(`AI 분석 요청 실패 (${analysisResponse.status}): ${errorText}`);
      }
      
      const analysisResult = await analysisResponse.json();
      console.log('📋 서버에서 받은 원본 응답:', analysisResult);      // AI 분석 결과를 콘솔과 로컬스토리지에 저장
      console.log('🤖 AI 분석 결과:', analysisResult);
      
      // 분석 결과를 로컬스토리지에 저장 (디버깅용)
      const analysisLog = {
        timestamp: new Date().toISOString(),
        toolId: tool.id,
        toolName: tool.name,
        request: {
          hasImage: !!imageBlob,
          imageSize: imageBlob.size,
          imageType: imageBlob.type
        },
        response: analysisResult
      };
      
      // 기존 로그 가져오기
      const existingLogs = JSON.parse(localStorage.getItem('ai-analysis-logs') || '[]');
      existingLogs.push(analysisLog);
      
      // 최대 10개까지만 보관
      if (existingLogs.length > 10) {
        existingLogs.shift();
      }
      
      localStorage.setItem('ai-analysis-logs', JSON.stringify(existingLogs, null, 2));
      
      // error 필드가 있거나 기본 fallback 메시지인 경우 에러로 처리
      if (analysisResult.error || analysisResult.name === '새 공구 (정보 입력 필요)') {
        console.error('❌ AI 분석 에러 또는 실패:', analysisResult);
        const errorMsg = analysisResult.error || analysisResult.message || 
                        'Google AI API가 이미지를 인식하지 못했습니다.\n\n가능한 원인:\n- API 키가 유효하지 않음\n- 할당량 초과\n- 이미지가 너무 크거나 형식이 지원되지 않음\n\n브라우저 콘솔에서 자세한 로그를 확인하세요.';
        throw new Error(errorMsg);
      }
      
      // AI 분석 결과를 editData에 적용
      const updatedData = {
        ...tool,
        name: analysisResult.name || tool.name,
        manufacturer: analysisResult.manufacturer || tool.manufacturer,
        model: analysisResult.model || tool.model,
        category: analysisResult.category || tool.category,
        condition: analysisResult.condition || tool.condition,
        notes: analysisResult.notes || tool.notes
      };
      
      setEditData(updatedData);
      setEditMode(true);
      setSel(updatedData);
      
      alert(
        `AI 분석이 완료되었습니다!\n\n` +
        `분석된 정보:\n` +
        `- 이름: ${analysisResult.name || '없음'}\n` +
        `- 제조사: ${analysisResult.manufacturer || '없음'}\n` +
        `- 모델: ${analysisResult.model || '없음'}\n` +
        `- 카테고리: ${analysisResult.category || '없음'}\n\n` +
        `수정 모드로 전환되었습니다. 정보를 확인 후 저장하세요.`
      );
      
    } catch (error) {
      console.error('❌ AI 분석 실패 (상세):', error);
      console.error('❌ 에러 스택:', (error as Error).stack);
      
      let errorMessage = 'AI 분석에 실패했습니다';
      if (error instanceof Error) {
        errorMessage += ': ' + error.message;
      }
      
      alert(errorMessage + '\n\n브라우저 콘솔(F12)에서 상세 정보를 확인하세요.');
    }
  };

  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=> {
      if (e.key==="Escape") {
        if (editMode) {
          setEditMode(false);
          setEditData(null);
        } else {
          setSel(null);
        }
      }
    };
    window.addEventListener("keydown",onKey); 
    return ()=>window.removeEventListener("keydown",onKey);
  },[editMode]);

  return (
    <div className="min-h-screen app-bg">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-black/30 backdrop-blur">
        <div className="max-w-screen-sm mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/" className="btn-ghost text-sm px-3 py-2">
            🏠 홈
          </Link>
          <div className="text-white text-xl font-black tracking-tight flex-1">📝 공구 목록</div>
          <Link to="/my-loans" className="btn-blue text-sm px-2 py-1 whitespace-nowrap">
            � 나의 대출현황
          </Link>
          <Link to="/tools" className="btn-red-outline text-sm px-2 py-1 whitespace-nowrap">
            🔍 둘러보기
          </Link>
        </div>
        
        {/* 필터 */}
        <div className="max-w-screen-sm mx-auto px-3 pb-3 space-y-2">
          <select className="pill w-full bg-gray-700 text-white" value={cat} onChange={e=>setCat(e.target.value)}>
            {cats.map(c=><option key={c} value={c} className="bg-gray-700 text-white">{c}</option>)}
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
          <span className="text-blue-400 text-sm font-semibold">정보 수정 가능 - 총 {filtered.length}개 공구</span>
        </div>
        
        {filtered.map(t=>(
          <article key={t.id} className="tool-card">
            <div className="thumb">
              {(t.imageUrl || t.tempImageName || t.tempDataURL)
                ? <img src={imgSrc(t.imageUrl, t.tempImageName, t.tempDataURL)} alt={t.name} className="max-h-full max-w-full object-contain" loading="lazy"/>
                : <span className="muted text-xs">이미지 없음</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <h2 className="text-white font-bold text-[15px] leading-tight line-clamp-2">{t.name}</h2>
                <span className="pill ml-auto">{t.category}</span>
              </div>
              
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-white/60">#{t.id}</span>
                <span className="text-xs text-blue-400">수정 가능</span>
              </div>
              
              <div className="meta-row mt-1">
                <Meta label="상태" val={t.condition==="new"?"신품":"중고"} />
                <Meta label="제조사" val={t.manufacturer??"-"} />
                <Meta label="모델" val={t.model??"-"} />
              </div>
              <div className="mt-2 flex justify-between gap-2">
                <button className="btn-ghost text-sm" onClick={()=>setSel(t)}>🔍 보기</button>
                <button className="btn-blue text-sm" onClick={()=>handleEdit(t)}>✏️ 수정</button>
                <button className="btn-purple text-sm" onClick={()=>handleAIAnalysis(t)}>🤖 AI분석</button>
              </div>
            </div>
          </article>
        ))}
        {filtered.length===0 && <div className="text-center muted py-16">검색/필터 조건에 맞는 항목이 없습니다.</div>}
      </main>

      {/* 바텀시트 (상세보기/수정) */}
      {sel && (
        <>
          <div className="sheet-backdrop" onClick={()=>{setSel(null); setEditMode(false); setEditData(null);}} />
          <section className="sheet" role="dialog" aria-modal="true" aria-label={`${sel.name} ${editMode ? '수정' : '상세'}`}>
            <div className="sheet-header">
              <div className="sheet-handle" />
              <button className="sheet-close" onClick={()=>{setSel(null); setEditMode(false); setEditData(null);}} aria-label="닫기">✕</button>

              <div className="w-full h-56 bg-[#0f1318] rounded-2xl overflow-hidden flex items-center justify-center">
                {(() => {
                  // 편집 모드일 때는 editData 우선, 아니면 sel 사용
                  const imageData = editMode && editData ? editData : sel;
                  const hasImage = imageData.imageUrl || imageData.tempImageName || imageData.tempDataURL;
                  const imageSrc = imgSrc(imageData.imageUrl, imageData.tempImageName, imageData.tempDataURL);
                  
                  console.log('🖼️ Image display check:', {
                    editMode,
                    hasEditData: !!editData,
                    imageUrl: imageData.imageUrl,
                    tempImageName: imageData.tempImageName,
                    tempDataURL: imageData.tempDataURL ? imageData.tempDataURL.substring(0, 50) + '...' : null,
                    hasImage,
                    finalImageSrc: imageSrc
                  });
                  
                  if (!hasImage) {
                    return <span className="muted text-sm">이미지 없음</span>;
                  }
                  
                  return (
                    <img 
                      src={imageSrc} 
                      alt={imageData.name} 
                      className="object-contain max-h-full w-auto"
                      onLoad={() => {
                        console.log('✅ Image loaded successfully:', imageSrc);
                      }}
                      onError={(e) => {
                        console.error('❌ Image failed to load:', imageSrc, e);
                        const imgElement = e.target as HTMLImageElement;
                        
                        // 무한 재시도 방지 - 이미 시도한 적이 있으면 더 이상 시도하지 않음
                        if (imgElement.getAttribute('data-retry-attempted')) {
                          console.log('🛑 Max retry reached for:', imageSrc);
                          // 대체 이미지 표시 또는 에러 메시지
                          imgElement.style.display = 'none';
                          return;
                        }
                        
                        // 임시 이미지 로드 실패 시 한 번만 재시도
                        if (imageSrc.includes('/temp/')) {
                          console.log('🔄 Attempting to reload temp image (one-time)...');
                          imgElement.setAttribute('data-retry-attempted', 'true');
                          
                          // 잠시 후 다시 시도
                          setTimeout(() => {
                            imgElement.src = imageSrc + '?t=' + Date.now();
                          }, 1000);
                        }
                      }}
                      style={{ 
                        backgroundColor: '#0f1318',
                        minHeight: '100px' // 최소 높이 보장
                      }}
                    />
                  );
                })()}
              </div>

              <div className="mt-3 px-1">
                <h3 className="text-[18px] font-extrabold leading-tight">{sel.name}</h3>
                <div className="mt-1 flex gap-2 items-center flex-wrap">
                  <span className="pill">{sel.category}</span>
                  <span className="pill">{sel.condition==="new"?"신품":"중고"}</span>
                  {editMode && <span className="text-blue-400 text-sm">수정 모드</span>}
                </div>
              </div>
            </div>

            <div className="sheet-body">
              {editMode && editData ? (
                /* 수정 폼 */
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">공구명</label>
                    <input 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                      value={editData.name} 
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">제조사</label>
                    <input 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                      value={editData.manufacturer || ''} 
                      onChange={(e) => setEditData({...editData, manufacturer: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">모델</label>
                    <input 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                      value={editData.model || ''} 
                      onChange={(e) => setEditData({...editData, model: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">카테고리</label>
                    <select 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                      value={editData.category} 
                      onChange={(e) => setEditData({...editData, category: e.target.value})}
                    >
                      <option value="전동공구">전동공구</option>
                      <option value="수공구">수공구</option>
                      <option value="측정공구">측정공구</option>
                      <option value="안전장비">안전장비</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">상태</label>
                    <select 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                      value={editData.condition} 
                      onChange={(e) => setEditData({...editData, condition: e.target.value as "new"|"used"})}
                    >
                      <option value="new">신품</option>
                      <option value="used">중고</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">비고</label>
                    <textarea 
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white" 
                      rows={3}
                      value={editData.notes || ''} 
                      onChange={(e) => setEditData({...editData, notes: e.target.value})}
                    />
                  </div>
                </div>
              ) : (
                /* 상세 정보 */
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
                  {sel.notes && (
                    <>
                      <div className="col-span-2 mt-2">
                        <div className="font-semibold mb-1">비고</div>
                        <div className="whitespace-pre-wrap text-[#dfe5ec]">{sel.notes}</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="sheet-footer">
              {editMode ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button className="btn-ghost flex-1" onClick={()=>{setEditMode(false); setEditData(null);}}>
                      취소
                    </button>
                    <button className="btn-blue flex-1" onClick={handleSave}>
                      💾 저장
                    </button>
                  </div>
                  <button 
                    className="btn-red w-full text-sm" 
                    onClick={()=>editData && handleDelete(editData)}
                  >
                    🗑️ 이 공구 삭제
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button className="btn-blue flex-1" onClick={()=>handleEdit(sel)}>
                    ✏️ 정보 수정
                  </button>
                  <button className="btn-purple flex-1" onClick={()=>handleAIAnalysis(sel)}>
                    🤖 AI 재분석
                  </button>
                </div>
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
          📝 공구목록
        </button>
        <Link to="/settings" className="tab">⚙️ 설정</Link>
      </nav>
    </div>
  );
}

function Meta({label,val}:{label:string; val?:string}){
  return <div className="text-[#d0d6dd]"><span className="muted">{label}:</span> {val??"-"}</div>;
}