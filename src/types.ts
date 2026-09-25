export type QuestionType = 'PG' | 'PGK' | 'Uraian' | 'BS' | 'Menjodohkan';

export type BloomLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

export interface QuestionItem {
  id: string;
  no: number;
  type: QuestionType;
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  key: string;
  level: string;
  image?: string; // base64 or URL
  imagePrompt?: string; // text description
}

export interface PromptConfig {
  jenjang: string;
  kelas: string;
  mapel: string;
  materi: string;
  bukuSibi?: string;
  typeCounts: Record<QuestionType, number>;
  levels: BloomLevel[];
  catatan: string;
}

export interface KopData {
  instansi: string;
  dinas: string;
  sekolah: string;
  alamat: string;
  ujian: string;
  tahun: string;
  mapel: string;
  kelas: string;
  tanggal: string;
  waktu: string;
  logoKiri?: string;
  logoKanan?: string;
}

export interface ExportSettings {
  paperSize: 'A4' | 'F4' | 'Letter';
  optionCols: 1 | 2 | 4;
  fontSize: 10 | 11 | 12;
  includeKey: boolean;
  includeLJK: boolean;
  showBloomLevel: boolean;
}
