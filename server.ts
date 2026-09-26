import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Siapajar.id Backend" });
  });

  // Check Gemini Status
  app.get("/api/gemini/status", (_req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    res.json({ hasKey });
  });

  // Direct AI Generation
  app.post("/api/gemini/generate-questions", async (req, res) => {
    try {
      const ai = getAi();
      if (!ai) {
        return res.status(503).json({
          error: "GEMINI_API_KEY belum dikonfigurasi di lingkungan aplikasi.",
        });
      }

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
      } = req.body;

      const typeListStr = Object.entries(typeCounts)
        .filter(([, count]) => Number(count) > 0)
        .map(([type, count]) => `${count} butir soal ${type}`)
        .join(", ");

      const totalSoal = Object.values(typeCounts).reduce((acc: number, cur) => acc + (Number(cur) || 0), 0) || 5;

      const prompt = `Anda adalah pakar penyusun naskah soal ujian nasional dan kurikulum merdeka Indonesia yang teliti, mendidik, dan berstandar HOTS (Higher Order Thinking Skills).

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

      // Support custom key from header or default env key
      const customKey = req.headers["x-gemini-api-key"] as string;
      const client = customKey
        ? new GoogleGenAI({
            apiKey: customKey,
            httpOptions: { headers: { "User-Agent": "aistudio-build" } },
          })
        : ai;

      let text = "";
      const modelsToTry = ["gemini-3.6-flash", "gemini-3.8-flash"];
      let lastErr: any = null;

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
        } catch (mErr: any) {
          lastErr = mErr;
        }
      }

      if (!text.trim()) {
        throw lastErr || new Error("Tidak menerima respons dari model AI.");
      }

      return res.json({
        rawText: text,
      });
    } catch (err: any) {
      console.error("Gemini Generation Error:", err);
      return res.status(500).json({
        error: err.message || "Gagal memproses pembuatan soal dengan AI.",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
