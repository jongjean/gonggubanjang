// api/tools.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 간단한 인메모리 데이터 (Vercel 호환)
const SAMPLE_TOOLS = [
  {
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
  },
  {
    id: "G002",
    name: "원형톱",
    category: "전동공구",
    manufacturer: "Makita",
    model: "5007MG",
    condition: "new",
    purchaseDate: "2023-03-10",
    lifespanMonths: 48,
    available: true,
    loanStatus: "반납",
    damaged: false,
    repaired: false,
    imageUrl: "circularsaw.jpg",
    notes: "날 교체 필요시 연락",
    createdAt: "2023-03-10T00:00:00.000Z",
    requiredKeys: ["name", "condition"],
    hiddenKeys: []
  },
  {
    id: "G003",
    name: "해머",
    category: "수공구",
    manufacturer: "Stanley",
    model: "STHT51512",
    condition: "used",
    purchaseDate: "2022-08-20",
    lifespanMonths: 60,
    available: false,
    loanStatus: "대출중",
    damaged: false,
    repaired: false,
    imageUrl: "hammer.jpg",
    notes: "무게 450g",
    createdAt: "2022-08-20T00:00:00.000Z",
    requiredKeys: ["name", "condition"],
    hiddenKeys: []
  },
  {
    id: "G004",
    name: "각도절단기",
    category: "전동공구",
    manufacturer: "BOSCH",
    model: "GWS 7-115",
    condition: "used",
    purchaseDate: "2023-02-20",
    lifespanMonths: 36,
    available: true,
    loanStatus: "반납",
    damaged: false,
    repaired: false,
    imageUrl: "anglegrinder.jpg",
    notes: "보안경 착용 필수",
    createdAt: "2023-02-20T00:00:00.000Z",
    requiredKeys: ["name", "condition"],
    hiddenKeys: []
  },
  {
    id: "G005",
    name: "줄자",
    category: "측정공구",
    manufacturer: "Stanley",
    model: "STHT30825",
    condition: "new",
    purchaseDate: "2023-04-05",
    lifespanMonths: 24,
    available: true,
    loanStatus: "반납",
    damaged: false,
    repaired: false,
    imageUrl: "tape-measure.jpg",
    notes: "5m 길이",
    createdAt: "2023-04-05T00:00:00.000Z",
    requiredKeys: ["name", "condition"],
    hiddenKeys: []
  }
];

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
          const tool = SAMPLE_TOOLS.find(t => t.id === req.query.id);
          if (!tool) {
            return res.status(404).json({ error: '공구를 찾을 수 없습니다' });
          }
          return res.status(200).json(tool);
        } else {
          // 모든 공구 조회
          console.log('API 호출됨: tools 목록 반환', SAMPLE_TOOLS.length, '개');
          return res.status(200).json(SAMPLE_TOOLS);
        }

      case 'POST':
        // 새 공구 추가 (간단 버전)
        const newTool = {
          id: `G${String(Date.now()).slice(-3)}`,
          ...req.body,
          createdAt: new Date().toISOString(),
          requiredKeys: ["name", "condition"],
          hiddenKeys: []
        };
        SAMPLE_TOOLS.push(newTool);
        return res.status(201).json(newTool);

      case 'PUT':
        // 공구 업데이트 (간단 버전)
        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: 'ID가 필요합니다' });
        }

        const toolIndex = SAMPLE_TOOLS.findIndex(t => t.id === id);
        if (toolIndex === -1) {
          return res.status(404).json({ error: '공구를 찾을 수 없습니다' });
        }

        SAMPLE_TOOLS[toolIndex] = { ...SAMPLE_TOOLS[toolIndex], ...req.body };
        return res.status(200).json(SAMPLE_TOOLS[toolIndex]);

      case 'DELETE':
        // 공구 삭제 (간단 버전)
        const { id: deleteId } = req.query;
        if (!deleteId) {
          return res.status(400).json({ error: 'ID가 필요합니다' });
        }

        const deleteIndex = SAMPLE_TOOLS.findIndex(t => t.id === deleteId);
        if (deleteIndex === -1) {
          return res.status(404).json({ error: '공구를 찾을 수 없습니다' });
        }

        SAMPLE_TOOLS.splice(deleteIndex, 1);
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