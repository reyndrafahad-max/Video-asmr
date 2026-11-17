# ASMR Rain Studio

Web app ramah Android untuk membuat visual hujan realistis memakai Gemini, membuat ambience hujan sintetis di browser, dan merakit MP4 10 menit dengan FFmpeg.

## Persyaratan
- Node.js 20 atau lebih baru
- Gemini API key dengan akses ke model gambar `gemini-3.1-flash-image` dan video `gemini-omni-1.2-flash`
- FFmpeg terpasang di server untuk fitur rakit MP4

Dokumentasi resmi:
- Gambar: https://ai.google.dev/gemini-api/docs/image-generation
- Video: https://ai.google.dev/gemini-api/docs/omni

## Menjalankan
1. Ekstrak ZIP.
2. Salin `.env.example` menjadi `.env`.
3. Isi `GEMINI_API_KEY` di `.env`. Jangan kirim atau tempel API key ke chat, dan jangan masukkan ke file HTML.
4. Jalankan `npm install`.
5. Pastikan `ffmpeg` tersedia pada PATH server.
6. Jalankan `npm start`.
7. Buka `http://localhost:3000`.

Untuk Android, deploy folder ini ke hosting Node.js yang mendukung FFmpeg. Buka URL HTTPS di Chrome Android lalu pilih menu browser > Tambahkan ke layar utama.

## Cara kerja
- Generate gambar: Gemini image model, 16:9, 2K.
- Generate video: Gemini Omni, klip 15 detik, 16:9, 720p.
- Generate audio: browser membuat ambience hujan sintetis 60 detik sebagai WAV (tidak memakai API tambahan).
- Rakit MP4: server mengulang video dan audio hingga 600 detik dengan FFmpeg.

## Batasan penting
Hasil 10 menit adalah klip AI 15 detik yang diulang dengan audio hujan 60 detik berulang, bukan 10 menit adegan unik. Suara hujan sintetis adalah noise terfilter sederhana, bukan rekaman lapangan. Untuk hasil profesional, ganti dengan rekaman ambience milik sendiri atau berlisensi.
Biaya/kuota API Gemini mengikuti akun dan model yang tersedia. Model API dapat berubah; jika model tidak tersedia pada akun, perbarui nama model sesuai dokumentasi Google.

## Keamanan
API key server dibaca dari environment `.env`. Jangan commit `.env` ke Git atau membagikannya. Gunakan HTTPS dan batasi akses endpoint jika aplikasi dipublikasikan.
