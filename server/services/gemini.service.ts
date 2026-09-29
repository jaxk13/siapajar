// Pre-existing Direct Gemini generation, moved from server.ts without behavior changes.
// Direct AI is NOT an MVP dependency (ADR-001, API.md §7); keep this isolated from core modules.
import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";

export interface GenerateQuestionsInput {
  jenjang?: string;
  kelas?: string;
  mapel?: string;
  materi?: string;
  bukuSibi?: string;
  typeCounts?: Record<string, number>;
  difficulty?: string;
  levels?: string[];
  catatan?: string;
}

let aiClient: GoogleGenAI | null = null;

function createClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getDefaultClient(): GoogleGenAI | null {
  if (!env.geminiApiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = createClient(env.geminiApiKey);
  }
  return aiClient;
}

export function hasGeminiKey(): boolean {
  return Boolean(env.geminiApiKey);
}

function buildPrompt(input: GenerateQuestionsInput): string {
  const {
    jenjang = "SMP/MTs",
    kelas = "8",
    mapel = "Umum",
    materi = "",
    bukuSibi = "",
    typeCounts = { PG: 5, PGK: 0, Uraian: 2, BS: 0, Menjodohkan: 0 },
    difficulty = "Campuran",
    levels = ["C2", "C3", "C4"],
    catatan = "",
  } = input;

  const typeListStr = Object.entries(typeCounts)
    .filter(([, count]) => Number(count) > 0)
    .map(([type, count]) => `${count} butir soal ${type}`)
    .join(", ");

  const totalSoal = Object.values(typeCounts).reduce((acc: number, cur) => acc + (Number(cur) || 0), 0) || 5;

  return `Anda adalah pakar penyusun naskah soal ujian nasional dan kurikulum merdeka Indonesia yang teliti, mendidik, dan berstandar HOTS (Higher Order Thinking Skills).

TUGAS:
Buatkan naskah soal ujian yang berkualitas tinggi dengan spesifikasi berikut:
- Jenjang: ${jenjang}
- Kelas: Kelas ${kelas}
- Mata Pelajaran: ${mapel}
- Tingkat Kesulitan: ${difficulty || levels.join(", ") || "Sedang"}
- Komposisi Soal: ${typeListStr || `${totalSoal} butir soal PG`}
- Cakupan Materi / Indikator:
${materi || "Materi standar mata pelajaran ini yang sesuai dengan jenjang dan kelas tersebut."}
${bukuSibi && String(bukuSibi).trim() ? `- Referensi Utama: Gunakan konteks, gaya bahasa, dan sudut pandang dari buku '${String(bukuSibi).trim()}' agar soal sesuai dengan kurikulum nasional.` : ""}
${catatan ? `- Catatan Tambahan: ${catatan}` : ""}

ATURAN STRUKTUR OUTPUT:
Balas HANYA dengan tabel data pipe-delimited (|) yang bersih TANPA kalimat pengantar dan TANPA penutup.
Baris pertama WAJIB berupa header tepat seperti ini:
tipe|soal|a|b|c|d|e|kunci|level|gambar

Format kolom per baris:
1. tipe: salah satu dari "PG", "PGK", "Uraian", "BS", "Menjodohkan"
2. soal: teks butir pertanyaan/stimulus (jangan masukkan nomor soal ke dalam teks soal, gunakan kalimat efektif bahasa Indonesia)
3. a: opsi A (jika tipe Uraian/BS, beri tanda -)
4. b: opsi B (jika tipe Uraian/BS, beri tanda -)
5. c: opsi C (jika tipe Uraian/BS, beri tanda -)
6. d: opsi D (jika tipe Uraian/BS atau SD hanya A-C, beri tanda -)
7. e: opsi E (jika jenjang SMP/SD atau Uraian, beri tanda -)
8. kunci: Kunci jawaban (misal: "A" atau "B,C" untuk PGK atau "Benar" untuk BS atau poin kata kunci untuk Uraian)
9. level: tingkat kesulitan atau level soal (misal Mudah, Sedang, Sulit, atau C1-C6)
10. gambar: "-" jika tidak butuh gambar, atau deskripsi singkat ilustrasi jika perlu stimulus visual, misal: "[Ilustrasi diagram siklus air]"

Pastikan semua baris soal valid dan berisi 10 kolom yang dipisahkan oleh karakter pipa (|).`;
}

/**
 * Returns the raw AI text, or null when no server key is configured.
 * Throws on generation failure.
 */
export async function generateQuestions(
  input: GenerateQuestionsInput,
  customKey?: string
): Promise<string | null> {
  const ai = getDefaultClient();
  if (!ai) {
    return null;
  }

  const prompt = buildPrompt(input);
  const client = customKey ? createClient(customKey) : ai;

  let text = "";
  const modelsToTry = ["gemini-3.6-flash", "gemini-3.8-flash"];
  let lastErr: unknown = null;

  for (const m of modelsToTry) {
    try {
      const response = await client.models.generateContent({
        model: m,
        contents: prompt,
        config: {
          systemInstruction:
            "Anda adalah asisten pembuatan instrumen asesmen dan soal evaluasi pembelajaran sekolah di Indonesia. Berikan output berupa tabel teks pipe-delimited (|) yang presisi, bebas kesalahan ejaan, dan sesuai kaidah pedagogik.",
          temperature: 0.7,
        },
      });
      text = response.text || "";
      if (text.trim()) break;
    } catch (mErr) {
      lastErr = mErr;
    }
  }

  if (!text.trim()) {
    throw lastErr || new Error("Tidak menerima respons dari model AI.");
  }

  return text;
}
