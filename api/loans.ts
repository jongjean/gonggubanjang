// api/loans.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getLoans, createLoan, returnLoan } from './src/lib/data';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // 모든 대출 기록 조회
        const loans = getLoans();
        return res.status(200).json(loans);

      case 'POST':
        // 새 대출 생성
        const { toolId, borrowerName } = req.body;
        
        if (!toolId || !borrowerName) {
          return res.status(400).json({ 
            error: '공구 ID와 대출자명이 필요합니다' 
          });
        }

        const newLoan = createLoan({
          toolId,
          borrowerName,
          borrowDate: new Date().toISOString(),
          status: 'borrowed'
        });

        return res.status(201).json(newLoan);

      case 'PUT':
        // 대출 반납 처리
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({ error: '대출 ID가 필요합니다' });
        }

        const returned = returnLoan(id as string);
        
        if (!returned) {
          return res.status(404).json({ error: '대출 기록을 찾을 수 없습니다' });
        }

        return res.status(200).json({ 
          message: '성공적으로 반납되었습니다',
          loanId: id 
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'OPTIONS']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('대출 API 오류:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
}