import { useEffect, useState } from "react"

type ExtractResult = {
  name?: string
  manufacturer?: string
  model?: string
  category?: string
  specs?: Record<string, string>
  manualUrl?: string
  condition?: "new" | "used"
  purchaseDate?: string
  lifespanMonths?: number
  confidence?: number
}

export default function App() {
  const [apiBase] = useState<string>(import.meta.env.VITE_API_BASE)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExtractResult | null>(null)

  useEffect(() => {
    // 연결 체크 (콘솔에 ok가 찍히면 web↔api 통신 OK)
    fetch(apiBase + "/health")
      .then(r => r.text())
      .then(t => console.log("health:", t))
      .catch(e => console.error(e))
  }, [apiBase])

  const onPick: React.ChangeEventHandler<HTMLInputElement> = e => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setResult(null)
    setError(null)
    if (f) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }

  const onSubmit: React.FormEventHandler = async e => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch(apiBase + "/api/tools/extract", {
        method: "POST",
        body: fd,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setResult(json)
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "32px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <h1 style={{ marginBottom: 12 }}>공구반장 — 이미지 인식 테스트</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="file"
          accept="image/*"
          // 모바일 카메라 바로 사용하려면 다음 속성도 유용 (지원 브라우저에서만)
          capture="environment"
          onChange={onPick}
        />
        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{ width: "100%", borderRadius: 12, boxShadow: "0 6px 16px rgba(0,0,0,.12)" }}
          />
        )}
        <button
          type="submit"
          disabled={!file || loading}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: loading ? "#999" : "#FF3040",
            color: "white",
            border: "none",
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            boxShadow: "0 8px 20px rgba(255,48,64,.35)"
          }}
        >
          {loading ? "추출 중..." : "AI로 정보 추출"}
        </button>
      </form>

      {error && (
        <p style={{ marginTop: 12, color: "#c00", fontWeight: 600 }}>
          에러: {error}
        </p>
      )}

      {result && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: "#fff", boxShadow: "0 6px 16px rgba(0,0,0,.08)" }}>
          <h2 style={{ marginTop: 0 }}>추출 결과</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <p style={{ marginTop: 24, opacity: .7 }}>
        ※ 실제 앱에서는 이 결과를 “저장(POST /api/tools)”해 목록/상세에서 활용합니다.
      </p>
    </div>
  )
}
