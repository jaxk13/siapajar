PRODUCT REQUIREMENT DOCUMENT (PRD)
SIAPAJAR.id — Platform Penyusun, Editor & Generator Naskah Soal Terstandar Indonesia

1. Dokumen Metadata
Atribut
Keterangan
Nama Produk
SIAPAJAR.id — Sistem Asisten Pendidik Penulisan Naskah Soal & Asesmen Terstandar
Versi Dokumen
2.0.0
Status
MVP Development Specification
Target Pengguna
Guru SD/MI, SMP/MTs, SMA/MA/SMK
Frontend
React 19 + TypeScript + Vite + Tailwind CSS
Backend
Node.js + Express
Database
PostgreSQL self-hosted
Infrastructure
VPS Linux + Nginx + PM2
Access System
Access Code + Temporary Session
AI Strategy
External AI First + Optional BYOK/Direct API
Storage
Local-first + PostgreSQL
Output
Microsoft Word + Print/PDF


2. Ringkasan Eksekutif
SIAPAJAR.id adalah aplikasi web yang membantu guru menyusun naskah soal ujian secara lebih cepat melalui workflow terstruktur.
Platform tidak bergantung sepenuhnya pada satu provider AI.
SIAPAJAR berfungsi sebagai orchestration layer yang menangani:
konfigurasi kebutuhan soal;
penyusunan prompt terstandar;
integrasi workflow AI;
parsing hasil AI;
validasi struktur soal;
editing naskah;
pembuatan kisi-kisi;
pengelolaan kunci jawaban;
penyusunan kop sekolah;
ekspor dokumen.
Pada MVP, AI dapat dijalankan melalui platform AI eksternal menggunakan prompt yang dibuat SIAPAJAR.
Arsitektur ini bertujuan mengurangi:
biaya inference AI;
ketergantungan terhadap satu provider;
risiko API rate limit;
kompleksitas backend;
beban server pada fase validasi pasar.
SIAPAJAR tidak dimaksudkan untuk menggantikan keputusan akademik guru. Guru tetap menjadi pihak yang melakukan review dan menentukan naskah akhir sebelum digunakan.

3. Problem Statement
Guru sering menghadapi beberapa masalah ketika membuat soal ujian.
3.1 Waktu Penyusunan
Pembuatan naskah membutuhkan beberapa aktivitas berbeda:
menentukan materi;
membuat pertanyaan;
membuat opsi jawaban;
menentukan kunci;
membuat kisi-kisi;
mengatur format dokumen;
menyiapkan dokumen untuk dicetak.
SIAPAJAR menggabungkan aktivitas tersebut ke dalam satu workflow.
3.2 Prompt Engineering
Guru dapat menggunakan AI generatif, tetapi hasil sangat dipengaruhi kualitas instruksi yang diberikan.
Sebagian pengguna tidak ingin atau tidak memiliki waktu untuk menyusun prompt kompleks.
SIAPAJAR menyembunyikan proses prompt engineering melalui UI sederhana.
3.3 Output AI Tidak Terstruktur
Output dari AI dapat memiliki format berbeda-beda.
SIAPAJAR menyediakan struktur output yang konsisten sehingga hasil dapat dimasukkan ke editor naskah.
3.4 Formatting
Guru sering harus memindahkan hasil AI ke Word dan mengatur ulang:
nomor soal;
opsi jawaban;
spacing;
kop sekolah;
kunci;
kisi-kisi.
SIAPAJAR mengotomatisasi proses tersebut.

4. Prinsip Produk
Pengembangan MVP mengikuti lima prinsip.
4.1 Simple for Teachers
Pengguna tidak perlu memahami:
prompt engineering;
JSON;
API;
database;
konfigurasi model AI.
4.2 AI Provider Independent
Core application tidak boleh bergantung secara permanen pada satu provider AI.
4.3 Local First
Draft soal sebisa mungkin disimpan pada perangkat pengguna.
4.4 Human Review Required
Output AI dianggap sebagai draft, bukan naskah final yang otomatis benar.
Guru bertanggung jawab melakukan review.
4.5 Launch Fast
Fitur yang tidak secara langsung mendukung workflow utama tidak menjadi dependency peluncuran MVP.

