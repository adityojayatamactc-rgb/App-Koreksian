import { McOption, SubjectConfig } from '../types/assessment';

export interface SampleStudentProfile {
  studentName: string;
  studentId: string;
  studentClass: string;
  targetAccuracy: number; // e.g. 0.85
}

const SAMPLE_PROFILES: SampleStudentProfile[] = [
  {
    studentName: 'Raka Pratama Wijaya',
    studentId: '20240118',
    studentClass: 'XI TKJ 2',
    targetAccuracy: 0.85,
  },
  {
    studentName: 'Siti Nurhaliza Putri',
    studentId: '20240124',
    studentClass: 'XI RPL 1',
    targetAccuracy: 0.92,
  },
  {
    studentName: 'Dimas Arya Saputra',
    studentId: '20240139',
    studentClass: 'XII TKRO 1',
    targetAccuracy: 0.72,
  },
];

const OPTIONS: McOption[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * Generates a realistic scanned JPG image of an SMK student answer sheet
 * (including header metadata, OMR bubble grid for 40 or 45 MC items,
 * and 5 handwritten-style essay answer blocks) so teachers can immediately
 * test real multimodal AI reading & human-in-the-loop editing.
 */
export function generateSampleSheetJpg(
  subject: SubjectConfig,
  profileIndex = 0
): { dataUrl: string; fileName: string; profile: SampleStudentProfile } {
  const profile = SAMPLE_PROFILES[profileIndex % SAMPLE_PROFILES.length];
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754; // A4 @ 150 DPI proportion
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas tidak tersedia di browser.');
  }

  // Slight off-white paper texture
  ctx.fillStyle = '#fcfbf7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Corner registration fiducial markers (recommended LJK anchor practice)
  ctx.fillStyle = '#0f172a';
  const markerSize = 24;
  ctx.fillRect(36, 36, markerSize, markerSize);
  ctx.fillRect(canvas.width - 36 - markerSize, 36, markerSize, markerSize);
  ctx.fillRect(36, canvas.height - 36 - markerSize, markerSize, markerSize);
  ctx.fillRect(canvas.width - 36 - markerSize, canvas.height - 36 - markerSize, markerSize, markerSize);

  // Outer form frame
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 60, canvas.width - 144, canvas.height - 120);

  // Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('LEMBAR JAWABAN ASESMEN SUMATIF SMK', 100, 108);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(`Mata Pelajaran: ${subject.name} (${subject.pgCount} PG + ${subject.essayCount} Esai)`, 100, 136);

  // Student identity box
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(100, 155, 1040, 96);

  ctx.fillStyle = '#334155';
  ctx.font = '15px sans-serif';
  ctx.fillText('Nama Siswa :', 120, 186);
  ctx.fillText('NIS / No. Peserta :', 120, 226);
  ctx.fillText('Kelas / Jurusan :', 640, 186);
  ctx.fillText('Kode Mapel :', 640, 226);

  // Simulated student handwriting
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'italic 20px serif';
  ctx.fillText(profile.studentName, 240, 188);
  ctx.fillText(profile.studentId, 270, 228);
  ctx.fillText(profile.studentClass, 780, 188);
  ctx.fillText(subject.code, 780, 228);

  // Section 1: Pilihan Ganda
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`BAGIAN I — PILIHAN GANDA (1 s.d. ${subject.pgCount})`, 100, 290);

  const cols = 3;
  const perCol = Math.ceil(subject.pgCount / cols); // 14 for 40, 15 for 45
  const startY = 325;
  const rowH = 38;
  const colW = 345;

  for (let i = 0; i < subject.pgCount; i++) {
    const colIdx = Math.floor(i / perCol);
    const rowIdx = i % perCol;
    const x = 110 + colIdx * colW;
    const y = startY + rowIdx * rowH;

    // Question number
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(String(i + 1).padStart(2, '0') + '.', x, y + 6);

    const keyOpt = subject.answerKey[i] || 'A';
    // Deterministic pseudo-random choice based on question index & profile
    const seed = (i * 17 + profileIndex * 31) % 100;
    const isCorrect = seed < profile.targetAccuracy * 100;
    const chosenOpt = isCorrect
      ? keyOpt
      : OPTIONS[(OPTIONS.indexOf(keyOpt) + 1 + (i % 3)) % OPTIONS.length];

    // Deliberately make #12 look like a crossed-out revision to test low-confidence detection
    const isMessyRevision = i === 11;

    OPTIONS.forEach((opt, optIdx) => {
      const cx = x + 52 + optIdx * 48;
      const cy = y;

      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = '#475569';
      ctx.font = '13px sans-serif';
      ctx.fillText(opt, cx - 4.5, cy + 4.5);

      if (opt === chosenOpt) {
        // Draw dark pen fill
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(23, 37, 84, 0.85)';
        ctx.fill();
      } else if (isMessyRevision && opt === OPTIONS[(OPTIONS.indexOf(chosenOpt) + 1) % 5]) {
        // Crossed-out mistake
        ctx.strokeStyle = '#172554';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy - 10);
        ctx.lineTo(cx + 10, cy + 10);
        ctx.moveTo(cx + 10, cy - 10);
        ctx.lineTo(cx - 10, cy + 10);
        ctx.stroke();
      }
    });
  }

  // Section 2: Esai (5 soal)
  const essayStartY = 935;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`BAGIAN II — JAWABAN ESAI (1 s.d. ${subject.essayCount})`, 100, essayStartY);

  const sampleEssays = [
    'Langkah pertama melakukan identifikasi masalah, menyiapkan alat ukur/komponen sesuai SOP, lalu menguji hasil dengan toleransi standar.',
    'Perbedaan utamanya terletak pada efisiensi daya dan kestabilan output saat beban puncak berlangsung di bengkel atau sistem jaringan.',
    'Diketahui nilai awal sesuai soal, substitusi ke rumus efisiensi sehingga diperoleh hasil akhir 85% dengan selisih rugi daya 15%.',
    'Penerapan K3 wajib memakai APD lengkap, memastikan isolasi sumber tegangan, dan mencatat log pemeriksaan berkala.',
    'Analisis biaya produksi: HPP per unit Rp 24.500 dengan margin 25%, harga jual disarankan Rp 30.625 per paket.',
  ];

  for (let e = 0; e < subject.essayCount; e++) {
    const boxY = essayStartY + 25 + e * 140;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(100, boxY, 1040, 122);

    ctx.fillStyle = '#334155';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`No. ${e + 1}`, 115, boxY + 24);

    // Ruled lines
    ctx.strokeStyle = '#e2e8f0';
    for (let l = 1; l <= 3; l++) {
      ctx.beginPath();
      ctx.moveTo(170, boxY + 28 + l * 28);
      ctx.lineTo(1120, boxY + 28 + l * 28);
      ctx.stroke();
    }

    // Handwritten response text wrapped across 2 lines
    const text = sampleEssays[e % sampleEssays.length];
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'italic 18px serif';
    const mid = Math.ceil(text.length / 2);
    const splitIdx = text.indexOf(' ', mid - 10);
    const line1 = splitIdx > 0 ? text.slice(0, splitIdx) : text;
    const line2 = splitIdx > 0 ? text.slice(splitIdx + 1) : '';
    ctx.fillText(line1, 178, boxY + 50);
    if (line2) {
      ctx.fillText(line2, 178, boxY + 78);
    }
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const safeStudent = profile.studentName.toLowerCase().replace(/\s+/g, '-');
  return {
    dataUrl,
    fileName: `lembar-${subject.code.toLowerCase()}-${safeStudent}.jpg`,
    profile,
  };
}
