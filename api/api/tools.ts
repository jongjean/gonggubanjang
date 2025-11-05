// api/api/tools.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

// 샘플 공구 데이터
const sampleTools = [
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
    notes: "날 교체 필요시 연락"
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
    notes: "무게 450g"
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
    notes: "보안경 착용 필수"
  },
  {
    id: "G005",
    name: "줄자",
    category: "수공구",
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
    notes: "5m 길이"
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

  if (req.method === 'GET') {
    return res.status(200).json(sampleTools);
  }

  if (req.method === 'POST') {
    // 새 공구 추가 (간단 버전)
    const newTool = {
      id: `G${String(Date.now()).slice(-3)}`,
      ...req.body,
      createdAt: new Date().toISOString(),
      requiredKeys: ["name", "condition"],
      hiddenKeys: []
    };
    
    sampleTools.push(newTool);
    return res.status(201).json(newTool);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}