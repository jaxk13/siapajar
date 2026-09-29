import { QuestionItem, KopData, ExportSettings } from "../../types";

export function generateWordDocument(
  questions: QuestionItem[],
  kop: KopData,
  settings: ExportSettings
): void {
  const title = `Naskah_Soal_${kop.mapel || "Ujian"}_${kop.kelas || "Sekolah"}`.replace(/[\s/\\?%*:|"<>]/g, "_");

  // Separate questions by type
  const pgList = questions.filter(q => q.type === "PG");
  const pgkList = questions.filter(q => q.type === "PGK");
  const bsList = questions.filter(q => q.type === "BS");
  const uraianList = questions.filter(q => q.type === "Uraian");
  const matchList = questions.filter(q => q.type === "Menjodohkan");

  let questionHtml = "";

  const renderOptionGrid = (q: QuestionItem) => {
    const opts = [
      { key: "A", val: q.a },
      { key: "B", val: q.b },
      { key: "C", val: q.c },
      { key: "D", val: q.d },
      { key: "E", val: q.e },
    ].filter(o => o.val && o.val.trim().length > 0);

    if (opts.length === 0) return "";

    if (settings.optionCols === 1) {
      return `
        <table style="width:100%; border:none; margin: 4px 0 8px 18px; font-size:${settings.fontSize}pt;">
          ${opts.map(o => `
            <tr>
              <td style="width:24px; vertical-align:top; font-weight:bold;">${o.key}.</td>
              <td style="vertical-align:top;">${escapeHtml(o.val)}</td>
            </tr>
          `).join("")}
        </table>
      `;
    } else if (settings.optionCols === 2) {
      const rows: typeof opts[] = [];
      for (let i = 0; i < opts.length; i += 2) {
        rows.push(opts.slice(i, i + 2));
      }
      return `
        <table style="width:100%; border:none; margin: 4px 0 8px 18px; font-size:${settings.fontSize}pt;">
          ${rows.map(r => `
            <tr>
              <td style="width:24px; vertical-align:top; font-weight:bold;">${r[0].key}.</td>
              <td style="width:48%; vertical-align:top;">${escapeHtml(r[0].val)}</td>
              ${r[1] ? `
                <td style="width:24px; vertical-align:top; font-weight:bold;">${r[1].key}.</td>
                <td style="width:48%; vertical-align:top;">${escapeHtml(r[1].val)}</td>
              ` : `<td colspan="2"></td>`}
            </tr>
          `).join("")}
        </table>
      `;
    } else {
      // 4 columns horizontal
      return `
        <table style="width:100%; border:none; margin: 4px 0 8px 18px; font-size:${settings.fontSize}pt;">
          <tr>
            ${opts.map(o => `
              <td style="vertical-align:top; padding-right:12px;">
                <b>${o.key}.</b> ${escapeHtml(o.val)}
              </td>
            `).join("")}
          </tr>
        </table>
      `;
    }
  };

  const renderSection = (title: string, items: QuestionItem[], instruction: string) => {
    if (items.length === 0) return "";
    return `
      <div style="margin-top:16px;">
        <h3 style="font-size:${settings.fontSize + 1}pt; font-weight:bold; margin-bottom:4px; text-transform:uppercase;">
          ${title}
        </h3>
        <p style="font-size:${settings.fontSize}pt; font-style:italic; margin-bottom:10px;">
          ${instruction}
        </p>
        <ol style="margin-top:4px; padding-left:22px; font-size:${settings.fontSize}pt;">
          ${items.map(q => `
            <li style="margin-bottom:12px; line-height:1.45; page-break-inside:avoid; break-inside:avoid;">
              <div>
                ${escapeHtml(q.question)}
                ${settings.showBloomLevel ? `<span style="font-size:8.5pt; color:#666; font-family:monospace; margin-left:6px;">[${q.level}]</span>` : ""}
              </div>
              ${q.image ? `<div style="margin:8px 0;"><img src="${q.image}" style="max-height:160px; max-width:100%;" /></div>` : ""}
              ${q.imagePrompt && !q.image ? `<div style="margin:4px 0; font-size:9pt; color:#555; font-style:italic;">[Stimulus visual: ${escapeHtml(q.imagePrompt)}]</div>` : ""}
              ${renderOptionGrid(q)}
            </li>
          `).join("")}
        </ol>
      </div>
    `;
  };

  questionHtml += renderSection("BAGIAN I: PILIHAN GANDA", pgList, "Pilihlah salah satu jawaban yang paling tepat dengan memberi tanda silang (X) pada huruf A, B, C, D, atau E di lembar jawaban!");
  questionHtml += renderSection("BAGIAN II: PILIHAN GANDA KOMPLEKS", pgkList, "Pilihlah semua pernyataan yang benar (jawaban benar dapat lebih dari satu)!");
  questionHtml += renderSection("BAGIAN III: BENAR / SALAH", bsList, "Tentukan apakah pernyataan berikut Benar (B) atau Salah (S)!");
  questionHtml += renderSection("BAGIAN IV: MENJODOHKAN", matchList, "Pasangkanlah pernyataan di sebelah kiri dengan jawaban yang tepat di sebelah kanan!");
  questionHtml += renderSection("BAGIAN V: URAIAN / ESAI", uraianList, "Jawablah pertanyaan-pertanyaan berikut dengan jelas, sistematis, dan tepat!");

  // Key answers appendix
  let keyHtml = "";
  if (settings.includeKey) {
    keyHtml = `
      <div style="page-break-before:always; margin-top:28px;">
        <h2 style="text-align:center; font-size:14pt; font-weight:bold; margin-bottom:14px; border-bottom:1px solid #000; padding-bottom:6px;">
          KUNCI JAWABAN & KISI-KISI BUTIR SOAL
        </h2>
        <table style="width:100%; border-collapse:collapse; font-size:10pt;" border="1">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:6px; border:1px solid #000; width:40px;">No</th>
              <th style="padding:6px; border:1px solid #000; width:70px;">Bentuk</th>
              <th style="padding:6px; border:1px solid #000; width:60px;">Level</th>
              <th style="padding:6px; border:1px solid #000;">Kunci Jawaban / Rubrik Penilaian</th>
            </tr>
          </thead>
          <tbody>
            ${questions.map((q, idx) => `
              <tr>
                <td style="padding:5px; border:1px solid #000; text-align:center;">${idx + 1}</td>
                <td style="padding:5px; border:1px solid #000; text-align:center;">${q.type}</td>
                <td style="padding:5px; border:1px solid #000; text-align:center;">${q.level}</td>
                <td style="padding:5px; border:1px solid #000; font-weight:${q.type === 'PG' ? 'bold' : 'normal'};">${escapeHtml(q.key || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // Lembar Jawaban Siswa (LJK Sederhana)
  let ljkHtml = "";
  if (settings.includeLJK) {
    ljkHtml = `
      <div style="page-break-before:always; margin-top:28px;">
        <div style="border:2px solid #000; padding:16px;">
          <h3 style="text-align:center; font-size:13pt; font-weight:bold; margin:0 0 10px;">
            LEMBAR JAWABAN SISWA (LJS)
          </h3>
          <table style="width:100%; border:none; font-size:10pt; margin-bottom:14px;">
            <tr>
              <td style="width:120px;">NAMA LENGKAP</td>
              <td style="width:10px;">:</td>
              <td style="border-bottom:1px dotted #000;"></td>
              <td style="width:80px; padding-left:20px;">KELAS</td>
              <td style="width:10px;">:</td>
              <td style="border-bottom:1px dotted #000; width:100px;"></td>
            </tr>
            <tr>
              <td>NOMOR PESERTA</td>
              <td>:</td>
              <td style="border-bottom:1px dotted #000;"></td>
              <td style="padding-left:20px;">TANGGAL</td>
              <td>:</td>
              <td style="border-bottom:1px dotted #000;"></td>
            </tr>
          </table>
          <hr style="border:none; border-top:1px solid #000; margin-bottom:12px;" />
          <p style="font-size:9.5pt; font-weight:bold; margin-bottom:8px;">PILIHAN GANDA (Beri tanda silang X pada huruf yang dipilih):</p>
          <div style="display:flex; flex-wrap:wrap; gap:16px;">
            <table style="border-collapse:collapse; font-size:9pt; width:100%;" border="1">
              ${renderLjkRows(pgList.length)}
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // Assembling complete Word HTML document with MSO styling
  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${escapeHtml(kop.ujian || "Naskah Soal")}</title>
      <style>
        @page {
          size: ${settings.paperSize === "F4" ? "215mm 330mm" : settings.paperSize === "Letter" ? "8.5in 11in" : "210mm 297mm"};
          margin: 20mm 20mm 20mm 20mm;
          mso-page-orientation: portrait;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: ${settings.fontSize}pt;
          line-height: 1.35;
          color: #000000;
        }
        h1, h2, h3, h4, p { margin: 0; }
        .kop-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          border-bottom: 3.5pt double #000000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          border-top: 1pt solid #000;
          border-bottom: 1pt solid #000;
          margin-bottom: 14px;
          font-size: ${settings.fontSize}pt;
        }
        .meta-table td {
          padding: 3px 6px;
        }
      </style>
    </head>
    <body>
      <!-- KOP SURAT -->
      <table class="kop-table">
        <tr>
          ${kop.logoKiri ? `<td style="width:75px; text-align:center; vertical-align:middle;"><img src="${kop.logoKiri}" width="65" height="65" /></td>` : ""}
          <td style="text-align:center; vertical-align:middle;">
            <div style="font-size:11pt; font-weight:bold; letter-spacing:0.04em;">${escapeHtml(kop.instansi || "PEMERINTAH PROVINSI / KABUPATEN")}</div>
            <div style="font-size:12pt; font-weight:bold;">${escapeHtml(kop.dinas || "DINAS PENDIDIKAN")}</div>
            <div style="font-size:14pt; font-weight:bold; margin-top:2px;">${escapeHtml(kop.sekolah || "SEKOLAH INDONESIA")}</div>
            <div style="font-size:9pt; font-style:italic; margin-top:2px;">${escapeHtml(kop.alamat || "Alamat Sekolah")}</div>
          </td>
          ${kop.logoKanan ? `<td style="width:75px; text-align:center; vertical-align:middle;"><img src="${kop.logoKanan}" width="65" height="65" /></td>` : ""}
        </tr>
      </table>

      <!-- JUDUL UJIAN -->
      <div style="text-align:center; margin-bottom:12px;">
        <div style="font-size:12.5pt; font-weight:bold; text-transform:uppercase;">${escapeHtml(kop.ujian || "ASESMEN SUMATIF")}</div>
        <div style="font-size:11pt; font-weight:bold;">TAHUN PELAJARAN ${escapeHtml(kop.tahun || "2026/2027")}</div>
      </div>

      <!-- METADATA TABEL -->
      <table class="meta-table">
        <tr>
          <td style="width:130px; font-weight:bold;">Mata Pelajaran</td>
          <td style="width:10px;">:</td>
          <td>${escapeHtml(kop.mapel || "-")}</td>
          <td style="width:120px; font-weight:bold;">Hari / Tanggal</td>
          <td style="width:10px;">:</td>
          <td>${escapeHtml(kop.tanggal || "-")}</td>
        </tr>
        <tr>
          <td style="font-weight:bold;">Kelas / Tingkat</td>
          <td>:</td>
          <td>${escapeHtml(kop.kelas || "-")}</td>
          <td style="font-weight:bold;">Waktu Pengerjaan</td>
          <td>:</td>
          <td>${escapeHtml(kop.waktu || "-")}</td>
        </tr>
      </table>

      <!-- PETUNJUK UMUM (JIKA DIAKTIFKAN) -->
      ${
        settings.showInstructions !== false && settings.instructions && settings.instructions.length > 0
          ? `
        <div style="margin-bottom:14px; border:1pt solid #777; padding:8px 12px; background:#f9f9f9; font-size:${Math.max(settings.fontSize - 1, 9)}pt;">
          <div style="font-weight:bold; text-transform:uppercase; margin-bottom:4px; letter-spacing:0.04em;">PETUNJUK UMUM:</div>
          <ol style="margin:2px 0 0 18px; padding:0; line-height:1.4;">
            ${settings.instructions.map(inst => `<li style="margin-bottom:2px;">${escapeHtml(inst)}</li>`).join("")}
          </ol>
        </div>
      `
          : ""
      }

      <!-- KONTEN SOAL -->
      <div style="${
        settings.layoutColumns === 2
          ? "column-count: 2; -webkit-column-count: 2; mso-column-count: 2; column-gap: 20pt; mso-column-gap: 20pt;"
          : ""
      }">
        ${questionHtml}
      </div>

      <!-- KUNCI JAWABAN (JIKA DIPILIH) -->
      ${keyHtml}

      <!-- LEMBAR JAWABAN SISWA (JIKA DIPILIH) -->
      ${ljkHtml}
    </body>
    </html>
  `;

  // Create download blob
  const blob = new Blob(["\ufeff", docHtml], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderLjkRows(count: number): string {
  const total = Math.max(count, 10);
  let html = "<tr>";
  for (let c = 0; c < 5; c++) {
    html += `<th style="padding:3px; background:#f0f0f0;">No</th><th style="padding:3px; background:#f0f0f0;">Jawaban</th>`;
  }
  html += "</tr>";

  const rows = Math.ceil(total / 5);
  for (let r = 0; r < rows; r++) {
    html += "<tr>";
    for (let c = 0; c < 5; c++) {
      const qNum = r + 1 + c * rows;
      if (qNum <= total) {
        html += `
          <td style="padding:2px 4px; text-align:center; font-weight:bold;">${qNum}</td>
          <td style="padding:2px 4px; text-align:center; letter-spacing:3px;">A B C D E</td>
        `;
      } else {
        html += `<td></td><td></td>`;
      }
    }
    html += "</tr>";
  }
  return html;
}

function escapeHtml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
