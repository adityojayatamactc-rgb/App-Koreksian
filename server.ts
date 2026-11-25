import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

interface EssayRubricInput {
  number: number;
  prompt: string;
  criteria: string;
  maxScore: number;
}

interface GradeSheetBody {
  fileDataBase64?: string;
  mimeType?: string;
  subjectName?: string;
  pgCount?: number;
  essayCount?: number;
  answerKey?: string[];
  essayRubrics?: EssayRubricInput[];
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'asesmen-smk-grader' });
  });

  app.post('/api/grade-sheet', async (req: Request, res: Response) => {
    try {
      const body = req.body as GradeSheetBody;

      if (!body || typeof body.fileDataBase64 !== 'string' || !body.fileDataBase64.trim()) {
        res.status(400).json({ error: 'Berkas lembar jawaban (JPG/PNG/PDF) wajib diunggah.' });
        return;
      }

      const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        res.status(400).json({
          error: 'Format berkas tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.',
        });
        return;
      }

      const pgCount = Number(body.pgCount);
      const essayCount = Number(body.essayCount);
      if (!Number.isInteger(pgCount) || pgCount < 1 || pgCount > 100) {
        res.status(400).json({ error: 'Jumlah soal pilihan ganda tidak valid.' });
        return;
      }
      if (!Number.isInteger(essayCount) || essayCount < 0 || essayCount > 20) {
        res.status(400).json({ error: 'Jumlah soal esai tidak valid.' });
        return;
      }

      // Strip potential data URL prefix if sent from browser
      const cleanBase64 = body.fileDataBase64.includes(',')
        ? body.fileDataBase64.split(',')[1]
        : body.fileDataBase64;

      if (cleanBase64.length > 28 * 1024 * 1024) {
        res.status(413).json({ error: 'Ukuran berkas terlalu besar (maksimal ~20 MB).' });
        return;
      }

      const subjectName =
        typeof body.subjectName === 'string' && body.subjectName.trim()
          ? body.subjectName.trim().slice(0, 120)
          : 'Mata Pelajaran SMK';

      const essayRubrics = Array.isArray(body.essayRubrics) ? body.essayRubrics : [];
      const rubricSummary = essayRubrics
        .map(
          (r) =>
            `Esai #${Number(r.number)} (Skor Maks: ${Number(r.maxScore)}): Topik="${String(r.prompt || '').slice(0, 200)}", Rubrik="${String(r.criteria || '').slice(0, 400)}"`
        )
        .join('\n');

      const ai = getAiClient();

      const instruction = [
        `Anda adalah sistem pembaca dan korektor lembar jawaban ujian asesmen SMK untuk mata pelajaran "${subjectName}".`,
        `Lembar jawaban ini memiliki tepat ${pgCount} soal Pilihan Ganda (nomor 1 sampai ${pgCount}, pilihan A/B/C/D/E) dan ${essayCount} soal Esai (nomor 1 sampai ${essayCount}).`,
        `Tugas Anda:`,
        `1. Ekstrak identitas siswa (studentName, studentId/NIS, studentClass) jika tertulis pada lembar. Jika tidak terbaca atau kosong, isi string kosong "".`,
        `2. Baca seluruh jawaban Pilihan Ganda dari nomor 1 hingga ${pgCount}. Untuk setiap nomor:`,
        `   - Isi "answer" dengan salah satu huruf kapital: "A", "B", "C", "D", "E", atau "" jika kosong/tidak terjawab, atau "GANDA" jika siswa menyilang/menghitamkan lebih dari satu tanpa coretan pembatalan yang jelas.`,
        `   - Isi "confidence" dengan "high" (tanda sangat jelas), "medium" (agak samar/miring), atau "low" (ada coretan, tip-ex, tanda ganda, atau sulit dibaca sehingga WAJIB dicek ulang oleh guru).`,
        `   - Isi "note" singkat dalam Bahasa Indonesia jika ada coretan atau keraguan (kosongkan "" jika jelas).`,
        `3. Baca dan transkripsikan jawaban Esai nomor 1 hingga ${essayCount}. Bandingkan dengan rubrik berikut dan berikan saran skor awal (suggestedScore dari 0 sampai maxScore) beserta alasan singkat (rationale) dalam Bahasa Indonesia:`,
        rubricSummary || 'Gunakan penilaian objektif sesuai kelengkapan konsep jawaban siswa.',
        `4. Pastikan array mcAnswers berisi tepat ${pgCount} item berurutan (number 1..${pgCount}) dan essayAnswers berisi tepat ${essayCount} item berurutan (number 1..${essayCount}).`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: instruction,
            },
          ],
        },
        config: {
          systemInstruction:
            'Anda adalah asisten koreksi asesmen guru SMK yang teliti dan jujur. Jangan mengarang jawaban jika lembar buram atau kosong—tandai confidence="low" agar guru dapat memverifikasi secara manual.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              studentName: {
                type: Type.STRING,
                description: 'Nama lengkap siswa yang terbaca dari lembar jawaban.',
              },
              studentId: {
                type: Type.STRING,
                description: 'NIS / NISN / Nomor peserta ujian siswa.',
              },
              studentClass: {
                type: Type.STRING,
                description: 'Kelas atau rombongan belajar siswa, misal XI TKJ 1.',
              },
              sheetConditionNote: {
                type: Type.STRING,
                description:
                  'Ringkasan singkat kondisi lembar scan (misal: jelas, miring, ada coretan pada beberapa nomor PG).',
              },
              mcAnswers: {
                type: Type.ARRAY,
                description: `Daftar jawaban pilihan ganda berurutan 1 sampai ${pgCount}.`,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.INTEGER },
                    answer: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    note: { type: Type.STRING },
                  },
                  required: ['number', 'answer', 'confidence', 'note'],
                },
              },
              essayAnswers: {
                type: Type.ARRAY,
                description: `Daftar jawaban esai berurutan 1 sampai ${essayCount}.`,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.INTEGER },
                    transcribedAnswer: { type: Type.STRING },
                    suggestedScore: { type: Type.NUMBER },
                    maxScore: { type: Type.NUMBER },
                    rationale: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                  },
                  required: [
                    'number',
                    'transcribedAnswer',
                    'suggestedScore',
                    'maxScore',
                    'rationale',
                    'confidence',
                  ],
                },
              },
            },
            required: [
              'studentName',
              'studentId',
              'studentClass',
              'sheetConditionNote',
              'mcAnswers',
              'essayAnswers',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Model AI tidak mengembalikan data pembacaan.' });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({ result: parsed });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses lembar.';
      if (message === 'GEMINI_API_KEY_MISSING') {
        res.status(500).json({
          error:
            'Kunci API Gemini (GEMINI_API_KEY) belum dipasang di pengaturan server / Environment Variables.',
        });
        return;
      }
      console.error('Error /api/grade-sheet:', err);
      res.status(500).json({
        error: `Gagal membaca lembar jawaban: ${message}`,
      });
    }
  });

  const distDir = path.resolve(__dirname, 'dist');
  const hasDistBuild = fs.existsSync(path.join(distDir, 'index.html'));
  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(
      process.env.RENDER ||
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_PUBLIC_DOMAIN
    ) ||
    (process.env.npm_lifecycle_event === 'start' && hasDistBuild);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server AsesmenSMK berjalan di http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Gagal memulai server:', err);
  process.exit(1);
});
