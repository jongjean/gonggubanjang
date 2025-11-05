// api/incidents.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIncidents, createIncident } from './src/lib/data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // 모든 사건 기록 조회
        const incidents = getIncidents();
        return res.status(200).json(incidents);

      case 'POST':
        // 새 사건 기록 생성
        const { toolId, type, description } = req.body;
        
        if (!toolId || !type || !description) {
          return res.status(400).json({ 
            error: '공구 ID, 사건 유형, 설명이 필요합니다' 
          });
        }

        const validTypes = ['new', 'repair', 'damage', 'lost'];
        if (!validTypes.includes(type)) {
          return res.status(400).json({ 
            error: `유효하지 않은 사건 유형입니다. 허용값: ${validTypes.join(', ')}` 
          });
        }

        const newIncident = createIncident({
          toolId,
          type,
          description
        });

        return res.status(201).json(newIncident);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('사건 기록 API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
}