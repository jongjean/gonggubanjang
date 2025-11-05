// api/api/ai/status.ts
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
    const hasApiKey = !!process.env.GOOGLE_AI_API_KEY;
    return res.status(200).json({ 
      status: hasApiKey ? "ready" : "no_key", 
      message: hasApiKey ? "AI API 키 설정됨" : "Google AI API 키 필요",
      keyLength: hasApiKey ? process.env.GOOGLE_AI_API_KEY!.length : 0
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}