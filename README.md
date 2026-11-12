# Gram Kawach (ग्राम कवच • గ్రామ్ కవచ్) — AI Scam & Fraud Guard

**Gram Kawach** is a complete, mobile-first **WhatsApp-Style Multimodal AI Scam & Fraud Detector Web App** powered by the official `@google/genai` SDK (Google Gemini Flash + Gemini Native Audio TTS) with a built-in Indian Multimodal Shield fallback engine and Indian Neural Voice synthesis.

---

## Key Features

1. **Authentic WhatsApp Web & Mobile Interface**
   - Dark teal header (`#075E54`) with custom Shield + Checkmark avatar, **Gram Kawach** verified green badge, live status indicator (`Online • Multimodal Scam Protection`), and auto-detected language indicator pill.
   - Classic `#ECE5DD` doodle chat wallpaper, pinned end-to-end safety banner, outgoing light-green user bubbles (`#DCF8C6`) with link/image previews and blue double-check read ticks (`✓✓`), and crisp white incoming verdict bubbles (`#FFFFFF`).

2. **Multimodal Fraud Detection (Google Gemini + Built-in Shield)**
   - **Suspicious Links:** Detects typosquatting, fake bank/government domains (`SBI`, `HDFC`, `India Post`, `Parivahan`, `PM-Kisan`), URL shorteners, unencrypted HTTP links, and `.apk` malware traps.
   - **SMS / Forwarded Chats:** Flags fake KYC/PAN block urgency, tonight electricity bill cut scams, "Digital Arrest" CBI/Customs video-call extortion, lottery/job traps, and OTP/UPI PIN requests.
   - **Screenshots & UPI QR Codes:** Decodes QR codes inside uploaded screenshots (`upi://pay?...`) to expose "Scan QR & enter UPI PIN to receive money" traps, doctored payment receipts, and fake legal warrants.
   - **Microphone Voice Notes:** Record voice queries directly inside the chat bar (`#F0F0F0` input bar with `#00A884` send button).

3. **Android Web App (PWA / WebAPK) & Mobile Compatibility**
   - Installable on Android phones with adaptive maskable launcher icons (`maskable-icon-512.png`), home-screen long-press app shortcuts, and **Android Share Sheet (`share_target`)** integration (tap **Share → Gram Kawach** from WhatsApp or Messages to scan a suspicious link immediately).
   - Dynamic mobile keyboard viewport (`visualViewport`), Android hardware/gesture Back button modal handling, accidental pull-to-refresh prevention, and fast 4G/Vercel-safe camera image compression (`<=1280px` JPEG).

---

## 1. Run Locally (Windows / macOS / Linux)

```bash
npm install
npm run dev
```

Open **`http://localhost:3001`** in your browser. Ensure `.env` contains:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PREFER_GEMINI_AUDIO=true
```

---

## 2. Deploy on Vercel

This project includes turnkey **Vercel Serverless** configuration (`vercel.json` + `/api/index.js` + `server/app.mjs`):

### Option A: Via GitHub + Vercel Dashboard
1. Push this project folder to a GitHub repository (`.gitignore` excludes `.env` so your API key remains private).
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = `your_gemini_api_key`
   - `PREFER_GEMINI_AUDIO` = `true`
4. Click **Deploy**. Vercel builds the Vite frontend into `dist/` and serves `/api/*` via Serverless Functions.

### Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel
vercel env add GEMINI_API_KEY
vercel --prod
```

---

## 3. Install as a Web App on Android Phones

Once deployed on HTTPS (e.g. `https://your-app.vercel.app`):

1. Open your Vercel URL in **Google Chrome** on your Android phone.
2. Tap **Install** in the Gram Kawach header/banner (or tap Chrome's top-right **⋮** menu → **Install app** / **Add to Home screen**).
3. Tap **Install** in the Android system dialog.
4. **Gram Kawach** installs into your Android app drawer, opens full-screen like WhatsApp, and appears inside Android's **Share** menu!
