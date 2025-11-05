// api/extract.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseMultipartForm, validateImageFile } from './src/lib/upload';
import { extractToolInfoFromImage } from './src/lib/ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용됩니다' });
  }

  try {
    // 멀티파트 폼 파싱
    const { files } = await parseMultipartForm(req);
    
    const imageFile = files.image;
    if (!imageFile) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다' });
    }

    // 파일 유효성 검사
    const validation = validateImageFile(imageFile);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // AI 분석 실행
    const analysisResult = await extractToolInfoFromImage(imageFile.buffer);
    
    return res.status(200).json({
      success: true,
      data: analysisResult,
      fileInfo: {
        name: imageFile.originalName,
        size: imageFile.size,
        type: imageFile.mimeType
      }
    });

  } catch (error) {
    console.error('이미지 분석 오류:', error);
    return res.status(500).json({
      success: false,
      error: '이미지 분석 중 오류가 발생했습니다',
      details: (error as Error).message
    });
  }
}

// Vercel에서 body parser 비활성화
export const config = {
  api: {
    bodyParser: false
  }
};