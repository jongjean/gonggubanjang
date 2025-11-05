// api/api/tools/extract.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const genAIKey = process.env.GOOGLE_AI_API_KEY;
  if (!genAIKey) {
    return res.status(500).json({ error: 'Google AI API 키가 설정되지 않았습니다' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!imageFile) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다' });
    }

    const genAI = new GoogleGenerativeAI(genAIKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1,
        topP: 0.8,
        topK: 40
      }
    });

    // 이미지 읽기
    const imageData = fs.readFileSync(imageFile.filepath);
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

    console.log(`🤖 Starting AI analysis...`);
    console.log(`🔑 API Key length: ${genAIKey.length}`);
    console.log(`📊 Model: gemini-flash-latest`);

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: b64, mimeType: imageFile.mimetype || 'image/jpeg' } }
    ]);

    const response = result.response;
    let text = response.text();
    
    console.log(`🤖 AI Raw Response: ${text}`);

    // JSON 추출
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const json = JSON.parse(text);

    // 기본값 설정
    json.name = json.name || "미확인 공구";
    json.category = json.category || "기타";
    json.condition = json.condition || "used";
    json.confidence = typeof json.confidence === 'number' ? json.confidence : 0.5;

    // 임시 이미지 정보 추가
    json.tempImageId = `temp_${Date.now()}`;
    json.tempImageName = imageFile.originalFilename || `temp_${Date.now()}.jpg`;

    console.log(`✅ AI Analysis completed: ${json.name} (confidence: ${json.confidence})`);

    // 임시 파일 정리
    fs.unlinkSync(imageFile.filepath);

    return res.status(200).json(json);

  } catch (error: any) {
    console.error("AI 분석 실패:", error);
    
    // fallback 응답
    const fallbackJson = {
      name: "새 공구 (정보 입력 필요)",
      manufacturer: "제조사 미확인",
      model: "모델 미확인",
      category: "전동공구",
      condition: "used",
      confidence: 0.0,
      error: "AI 분석을 사용할 수 없습니다. 정보를 직접 입력해주세요.",
      errorDetails: error.message
    };

    return res.status(500).json(fallbackJson);
  }
}