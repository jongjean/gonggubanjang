// api/lib/upload.ts
import formidable, { Fields, Files, File } from 'formidable';
import { IncomingMessage } from 'http';
import fs from 'fs';

export interface ParsedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export const parseMultipartForm = async (req: IncomingMessage): Promise<{
  fields: Fields;
  files: { [key: string]: ParsedFile };
}> => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
      keepExtensions: true
    });

    form.parse(req, async (err: any, fields: Fields, files: Files) => {
      if (err) {
        reject(err);
        return;
      }

      const processedFiles: { [key: string]: ParsedFile } = {};

      for (const [key, file] of Object.entries(files)) {
        if (Array.isArray(file)) {
          const firstFile = file[0] as File;
          if (firstFile && firstFile.filepath) {
            try {
              const buffer = fs.readFileSync(firstFile.filepath);
              processedFiles[key] = {
                buffer,
                originalName: firstFile.originalFilename || 'unknown',
                mimeType: firstFile.mimetype || 'application/octet-stream',
                size: firstFile.size
              };
              
              // 임시 파일 삭제
              fs.unlinkSync(firstFile.filepath);
            } catch (fileError) {
              console.error('파일 처리 오류:', fileError);
            }
          }
        } else if (file) {
          const singleFile = file as File;
          if (singleFile.filepath) {
            try {
              const buffer = fs.readFileSync(singleFile.filepath);
              processedFiles[key] = {
                buffer,
                originalName: singleFile.originalFilename || 'unknown',
                mimeType: singleFile.mimetype || 'application/octet-stream',
                size: singleFile.size
              };
              
              // 임시 파일 삭제
              fs.unlinkSync(singleFile.filepath);
            } catch (fileError) {
              console.error('파일 처리 오류:', fileError);
            }
          }
        }
      }

      resolve({ fields, files: processedFiles });
    });
  });
};

export const validateImageFile = (file: ParsedFile): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.mimeType)) {
    return {
      valid: false,
      error: `지원되지 않는 파일 형식입니다. (${file.mimeType}) 허용 형식: JPEG, PNG, WebP`
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다. (${Math.round(file.size / 1024 / 1024)}MB) 최대 10MB까지 허용됩니다.`
    };
  }

  return { valid: true };
};

// Vercel에서는 파일 시스템 쓰기가 제한되므로 메모리에서 처리
export const processImageForAI = async (buffer: Buffer): Promise<Buffer> => {
  // 실제 환경에서는 이미지 리사이징이나 압축을 할 수 있습니다
  // 현재는 원본 버퍼를 그대로 반환
  return buffer;
};