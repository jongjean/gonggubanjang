// api/lib/ai.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

const initializeAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

export const extractToolInfoFromImage = async (imageBuffer: Buffer): Promise<any> => {
  try {
    const ai = initializeAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      이 이미지를 분석해서 다음 JSON 형식으로 공구 정보를 추출해주세요:
      {
        "name": "공구명",
        "category": "전동공구 또는 수공구 또는 측정공구 또는 기타",
        "manufacturer": "제조사 (있다면)",
        "model": "모델명 (있다면)",
        "condition": "new 또는 used (상태를 보고 판단)",
        "notes": "특징이나 주의사항 (있다면)",
        "confidence": 0.8
      }

      만약 공구가 아니거나 명확하지 않으면 confidence를 0.3 이하로 설정하고 name을 "알 수 없음"으로 해주세요.
      한국어로 응답해주세요.
    `;

    const imageData = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    const text = response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없음');
      }
    } catch (parseError) {
      return {
        name: "분석 실패",
        category: "기타",
        condition: "used",
        confidence: 0.1,
        notes: "AI 분석에 실패했습니다: " + text.substring(0, 100)
      };
    }
  } catch (error) {
    console.error('AI 분석 오류:', error);
    return {
      name: "분석 오류",
      category: "기타",
      condition: "used",
      confidence: 0.0,
      notes: "오류: " + (error as Error).message
    };
  }
};

export const analyzeToolCondition = async (imageBuffer: Buffer, toolName: string): Promise<any> => {
  try {
    const ai = initializeAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      이 ${toolName} 이미지를 분석해서 다음 JSON 형식으로 상태를 평가해주세요:
      {
        "condition": "new 또는 used",
        "damageLevel": "없음 또는 경미 또는 보통 또는 심각",
        "damages": ["손상1", "손상2"],
        "maintenanceNeeds": ["정비필요사항1", "정비필요사항2"],
        "usabilityScore": 85,
        "notes": "상세 분석 내용",
        "confidence": 0.9
      }

      usabilityScore는 0-100점으로 사용 가능성을 평가해주세요.
      한국어로 응답해주세요.
    `;

    const imageData = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    };

    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    const text = response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON 형식을 찾을 수 없음');
      }
    } catch (parseError) {
      return {
        condition: "used",
        damageLevel: "알 수 없음",
        damages: [],
        maintenanceNeeds: [],
        usabilityScore: 50,
        confidence: 0.1,
        notes: "AI 분석에 실패했습니다: " + text.substring(0, 100)
      };
    }
  } catch (error) {
    console.error('AI 상태 분석 오류:', error);
    return {
      condition: "used",
      damageLevel: "오류",
      damages: [],
      maintenanceNeeds: [],
      usabilityScore: 0,
      confidence: 0.0,
      notes: "오류: " + (error as Error).message
    };
  }
};

export const checkAIStatus = async (): Promise<{ status: string; model: string; available: boolean }> => {
  try {
    const ai = initializeAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    const result = await model.generateContent("Hello");
    await result.response;
    
    return {
      status: "연결됨",
      model: "gemini-1.5-flash-latest",
      available: true
    };
  } catch (error) {
    return {
      status: "오류: " + (error as Error).message,
      model: "gemini-1.5-flash-latest",
      available: false
    };
  }
};