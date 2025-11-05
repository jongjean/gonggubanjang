// api/tools/extract.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  // AI 분석 시뮬레이션 (실제 구현을 위해서는 Google AI API와 파일 처리가 필요)
  const mockResult = {
    name: "AI 분석 결과",
    manufacturer: "DeWalt",
    model: "XR 시리즈",
    category: "전동공구",
    condition: "used",
    confidence: 0.85,
    tempImageId: `temp_${Date.now()}`,
    tempImageName: `ai_analyzed_${Date.now()}.jpg`
  };

  return res.status(200).json(mockResult);
}