5. Target Pengguna
Persona Utama — Guru
Contoh kebutuhan:
membuat soal ujian;
membuat soal latihan;
membuat asesmen harian;
membuat SAS/PAS;
membuat STS/PTS;
membuat soal HOTS;
membuat kisi-kisi;
menghasilkan kunci jawaban;
mendapatkan dokumen siap edit/cetak.
Karakteristik penting:
kemampuan teknologi beragam;
mayoritas familiar dengan Microsoft Word;
sebagian sudah menggunakan ChatGPT/Gemini;
menginginkan workflow sederhana;
tidak ingin melakukan konfigurasi teknis.

6. Scope MVP
MVP difokuskan pada enam tahap utama.
A. Parameter Soal
        ↓
B. Prompt Builder
        ↓
C. Jalankan AI
        ↓
D. Import & Validasi
        ↓
E. Editor Naskah
        ↓
F. Export
Di luar workflow tersebut terdapat:
Access Code
Session Management
Usage Logging
Payment Integration
Monitoring

7. User Journey Utama
Step 0 — Access
Pengguna membuka:
SIAPAJAR.id
Sistem menampilkan:
Masukkan Kode Akses
[________________]

[Masuk]
Backend memvalidasi kode.
Jika valid:
Access Code
    ↓
Validation API
    ↓
Create Temporary Session
    ↓
Dashboard
Jika tidak valid:
Kode akses tidak valid atau sudah kedaluwarsa.
Tidak terdapat:
registrasi akun;
login email/password;
Google OAuth;
reset password;
profil pengguna.

8. STEP A — Parameter Soal
FR-A01 — Konfigurasi Soal
Pengguna menentukan parameter soal melalui form.
Input
Jenjang
SD/MI
SMP/MTs
SMA/MA
SMK
Kelas
Menyesuaikan jenjang.
Mata Pelajaran
Input/pilihan mata pelajaran.
Materi/Bab
User dapat mengetik materi secara manual.
Contoh:
Pecahan
Sistem Pernapasan
Teks Eksplanasi
Persamaan Linear
Jenis Penilaian
Contoh:
Latihan;
Asesmen Formatif;
STS/PTS;
SAS/PAS;
Ujian Sekolah;
Custom.
Jenis Soal
MVP mendukung:
Pilihan Ganda;
Pilihan Ganda Kompleks;
Benar/Salah;
Isian;
Uraian.
Jumlah Soal
Pengguna menentukan jumlah setiap tipe soal.
Kesulitan
Mudah
Sedang
Sulit
Campuran
Instruksi Tambahan
Free-text optional.
Contoh:
Gunakan konteks kehidupan sehari-hari.

9. STEP B — Prompt Builder
FR-B01 — Structured Prompt Generator
SIAPAJAR mengubah parameter pengguna menjadi prompt terstruktur.
Prompt mengandung minimal:
ROLE
TASK
EDUCATION LEVEL
GRADE
SUBJECT
TOPIC
ASSESSMENT TYPE
QUESTION COMPOSITION
DIFFICULTY
HOTS REQUIREMENTS
OUTPUT FORMAT
VALIDATION RULES
ADDITIONAL USER INSTRUCTIONS
Pengguna tidak perlu melihat kompleksitas internal prompt.

FR-B02 — Output Schema
AI diarahkan menghasilkan struktur yang dapat diproses SIAPAJAR.
Struktur internal minimal setiap soal:
id
type
question
stimulus
options
answer
explanation
cognitive_level
score
Untuk uraian dapat ditambahkan:
rubric

10. STEP C — Jalankan AI
FR-C01 — External AI Workflow
Mode default MVP adalah External AI.
SIAPAJAR menghasilkan prompt siap digunakan.
Interface menyediakan:
Prompt Siap Digunakan

[Copy Prompt]

Gunakan prompt ini pada AI pilihan Anda.
SIAPAJAR dapat menyediakan shortcut menuju platform AI yang didukung UX.
User kemudian:
Copy Prompt
     ↓
AI Eksternal
     ↓
Generate
     ↓
Copy Output
     ↓
Kembali ke SIAPAJAR

FR-C02 — BYOK
BYOK dapat disediakan sebagai fitur opsional.
User dapat memasukkan API key provider yang didukung.
Prinsip keamanan:
API key tidak disimpan permanen tanpa kebutuhan;
key tidak dicatat pada application log;
key tidak dimasukkan ke database secara default;
UI menjelaskan bahwa key berasal dari akun AI milik pengguna.

FR-C03 — Direct AI
Direct AI melalui API milik SIAPAJAR bukan dependency MVP.
Arsitektur tetap memungkinkan implementasi kemudian.
Contoh:
AIProvider Interface

├── External
├── Gemini
├── OpenAI
└── Anthropic
Penambahan provider tidak boleh membutuhkan perubahan besar pada editor soal.

