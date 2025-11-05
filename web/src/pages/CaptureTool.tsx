import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type AiResult = {
  name?: string;
  manufacturer?: string;
  model?: string;
  category?: string;
  specs?: Record<string, string>;
  manualUrl?: string;
  condition?: "new" | "used" | string;
  purchaseDate?: string;
  lifespanMonths?: number;
  confidence?: number;
  tempImageId?: string;
  tempImageName?: string;
};

export default function CaptureTool() {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [fileBlob, setFileBlob] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // 설정 읽기
  const getSettings = () => {
    const saved = localStorage.getItem('gonggubanjang-settings');
    return saved ? JSON.parse(saved) : {
      autoSaveImages: false,
      autoAnalysis: false, // 기본값을 false로 변경
      imageQuality: 'medium'
    };
  };

  // photoURL 상태 변화 추적
  useEffect(() => {
    console.log('📊 photoURL state changed:', photoURL ? photoURL.substring(0, 50) + '...' : 'null');
    console.log('📊 showCamera state:', showCamera);
    
    // 이미지가 설정되면 DOM에서 확인
    if (photoURL) {
      setTimeout(() => {
        const imgEl = document.querySelector('img[alt="촬영 이미지"]') as HTMLImageElement;
        console.log('🔍 Image element in DOM:', !!imgEl);
        if (imgEl) {
          console.log('🖼️ Image src set to:', imgEl.src.substring(0, 50) + '...');
          console.log('🖼️ Image load state:', imgEl.complete ? 'loaded' : 'loading');
        }
      }, 50);
    }
  }, [photoURL, showCamera]);

  // 컴포넌트 언마운트 시 blob URL 정리
  useEffect(() => {
    return () => {
      if (photoURL && photoURL.startsWith('blob:')) {
        URL.revokeObjectURL(photoURL);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [photoURL, stream]);

  // 1) 페이지 진입 시 자동으로 카메라 열기 비활성화 (사용자가 직접 실행)
  // useEffect(() => {
  //   const id = setTimeout(() => startCamera(), 300);
  //   return () => clearTimeout(id);
  // }, []);

  // 카메라 스트림 시작
  const startCamera = async () => {
    try {
      setError(null);
      setCameraLoading(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('이 브라우저에서는 카메라를 지원하지 않습니다.');
      }

      // 먼저 기본 설정으로 시도 (빠른 시작)
      let constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 }
        },
        audio: false
      };

      try {
        // 후면 카메라 시도
        const backCameraConstraints = {
          ...constraints,
          video: {
            ...constraints.video,
            facingMode: { ideal: 'environment' }
          }
        };
        
        const mediaStream = await navigator.mediaDevices.getUserMedia(backCameraConstraints);
        setStream(mediaStream);
        setShowCamera(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // 비디오 메타데이터 로드 기다리기
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(console.error);
            setCameraLoading(false);
          };
        }
        return;
      } catch (backCameraError) {
        console.log('후면 카메라 실패, 기본 카메라로 시도:', backCameraError);
        
        // 후면 카메라 실패시 기본 카메라로 시도
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        setShowCamera(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(console.error);
            setCameraLoading(false);
          };
        }
      }
    } catch (err: any) {
      console.error('카메라 접근 실패:', err);
      if (err.name === 'NotAllowedError') {
        setError('카메라 권한이 거부되었습니다. 권한을 허용하거나 파일 선택을 사용하세요.');
      } else if (err.name === 'NotFoundError') {
        setError('카메라를 찾을 수 없습니다. 파일 선택을 사용하세요.');
      } else if (err.name === 'OverconstrainedError') {
        setError('카메라 설정이 지원되지 않습니다. 파일 선택을 사용하세요.');
      } else {
        setError(`카메라 오류: ${err.message || '알 수 없는 오류'}`);
      }
      // 에러시 자동으로 파일 선택 모드로 전환하지 않음 (사용자 선택)
      setCameraLoading(false);
    }
  };

  // 카메라에서 사진 촬영
  const captureFromCamera = () => {
    console.log('🎯 captureFromCamera called');
    
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Video or canvas ref is null', {
        video: !!videoRef.current,
        canvas: !!canvasRef.current
      });
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('❌ Failed to get canvas context');
      return;
    }
    
    console.log('📹 Video state:', {
      readyState: video.readyState,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      ended: video.ended
    });
    
    // 비디오가 준비되지 않은 경우 처리
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error('❌ Video dimensions are 0, video not ready');
      alert('카메라가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    console.log('📐 Canvas dimensions set:', canvas.width, canvas.height);
    
    // 거울모드로 표시된 비디오를 정상 방향으로 저장하기 위해 좌우 반전
    console.log('🎨 Drawing video to canvas with horizontal flip...');
    
    // 캔버스 초기화
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // 비디오는 이미 scaleX(-1)로 거울모드 표시되고 있으므로
    // Canvas에서는 정상적으로 그려야 올바른 방향이 됩니다
    console.log('�️ Drawing video normally (video already has mirror transform)');
    
    // 정상적으로 비디오 그리기 (거울모드 비디오를 정상으로 저장)
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    console.log('✅ Video drawn - mirror display corrected for storage');
    
    // Canvas를 Blob으로 변환하여 이미지 생성
    console.log('🖼️ Converting canvas to blob...');
    
    // 먼저 카메라를 정지하고
    stopCamera();
    console.log('📷 Camera stopped');
    
    // DataURL을 Blob으로도 변환 (파일 업로드용)
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setFileBlob(file);
        console.log('� File blob set for upload');
      }
    }, 'image/jpeg', 0.9);
    
    // DataURL 생성하여 즉시 이미지 표시
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoURL(dataURL);
    console.log('📄 DataURL set for immediate display:', dataURL.length, 'characters');
    setShowCamera(false);
    setResult(null);
    setAnalysisError(null);
    setSheetOpen(false);
    
    console.log('💾 State updated with dataURL');
    
    // AI 분석은 blob이 준비된 후 실행
    setTimeout(() => {
      if (fileBlob) {
        void analyze(fileBlob);
      }
    }, 200);
  };

  // 카메라 정지
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCameraLoading(false);
  };

  // 스트림 연결 효과
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // 컴포넌트 정리
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // 2) 촬영하면 자동 업로드 → 분석 결과 시트 열기
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileBlob(f);
    const url = URL.createObjectURL(f);
    setPhotoURL(url);
    
    // 상태 초기화
    setResult(null);
    setAnalysisError(null);
    setSheetOpen(false);
    
    // 설정에 따라 자동 분석 여부 결정
    const settings = getSettings();
    if (settings.autoAnalysis) {
      setTimeout(() => {
        void analyze(f);
      }, 100);
    }
  };

  const analyze = async (file: File) => {
    const settings = getSettings();
    
    // 분석 시작 전 상태 설정 (이미지는 유지)
    setUploading(true);
    setResult(null);
    setAnalysisError(null);
    setSheetOpen(true); // 분석 중에도 시트 열기
    
    console.log('🤖 Starting AI analysis, photoURL preserved:', !!photoURL);
    
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/tools/extract", { method: "POST", body: fd });
      
      if (!res.ok) {
        let errorMessage = `서버 오류 (${res.status})`;
        
        try {
          const errorData = await res.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // JSON 파싱 실패시 기본 메시지 사용
        }
        
        throw new Error(errorMessage);
      }
      
      const json: AiResult = await res.json();
      
      // AI 결과 유효성 검사
      if (!json || typeof json !== 'object') {
        throw new Error("AI 응답이 올바르지 않습니다");
      }
      
      setResult(json);
      setAnalysisError(null);
      
      // 자동 저장 설정이 켜져있으면 즉시 저장
      if (settings.autoSaveImages) {
        await saveToDB(json);
      } else {
        setSheetOpen(true);
      }
    } catch (err) {
      let errorMessage = "알 수 없는 오류가 발생했습니다";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // 네트워크 오류 감지
      if (errorMessage.includes("fetch")) {
        errorMessage = "네트워크 연결을 확인해주세요";
      }
      
      setAnalysisError(errorMessage);
      console.error("AI 분석 실패:", err);
      
      // 에러 발생시 시트는 열지 않음 (메인 화면에서 처리)
      // setSheetOpen(true);
    } finally {
      setUploading(false);
    }
  };

  // 3) DB 저장 (AI 분석 결과 포함)
  const saveToDB = async (aiResult?: AiResult) => {
    const dataToSave = aiResult || result;
    if (!dataToSave) return;
    
    try {
      let payload;
      let r;
      
      // 파일이 있는 경우 (카메라 촬영 or 파일 선택)
      if (fileBlob) {
        // FormData로 이미지와 함께 전송
        const fd = new FormData();
        fd.append("image", fileBlob);
        
        // 나머지 데이터는 JSON 문자열로 추가
        const toolData = {
          ...dataToSave,
          condition: dataToSave.condition ?? "used",
          available: true,
          loanStatus: "반납",
          damaged: false,
          repaired: false,
        };
        
        fd.append("data", JSON.stringify(toolData));
        
        r = await fetch("/api/tools", {
          method: "POST",
          body: fd, // FormData 사용
        });
      } else {
        // 이미지가 없는 경우 JSON만 전송
        payload = {
          ...dataToSave,
          condition: dataToSave.condition ?? "used",
          available: true,
          loanStatus: "반납",
          damaged: false,
          repaired: false,
        };
        
        r = await fetch("/api/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      
      if (!r.ok) {
        let errorMessage = `저장 실패: ${r.status} ${r.statusText}`;
        try {
          const errorData = await r.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // JSON 파싱 실패시 기본 메시지 사용
        }
        throw new Error(errorMessage);
      }
      
      const created = await r.json();
      
      // 저장 성공 후 실제 이미지 URL로 업데이트
      if (created.imageUrl) {
        // 기존 blob URL 해제
        if (photoURL && photoURL.startsWith('blob:')) {
          URL.revokeObjectURL(photoURL);
        }
        // 실제 저장된 이미지 경로로 업데이트
        setPhotoURL(`/tools/${created.imageUrl}`);
      }
      
      const settings = getSettings();
      if (settings.autoSaveImages) {
        alert(`자동 저장 완료! ID: ${created.id}\n이미지가 자동으로 저장되었습니다.`);
      } else {
        alert(`DB 저장 완료! ID: ${created.id}\n이미지도 저장되었습니다.`);
      }
      
      setSheetOpen(false);
      
      // 저장 완료 후 초기화 (photoURL은 실제 이미지로 유지)
      setResult(null);
      setFileBlob(null);
      setAnalysisError(null);
    } catch (e) {
      console.error("❌ DB save failed:", e);
      alert("DB 저장 실패: " + (e as Error).message);
    }
  };

  // 4) 수정을 위해 임시 저장 후 편집 페이지로 이동
  const saveForEdit = async () => {
    const dataToSave = result;
    if (!dataToSave || !fileBlob) return;
    
    try {
      // 1. 먼저 이미지만 업로드 (DB에 저장하지 않음)
      const fd = new FormData();
      fd.append("image", fileBlob);
      fd.append("tempOnly", "true"); // 임시 저장 플래그
      
      const uploadRes = await fetch("/api/tools/upload-temp", { 
        method: "POST", 
        body: fd 
      });
      
      if (!uploadRes.ok) {
        throw new Error("이미지 업로드 실패");
      }
      
      const uploadResult = await uploadRes.json();
      
      // 2. AI 결과와 이미지 정보를 localStorage에 임시 저장
      const tempData = {
        ...dataToSave,
        tempImageId: uploadResult.tempImageId,
        tempImageName: uploadResult.tempImageName,
        tempDataURL: photoURL, // 현재 표시 중인 DataURL도 저장
        condition: dataToSave.condition ?? "used",
        available: true,
        loanStatus: "반납",
        damaged: false,
        repaired: false,
      };
      
      localStorage.setItem('temp-edit-data', JSON.stringify(tempData));
      console.log('💾 Temp data with image saved:', tempData);
      
      // 3. 수정 페이지로 이동 (실제 DB 저장은 하지 않음)
      window.location.href = `/tool-editor?temp=true`;
    } catch (e) {
      alert("임시 저장 실패: " + (e as Error).message);
    }
  };

  // 5) 이미지만 저장 후 수정 페이지로 이동
  const saveImageForEdit = async () => {
    if (!fileBlob) return;
    
    try {
      // 임시 이미지 ID 생성 (AI 분석 없이도 저장 가능하도록)
      const tempImageId = "manual_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      
      const payload = {
        tempImageId: tempImageId,
        tempImageName: `${tempImageId}.jpg`,
        name: "새 공구 (수정 필요)",
        category: "기타",
        condition: "used",
        available: true,
        loanStatus: "반납",
        damaged: false,
        repaired: false,
        confidence: 0, // 수동 등록이므로 신뢰도 0
      };
      
      // 먼저 이미지를 서버에 업로드
      const fd = new FormData();
      fd.append("image", fileBlob);
      fd.append("manualSave", "true"); // 수동 저장 플래그
      
      const uploadRes = await fetch("/api/tools/upload-only", { 
        method: "POST", 
        body: fd 
      });
      
      if (!uploadRes.ok) {
        throw new Error("이미지 업로드 실패");
      }
      
      const uploadResult = await uploadRes.json();
      payload.tempImageId = uploadResult.tempImageId;
      payload.tempImageName = uploadResult.tempImageName;
      
      // 그 다음 DB에 저장
      const r = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await r.json();
      
      // blob URL 해제 (메모리 정리)
      if (photoURL && photoURL.startsWith('blob:')) {
        URL.revokeObjectURL(photoURL);
      }
      
      // 저장 완료 후 수정 페이지로 이동
      window.location.href = `/tool-editor?edit=${created.id}`;
    } catch (e) {
      alert("이미지 저장 실패: " + (e as Error).message);
    }
  };

  // 6) 수동 입력을 위해 이미지만 임시 저장 후 편집 페이지로 이동
  const saveImageOnly = async () => {
    try {
      console.log('📤 Starting manual entry image upload...');
      console.log('🔍 Image source check:', {
        hasFileBlob: !!fileBlob,
        hasPhotoURL: !!photoURL,
        photoURLType: photoURL?.startsWith('data:') ? 'DataURL' : photoURL?.startsWith('blob:') ? 'BlobURL' : 'other'
      });
      
      let imageFile: File;
      
      // 1. 이미지 소스 확인 및 File 객체 생성
      if (fileBlob) {
        // 파일 선택이나 카메라에서 이미 File 객체가 있는 경우
        console.log('📁 Using existing fileBlob');
        imageFile = fileBlob;
      } else if (photoURL && photoURL.startsWith('data:')) {
        // 카메라 촬영으로 DataURL만 있는 경우 - DataURL을 Blob으로 변환
        console.log('� Converting DataURL to File...');
        
        const response = await fetch(photoURL);
        const blob = await response.blob();
        imageFile = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        
        console.log('✅ DataURL converted to File:', imageFile.size, 'bytes');
      } else {
        throw new Error('업로드할 이미지가 없습니다. 다시 촬영하거나 파일을 선택해주세요.');
      }
      
      // 2. 이미지를 임시 업로드 (DB에 저장하지 않음)
      const fd = new FormData();
      fd.append("image", imageFile);
      fd.append("tempOnly", "true"); // 임시 저장 플래그
      
      const uploadRes = await fetch("/api/tools/upload-temp", { 
        method: "POST", 
        body: fd 
      });
      
      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || "이미지 업로드 실패");
      }
      
      const uploadResult = await uploadRes.json();
      console.log('📸 Temp image uploaded:', uploadResult);
      
      // 3. 기본 데이터와 이미지 정보를 localStorage에 임시 저장
      const tempData = {
        name: "새 공구 (정보 입력 필요)",
        category: "기타",
        condition: "used",
        available: true,
        loanStatus: "반납",
        damaged: false,
        repaired: false,
        confidence: 0,
        tempImageId: uploadResult.tempImageId,
        tempImageName: uploadResult.tempImageName,
      };
      
      localStorage.setItem('temp-edit-data', JSON.stringify(tempData));
      console.log('💾 Manual entry data saved:', tempData);
      
      // blob URL 해제 (메모리 정리)
      if (photoURL && photoURL.startsWith('blob:')) {
        URL.revokeObjectURL(photoURL);
      }
      
      // 4. 수정 페이지로 이동 (실제 DB 저장은 하지 않음)
      window.location.href = `/tool-editor?temp=true`;
    } catch (e) {
      console.error('❌ Manual entry save failed:', e);
      alert("임시 저장 실패: " + (e as Error).message);
    }
  };

  const retake = () => {
    // 기존 blob URL이 있으면 메모리에서 해제
    if (photoURL && photoURL.startsWith('blob:')) {
      URL.revokeObjectURL(photoURL);
    }
    
    // 모든 상태 초기화
    setPhotoURL(null);
    setFileBlob(null);
    setResult(null);
    setSheetOpen(false);
    setError(null);
    setAnalysisError(null);
    setUploading(false);
    
    // 다시 실제 카메라 시작
    startCamera();
  };

  return (
    <div className="min-h-screen app-bg text-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="max-w-screen-sm mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/" className="btn-ghost text-sm px-3 py-2">
            🏠 홈
          </Link>
          <div className="font-black text-xl ml-2">📷 촬영 등록</div>
          <Link to="/tools" className="ml-auto btn-red-outline text-sm px-3 py-2">
            📋 목록
          </Link>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-screen-sm mx-auto px-4 py-6">
        {/* 숨김 파일 입력 (카메라) */}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPick}
          className="hidden"
        />

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 app-card bg-red-500/15 border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* 카메라 뷰 */}
        {showCamera && !photoURL && (
          <div className="w-full max-w-md mx-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[4/3] object-cover rounded-2xl border border-white/20 bg-black/20"
              style={{ transform: 'scaleX(-1)' }}
              onLoadedMetadata={() => {
                videoRef.current?.play().catch(console.error);
              }}
            />
            <div className="mt-4 flex gap-4 justify-center">
              <button
                onClick={stopCamera}
                className="btn-red-outline px-6 py-3"
              >
                ✕ 취소
              </button>
              <button
                onClick={captureFromCamera}
                className="btn-red px-8 py-3"
              >
                📸 촬영하기
              </button>
            </div>
          </div>
        )}

        {/* 프리뷰 / 가이드 */}
        {!photoURL && !showCamera && (
          <div className="app-card p-6 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-semibold">공구를 화면 중앙에 맞추고 촬영하세요</div>
            <p className="muted mt-1 text-sm">로고/모델명이 보이도록 정면에서 찍으면 인식률이 높아집니다.</p>
            <div className="mt-4 flex gap-3 justify-center">
              <button 
                className="btn-red disabled:opacity-50" 
                onClick={startCamera}
                disabled={cameraLoading}
              >
                {cameraLoading ? "🔄 카메라 준비중..." : "📷 카메라 실행"}
              </button>
              <button className="btn-red-outline" onClick={() => fileInput.current?.click()}>
                📁 파일 선택
              </button>
            </div>
          </div>
        )}

        {/* 숨겨진 캔버스 */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 촬영된 이미지 표시 */}
        {photoURL && (
          <>
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0f1318]">
              <img 
                src={photoURL} 
                alt="촬영 이미지" 
                className="w-full object-contain max-h-[55vh]" 
                onLoad={() => {
                  console.log('🖼️ Image loaded successfully');
                }}
                onError={(e) => {
                  console.error('❌ Image failed to load:', e);
                  // DataURL이 깨진 경우 다시 캡처 유도
                  alert('이미지 표시에 실패했습니다. 다시 촬영해주세요.');
                }}
                style={{ 
                  backgroundColor: '#0f1318',
                  minHeight: '200px' // 최소 높이 보장
                }}
              />
            </div>

            {/* AI 분석 에러 상태 표시 */}
            {analysisError && (
              <div className="mt-3 app-card bg-red-500/15 border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
                <div className="font-semibold mb-1">🚫 AI 분석 실패</div>
                <div className="text-xs">{analysisError}</div>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button className="btn-red-outline flex-1" onClick={retake}>
                📷 다시 촬영
              </button>
              <button
                className="btn-red flex-1 disabled:opacity-50"
                onClick={() => fileBlob && analyze(fileBlob)}
                disabled={uploading}
              >
                {uploading ? "🤖 AI분석 중…" : result ? "🔄 AI분석 재시도" : "🤖 AI분석"}
              </button>
            </div>

            {/* 수동 입력 저장 옵션 - AI 분석과 관계없이 항상 표시 */}
            {photoURL && (
              <>
                <div className="mt-3">
                  <button 
                    className="btn-red-outline w-full" 
                    onClick={saveImageOnly}
                    disabled={uploading}
                  >
                    ✏️ 수동 입력하여 저장
                  </button>
                </div>
                <div className="mt-2 text-center text-xs muted">
                  이미지를 저장하고 직접 정보를 입력합니다
                </div>
              </>
            )}

            {/* AI 분석 실패시 대안 버튼 */}
            {analysisError && !uploading && (
              <>
                <div className="mt-3">
                  <button 
                    className="btn-red-outline w-full" 
                    onClick={saveImageOnly}
                  >
                    💾 저장하기
                  </button>
                </div>
                <div className="mt-2 text-center text-xs muted">
                  AI분석 하지않고 이미지 저장
                </div>
              </>
            )}

            {/* 파일 선택 옵션 추가 */}
            <div className="mt-2 text-center">
              <button 
                className="btn-ghost text-sm px-4 py-2" 
                onClick={() => fileInput.current?.click()}
              >
                📁 파일에서 선택
              </button>
            </div>

            {uploading && (
              <div className="mt-3 text-center muted text-sm">AI가 공구 정보를 추출하고 있어요…</div>
            )}
          </>
        )}
      </main>

      {/* 바텀시트: 분석 결과 */}
      {sheetOpen && (result || analysisError || uploading) && photoURL && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <section className="sheet" role="dialog" aria-modal="true" aria-label="AI 분석 결과">
            {/* Header */}
            <div className="sheet-header">
              <div className="sheet-handle" />
              <button className="sheet-close" onClick={() => setSheetOpen(false)} aria-label="닫기">✕</button>

              {/* 큰 이미지 미리보기 */}
              {photoURL && (
                <div className="w-full h-56 bg-[#0f1318] rounded-2xl overflow-hidden flex items-center justify-center">
                  <img 
                    src={photoURL} 
                    alt="촬영 이미지" 
                    className="object-contain max-h-full w-auto"
                    onLoad={() => console.log('🖼️ Bottom sheet image loaded')}
                    onError={(e) => console.error('❌ Bottom sheet image error:', e)}
                  />
                </div>
              )}

              <div className="mt-3 px-1">
                {uploading ? (
                  // AI 분석 중
                  <div>
                    <h3 className="text-[18px] font-extrabold leading-tight text-blue-400">
                      🤖 AI 분석 중...
                    </h3>
                    <div className="mt-1 text-sm text-blue-300">
                      AI가 공구 정보를 추출하고 있습니다
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                ) : analysisError ? (
                  // AI 분석 실패시
                  <div>
                    <h3 className="text-[18px] font-extrabold leading-tight text-red-400">
                      ⚠️ AI 분석 실패
                    </h3>
                    <div className="mt-1 text-sm text-red-300">
                      {analysisError}
                    </div>
                    <div className="mt-2 text-sm muted">
                      다시 분석하거나 직접 정보를 입력할 수 있습니다
                    </div>
                  </div>
                ) : result ? (
                  // AI 분석 성공시
                  <div>
                    <h3 className="text-[18px] font-extrabold leading-tight">
                      {result.name || "이름 미확인"}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="pill">제조사: {result.manufacturer || "-"}</span>
                      <span className="pill">모델: {result.model || "-"}</span>
                      <span className="pill">분류: {result.category || "-"}</span>
                      {"confidence" in result && (
                        <span className="pill">신뢰도 {Math.round((result.confidence || 0) * 100)}%</span>
                      )}
                    </div>
                  </div>
                ) : (
                  // 기본 상태
                  <div>
                    <h3 className="text-[18px] font-extrabold leading-tight">
                      촬영 완료
                    </h3>
                    <div className="mt-1 text-sm muted">
                      AI 분석을 시작하거나 직접 정보를 입력할 수 있습니다
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="sheet-body">
              {uploading ? (
                // AI 분석 중 상태
                <div className="text-center py-6">
                  <div className="text-blue-400 text-sm mb-3">
                    🔄 공구 정보를 분석하고 있습니다...
                  </div>
                  <div className="text-xs muted">
                    잠시만 기다려주세요
                  </div>
                </div>
              ) : analysisError ? (
                // AI 분석 실패시 안내
                <div className="text-center py-4">
                  <div className="text-red-400 text-sm mb-2">
                    🤖 AI 분석에 실패했습니다
                  </div>
                  <div className="text-sm muted mb-3">
                    {analysisError}
                  </div>
                  <div className="text-xs muted">
                    재시도하거나 직접 정보를 입력해주세요
                  </div>
                </div>
              ) : result ? (
                // AI 분석 성공시 상세 정보
                <>
                  <div className="grid grid-cols-2 gap-y-1 text-[13px]">
                    <Meta label="구입일" val={result.purchaseDate || "-"} />
                    <Meta label="수명(개월)" val={result.lifespanMonths ? String(result.lifespanMonths) : "-"} />
                    <Meta label="상태" val={result.condition === "new" ? "신품" : "중고"} />
                    <Meta label="메뉴얼" val={result.manualUrl ? "제공됨" : "-"} />
                  </div>

                  {result.specs && Object.keys(result.specs).length > 0 && (
                    <div className="mt-3 text-[13px]">
                      <div className="font-semibold mb-1">주요 스펙</div>
                      <div className="app-card p-3 text-[#dfe5ec]">
                        {Object.entries(result.specs).map(([k, v]) => (
                          <div key={k} className="flex text-sm border-b border-white/10 last:border-0 py-1">
                            <div className="w-28 muted">{k}</div>
                            <div className="flex-1">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="sheet-footer space-y-3">
              {uploading ? (
                // AI 분석 중일 때는 기다리거나 직접 저장 옵션만 제공
                <button 
                  className="btn-red-outline w-full text-[16px] py-3" 
                  onClick={saveImageOnly}
                >
                  💾 AI분석 중단하고 바로 저장
                </button>
              ) : analysisError ? (
                // AI 분석 실패시 대안 버튼들
                <>
                  <div className="flex gap-2">
                    <button 
                      className="btn-blue flex-1 text-[16px] py-3" 
                      onClick={() => fileBlob && analyze(fileBlob)}
                    >
                      🔄 AI분석 재시도
                    </button>
                    <button 
                      className="btn-purple flex-1 text-[16px] py-3" 
                      onClick={() => {
                        // 기본 데이터로 저장 후 수정 페이지로 이동
                        saveImageForEdit();
                      }}
                    >
                      ✏️ 직접 수정
                    </button>
                  </div>
                  <button 
                    className="btn-red-outline w-full text-[16px] py-3" 
                    onClick={saveImageOnly}
                  >
                    💾 저장하기
                  </button>
                  <div className="text-center text-xs muted px-4">
                    AI 분석하지 않고 이미지만 저장합니다
                  </div>
                </>
              ) : result ? (
                // AI 분석 성공시 저장 및 수정 버튼
                <>
                  <div className="flex gap-2">
                    <button 
                      className="btn-red flex-1 text-[16px] py-3" 
                      onClick={() => saveToDB()}
                    >
                      ✅ 저장하기
                    </button>
                    <button 
                      className="btn-purple flex-1 text-[16px] py-3" 
                      onClick={() => {
                        // 임시로 저장한 후 수정 페이지로 이동
                        saveForEdit();
                      }}
                    >
                      ✏️ 수정 후 저장
                    </button>
                  </div>
                  <button 
                    className="btn-blue w-full text-[16px] py-3" 
                    onClick={() => fileBlob && analyze(fileBlob)}
                  >
                    🔄 AI분석 재실행
                  </button>
                </>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Meta({ label, val }: { label: string; val?: string }) {
  return (
    <div className="text-[#d0d6dd]">
      <span className="muted">{label}:</span> {val ?? "-"}
    </div>
  );
}
