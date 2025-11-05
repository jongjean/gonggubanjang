"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// api/src/server.ts
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const generative_ai_1 = require("@google/generative-ai");
require("dotenv/config");
// ------------------------------ 기본 설정 ------------------------------
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT || 8080);
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: process.env.CORS_ORIGIN || "*" }));
// 업로드 임시 폴더 보장
const UPLOAD_DIR = path_1.default.resolve(process.cwd(), "uploads");
const TEMP_IMAGES_DIR = path_1.default.resolve(process.cwd(), "temp_images");
fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
fs_1.default.mkdirSync(TEMP_IMAGES_DIR, { recursive: true });
// 이미지/샘플 JSON이 있는 실제 디렉터리 (api/tools)
const TOOLS_DIR = path_1.default.resolve(__dirname, "../tools");
// 정적 파일 서빙: http://localhost:8080/tools/파일명
app.use("/tools", express_1.default.static(TOOLS_DIR));
// 임시 이미지 서빙: http://localhost:8080/temp/파일명
app.use("/temp", express_1.default.static(TEMP_IMAGES_DIR));
// 헬스 체크
app.get("/health", (_req, res) => {
    res.type("text/plain").send("ok");
});
// AI API 상태 체크 (간단 버전)
app.get("/api/ai/status", (_req, res) => {
    const hasApiKey = !!genAI && !!genAIKey;
    res.json({
        status: hasApiKey ? "ready" : "no_key",
        message: hasApiKey ? "AI API 키 설정됨" : "Google AI API 키 필요",
        keyLength: genAIKey ? genAIKey.length : 0
    });
});
let tools = {};
let loans = [];
let myLoans = [];
let incidents = [];
// 데이터 파일 경로
const TOOLS_DATA_FILE = path_1.default.join(TOOLS_DIR, "tools_data.json");
const LOANS_DATA_FILE = path_1.default.join(TOOLS_DIR, "loans_data.json");
const INCIDENTS_DATA_FILE = path_1.default.join(TOOLS_DIR, "incidents_data.json");
// 데이터 파일에서 로드
function loadDataFromFiles() {
    try {
        // 공구 데이터 로드
        if (fs_1.default.existsSync(TOOLS_DATA_FILE)) {
            const toolsData = JSON.parse(fs_1.default.readFileSync(TOOLS_DATA_FILE, "utf8"));
            tools = toolsData || {};
            console.log(`✅ Loaded ${Object.keys(tools).length} tools from ${TOOLS_DATA_FILE}`);
        }
        // 대출 데이터 로드
        if (fs_1.default.existsSync(LOANS_DATA_FILE)) {
            const loansData = JSON.parse(fs_1.default.readFileSync(LOANS_DATA_FILE, "utf8"));
            loans = Array.isArray(loansData) ? loansData : [];
            myLoans = [...loans]; // myLoans도 동일한 데이터로 초기화
            console.log(`✅ Loaded ${loans.length} loans from ${LOANS_DATA_FILE}`);
        }
        // 사건 데이터 로드
        if (fs_1.default.existsSync(INCIDENTS_DATA_FILE)) {
            const incidentsData = JSON.parse(fs_1.default.readFileSync(INCIDENTS_DATA_FILE, "utf8"));
            incidents = Array.isArray(incidentsData) ? incidentsData : [];
            console.log(`✅ Loaded ${incidents.length} incidents from ${INCIDENTS_DATA_FILE}`);
        }
    }
    catch (e) {
        console.warn("⚠️ Data file loading error:", e.message);
    }
}
// 데이터 파일에 저장
function saveDataToFiles() {
    try {
        // 공구 데이터 저장
        fs_1.default.writeFileSync(TOOLS_DATA_FILE, JSON.stringify(tools, null, 2));
        // 대출 데이터 저장
        fs_1.default.writeFileSync(LOANS_DATA_FILE, JSON.stringify(loans, null, 2));
        // 사건 데이터 저장
        fs_1.default.writeFileSync(INCIDENTS_DATA_FILE, JSON.stringify(incidents, null, 2));
        console.log("💾 Data saved to files");
    }
    catch (e) {
        console.error("❌ Data save error:", e.message);
    }
}
// 서버 시작 시 데이터 로드
(() => {
    // 먼저 저장된 데이터 로드
    loadDataFromFiles();
    // 데이터가 없으면 샘플 로드
    if (Object.keys(tools).length === 0) {
        try {
            const samplePath = path_1.default.join(TOOLS_DIR, "sample_tools.json");
            const raw = fs_1.default.readFileSync(samplePath, "utf8");
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
                for (const t of arr)
                    tools[t.id] = t;
                console.log(`✅ Loaded ${arr.length} sample tools from ${samplePath}`);
                // 샘플 데이터를 실제 데이터 파일에 저장
                saveDataToFiles();
            }
            else {
                console.warn("⚠️ sample_tools.json is not an array.");
            }
        }
        catch (e) {
            console.warn("⚠️ No sample loaded:", e?.message);
        }
    }
})();
// 샘플 데이터 그대로 반환 (점검용)
app.get("/api/tools/sample", (_req, res) => {
    try {
        const samplePath = path_1.default.join(TOOLS_DIR, "sample_tools.json");
        const raw = fs_1.default.readFileSync(samplePath, "utf8");
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr))
            return res.status(500).json({ error: "INVALID_SAMPLE_JSON" });
        res.json(arr);
    }
    catch (err) {
        console.error("[SAMPLE_LOAD_FAILED]", err?.message);
        res.status(500).json({ error: "SAMPLE_LOAD_FAILED", message: String(err) });
    }
});
// ------------------------------ AI 추출 ------------------------------
const upload = (0, multer_1.default)({ dest: UPLOAD_DIR });
const genAIKey = process.env.GOOGLE_API_KEY || "";
const genAI = genAIKey ? new generative_ai_1.GoogleGenerativeAI(genAIKey) : null;
// 이미지만 업로드 (AI 분석 없이)
app.post("/api/tools/upload-only", upload.single("image"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "NO_FILE" });
        // 임시 이미지 파일명 생성
        const tempImageId = "manual_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const tempImageExt = path_1.default.extname(req.file.originalname || ".jpg");
        const tempImageName = tempImageId + tempImageExt;
        const tempImagePath = path_1.default.join(TEMP_IMAGES_DIR, tempImageName);
        // 임시 디렉토리로 이미지 이동
        fs_1.default.copyFileSync(req.file.path, tempImagePath);
        fs_1.default.unlinkSync(req.file.path);
        console.log(`📸 Manual image stored: ${tempImageName}`);
        return res.json({
            tempImageId,
            tempImageName,
            message: "Image uploaded successfully"
        });
    }
    catch (e) {
        // 업로드 파일 남아있으면 삭제 시도
        try {
            if (req.file?.path)
                fs_1.default.unlinkSync(req.file.path);
        }
        catch { }
        return res.status(500).json({ error: "UPLOAD_ERROR", message: e.message || String(e) });
    }
});
// 임시 이미지 업로드 API (DB 저장 없이 이미지만 저장)
app.post("/api/tools/upload-temp", upload.single("image"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "NO_FILE" });
        // 임시 이미지 파일명 생성
        const tempImageId = "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const tempImageExt = path_1.default.extname(req.file.originalname || ".jpg");
        const tempImageName = tempImageId + tempImageExt;
        const tempImagePath = path_1.default.join(TEMP_IMAGES_DIR, tempImageName);
        // 임시 디렉토리가 없으면 생성
        if (!fs_1.default.existsSync(TEMP_IMAGES_DIR)) {
            fs_1.default.mkdirSync(TEMP_IMAGES_DIR, { recursive: true });
        }
        // 임시 디렉토리로 이미지 이동
        fs_1.default.copyFileSync(req.file.path, tempImagePath);
        fs_1.default.unlinkSync(req.file.path);
        console.log(`📸 Temp image stored: ${tempImageName}`);
        return res.json({
            tempImageId,
            tempImageName,
            message: "Temporary image uploaded successfully"
        });
    }
    catch (e) {
        // 업로드 파일 남아있으면 삭제 시도
        try {
            if (req.file?.path)
                fs_1.default.unlinkSync(req.file.path);
        }
        catch { }
        return res.status(500).json({ error: "TEMP_UPLOAD_ERROR", message: e.message || String(e) });
    }
});
// 이미지 1장 → 공구 정보 JSON 추출
app.post("/api/tools/extract", upload.single("image"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "NO_FILE" });
        // Google AI API 키 체크
        if (!genAI || !genAIKey) {
            fs_1.default.unlinkSync(req.file.path);
            return res.status(501).json({
                error: "NO_GOOGLE_API_KEY",
                message: "Google AI API 키가 설정되지 않았습니다. .env 파일을 확인해주세요."
            });
        }
        console.log(`🔑 Using API key: ${genAIKey.substring(0, 10)}...`);
        const b64 = fs_1.default.readFileSync(req.file.path).toString("base64");
        // 임시 이미지 파일명 생성
        const tempImageId = "temp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        const tempImageExt = path_1.default.extname(req.file.originalname || ".jpg");
        const tempImageName = tempImageId + tempImageExt;
        const tempImagePath = path_1.default.join(TEMP_IMAGES_DIR, tempImageName);
        // 임시 디렉토리로 이미지 이동
        fs_1.default.copyFileSync(req.file.path, tempImagePath);
        fs_1.default.unlinkSync(req.file.path);
        // AI 모델 설정 (안정적인 비전 모델)
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash", // 기본 flash 모델 (가장 안정적)
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.1, // 일관성 있는 결과를 위해 낮은 온도
                topP: 0.8,
                topK: 40
            }
        });
        const prompt = `이 공구 사진을 분석하여 JSON 형태로 정보를 추출해주세요.

다음 형식으로 응답해주세요:
{
  "name": "공구명",
  "manufacturer": "제조사명",
  "model": "모델명",
  "category": "공구분류",
  "condition": "new 또는 used",
  "confidence": 0.8
}

규칙:
- 확실하지 않은 정보는 null로 설정
- condition은 반드시 "new" 또는 "used"만 사용
- confidence는 0~1 사이 숫자
- JSON 형태로만 응답하세요`;
        console.log(`🤖 Starting AI analysis for: ${tempImageName}`);
        // AI 분석 시도
        let json;
        try {
            const result = await Promise.race([
                model.generateContent([
                    { text: prompt },
                    { inlineData: { data: b64, mimeType: req.file.mimetype } }
                ]),
                new Promise((_, reject) => setTimeout(() => reject(new Error("AI 분석 시간 초과 (30초)")), 30000))
            ]);
            const response = result.response;
            if (!response) {
                throw new Error("AI 응답을 받지 못했습니다");
            }
            let text = response.text();
            if (!text || text.trim() === "") {
                throw new Error("AI가 빈 응답을 반환했습니다");
            }
            console.log(`🤖 AI Raw Response: ${text.substring(0, 100)}...`);
            // JSON 추출 (마크다운 코드 블록 제거)
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            try {
                json = JSON.parse(text);
            }
            catch (parseError) {
                console.error("JSON 파싱 실패:", text);
                // fallback: 기본 정보로 응답
                json = {
                    name: "분석 실패 - 수동 입력 필요",
                    manufacturer: null,
                    model: null,
                    category: "기타",
                    condition: "used",
                    confidence: 0.1
                };
            }
        }
        catch (aiError) {
            console.error("AI 분석 실패:", aiError);
            // AI 완전 실패시 기본 응답 - 사용자가 직접 입력할 수 있도록 유도
            json = {
                name: "새 공구 (정보 입력 필요)",
                manufacturer: "제조사 미확인",
                model: "모델 미확인",
                category: "전동공구",
                condition: "used",
                confidence: 0.0,
                error: "AI 분석을 사용할 수 없습니다. 정보를 직접 입력해주세요."
            };
        }
        // 기본값 보정
        json.name = json.name || "미확인 공구";
        json.category = json.category || "기타";
        json.condition = json.condition || "used";
        json.confidence = typeof json.confidence === 'number' ? json.confidence : 0.5;
        // 임시 이미지 정보를 결과에 추가
        json.tempImageId = tempImageId;
        json.tempImageName = tempImageName;
        console.log(`✅ AI Analysis completed for: ${json.name} (confidence: ${json.confidence})`);
        return res.json(json);
    }
    catch (e) {
        console.error("🚨 AI Analysis Error:", e);
        // 업로드 파일 남아있으면 삭제 시도
        try {
            if (req.file?.path)
                fs_1.default.unlinkSync(req.file.path);
        }
        catch { }
        // 에러 타입별 구체적 메시지
        let errorMessage = "알 수 없는 오류가 발생했습니다";
        let errorCode = "AI_ERROR";
        if (e.message?.includes("API key")) {
            errorMessage = "Google AI API 키가 유효하지 않습니다";
            errorCode = "INVALID_API_KEY";
        }
        else if (e.message?.includes("quota") || e.message?.includes("limit")) {
            errorMessage = "AI 분석 할당량을 초과했습니다. 잠시 후 다시 시도해주세요";
            errorCode = "QUOTA_EXCEEDED";
        }
        else if (e.message?.includes("network") || e.code === "ECONNREFUSED") {
            errorMessage = "네트워크 연결에 문제가 있습니다";
            errorCode = "NETWORK_ERROR";
        }
        else if (e.message?.includes("JSON")) {
            errorMessage = "AI 응답 형식이 올바르지 않습니다";
            errorCode = "INVALID_RESPONSE";
        }
        else if (e.message) {
            errorMessage = e.message;
        }
        return res.status(500).json({
            error: errorCode,
            message: errorMessage,
            details: e.message || String(e)
        });
    }
});
// ------------------------------ CRUD / 로그 ------------------------------
// 생성 (JSON과 FormData 모두 처리)
app.post("/api/tools", upload.single("image"), (req, res) => {
    try {
        const id = "t_" + Date.now();
        let finalImageUrl = "";
        let toolData = {};
        // FormData로 전송된 경우 data 필드에서 JSON 파싱
        if (req.body.data) {
            try {
                toolData = JSON.parse(req.body.data);
            }
            catch (e) {
                return res.status(400).json({ error: "Invalid JSON data in FormData" });
            }
        }
        else {
            // JSON으로 전송된 경우
            toolData = req.body;
        }
        // 업로드된 이미지 처리
        if (req.file) {
            const ext = path_1.default.extname(req.file.originalname) || ".jpg";
            const finalImageName = `tool_${id}${ext}`;
            const finalImagePath = path_1.default.join(TOOLS_DIR, finalImageName);
            try {
                // 업로드된 파일을 tools 디렉토리로 이동
                fs_1.default.copyFileSync(req.file.path, finalImagePath);
                fs_1.default.unlinkSync(req.file.path); // 임시 파일 삭제
                finalImageUrl = finalImageName;
                console.log(`📸 New image uploaded: ${finalImageName}`);
            }
            catch (e) {
                console.error("❌ Image save failed:", e.message);
                // 임시 파일 정리
                try {
                    fs_1.default.unlinkSync(req.file.path);
                }
                catch { }
                return res.status(500).json({ error: "이미지 저장 실패" });
            }
        }
        // 임시 이미지가 있으면 실제 tools 디렉토리로 이동
        else if (toolData.tempImageId && toolData.tempImageName) {
            const tempImagePath = path_1.default.join(TEMP_IMAGES_DIR, toolData.tempImageName);
            if (fs_1.default.existsSync(tempImagePath)) {
                const ext = path_1.default.extname(toolData.tempImageName);
                const finalImageName = `tool_${id}${ext}`;
                const finalImagePath = path_1.default.join(TOOLS_DIR, finalImageName);
                try {
                    fs_1.default.copyFileSync(tempImagePath, finalImagePath);
                    fs_1.default.unlinkSync(tempImagePath);
                    finalImageUrl = finalImageName;
                    console.log(`📸 Image moved: ${toolData.tempImageName} → ${finalImageName}`);
                }
                catch (e) {
                    console.error("❌ Image move failed:", e.message);
                }
            }
        }
        const tool = {
            id,
            ...toolData,
            imageUrl: finalImageUrl,
            requiredKeys: toolData.requiredKeys ?? ["name", "condition"],
            hiddenKeys: toolData.hiddenKeys ?? [],
            createdAt: new Date().toISOString(),
        };
        // 임시 필드 제거
        delete tool.tempImageId;
        delete tool.tempImageName;
        delete tool.tempDataURL;
        tools[id] = tool;
        // 신규 등록 활동 로그 추가
        const newToolActivity = {
            id: "i_" + Date.now(),
            toolId: id,
            type: "new",
            description: `새 공구 등록: ${tool.name}`,
            timestamp: new Date().toISOString()
        };
        incidents.push(newToolActivity);
        // 파일에 저장
        saveDataToFiles();
        console.log(`📋 New tool saved: ${tool.name} (ID: ${id})`);
        res.json(tool);
    }
    catch (error) {
        console.error("❌ Tool creation failed:", error);
        res.status(500).json({ error: "공구 생성 실패: " + error.message });
    }
});
// 목록/상세
app.get("/api/tools", (_req, res) => res.json(Object.values(tools)));
app.get("/api/tools/:id", (req, res) => res.json(tools[req.params.id] || null));
// 공구 업데이트 API
app.put("/api/tools/:id", (req, res) => {
    const toolId = req.params.id;
    if (!tools[toolId]) {
        return res.status(404).json({ error: "공구를 찾을 수 없습니다." });
    }
    // 기존 도구 정보를 유지하면서 업데이트
    tools[toolId] = {
        ...tools[toolId],
        ...req.body,
        id: toolId // ID는 변경되지 않도록 보장
    };
    saveDataToFiles();
    console.log(`🔧 Tool updated: ${toolId} - status: ${tools[toolId].status}`);
    res.json(tools[toolId]);
});
// 대출/반납
app.post("/api/tools/:id/loan", (req, res) => {
    const rec = { id: "l_" + Date.now(), toolId: req.params.id, user: req.body.user, action: "loan", timestamp: new Date().toISOString() };
    loans.push(rec);
    saveDataToFiles();
    console.log(`🔄 Loan recorded: ${req.params.id} to ${req.body.user}`);
    res.json(rec);
});
app.post("/api/tools/:id/return", (req, res) => {
    const rec = { id: "l_" + Date.now(), toolId: req.params.id, user: req.body.user, action: "return", timestamp: new Date().toISOString() };
    loans.push(rec);
    saveDataToFiles();
    console.log(`🔄 Return recorded: ${req.params.id} from ${req.body.user}`);
    res.json(rec);
});
app.get("/api/loans", (req, res) => {
    const { toolId } = req.query;
    const data = toolId ? loans.filter(l => l.toolId === toolId) : loans;
    res.json(data.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
});
// 사건 로그
app.post("/api/tools/:id/incident", (req, res) => {
    const rec = { id: "i_" + Date.now(), toolId: req.params.id, type: req.body.type, description: req.body.description, timestamp: new Date().toISOString() };
    incidents.push(rec);
    saveDataToFiles();
    console.log(`📝 Incident recorded: ${req.body.type} for ${req.params.id}`);
    res.json(rec);
});
// 망실현황 전용 API
app.post("/api/incidents", (req, res) => {
    const rec = {
        id: "i_" + Date.now(),
        toolId: req.body.toolId,
        type: req.body.type,
        description: req.body.description,
        timestamp: new Date().toISOString()
    };
    incidents.push(rec);
    // 공구 상태도 업데이트
    if (tools[req.body.toolId]) {
        if (req.body.type === 'broken' || req.body.type === 'damaged') {
            tools[req.body.toolId].damaged = true;
        }
        tools[req.body.toolId].status = req.body.type;
    }
    saveDataToFiles();
    console.log(`📝 Incident created: ${req.body.type} for ${req.body.toolId}`);
    res.json(rec);
});
app.get("/api/incidents", (req, res) => {
    const { toolId } = req.query;
    const data = toolId ? incidents.filter(i => i.toolId === toolId) : incidents;
    res.json(data.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
});
// 망실현황 수정 API
app.put("/api/incidents/:id", (req, res) => {
    const incidentId = req.params.id;
    const incidentIndex = incidents.findIndex(i => i.id === incidentId);
    if (incidentIndex === -1) {
        return res.status(404).json({ error: "해당 망실 현황을 찾을 수 없습니다." });
    }
    // 기존 데이터 유지하면서 업데이트
    incidents[incidentIndex] = {
        ...incidents[incidentIndex],
        type: req.body.type,
        description: req.body.description,
        timestamp: req.body.timestamp || incidents[incidentIndex].timestamp
    };
    // 공구 상태도 업데이트
    const toolId = incidents[incidentIndex].toolId;
    if (tools[toolId]) {
        if (req.body.type === 'broken' || req.body.type === 'damaged') {
            tools[toolId].damaged = true;
        }
        tools[toolId].status = req.body.type;
    }
    saveDataToFiles();
    console.log(`📝 Incident updated: ${incidentId} - ${req.body.type}`);
    res.json(incidents[incidentIndex]);
});
// ------------------------------ 서버 시작 ------------------------------
app.listen(PORT, () => {
    console.log(`API on http://localhost:${PORT}`);
    console.log("Static /tools ->", TOOLS_DIR);
    console.log(`💾 Data files: ${TOOLS_DATA_FILE}`);
});
// 임시 이미지 정리 함수
function cleanupTempImages() {
    try {
        const files = fs_1.default.readdirSync(TEMP_IMAGES_DIR);
        const now = Date.now();
        let cleanedCount = 0;
        for (const file of files) {
            const filePath = path_1.default.join(TEMP_IMAGES_DIR, file);
            const stats = fs_1.default.statSync(filePath);
            // 1시간(3600초) 이상 된 파일 삭제
            if (now - stats.mtime.getTime() > 60 * 60 * 1000) {
                fs_1.default.unlinkSync(filePath);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned ${cleanedCount} old temp images`);
        }
    }
    catch (e) {
        console.error("❌ Temp cleanup error:", e.message);
    }
}
// 정기적 자동 저장 (5분마다)
setInterval(() => {
    saveDataToFiles();
}, 5 * 60 * 1000);
// 정기적 임시 이미지 정리 (10분마다)
setInterval(() => {
    cleanupTempImages();
}, 10 * 60 * 1000);
// 서버 종료시 데이터 저장
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    saveDataToFiles();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('\n🛑 Server terminating...');
    saveDataToFiles();
    process.exit(0);
});
// ===== 샘플 로드 유틸 =====
function loadSampleTools() {
    try {
        const samplePath = path_1.default.join(TOOLS_DIR, "sample_tools.json");
        const raw = fs_1.default.readFileSync(samplePath, "utf8");
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) {
            console.warn("⚠️ sample_tools.json is not an array");
            return 0;
        }
        let count = 0;
        for (const t of arr) {
            if (!t?.id)
                continue;
            tools[t.id] = t;
            count++;
        }
        console.log(`✅ sample loaded: ${count} items`);
        return count;
    }
    catch (e) {
        console.error("❌ loadSampleTools failed:", e.message);
        return 0;
    }
}
// 서버 시작 시 1회 로드
if (!Object.keys(tools).length)
    loadSampleTools();
// 강제 리로드 엔드포인트 (수동 점검용)
app.post("/api/tools/reload", (_req, res) => {
    tools = {};
    loans = [];
    incidents = [];
    loadDataFromFiles();
    const n = Object.keys(tools).length;
    res.json({ reloaded: n, keys: Object.keys(tools).slice(0, 5) });
});
// 경로/키 카운트 확인(디버그)
app.get("/api/debug", (_req, res) => {
    res.json({
        toolsDir: TOOLS_DIR,
        count: Object.keys(tools).length,
        sampleExists: fs_1.default.existsSync(path_1.default.join(TOOLS_DIR, "sample_tools.json")),
        firstIds: Object.keys(tools).slice(0, 5)
    });
});
app.get("/api/tools", (_req, res) => {
    if (!Object.keys(tools).length)
        loadDataFromFiles(); // ← 비었으면 자동 로드
    res.json(Object.values(tools));
});
// 대출 관련 API
app.get("/api/my-loans", (_req, res) => {
    res.json(myLoans);
});
app.post("/api/loans", (req, res) => {
    try {
        const { toolIds, days = 3, startDate } = req.body;
        if (!toolIds || !Array.isArray(toolIds)) {
            return res.status(400).json({ error: "toolIds는 배열이어야 합니다." });
        }
        const start = new Date(startDate || new Date());
        const end = new Date(start.getTime() + (days * 24 * 60 * 60 * 1000));
        const newLoans = toolIds.map(toolId => ({
            id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            toolId,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            status: "active",
            extendCount: 0,
            createdAt: new Date().toISOString()
        }));
        myLoans.push(...newLoans);
        loans.push(...newLoans); // 전역 loans 배열에도 추가
        // 대출된 공구들을 대출중 상태로 변경
        toolIds.forEach((toolId) => {
            if (tools[toolId]) {
                tools[toolId].loanStatus = "대출중";
                tools[toolId].available = false;
            }
        });
        saveDataToFiles();
        res.json({ success: true, loans: newLoans });
    }
    catch (error) {
        res.status(500).json({ error: "대출 처리 실패" });
    }
});
app.post("/api/loans/:id/extend", (req, res) => {
    try {
        const { id } = req.params;
        const { days = 3 } = req.body;
        const loan = myLoans.find(l => l.id === id);
        if (!loan) {
            return res.status(404).json({ error: "대출 기록을 찾을 수 없습니다." });
        }
        const currentEnd = new Date(loan.endDate);
        const newEnd = new Date(currentEnd.getTime() + (days * 24 * 60 * 60 * 1000));
        loan.endDate = newEnd.toISOString().split('T')[0];
        loan.extendCount = (loan.extendCount || 0) + 1;
        res.json(loan);
    }
    catch (error) {
        res.status(500).json({ error: "연장 처리 실패" });
    }
});
app.post("/api/loans/:id/return", (req, res) => {
    try {
        const { id } = req.params;
        const loan = myLoans.find(l => l.id === id);
        if (!loan) {
            return res.status(404).json({ error: "대출 기록을 찾을 수 없습니다." });
        }
        loan.status = "returned";
        loan.returnDate = new Date().toISOString().split('T')[0];
        // 공구를 반납 상태로 변경
        if (tools[loan.toolId]) {
            tools[loan.toolId].loanStatus = "반납";
            tools[loan.toolId].available = true;
        }
        saveDataToFiles();
        res.json(loan);
    }
    catch (error) {
        res.status(500).json({ error: "반납 처리 실패" });
    }
});
// 공구 삭제 API
app.delete("/api/tools/:id", (req, res) => {
    try {
        const { id } = req.params;
        if (!tools[id]) {
            return res.status(404).json({ error: "공구를 찾을 수 없습니다." });
        }
        const deletedTool = tools[id];
        // 공구 데이터에서 삭제
        delete tools[id];
        saveDataToFiles();
        res.json({
            success: true,
            message: `공구 ${deletedTool.name} (ID: ${id})가 삭제되었습니다.`,
            deletedTool: deletedTool
        });
    }
    catch (error) {
        console.error("공구 삭제 실패:", error);
        res.status(500).json({ error: "공구 삭제에 실패했습니다." });
    }
});
// incidents API 추가
app.post("/api/incidents", (req, res) => {
    try {
        const { toolId, type, timestamp, description } = req.body;
        if (!toolId || !type) {
            return res.status(400).json({ error: "toolId와 type은 필수입니다." });
        }
        const newIncident = {
            id: "I" + String(incidents.length + 1).padStart(3, "0"),
            toolId,
            type,
            timestamp: timestamp || new Date().toISOString(),
            description: description || ""
        };
        incidents.push(newIncident);
        saveDataToFiles();
        res.status(201).json(newIncident);
    }
    catch (error) {
        console.error("사고 기록 생성 실패:", error);
        res.status(500).json({ error: "사고 기록 생성에 실패했습니다." });
    }
});
// 대출 상태 동기화 API
app.post("/api/sync-loan-status", (req, res) => {
    try {
        // 현재 활성 대출 목록 가져오기
        const activeToolIds = myLoans
            .filter(loan => loan.status === "active")
            .map(loan => loan.toolId);
        let updatedCount = 0;
        // 모든 공구 상태 동기화
        Object.keys(tools).forEach(toolId => {
            const tool = tools[toolId];
            if (activeToolIds.includes(toolId)) {
                // 실제 대출중인 공구는 대출중 상태로
                if (tool.loanStatus !== "대출중") {
                    tool.loanStatus = "대출중";
                    tool.available = false;
                    updatedCount++;
                }
            }
            else {
                // 대출 기록이 없는 공구는 대여가능 상태로
                if (tool.loanStatus === "대출중") {
                    delete tool.loanStatus;
                    tool.available = true;
                    updatedCount++;
                }
            }
        });
        saveDataToFiles();
        res.json({
            success: true,
            message: `${updatedCount}개 공구 상태가 동기화되었습니다.`,
            activeLoans: activeToolIds.length,
            updatedTools: updatedCount
        });
    }
    catch (error) {
        console.error("대출 상태 동기화 실패:", error);
        res.status(500).json({ error: "대출 상태 동기화에 실패했습니다." });
    }
});
// 서버 시작
app.listen(PORT, () => {
    console.log(`API on http://localhost:${PORT}`);
    console.log(`Static /tools -> ${TOOLS_DIR}`);
    console.log(`💾 Data files: ${path_1.default.join(TOOLS_DIR, "tools_data.json")}`);
});