11. STEP D — Import & Validasi
FR-D01 — Import AI Output
Pengguna menempelkan output AI ke SIAPAJAR.
[ Paste hasil AI ]

[ Proses Soal ]

FR-D02 — Parser
Parser mengubah output menjadi struktur internal aplikasi.
Contoh:
AI Output
    ↓
Parser
    ↓
Validation
    ↓
Normalized Question Data
    ↓
Editor

FR-D03 — Structural Validation
Sistem memeriksa:
jumlah soal;
tipe soal;
keberadaan pertanyaan;
opsi jawaban;
kunci;
format jawaban;
field wajib;
duplicate ID;
struktur yang rusak.

FR-D04 — Error Handling
Jika sebagian output tidak valid, seluruh naskah tidak boleh otomatis dibuang.
Contoh:
38 soal berhasil diproses.

2 soal perlu diperbaiki:
#17 — Kunci jawaban tidak ditemukan
#29 — Format opsi tidak valid
User dapat:
Edit Manual
atau mengulang proses terhadap bagian yang bermasalah.

12. STEP E — Editor Naskah
FR-E01 — Question Editor
Setiap soal ditampilkan dalam card.
User dapat:
edit pertanyaan;
edit stimulus;
edit opsi;
edit kunci;
edit pembahasan;
edit skor;
edit rubrik;
hapus soal;
duplikasi soal;
mengubah urutan.
Penomoran berubah otomatis.

FR-E02 — Question Type Badge
Setiap soal menampilkan badge.
Contoh:
PG
PGK
BS
ISIAN
URAIAN
Jika tersedia:
C1
C2
C3
C4
C5
C6

13. Kisi-Kisi
FR-E03 — Kisi-Kisi Otomatis
SIAPAJAR membentuk tabel berdasarkan data soal.
Kolom minimal:
No
Materi
Indikator
Level Kognitif
Bentuk Soal
Skor

Jika CP/KD tersedia dari input/output yang digunakan, data tersebut dapat ditampilkan sebagai kolom tambahan.
Semua data dapat diedit manual.

14. Kunci Jawaban
FR-E04 — Answer Key
Sistem menghasilkan tabel kunci jawaban dari data soal.
Contoh:
No
Jawaban
Skor
1
B
2
2
A,C
2
3
Benar
1

Untuk soal uraian, sistem dapat menampilkan rubrik jika tersedia.

15. Kop Sekolah
FR-E05 — School Header Builder
User dapat mengisi:
instansi;
nama sekolah;
alamat;
kabupaten/kota;
telepon;
email;
logo kiri;
logo kanan.
User dapat memilih format garis kop.
Data kop disimpan secara lokal agar tidak perlu diketik ulang pada setiap naskah.

16. STEP F — Export
FR-F01 — Microsoft Word
SIAPAJAR menyediakan ekspor dokumen yang dapat dibuka menggunakan aplikasi pengolah dokumen yang kompatibel.
Dokumen dapat mencakup:
Kop Sekolah
Identitas Ujian
Petunjuk
Naskah Soal
Kunci Jawaban
Kisi-Kisi
Rubrik

FR-F02 — Print / PDF
Browser print engine digunakan untuk menghasilkan dokumen siap cetak/PDF.
Ukuran:
A4
F4
Layout:
1 Kolom
2 Kolom / Eco Print
User dapat memilih apakah ingin memasukkan:
☑ Kop
☑ Naskah
☐ Kunci Jawaban
☐ Kisi-kisi

17. Local Storage
FR-G01 — Auto Save
Draft aktif disimpan secara otomatis pada browser.
Contoh key:
siapajar_current_draft
siapajar_school_header
siapajar_preferences
Auto-save tidak memerlukan request ke server setiap kali pengguna mengedit soal.

18. Access Code System
FR-H01 — Access Code
Access code menjadi sistem akses utama MVP.
Struktur konseptual:
AccessCode

id
code_hash
plan
status
activated_at
expires_at
created_at
Status:
unused
active
expired
disabled

FR-H02 — Activation
Saat kode pertama kali digunakan:
unused
 ↓
activate
 ↓
active
Sistem mencatat waktu aktivasi.

FR-H03 — Expiration
Kode memiliki masa aktif sesuai produk yang dibeli.
Contoh konfigurasi:
Instan → configurable duration
Pro    → configurable duration
Durasi tidak di-hardcode pada frontend.
Backend menentukan:
activated_at
expires_at

