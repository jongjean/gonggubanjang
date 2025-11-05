// api/vercel/index.ts - Vercel Serverless Function
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from "express";
import path from "path";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Express 앱 생성
const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));

// 업로드 설정
const upload = multer({ dest: "/tmp/uploads/" });

// Google AI 설정
const genAIKey = process.env.GOOGLE_AI_API_KEY;
const genAI = genAIKey ? new GoogleGenerativeAI(genAIKey) : null;

// 데이터 저장소 (Vercel에서는 메모리 기반)
type Tool = Record<string, any>;
let tools: Record<string, Tool> = {};
let loans: any[] = [];
let myLoans: any[] = [];
let incidents: any[] = [];

// 샘플 데이터 로드 (초기화)
function initializeData() {
  // 기본 도구 데이터
  tools = {
    "G001": {
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
      notes: "배터리 2개 포함",
      createdAt: "2023-01-15T00:00:00.000Z",
      requiredKeys: ["name", "condition"],
      hiddenKeys: []
    }
    // 더 많은 샘플 데이터...
  };

  loans = [];
  myLoans = [];
  incidents = [];
}

// 라우트 설정
app.get("/health", (req, res) => {
  res.type("text/plain").send("ok");
});

// AI 상태 체크
app.get("/api/ai/status", (req, res) => {
  const hasApiKey = !!genAI && !!genAIKey;
  res.json({ 
    status: hasApiKey ? "ready" : "no_key", 
    message: hasApiKey ? "AI API 키 설정됨" : "Google AI API 키 필요",
    keyLength: genAIKey ? genAIKey.length : 0
  });
});

// 공구 목록
app.get("/api/tools", (req, res) => {
  const toolsArray = Object.values(tools);
  res.json(toolsArray);
});

// AI 분석
app.post("/api/tools/extract", upload.single("image"), async (req, res) => {
  if (!genAI) {
    return res.status(500).json({ error: "Google AI API 키가 설정되지 않았습니다" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "이미지 파일이 필요합니다" });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1,
        topP: 0.8,
        topK: 40
      }
    });

    const imageData = fs.readFileSync(req.file.path);
    const b64 = imageData.toString('base64');

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

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: b64, mimeType: req.file.mimetype } }
    ]);

    const response = result.response;
    let text = response.text();
    
    // JSON 추출
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const json = JSON.parse(text);

    // 임시 파일 정리
    fs.unlinkSync(req.file.path);

    res.json(json);

  } catch (error: any) {
    console.error("AI 분석 실패:", error);
    
    // 임시 파일 정리
    try { if (req.file?.path) fs.unlinkSync(req.file.path); } catch {}
    
    res.status(500).json({ 
      error: "AI_ERROR", 
      message: "AI 분석에 실패했습니다",
      details: error.message
    });
  }
});

// 데이터 초기화
initializeData();

// Vercel 핸들러
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}