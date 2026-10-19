# Nalar AI — Vercel

Website Nalar AI ini menggunakan endpoint `https://api.ikyyxd.my.id/ai/gemini` melalui proxy serverless Vercel.

## Deploy
1. Upload seluruh isi folder ini ke repository GitHub.
2. Import repository di https://vercel.com/new.
3. Deploy. Tidak perlu API key Gemini atau environment variable untuk endpoint ini.

## API lokal
Frontend memanggil `POST /api/chat` dengan JSON:
```json
{
  "text": "Halo",
  "sessionsId": "nalar-session-id"
}
```

Proxy meneruskan parameter `text` dan `sessionsId` ke endpoint Ikyy, lalu mengubah responsnya menjadi format yang kompatibel dengan frontend Nalar AI. ID sesi disimpan per browser agar percakapan dapat menggunakan sesi yang sama.

Endpoint serverless berada di `api/chat.js`; website berada di `public/index.html`.