19. Session Management
Setelah access code valid, backend menghasilkan session.
Browser menerima cookie session.
Cookie:
HttpOnly
Secure
SameSite
User tidak perlu memasukkan kode pada setiap halaman selama session masih valid.
Backend tetap memeriksa:
session
+
access_code.status
+
expires_at
untuk endpoint yang dilindungi.

20. PostgreSQL
Database digunakan untuk data server-side yang benar-benar diperlukan.
Tabel inti MVP:
access_codes
sessions
orders
usage_logs
system_settings
Draft soal tidak wajib masuk database pada MVP.

21. Payment Integration
Payment provider:
Skaler
Konsep flow:
Customer
   ↓
Payment
   ↓
Skaler
   ↓
Payment Confirmation
   ↓
Access Code Provisioning
   ↓
Customer
Detail implementasi webhook/API mengikuti kemampuan aktual provider pada saat integrasi.
Sistem harus mencegah satu event pembayaran membuat kode akses berulang secara tidak sengaja.

22. Telegram Monitoring
Backend dapat mengirim notification event penting.
Contoh:
NEW ORDER
ACCESS CODE CREATED
SERVER ERROR
RATE LIMIT
AI PROVIDER ERROR
Notifikasi tidak boleh mengandung:
API key;
session token;
access code lengkap;
data sensitif yang tidak diperlukan.

23. Arsitektur Sistem
                      INTERNET
                           │
                           ▼
                    ┌──────────────┐
                    │    NGINX     │
                    │ HTTPS/Proxy  │
                    └──────┬───────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
     ┌──────────────┐              ┌──────────────┐
     │    REACT     │              │   EXPRESS    │
     │   FRONTEND   │◄────────────►│     API      │
     └──────────────┘              └──────┬───────┘
                                          │
                                  ┌───────┴────────┐
                                  │                │
                                  ▼                ▼
                           ┌────────────┐   ┌────────────┐
                           │ PostgreSQL │   │ Telegram   │
                           └────────────┘   └────────────┘


USER AI WORKFLOW

React
  │
  ▼
Prompt Builder
  │
  ▼
External AI
  │
  ▼
AI Output
  │
  ▼
Parser
  │
  ▼
Validator
  │
  ▼
Question Editor

24. Deployment Architecture
Target:
VPS Linux
Software:
Nginx
Node.js
PM2
PostgreSQL
Request flow:
Internet
   ↓
HTTPS
   ↓
Nginx
   ↓
Frontend / API
          ↓
       Express
          ↓
      PostgreSQL
Environment secrets disimpan menggunakan environment variables atau secret management yang sesuai.
Tidak dimasukkan ke source code atau repository.

25. Security Requirements
SEC-01
Access code tidak disimpan dalam bentuk plaintext apabila tidak diperlukan untuk provisioning.
Gunakan hashing yang sesuai.
SEC-02
Session identifier harus sulit ditebak dan dibuat menggunakan secure random generator.
SEC-03
Production wajib menggunakan HTTPS.
SEC-04
Endpoint sensitif harus menggunakan rate limiting.
Contoh:
POST /api/access/activate
POST /api/access/validate
SEC-05
Request body memiliki batas ukuran.
SEC-06
Backend melakukan input validation.
SEC-07
Database tidak diekspos langsung ke public internet.
SEC-08
Secrets tidak boleh berada di frontend bundle.
SEC-09
Application logs tidak boleh merekam API key atau session token.

26. API Architecture
Contoh endpoint MVP:
POST /api/access/activate
GET  /api/session
POST /api/session/logout

POST /api/payment/webhook

POST /api/usage/event

GET  /api/system/status
Jika BYOK/direct AI ditambahkan:
POST /api/ai/generate
AI endpoint harus dipisahkan dari core editor logic.

27. Non-Functional Requirements
Performance
Target UI:
Initial application load:
dioptimalkan untuk koneksi internet umum pengguna Indonesia.

Editor interaction:
respons langsung tanpa request server untuk perubahan lokal.
Tidak ada target latency AI tetap karena external AI berada di luar kontrol SIAPAJAR.

Reliability
Kegagalan:
AI
Database
Telegram
Payment Provider
tidak boleh menyebabkan kehilangan draft soal yang sudah tersimpan secara lokal.

Responsive Design
Prioritas:
Desktop
Laptop
Tablet
Mobile
Editor soal dioptimalkan terutama untuk desktop/laptop karena proses penyusunan dokumen panjang lebih nyaman dilakukan pada layar besar.

