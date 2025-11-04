// api/src/server.ts
import express from "express";
import path from "path";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import "dotenv/config";

// ------------------------------ 기본 설정 ------------------------------
const app = express();
const PORT = Number(process.env.PORT || 8080);

app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// 업로드 임시 폴더 보장
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 이미지/샘플 JSON이 있는 실제 디렉터리 (api/tools)
const TOOLS_DIR = path.resolve(__dirname, "../tools");

// 정적 파일 서빙: http://localhost:8080/tools/파일명
app.use("/tools", express.static(TOOLS_DIR));

// 헬스 체크
app.get("/health", (_req, res) => {
  res.type("text/plain").send("ok");
});

// ------------------------------ 데이터 저장소 ------------------------------
type Tool = Record<string, any>;
let tools: Record<string, Tool> = {};
let loans: any[] = [];
let incidents: any[] = [];

// 서버 시작 시 샘플 50개 자동 로드
(() => {
  try {
    const samplePath = path.join(TOOLS_DIR, "sample_tools.json");
    const raw = fs.readFileSync(samplePath, "utf8");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      for (const t of arr) tools[t.id] = t;
      console.log(`✅ Loaded ${arr.length} sample tools from ${samplePath}`);
    } else {
      console.warn("⚠️ sample_tools.json is not an array.");
    }
  } catch (e: any) {
    console.warn("⚠️ No sample loaded:", e?.message);
  }
})();

// 샘플 데이터 그대로 반환 (점검용)
app.get("/api/tools/sample", (_req, res) => {
  try {
    const samplePath = path.join(TOOLS_DIR, "sample_tools.json");
    const raw = fs.readFileSync(samplePath, "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return res.status(500).json({ error: "INVALID_SAMPLE_JSON" });
    res.json(arr);
  } catch (err: any) {
    console.error("[SAMPLE_LOAD_FAILED]", err?.message);
    res.status(500).json({ error: "SAMPLE_LOAD_FAILED", message: String(err) });
  }
});

// ------------------------------ AI 추출 ------------------------------
const upload = multer({ dest: UPLOAD_DIR });
const genAIKey = process.env.GOOGLE_API_KEY || "";
const genAI = genAIKey ? new GoogleGenerativeAI(genAIKey) : null;

// 이미지 1장 → 공구 정보 JSON 추출
app.post("/api/tools/extract", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "NO_FILE" });
    if (!genAI) {
      // 키 없으면 친절히 안내
      fs.unlinkSync(req.file.path);
      return res.status(501).json({ error: "NO_GOOGLE_API_KEY" });
    }

    const b64 = fs.readFileSync(req.file.path).toString("base64");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            manufacturer: { type: SchemaType.STRING },
            model: { type: SchemaType.STRING },
            category: { type: SchemaType.STRING },
            specs: { type: SchemaType.OBJECT, properties: {} },
            manualUrl: { type: SchemaType.STRING },
            condition: { type: SchemaType.STRING, format: "enum", enum: ["new", "used"] },
            purchaseDate: { type: SchemaType.STRING },
            lifespanMonths: { type: SchemaType.NUMBER },
            confidence: { type: SchemaType.NUMBER }
          },
          required: ["name", "condition"]
        }
      }
    });

    const prompt = `공구 사진을 보고 JSON 스키마에 맞춰 정보를 추출하세요.
- name, manufacturer, model, category, specs(key:value), manualUrl(확실할 때만)
- condition은 new/used 중 택1
- confidence(0~1)를 포함`;

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: b64, mimeType: req.file.mimetype } }
    ]);

    // 임시파일 삭제
    fs.unlinkSync(req.file.path);

    const text = result.response.text();
    const json = JSON.parse(text);
    return res.json(json);
  } catch (e: any) {
    // 업로드 파일 남아있으면 삭제 시도
    try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ error: "AI_ERROR", message: e.message || String(e) });
  }
});

// ------------------------------ CRUD / 로그 ------------------------------
// 생성
app.post("/api/tools", (req, res) => {
  const id = req.body.id || "t_" + Date.now();
  const tool = {
    id,
    ...req.body,
    requiredKeys: req.body.requiredKeys ?? ["name", "condition"],
    hiddenKeys: req.body.hiddenKeys ?? []
  };
  tools[id] = tool;
  res.json(tool);
});

// 목록/상세
app.get("/api/tools", (_req, res) => res.json(Object.values(tools)));
app.get("/api/tools/:id", (req, res) => res.json(tools[req.params.id] || null));

// 대출/반납
app.post("/api/tools/:id/loan", (req, res) => {
  const rec = { id: "l_" + Date.now(), toolId: req.params.id, user: req.body.user, action: "loan", timestamp: new Date().toISOString() };
  loans.push(rec);
  res.json(rec);
});
app.post("/api/tools/:id/return", (req, res) => {
  const rec = { id: "l_" + Date.now(), toolId: req.params.id, user: req.body.user, action: "return", timestamp: new Date().toISOString() };
  loans.push(rec);
  res.json(rec);
});
app.get("/api/loans", (req, res) => {
  const { toolId } = req.query as { toolId?: string };
  const data = toolId ? loans.filter(l => l.toolId === toolId) : loans;
  res.json(data.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
});

// 사건 로그
app.post("/api/tools/:id/incident", (req, res) => {
  const rec = { id: "i_" + Date.now(), toolId: req.params.id, type: req.body.type, description: req.body.description, timestamp: new Date().toISOString() };
  incidents.push(rec);
  res.json(rec);
});
app.get("/api/incidents", (req, res) => {
  const { toolId } = req.query as { toolId?: string };
  const data = toolId ? incidents.filter(i => i.toolId === toolId) : incidents;
  res.json(data.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
});

// ------------------------------ 서버 시작 ------------------------------
app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
  console.log("Static /tools ->", TOOLS_DIR);
});
// ===== 샘플 로드 유틸 =====
function loadSampleTools(): number {
  try {
    const samplePath = path.join(TOOLS_DIR, "sample_tools.json");
    const raw = fs.readFileSync(samplePath, "utf8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) {
      console.warn("⚠️ sample_tools.json is not an array");
      return 0;
    }
    let count = 0;
    for (const t of arr) {
      if (!t?.id) continue;
      tools[t.id] = t;
      count++;
    }
    console.log(`✅ sample loaded: ${count} items`);
    return count;
  } catch (e: any) {
    console.error("❌ loadSampleTools failed:", e.message);
    return 0;
  }
}

// 서버 시작 시 1회 로드
if (!Object.keys(tools).length) loadSampleTools();

// 강제 리로드 엔드포인트 (수동 점검용)
app.post("/api/tools/reload", (_req, res) => {
  tools = {};  // 초기화
  const n = loadSampleTools();
  res.json({ reloaded: n, keys: Object.keys(tools).slice(0, 5) });
});

// 경로/키 카운트 확인(디버그)
app.get("/api/debug", (_req, res) => {
  res.json({
    toolsDir: TOOLS_DIR,
    count: Object.keys(tools).length,
    sampleExists: fs.existsSync(path.join(TOOLS_DIR, "sample_tools.json")),
    firstIds: Object.keys(tools).slice(0, 5)
  });
});

app.get("/api/tools", (_req, res) => {
  if (!Object.keys(tools).length) loadSampleTools(); // ← 비었으면 자동 로드
  res.json(Object.values(tools));
});
