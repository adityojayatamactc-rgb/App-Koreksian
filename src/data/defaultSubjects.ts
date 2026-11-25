import { McOption, StudentSubmission, SubjectConfig } from '../types/assessment';

function buildKey(pattern: string, length: 40 | 45): McOption[] {
  const valid = new Set<McOption>(['A', 'B', 'C', 'D', 'E']);
  const arr: McOption[] = [];
  for (let i = 0; i < length; i++) {
    const ch = pattern[i % pattern.length].toUpperCase() as McOption;
    arr.push(valid.has(ch) ? ch : 'A');
  }
  return arr;
}

function defaultRubrics(topics: string[]) {
  return topics.map((topic, idx) => ({
    number: idx + 1,
    prompt: topic,
    criteria:
      'Skor penuh jika konsep tepat, langkah sistematis/perhitungan benar, dan istilah teknis sesuai standar.',
    maxScore: 20,
  }));
}

export const INITIAL_SUBJECTS: SubjectConfig[] = [
  // 7 Mapel dengan format 40 PG + 5 Esai
  {
    id: 'mapel-matematika',
    code: 'MTK-XI',
    name: 'Matematika Terapan',
    gradeLevel: 'Kelas XI Semua Jurusan',
    pgCount: 40,
    essayCount: 5,
    pgWeight: 70,
    essayWeight: 30,
    kkm: 75,
    answerKey: buildKey('ABCDEBCDAECABDEDCBA', 40),
    essayRubrics: defaultRubrics([
      'Persamaan matriks & transformasi geometri pada desain teknik',
      'Barisan dan deret aritmetika dalam perhitungan produksi',
      'Trigonometri sudut elevasi untuk pengukuran lapangan',
      'Peluang kejadian majemuk dalam kontrol kualitas (QC)',
      'Statistika simpangan baku data pengujian komponen',
    ]),
  },
  {
    id: 'mapel-bindo',
    code: 'BIN-XI',
    name: 'Bahasa Indonesia',
    gradeLevel: 'Kelas XI Semua Jurusan',
    pgCount: 40,
    essayCount: 5,
    pgWeight: 70,
    essayWeight: 30,
    kkm: 75,
    answerKey: buildKey('BCADEEABCDBCADEACBD', 40),
    essayRubrics: defaultRubrics([
      'Struktur dan kaidah kebahasaan teks prosedur kerja bengkel',
      'Penyusunan proposal kegiatan usaha/proyek kejuruan',
      'Analisis kelengkapan surat lamaran pekerjaan & CV',
      'Menentukan kalimat efektif pada laporan hasil observasi',
      'Merumuskan kesimpulan paragraf eksposisi teknis',
    ]),
  },
  {
    id: 'mapel-bing',
    code: 'BIG-XI',
    name: 'Bahasa Inggris',
    gradeLevel: 'Kelas XI Semua Jurusan',
    pgCount: 40,
    essayCount: 5,
    pgWeight: 70,
    essayWeight: 30,
    kkm: 75,
    answerKey: buildKey('CDBAEADCBECBDAECABD', 40),
    essayRubrics: defaultRubrics([
      'Reading comprehension: Standard Operating Procedure manual',
      'Writing a formal business/internship inquiry email',
      'Using passive voice for technical process descriptions',
      'Conditional sentences in troubleshooting scenarios',
      'Summarizing workplace safety guidelines in English',
    ]),
  },
  {
    id: 'mapel-informatika',
    code: 'INF-X',
    name: 'Informatika & Jaringan Dasar',
    gradeLevel: 'Kelas X Teknik Komputer',
    pgCount: 40,
    essayCount: 5,
    pgWeight: 70,
    essayWeight: 30,
    kkm: 75,
    answerKey: buildKey('EADBCBCAEDDABCEBCAD', 40),
    essayRubrics: defaultRubrics([
      'Konversi bilangan biner, desimal, dan heksadesimal IPv4',
      'Topologi jaringan lokal & fungsi perangkat switch/router',
      'Alur logika pseudocode / flowchart percabangan bersarang',
      'Keamanan data dasar & mitigasi phishing di lingkungan kerja',
      'Analisis fungsi formula spreadsheet untuk rekapitulasi data',
    ]),
  },
  {
    id: 'mapel-pancasila',
    code: 'PPK-XI',
    name: 'Pendidikan Pancasila',
    gradeLevel: 'Kelas XI Semua Jurusan',
    pgCount: 40,
    essayCount: 5,
    pgWeight: 70,
    essayWeight: 30,
    kkm: 75,
    answerKey: buildKey('ACBDEBDACEABECDDCBA', 40),
    essayRubrics: defaultRubrics([
      'Implementasi nilai gotong royong dalam proyek kolaboratif',
      'Hak dan kewajiban warga negara berdasarkan UUD NRI 1945',
      'Etika digital dan toleransi di tengah keberagaman budaya',
      'Peran lembaga negara dalam sistem demokrasi konstitusional',
      'Penyelesaian konflik secara musyawarah di lingkungan sekolah',
    ]),
  },
  {
    id: 'mapel-ipas',
    code: 'IPA-X',
    name: 'Projek IPAS',
    gradeLevel: 'Kelas X Semua Jurusan',
    pgCount: 40,
    essayCount: 5,
    pgWeight: 70,
    essayWeight: 30,
    kkm: 75,
    answerKey: buildKey('DEABCABDCEECBADABCE', 40),
    essayRubrics: defaultRubrics([
      'Perubahan energi dan hukum kekekalan energi pada mesin',
      'Pemisahan campuran dan sifat fisika-kimia bahan industri',
      'Interaksi komponen ekosistem & pengolahan limbah bengkel',
      'Dinamika sosial ekonomi dalam masyarakat industri lokal',
      'Perhitungan besaran listrik dasar (tegangan, arus, hambatan)',
    ]),
  },
  {
    id: 'mapel-pkk',
    code: 'PKK-XI',
    name: 'Produk Kreatif & Kewirausahaan',
    gradeLevel: 'Kelas XI Semua Jurusan',
    pgCount: 40,
    essayCount: 5,
    pgWeight: 70,
    essayWeight: 30,
    kkm: 75,
    answerKey: buildKey('BAECDCABDEABCDEACBD', 40),
    essayRubrics: defaultRubrics([
      'Analisis peluang usaha menggunakan metode SWOT',
      'Perhitungan Harga Pokok Produksi (HPP) & Break Even Point',
      'Tahapan pembuatan prototipe produk/jasa dan pengujian mutu',
      'Strategi pemasaran digital & desain kemasan ergonomis',
      'Dokumen legalitas usaha mikro dan hak kekayaan intelektual',
    ]),
  },
  // 1 Mapel dengan format 45 PG + 5 Esai
  {
    id: 'mapel-kejuruan',
    code: 'KJR-XII',
    name: 'Konsentrasi Keahlian (Produktif)',
    gradeLevel: 'Kelas XII Kejuruan',
    pgCount: 45,
    essayCount: 5,
    pgWeight: 70,
    essayWeight: 30,
    kkm: 78,
    answerKey: buildKey('ABCDECEABDCBDAEECABD', 45),
    essayRubrics: defaultRubrics([
      'Prosedur diagnosis kerusakan sistem utama sesuai manual servis',
      'Penerapan standar K3LH dan kalibrasi alat ukur presisi',
      'Perencanaan kebutuhan material & estimasi waktu pengerjaan proyek',
      'Analisis diagram rangkaian/arsitektur sistem produksi',
      'Evaluasi pengujian akhir (quality assurance) sebelum serah terima',
    ]),
  },
];

