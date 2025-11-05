// api/ai-status.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      // 간단한 AI 상태 시뮬레이션
      const hasApiKey = !!process.env.GEMINI_API_KEY;
      
      return res.status(200).json({
        status: hasApiKey ? "연결됨" : "API 키 없음",
        model: "gemini-1.5-flash-latest",
        available: hasApiKey,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('AI 상태 확인 오류:', error);
      return res.status(500).json({
        status: "오류",
        model: "gemini-1.5-flash-latest", 
        available: false,
        error: (error as Error).message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}