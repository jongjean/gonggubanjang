// api/tools.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTools, getTool, createTool, updateTool, deleteTool } from './src/lib/data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        if (req.query.id) {
          // 특정 공구 조회
          const tool = getTool(req.query.id as string);
          if (!tool) {
            return res.status(404).json({ error: '공구를 찾을 수 없습니다' });
          }
          return res.status(200).json(tool);
        } else {
          // 모든 공구 조회
          const tools = getTools();
          return res.status(200).json(tools);
        }

      case 'POST':
        // 새 공구 추가
        const newTool = createTool(req.body);
        return res.status(201).json(newTool);

      case 'PUT':
        // 공구 업데이트
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'ID가 필요합니다' });
        }

        const updatedTool = updateTool(id as string, req.body);
        if (!updatedTool) {
          return res.status(404).json({ error: '공구를 찾을 수 없습니다' });
        }

        return res.status(200).json(updatedTool);

      case 'DELETE':
        // 공구 삭제
        const { id: deleteId } = req.query;
        if (!deleteId) {
          return res.status(400).json({ error: 'ID가 필요합니다' });
        }

        const deleted = deleteTool(deleteId as string);
        if (!deleted) {
          return res.status(404).json({ error: '공구를 찾을 수 없습니다' });
        }

        return res.status(200).json({ message: '공구가 삭제되었습니다' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
}