export function buildSeedSubmissions(subjects: SubjectConfig[]): StudentSubmission[] {
  const mtk = subjects[0];
  const kejuruan = subjects[7];

  const makeMc = (sub: SubjectConfig, wrongIndices: number[], lowIndices: number[]) =>
    Array.from({ length: sub.pgCount }, (_, idx) => {
      const key = sub.answerKey[idx];
      const wrongOpts: McOption[] = (['A', 'B', 'C', 'D', 'E'] as McOption[]).filter(
        (o) => o !== key
      );
      const isWrong = wrongIndices.includes(idx + 1);
      const isLow = lowIndices.includes(idx + 1);
      const ans: McOption = isWrong ? wrongOpts[idx % wrongOpts.length] : key;
      return {
        number: idx + 1,
        aiAnswer: ans,
        editedAnswer: ans,
        confidence: isLow ? ('low' as const) : ('high' as const),
        note: isLow ? 'Terdeteksi coretan / silang tipis, mohon cek visual guru.' : '',
        overriddenByTeacher: false,
      };
    });

  return [
    {
      id: 'sub-demo-1',
      subjectId: mtk.id,
      fileName: 'lembar-mtk-raka-pratama.jpg',
      mimeType: 'image/jpeg',
      fileDataUrl: '',
      uploadedAt: '2026-11-22T09:15:00.000Z',
      studentName: 'Raka Pratama Wijaya',
      studentId: '20240118',
      studentClass: 'XI TKJ 2',
      sheetConditionNote: 'Scan cukup jelas, terdapat 2 nomor PG dengan coretan pembatalan.',
      status: 'needs_review',
      mcAnswers: makeMc(mtk, [4, 12, 19, 27, 33, 38], [12, 27]),
      essayAnswers: [
        {
          number: 1,
          transcribedAnswer:
            'Matriks rotasi 90 derajat [[0,-1],[1,0]] dikalikan titik (4,2) menghasilkan (-2,4).',
          aiSuggestedScore: 18,
          teacherScore: 18,
          maxScore: 20,
          rationale: 'Rumus dan hasil akhir benar, hanya kurang keterangan satuan koordinat.',
          teacherNote: '',
          confidence: 'high',
          overriddenByTeacher: false,
        },
        {
          number: 2,
          transcribedAnswer:
            'U1 = 120, b = 15. Jumlah produksi 6 bulan pertama S6 = 3 * (240 + 75) = 945 unit.',
          aiSuggestedScore: 20,
          teacherScore: 20,
          maxScore: 20,
          rationale: 'Langkah perhitungan deret aritmetika lengkap dan akurat.',
          teacherNote: '',
          confidence: 'high',
          overriddenByTeacher: false,
        },
        {
          number: 3,
          transcribedAnswer:
            'tan 30 = tinggi / 12 -> tinggi = 12 * 0,577 = 6,92 meter (belum ditambah tinggi pengamat).',
          aiSuggestedScore: 14,
          teacherScore: 14,
          maxScore: 20,
          rationale: 'Perhitungan trigonometri tepat, tetapi lupa menambahkan tinggi mata pengamat 1,6 m.',
          teacherNote: '',
          confidence: 'medium',
          overriddenByTeacher: false,
        },
        {
          number: 4,
          transcribedAnswer:
            'Peluang cacat 2 dari 50 komponen = 2/50 = 0,04 atau 4%.',
          aiSuggestedScore: 16,
          teacherScore: 16,
          maxScore: 20,
          rationale: 'Konsep peluang dasar tepat; penjelasan kejadian majemuk masih singkat.',
          teacherNote: '',
          confidence: 'high',
          overriddenByTeacher: false,
        },
        {
          number: 5,
          transcribedAnswer:
            'Rata-rata = 10,2 mm. Varians dihitung dari selisih kuadrat dibagi n, akar = 0,42.',
          aiSuggestedScore: 13,
          teacherScore: 13,
          maxScore: 20,
          rationale: 'Tulisan pada bagian tabel deviasi agak pudar, mohon guru verifikasi nilai akhir.',
          teacherNote: '',
          confidence: 'low',
          overriddenByTeacher: false,
        },
      ],
    },
    {
      id: 'sub-demo-2',
      subjectId: kejuruan.id,
      fileName: 'lembar-kjr-nadia-kusuma.jpg',
      mimeType: 'image/jpeg',
      fileDataUrl: '',
      uploadedAt: '2026-11-22T09:42:00.000Z',
      studentName: 'Nadia Kusuma Wardani',
      studentId: '20230409',
      studentClass: 'XII RPL 1',
      sheetConditionNote: 'Lembar terbaca sangat jelas (45 PG + 5 Esai).',
      status: 'verified',
      verifiedBy: 'Guru Pengampu',
      verifiedAt: '2026-11-22T10:05:00.000Z',
      mcAnswers: makeMc(kejuruan, [8, 22, 41], []),
      essayAnswers: [
        {
          number: 1,
          transcribedAnswer:
            'Identifikasi gejala melalui log error sistem, isolasi modul terdampak, lalu uji regresi.',
          aiSuggestedScore: 19,
          teacherScore: 19,
          maxScore: 20,
          rationale: 'Urutan diagnosis sesuai SOP pemeliharaan.',
          teacherNote: 'Jawaban runtut.',
          confidence: 'high',
          overriddenByTeacher: false,
        },
        {
          number: 2,
          transcribedAnswer:
            'Menggunakan gelang anti-statis, memastikan grounding meja kerja, dan kalibrasi multimeter sebelum ukur.',
          aiSuggestedScore: 20,
          teacherScore: 20,
          maxScore: 20,
          rationale: 'Menyebutkan 3 poin K3LH dan prosedur kalibrasi dengan benar.',
          teacherNote: '',
          confidence: 'high',
          overriddenByTeacher: false,
        },
        {
          number: 3,
          transcribedAnswer:
            'BOM disusun berdasarkan komponen utama, cadangan 10%, dan estimasi 12 jam kerja teknisi.',
          aiSuggestedScore: 17,
          teacherScore: 18,
          maxScore: 20,
          rationale: 'Estimasi material dan waktu sudah realistis.',
          teacherNote: 'Ditambah +1 poin oleh guru karena menyebutkan buffer cadangan 10%.',
          confidence: 'high',
          overriddenByTeacher: true,
        },
        {
          number: 4,
          transcribedAnswer:
            'Diagram memisahkan lapisan antarmuka, layanan logika, dan basis data agar mudah di-scale.',
          aiSuggestedScore: 18,
          teacherScore: 18,
          maxScore: 20,
          rationale: 'Pemahaman arsitektur berlapis sudah tepat.',
          teacherNote: '',
          confidence: 'high',
          overriddenByTeacher: false,
        },
        {
          number: 5,
          transcribedAnswer:
            'Uji fungsional, uji beban, verifikasi dokumen serah terima UAT bersama klien.',
          aiSuggestedScore: 19,
          teacherScore: 19,
          maxScore: 20,
          rationale: 'Lengkap hingga dokumen serah terima.',
          teacherNote: '',
          confidence: 'high',
          overriddenByTeacher: false,
        },
      ],
    },
  ];
}
