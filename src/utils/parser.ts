import { QuestionItem, QuestionType } from "../types";

export interface ParseResult {
  questions: QuestionItem[];
  warnings: string[];
  totalRawLines: number;
}

export function parseAITable(rawText: string): ParseResult {
  const warnings: string[] = [];
  const questions: QuestionItem[] = [];

  if (!rawText || !rawText.trim()) {
    return { questions, warnings: ["Teks masih kosong. Silakan tempelkan tabel soal dari AI."], totalRawLines: 0 };
  }

  // Strip code fences like ```markdown or ```
  let cleanText = rawText
    .replace(/^```[a-z0-9_-]*\n/gim, "")
    .replace(/\n```$/gim, "")
    .replace(/```/g, "");

  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const totalRawLines = lines.length;

  let headerIndex = -1;
  let headerParts: string[] = [];

  // Look for header row containing 'tipe' and 'soal'
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split by pipe
    const parts = rawLine
      .split("|")
      .map(p => p.trim())
      .filter((p, idx, arr) => {
        // filter out leading/trailing empty parts from markdown table | col1 | col2 |
        if ((idx === 0 || idx === arr.length - 1) && p === "") return false;
        return true;
      });

    const joined = parts.join(" ").toLowerCase();
    if (joined.includes("tipe") && (joined.includes("soal") || joined.includes("pertanyaan"))) {
      headerIndex = i;
      headerParts = parts.map(p => p.toLowerCase());
      break;
    }
  }

  // If no header found, assume standard 10-column layout
  const startIdx = headerIndex >= 0 ? headerIndex + 1 : 0;

  let currentNo = 1;

  for (let i = startIdx; i < lines.length; i++) {
    const rawLine = lines[i];

    // Skip markdown divider line like |---|---|
    if (/^\|?(\s*[-:]+[-|\s:]*)\|?$/.test(rawLine)) {
      continue;
    }

    const parts = rawLine
      .split("|")
      .map(p => p.trim())
      .filter((p, idx, arr) => {
        if ((idx === 0 || idx === arr.length - 1) && p === "") return false;
        return true;
      });

    // If row doesn't have enough columns, skip or record warning
    if (parts.length < 3) {
      // Ignore random non-table chatter lines
      if (rawLine.startsWith("Berikut") || rawLine.startsWith("Semoga") || rawLine.startsWith("Catatan")) {
        continue;
      }
      warnings.push(`Baris ${i + 1} diabaikan karena format tidak sesuai tabel (${parts.length} kolom).`);
      continue;
    }

    // Determine values
    let rawType = (parts[0] || "PG").trim();
    let normalizedType: QuestionType = "PG";
    const lowerType = rawType.toLowerCase();
    if (lowerType.includes("pgk") || lowerType.includes("kompleks")) {
      normalizedType = "PGK";
    } else if (lowerType.includes("uraian") || lowerType.includes("esai") || lowerType.includes("essay")) {
      normalizedType = "Uraian";
    } else if (lowerType.includes("bs") || lowerType.includes("benar") || lowerType.includes("salah")) {
      normalizedType = "BS";
    } else if (lowerType.includes("jodoh") || lowerType.includes("menjodohkan")) {
      normalizedType = "Menjodohkan";
    } else {
      normalizedType = "PG";
    }

    // Question text - clean leading number if present (e.g. "1. Sebutkan..." -> "Sebutkan...")
    let questionText = parts[1] || "";
    questionText = questionText.replace(/^\d+[\.\)\-]\s*/, "");

    const optA = (parts[2] || "-").trim();
    const optB = (parts[3] || "-").trim();
    const optC = (parts[4] || "-").trim();
    const optD = (parts[5] || "-").trim();
    const optE = (parts[6] || "-").trim();
    const key = (parts[7] || "").trim();
    const level = (parts[8] || "C2").trim();
    const image = (parts[9] || "-").trim();

    questions.push({
      id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7) + "_" + currentNo,
      no: currentNo,
      type: normalizedType,
      question: questionText,
      a: optA === "-" ? "" : optA,
      b: optB === "-" ? "" : optB,
      c: optC === "-" ? "" : optC,
      d: optD === "-" ? "" : optD,
      e: optE === "-" ? "" : optE,
      key: key === "-" ? "" : key,
      level: level === "-" ? "C2" : level,
      image: image !== "-" && image.startsWith("data:image") ? image : undefined,
      imagePrompt: image !== "-" && !image.startsWith("data:image") ? image : undefined,
    });

    currentNo++;
  }

  return { questions, warnings, totalRawLines };
}

export function questionsToTableString(questions: QuestionItem[]): string {
  const header = "tipe|soal|a|b|c|d|e|kunci|level|gambar";
  const rows = questions.map((q) => {
    const a = q.a.trim() || "-";
    const b = q.b.trim() || "-";
    const c = q.c.trim() || "-";
    const d = q.d.trim() || "-";
    const e = q.e.trim() || "-";
    const key = q.key.trim() || "-";
    const lvl = q.level.trim() || "C2";
    const img = q.image ? q.image : q.imagePrompt ? q.imagePrompt : "-";
    return `${q.type}|${q.question}|${a}|${b}|${c}|${d}|${e}|${key}|${lvl}|${img}`;
  });

  return [header, ...rows].join("\n");
}

export const DEMO_TABLE_STRING = `tipe|soal|a|b|c|d|e|kunci|level|gambar
PG|Organ dalam sistem pernapasan manusia yang berfungsi sebagai tempat terjadinya difusi dan pertukaran gas oksigen dengan karbon dioksida adalah...|Trakea|Bronkus|Alveolus|Laring|Faring|C|C1|-
PG|Perhatikan pernyataan berikut! Seorang atlet berlari cepat sejauh 100 meter, lalu detak jantungnya meningkat secara drastis. Faktor utama penyebab peningkatan frekuensi pernapasan saat beraktivitas berat adalah...|Kadar oksigen di udara lingkungan menurun|Kadar karbon dioksida dalam darah meningkat memicu respon batang otak|Volume paru-paru mengecil saat berlari|Kebutuhan air dalam sel otot meningkat tajam|Tekanan atmosfer pada permukaan kulit meningkat|B|C4|-
PG|Enzim ptialin (amilase) yang dihasilkan oleh kelenjar ludah di dalam rongga mulut berperan penting dalam proses pencernaan kimiawi untuk memecah...|Lemak menjadi asam lemak dan gliserol|Protein menjadi pepton dan asam amino|Amilum menjadi maltosa (glukosa sederhana)|Laktosa menjadi glukosa dan galaktosa|Vitamin menjadi mineral larut air|C|C2|-
PGK|Manakah di antara pernyataan berikut yang BENAR mengenai perbedaan pembuluh darah arteri dan vena pada peredaran darah manusia? (Pilih semua yang tepat)|Arteri memiliki dinding tebal, elastis, dan kuat|Vena mengalirkan darah kembali menuju jantung|Semua vena selalu membawa darah kaya akan oksigen murni|Arteri memiliki katup di sepanjang pembuluh untuk mencegah aliran balik darah|Denyut pada pembuluh arteri umumnya dapat dirasakan dengan jelas|A, B, E|C4|-
BS|Fotosintesis pada tumbuhan hijau menghasilkan glukosa dan melepaskan gas oksigen ke udara lingkungan melalui stomata.|-|-|-|-|-|Benar|C2|-
BS|Semua bakteri yang hidup di dalam tubuh manusia bersifat patogen (menyebabkan penyakit berbahaya).|-|-|-|-|-|Salah|C2|-
Uraian|Jelaskan secara runtut tahapan gerak refleks ketika tangan seseorang secara tidak sengaja menyentuh wajan panas, serta sebutkan neuron apa saja yang terlibat!|-|-|-|-|-|Reseptor kulit menerima rangsangan panas -> Impuls diteruskan oleh neuron sensorik ke sumsum tulang belakang -> Interneuron meneruskan impuls ke neuron motorik -> Efektor (otot lengan) berkontraksi menarik tangan secara cepat tanpa melewati kontrol kesadaran otak.|C4|Skema gerak refleks lengan`;