Browser Support
Prioritas:
Chrome
Edge
Firefox
Safari modern

28. Error Handling
Frontend harus menampilkan error yang dapat dipahami pengguna.
Hindari:
500 Internal Server Error
ParserException
JSON_SCHEMA_INVALID
Gunakan:
Hasil AI belum dapat dibaca.

Periksa apakah seluruh hasil dari AI sudah disalin,
lalu coba proses kembali.
Technical error tetap dicatat di server log bila relevan.

29. Analytics & Usage Logging
MVP dapat mencatat event minimum seperti:
access_activated
session_created
prompt_generated
output_parsed
export_word
export_print
Tujuan analytics adalah memahami:
penggunaan fitur;
error rate;
conversion;
pola penggunaan produk.
Hindari menyimpan isi lengkap soal kecuali nantinya terdapat kebutuhan produk dan kebijakan privasi yang jelas.

30. MVP Definition
SIAPAJAR dianggap siap diluncurkan ketika workflow berikut dapat dilakukan end-to-end:
Access Code
     ↓
Parameter
     ↓
Generate Prompt
     ↓
External AI
     ↓
Import Output
     ↓
Parse
     ↓
Edit
     ↓
Kisi-kisi
     ↓
Kunci
     ↓
Kop
     ↓
Word / PDF
Tanpa membutuhkan akun pengguna.

31. Tidak Termasuk MVP
Fitur berikut bukan dependency launch:
sistem akun lengkap;
Google OAuth;
forgot password;
cloud document library;
kolaborasi guru;
MGMP/KKG sharing;
AI image generation;
analisis hasil ujian siswa;
LMS/Moodle integration;
import Word lama;
advanced AI audit;
collaborative question bank;
aplikasi mobile native;
Google Form Builder.
Fitur tersebut dapat dikembangkan setelah terdapat data penggunaan nyata.

32. Roadmap
Phase 1 — MVP / Market Validation
Prioritas:
Access Code;
temporary session;
parameter soal;
Prompt Builder;
external AI workflow;
parser;
validator;
editor soal;
kisi-kisi;
kunci/rubrik;
kop sekolah;
local autosave;
Word export;
Print/PDF;
PostgreSQL;
payment integration;
Telegram monitoring.

Phase 2 — Automation
Evaluasi berdasarkan data pengguna:
direct AI generation;
BYOK improvements;
automatic regenerate;
provider abstraction;
usage quota;
improved parser;
improved validation;
reference material integration.

Phase 3 — Account & Cloud
Jika kebutuhan pasar terbukti:
account system;
Google authentication;
cloud draft storage;
history naskah;
multi-device sync;
school workspace.

Phase 4 — Advanced Platform
Potensi pengembangan:
question bank;
SIBI/reference integration;
AI quality review;
import existing exams;
analytics hasil ujian;
school/team collaboration;
LMS export.
Roadmap dapat berubah berdasarkan penggunaan aktual dan feedback pengguna.

33. Success Metrics MVP
Metric awal yang perlu diamati:
Activation
Persentase pembeli yang berhasil mengaktifkan access code.
Prompt Completion
Persentase user yang berhasil menghasilkan prompt.
Parse Success Rate
Persentase output AI yang berhasil diproses parser tanpa intervensi besar.
Export Completion
Persentase user yang mencapai Word/PDF export.
Error Rate
Jumlah error pada:
Access
Parser
Export
Payment
Time to First Document
Durasi dari:
Access Code Activated
hingga:
First Successful Export
Tidak menetapkan klaim keberhasilan absolut sebelum terdapat data penggunaan produksi.

34. Product Decision Principles
Jika terdapat pilihan antara fitur baru dan stabilitas workflow utama, prioritas diberikan kepada workflow:
INPUT
  ↓
AI
  ↓
STRUCTURED QUESTIONS
  ↓
EDIT
  ↓
EXPORT
Fitur baru tidak boleh membuat proses tersebut lebih kompleks bagi guru.
Pertanyaan utama setiap kali fitur baru diusulkan:
Apakah fitur ini membuat guru lebih cepat menghasilkan naskah soal yang siap digunakan?
Jika tidak, fitur dapat ditunda.

35. Kesimpulan
SIAPAJAR.id MVP dibangun sebagai workflow platform untuk penyusunan naskah soal, bukan sekadar wrapper satu model AI.
Core value SIAPAJAR berada pada:
Structured Input
      +
Prompt Engineering
      +
AI Workflow
      +
Parsing & Validation
      +
Question Editing
      +
Document Generation


