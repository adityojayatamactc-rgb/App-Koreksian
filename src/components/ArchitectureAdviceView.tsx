import React from 'react';

interface AdviceSection {
  index: string;
  title: string;
  summary: string;
  points: { label: string; detail: string }[];
}

const ADVICE_SECTIONS: AdviceSection[] = [
  {
    index: '01.',
    title: 'Arsitektur Pembacaan Lembar Kerja (Hybrid OMR + Multimodal Vision AI)',
    summary:
      'Untuk membaca file JPG maupun PDF multi-halaman secara akurat tanpa bergantung pada scanner LJK khusus sekolah, gunakan pendekatan dua lapis.',
    points: [
      {
        label: 'Lapis 1 — Pra-Pemrosesan & Normalisasi PDF/JPG',
        detail:
          'Konversi PDF menjadi gambar per halaman (atau kirim langsung sebagai application/pdf ke model multimodal), lakukan auto-deskew (pelurusan kemiringan) dan deteksi 4 kotak penanda sudut (fiducial marker) jika memakai template cetak sekolah.',
      },
      {
        label: 'Lapis 2 — Ekstraksi Terstruktur (Structured JSON Output)',
        detail:
          'Gunakan Multimodal Vision LLM (seperti Gemini dengan responseSchema ketat) agar dalam satu proses sistem dapat mengekstrak identitas siswa (Nama/NIS/Kelas), 40 atau 45 jawaban PG beserta confidence score, sekaligus transkripsi tulisan tangan 5 soal esai.',
      },
      {
        label: 'Penanganan Coretan & Jawaban Ganda',
        detail:
          'Jangan memaksa AI menebak jika ada dua silangan atau coretan tip-ex. Tandai otomatis dengan status "low confidence" atau "GANDA" sehingga langsung muncul di filter "Perlu Cek" guru.',
      },
    ],
  },
  {
    index: '02.',
    title: 'Desain Template Lembar Jawaban Standar SMK (Kunci Akurasi >98%)',
    summary:
      'Akurasi pembacaan paling efektif ditingkatkan dari desain kertas lembar jawaban yang diseragamkan di 8 mapel.',
    points: [
      {
        label: 'Dua Varian Template (40+5 dan 45+5)',
        detail:
          'Sediakan 2 template resmi: Template A (7 Mapel Umum/Dasar: 40 PG A-E + 5 Kotak Esai) dan Template B (1 Mapel Konsentrasi Keahlian: 45 PG A-E + 5 Kotak Esai).',
      },
      {
        label: 'QR Code Identitas Paket & Mapel',
        detail:
          'Sematkan QR Code kecil di pojok kanan atas yang berisi kode mapel (mis. KJR-XII) dan paket soal (A/B). Saat di-scan massal, sistem otomatis mengarahkan lembar ke kunci jawaban yang tepat tanpa guru memilih manual satu per satu.',
      },
      {
        label: 'Kotak Esai Bernomor Tegas',
        detail:
          'Berikan garis batas kotak yang jelas untuk Esai No. 1 sampai No. 5 agar AI tidak mencampuradukkan jawaban nomor 2 ke nomor 3 saat tulisan siswa panjang.',
      },
    ],
  },
  {
    index: '03.',
    title: 'Alur Verifikasi & Edit Guru (Human-in-the-Loop)',
    summary:
      'Guru pembuat soal tetap memegang otoritas penuh atas nilai akhir. AI berperan sebagai asisten percepatan, bukan penentu mutlak.',
    points: [
      {
        label: 'Antarmuka Split-Screen (Kiri Scan, Kanan Editor)',
        detail:
          'Guru wajib melihat gambar asli/PDF di sebelah kiri sambil mengklik koreksi di sebelah kanan, sehingga tidak perlu bolak-balik membuka file terpisah.',
      },
      {
        label: 'Audit Trail (aiSuggested vs teacherEdited)',
        detail:
          'Simpan dua nilai di database: nilai/jawaban asli terbaca AI dan nilai hasil edit guru beserta catatan alasannya. Ini menjaga transparansi jika suatu saat ada sanggahan nilai dari siswa atau orang tua.',
      },
      {
        label: 'Rubrik Esai Berbobot sebagai Saran Awal',
        detail:
          'AI memberi skor awal 0–maksimal berdasarkan rubrik guru + alasan singkat (rationale), lalu guru tinggal menggeser -1/+1 atau mengetik skor final sesuai kebijakan guru.',
      },
    ],
  },
  {
    index: '04.',
    title: 'Formula Penilaian Dinamis (7 Mapel 40+5 & 1 Mapel 45+5)',
    summary:
      'Karena jumlah PG berbeda antara 7 mapel (40 soal) dan 1 mapel kejuruan (45 soal), pisahkan normalisasi skor PG dan Esai sebelum pembobotan.',
    points: [
      {
        label: 'Normalisasi PG ke Skala 0–100',
        detail:
          'Nilai PG = (Jumlah Benar / Total PG) × 100. Jadi pada 40 PG tiap 1 soal bernilai 2,5 poin; sedangkan pada 45 PG tiap 1 soal bernilai 2,22 poin secara otomatis.',
      },
      {
        label: 'Normalisasi Esai ke Skala 0–100',
        detail:
          'Nilai Esai = (Total Skor Mentah 5 Esai / Total Skor Maks Rubrik) × 100. Guru bebas memberi bobot berbeda antar nomor esai (misal No.1-3 bobot 15, No.4 bobot 25, No.5 studi kasus bobot 30).',
      },
      {
        label: 'Pembobotan Akhir Mapel',
        detail:
          'Nilai Akhir = (Nilai PG × Bobot PG%) + (Nilai Esai × Bobot Esai%), misalnya 70% PG dan 30% Esai, lalu dibandingkan langsung dengan KKM masing-masing mapel.',
      },
    ],
  },
  {
    index: '05.',
    title: 'Rekomendasi Skema Database & Skalabilitas Batch Upload',
    summary:
      'Jika diimplementasikan untuk 1 sekolah SMK (misalnya 300–600 siswa × 8 mapel = ~4.800 lembar), sistem perlu antrean yang rapi.',
    points: [
      {
        label: 'Struktur Tabel Relasional (PostgreSQL / Firestore)',
        detail:
          'Pisahkan tabel subjects (konfigurasi 8 mapel, pg_count 40/45, answer_key JSONB, essay_rubrics JSONB), submissions (file_url di Object Storage, student_id, status), dan submission_items atau JSONB hasil per nomor.',
      },
      {
        label: 'Antrean Batch Upload (Queue Worker)',
        detail:
          'Guru biasanya mengunggah 1 PDF gabungan berisi 36 lembar kelas sekaligus. Pecah PDF per halaman di server, masukkan ke antrean worker (BullMQ / Cloud Tasks) dengan rate-limit aman, dan tampilkan progres per siswa.',
      },
      {
        label: 'Ekspor Leger Nilai Siap E-Rapor / Excel',
        detail:
          'Sediakan ekspor CSV dengan BOM UTF-8 atau XLSX per kelas agar langsung bisa disalin ke format E-Rapor SMK dan arsip kurikulum.',
      },
    ],
  },
];

export const ArchitectureAdviceView: React.FC = () => {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header className="pb-6 border-b border-slate-200">
        <p className="text-xs font-medium text-indigo-700">
          Rekomendasi Teknis &amp; Blueprint Implementasi
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight text-balance">
          Saran Arsitektur Aplikasi Koreksi Ujian Asesmen SMK (JPG/PDF + Edit Guru)
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
          Seluruh alur pada tab <strong>Koreksi Lembar</strong>,{' '}
          <strong>Mapel &amp; Kunci</strong>, dan <strong>Rekap Nilai</strong> di aplikasi ini
          sudah menerapkan arsitektur di bawah ini agar Anda dapat langsung mengujinya dengan
          skenario 7 mapel (40 PG + 5 Esai) dan 1 mapel (45 PG + 5 Esai).
        </p>
      </header>

      <div className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-xl">
        {ADVICE_SECTIONS.map((section) => (
          <section key={section.index} className="p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900">
              <span className="font-mono text-indigo-700 mr-2">{section.index}</span>
              {section.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
              {section.summary}
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              {section.points.map((pt) => (
                <div
                  key={pt.label}
                  className="p-4 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1.5"
                >
                  <h3 className="text-sm font-semibold text-slate-900">{pt.label}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {pt.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
