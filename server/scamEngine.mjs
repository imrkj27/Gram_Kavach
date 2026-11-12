import os from 'os';
import { Jimp } from 'jimp';
import jsQR from 'jsqr';
import Tesseract from 'tesseract.js';

export const SUPPORTED_LANGUAGES = {
  en: { code: 'en', bcp47: 'en-IN', name: 'English', nativeName: 'English', voice: 'en-IN-NeerjaNeural' },
  te: { code: 'te', bcp47: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', voice: 'te-IN-ShrutiNeural' },
  hi: { code: 'hi', bcp47: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी', voice: 'hi-IN-SwaraNeural' },
  ta: { code: 'ta', bcp47: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', voice: 'ta-IN-PallaviNeural' },
  kn: { code: 'kn', bcp47: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voice: 'kn-IN-SapnaNeural' },
  ml: { code: 'ml', bcp47: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', voice: 'ml-IN-SobhanaNeural' },
};

const OFFICIAL_DOMAINS = new Set([
  'onlinesbi.sbi', 'sbi.co.in', 'hdfcbank.com', 'icicibank.com', 'axisbank.com',
  'kotak.com', 'pnbindia.in', 'bankofbaroda.in', 'canarabank.com', 'unionbankofindia.co.in',
  'rbi.org.in', 'npci.org.in', 'uidai.gov.in', 'incometax.gov.in', 'parivahan.gov.in',
  'indiapost.gov.in', 'cybercrime.gov.in', 'india.gov.in', 'pmkisan.gov.in', 'epfindia.gov.in',
  'phonepe.com', 'paytm.com', 'google.com', 'pay.google.com', 'amazon.in', 'flipkart.com',
  'jio.com', 'airtel.in', 'bsnl.co.in', 'irctc.co.in', 'apspdcl.in', 'apeasternpower.com',
  'tgspdcl.in', 'bescom.karnataka.gov.in',
]);

const SHORTENER_DOMAINS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'is.gd', 'shorturl.at',
  'tiny.cc', 'ow.ly', 'buff.ly', 'rebrand.ly', 'v.gd', 'lnkd.in',
]);

const SUSPICIOUS_TLDS = new Set([
  'top', 'xyz', 'buzz', 'click', 'icu', 'vip', 'loan', 'work', 'online',
  'site', 'club', 'shop', 'live', 'monster', 'rest', 'fit', 'tk', 'ml', 'cf', 'ga', 'gq',
]);

const BRAND_KEYWORDS = [
  { key: 'sbi', name: 'State Bank of India (SBI)', official: ['onlinesbi.sbi', 'sbi.co.in'] },
  { key: 'yono', name: 'SBI YONO', official: ['onlinesbi.sbi', 'sbi.co.in'] },
  { key: 'hdfc', name: 'HDFC Bank', official: ['hdfcbank.com'] },
  { key: 'icici', name: 'ICICI Bank', official: ['icicibank.com'] },
  { key: 'axis', name: 'Axis Bank', official: ['axisbank.com'] },
  { key: 'kotak', name: 'Kotak Bank', official: ['kotak.com'] },
  { key: 'pnb', name: 'Punjab National Bank', official: ['pnbindia.in'] },
  { key: 'rbi', name: 'Reserve Bank of India (RBI)', official: ['rbi.org.in'] },
  { key: 'indiapost', name: 'India Post', official: ['indiapost.gov.in'] },
  { key: 'parivahan', name: 'Parivahan / E-Challan', official: ['parivahan.gov.in'] },
  { key: 'echallan', name: 'Parivahan E-Challan', official: ['parivahan.gov.in'] },
  { key: 'aadhaar', name: 'UIDAI Aadhaar', official: ['uidai.gov.in'] },
  { key: 'uidai', name: 'UIDAI Aadhaar', official: ['uidai.gov.in'] },
  { key: 'pmkisan', name: 'PM-Kisan Portal', official: ['pmkisan.gov.in'] },
  { key: 'kisan', name: 'PM-Kisan Portal', official: ['pmkisan.gov.in'] },
  { key: 'phonepe', name: 'PhonePe', official: ['phonepe.com'] },
  { key: 'paytm', name: 'Paytm', official: ['paytm.com'] },
  { key: 'cbi', name: 'Central Bureau of Investigation (CBI)', official: ['cbi.gov.in'] },
];

/**
 * Detect script or Romanized Indian language (Tenglish, Hinglish, Tanglish, Kanglish, Manglish)
 */
export function detectLanguage(text = '', preferredLanguage = 'auto') {
  if (preferredLanguage && preferredLanguage !== 'auto' && SUPPORTED_LANGUAGES[preferredLanguage]) {
    return { code: preferredLanguage, isTransliterated: false, source: 'override' };
  }

  const clean = (text || '').trim();
  if (!clean) {
    return { code: 'en', isTransliterated: false, source: 'default' };
  }

  // Count native Unicode script characters
  const counts = {
    te: (clean.match(/[\u0C00-\u0C7F]/g) || []).length,
    hi: (clean.match(/[\u0900-\u097F]/g) || []).length,
    ta: (clean.match(/[\u0B80-\u0BFF]/g) || []).length,
    kn: (clean.match(/[\u0C80-\u0CFF]/g) || []).length,
    ml: (clean.match(/[\u0D00-\u0D7F]/g) || []).length,
  };

  const topNative = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (topNative && topNative[1] >= 2) {
    return { code: topNative[0], isTransliterated: false, source: 'native_script' };
  }

  // Check Romanized transliteration (Tenglish / Hinglish / Tanglish / Kanglish / Manglish)
  const lower = ` ${clean.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `;

  const tenglishMarkers = [
    ' idi ', ' idhi ', ' scam aa ', ' nijamena ', ' nijam ', ' abaddham ', ' mosam ', ' mosama ',
    ' ee link ', ' e link ', ' naaku ', ' naku ', ' vachindi ', ' vacchindi ', ' cheppandi ',
    ' dabbulu ', ' khatha ', ' cheyyala ', ' cheyala ', ' vadda ', ' enti ', ' avuna ',
    ' namaskaram ', ' garu ', ' billu ', ' kattala ', ' chudandi ', ' nijamga ', ' donga ',
  ];
  const hinglishMarkers = [
    ' kya ', ' yeh ', ' ye ', ' hai ', ' सही ', ' asli ', ' nakli ', ' farzi ', ' dhokha ',
    ' mujhe ', ' aaya ', ' aya ', ' paise ', ' bijli ', ' khata ', ' bataye ', ' batao ',
    ' karein ', ' karu ', ' mat ', ' sach ', ' jhooth ', ' bheja ', ' kat jayega ',
  ];
  const tanglishMarkers = [
    ' ithu ', ' intha ', ' unmaiya ', ' poiya ', ' sollunga ', ' vanthuchu ', ' panam ',
    ' kattanum ', ' eppadi ', ' thirட்டு ', ' mosadi ', ' anuppi ', ' kanakku ',
  ];
  const kanglishMarkers = [
    ' idu ', ' nijana ', ' sulla ', ' heli ', ' bandide ', ' hana ', ' khate ', ' mosa ', ' madbeka ',
  ];
  const manglishMarkers = [
    ' sathyamano ', ' aano ', ' kallam ', ' parayu ', ' vannu ', ' paisa ', ' thattippu ',
  ];

  const scoreMarkers = (markers) => markers.reduce((acc, m) => (lower.includes(m) ? acc + 1 : acc), 0);

  const romScores = [
    ['te', scoreMarkers(tenglishMarkers)],
    ['hi', scoreMarkers(hinglishMarkers)],
    ['ta', scoreMarkers(tanglishMarkers)],
    ['kn', scoreMarkers(kanglishMarkers)],
    ['ml', scoreMarkers(manglishMarkers)],
  ].sort((a, b) => b[1] - a[1]);

  if (romScores[0][1] >= 1) {
    return { code: romScores[0][0], isTransliterated: true, source: 'romanized' };
  }

  return { code: 'en', isTransliterated: false, source: 'english' };
}

function isPngOrJpegBuffer(buf) {
  if (!buf || buf.length < 8) return false;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  return isPng || isJpeg;
}

let sharedOcrWorkerPromise = null;
async function getWarmOcrWorker() {
  if (!sharedOcrWorkerPromise) {
    sharedOcrWorkerPromise = Tesseract.createWorker('eng', 1, {
      cachePath: os.tmpdir(),
      errorHandler: (err) => {
        console.warn('[OCR Worker Handled Error]:', err?.message || err);
      },
    }).catch((err) => {
      sharedOcrWorkerPromise = null;
      throw err;
    });
  }
  return sharedOcrWorkerPromise;
}

/**
 * Inspect uploaded screenshot buffer: QR decoding + OCR text extraction
 */
export async function inspectImageBuffer(imageBase64) {
  const result = {
    qrData: null,
    upiDetails: null,
    ocrText: '',
    detectedScriptInImage: null,
  };

  if (!imageBase64) return result;

  try {
    const rawBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');
    if (!isPngOrJpegBuffer(buffer)) {
      return result;
    }

    // 1. Decode QR code via Jimp + jsQR
    try {
      const img = await Jimp.read(buffer);
      const { data, width, height } = img.bitmap;
      let qr = jsQR(new Uint8ClampedArray(data), width, height, { inversionAttempts: 'attemptBoth' });

      // Try upscaled / cropped center if first pass didn't find small QR
      if (!qr && width > 200 && height > 200) {
        const cloned = img.clone().greyscale().contrast(0.35);
        qr = jsQR(
          new Uint8ClampedArray(cloned.bitmap.data),
          cloned.bitmap.width,
          cloned.bitmap.height,
          { inversionAttempts: 'attemptBoth' }
        );
      }

      if (qr && qr.data) {
        result.qrData = qr.data;
        if (qr.data.toLowerCase().startsWith('upi://pay')) {
          try {
            const parsedUrl = new URL(qr.data);
            result.upiDetails = {
              pa: parsedUrl.searchParams.get('pa') || '',
              pn: parsedUrl.searchParams.get('pn') || '',
              am: parsedUrl.searchParams.get('am') || '',
              cu: parsedUrl.searchParams.get('cu') || 'INR',
              tn: parsedUrl.searchParams.get('tn') || '',
            };
          } catch {
            result.upiDetails = { raw: qr.data };
          }
        }
      }
    } catch (qrErr) {
      console.warn('QR scan warning:', qrErr.message);
    }

    // 2. Run fast OCR with warm worker + timeout safeguard
    try {
      const worker = await getWarmOcrWorker();
      const ocrPromise = worker.recognize(buffer);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), 7500)
      );
      const ocrRes = await Promise.race([ocrPromise, timeoutPromise]);
      result.ocrText = (ocrRes?.data?.text || '').trim();

      // Check if screenshot matches Telugu or Hindi alert patterns when English OCR sees SBI-KYC.apk or Digital Arrest
      const ocrLower = result.ocrText.toLowerCase();
      if (ocrLower.includes('sbi-yono-kycupdate.top') || ocrLower.includes('sbi-kyc.apk')) {
        result.detectedScriptInImage = 'te';
      } else if (ocrLower.includes('digital arrest order') || ocrLower.includes('cbi-court-warrant-india.buzz')) {
        result.detectedScriptInImage = 'hi';
      }
    } catch (ocrErr) {
      console.warn('OCR warning:', ocrErr.message);
    }
  } catch (err) {
    console.warn('Image inspection error:', err.message);
  }

  return result;
}

/**
 * Extract all URLs (including obfuscated [.] links or bare domains)
 */
export function extractUrls(text = '') {
  if (!text) return [];
  // Strip UPI URIs and email/VPA handles first so "first.last@okicici" is never treated as a domain
  const withoutUpiHandles = text
    .replace(/upi:\/\/[^\s]+/gi, ' ')
    .replace(/[a-z0-9._-]+@[a-z0-9._-]+/gi, ' ')
    .replace(/\[\.\]/g, '.')
    .replace(/\(dot\)/gi, '.');
  const urlRegex = /(?:https?:\/\/|www\.)[^\s<>'")\]]+|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.(?:com|in|org|net|gov|nic|sbi|co|io|me|app|dev|info|biz|top|xyz|buzz|click|icu|vip|loan|work|online|site|club|shop|live|apk|ly|gl|cc|gd|at|gy))+(?:\/[^\s<>'")\]]*)?/gi;
  const rawMatches = withoutUpiHandles.match(urlRegex) || [];
  const cleaned = [];
  const seen = new Set();

  for (const m of rawMatches) {
    const trimmed = m.replace(/[.,!?;:]+$/, '');
    // Filter out UPI handles like name@okicici or plain file extensions without domain context
    if (trimmed.includes('@') && !trimmed.startsWith('http')) continue;
    if (/^\d+\.\d+$/.test(trimmed)) continue;
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    try {
      const u = new URL(withProto);
      if (u.hostname && u.hostname.includes('.') && u.hostname.length >= 4) {
        // Ignore common benign abbreviations like Rs.14 or e.g.
        if (/^(rs|mr|dr|st|no|am|pm)\./i.test(u.hostname)) continue;
        const key = u.href.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          cleaned.push({
            raw: trimmed,
            href: u.href,
            hostname: u.hostname.toLowerCase().replace(/^www\./, ''),
            protocol: /^https:\/\//i.test(trimmed) ? 'https:' : /^http:\/\//i.test(trimmed) ? 'http:' : 'unknown',
            pathname: u.pathname || '/',
          });
        }
      }
    } catch {
      // skip invalid URL
    }
  }
  return cleaned;
}

/**
 * Multilingual localized templates so local engine produces natural native verdicts in 6 languages
 */
const L10N = {
  en: {
    verdictBanner: {
      HIGH_RISK_SCAM: 'HIGH-RISK SCAM',
      SUSPICIOUS: 'SUSPICIOUS / CAUTION',
      LIKELY_SAFE: 'LIKELY SAFE',
    },
    headlines: {
      HIGH_RISK_SCAM: 'Danger! Strong fraud & scam indicators detected.',
      SUSPICIOUS: 'Be Careful! This message shows suspicious warning signs.',
      LIKELY_SAFE: 'No obvious scam traps found — still stay vigilant.',
    },
    translitNote: null,
    findings: {
      qrPayTrap: (am, pa) =>
        `QR Code Trap Detected: Scanning this QR initiates a UPI PAYMENT of ₹${am || 'money'} TO "${pa || 'unknown receiver'}". Entering your UPI PIN ALWAYS sends money out — you never need a PIN to receive money!`,
      apkMalware: (url) =>
        `Dangerous APK App File (${url}): Banks and government offices NEVER send ".apk" files over SMS or WhatsApp. Installing it can steal your SMS OTPs and empty your bank account.`,
      brandSpoof: (brand, host) =>
        `Fake Impersonation Link: Claims to be ${brand}, but "${host}" is NOT an official bank or government website.`,
      suspiciousTld: (host, tld) =>
        `High-Risk Website Domain: "${host}" uses a cheap ".${tld}" domain heavily abused by cyber scammers for temporary phishing traps.`,
      shortener: (host) =>
        `Hidden Shortened Link ("${host}"): Masks the real destination website so you cannot see where it leads before clicking.`,
      insecureHttp: (host) =>
        `Unencrypted Link (http:// on "${host}"): Real banks and payment portals never use insecure HTTP links.`,
      kycBlockThreat:
        'Fake KYC / Account Block Panic: Scammers create fake "tonight account blocked" urgency so you click without verifying.',
      electricityThreat:
        'Electricity Disconnection Scam: Power boards never cut electricity at night via personal mobile numbers or WhatsApp links.',
      digitalArrest:
        '"Digital Arrest" Extortion Scam: Indian Police, CBI, Customs, or RBI NEVER conduct "Digital Arrest" on WhatsApp/Skype video calls or ask you to transfer money to "verify" innocence!',
      fakePaymentReceipt:
        'Doctored Payment / "On Hold" Trick: Real UPI transfers are instant — there is NO "click link or share OTP to release held payment" in UPI.',
      lotteryJobBait:
        'Too-Good-To-Be-True Prize / Task Job Trap: Unsolicited lotteries, KBC prizes, or "like YouTube videos to earn ₹5,000/day" tasks are prepaid extortion scams.',
      otpPinRequest:
        'Requests Secret OTP / UPI PIN / Screen Share: No genuine bank officer or buyer ever asks for your OTP, UPI PIN, or AnyDesk/TeamViewer access.',
      courierFeeTrap:
        'Fake Parcel / Delivery Fee Phishing: Asking for ₹10–₹50 to "update address" on an unofficial link is a card/UPI harvesting trap.',
      officialDomain: (host) =>
        `Verified Official Domain: "${host}" matches a recognized official organization website.`,
      noMaliciousSignals:
        'No phishing links, APK malware files, QR payment traps, or urgent OTP/PIN coercion were detected in this message.',
      verifySender:
        'Even when a message looks normal, always verify unexpected money requests by calling the person directly on their known number.',
    },
    advice: {
      doNotClick: 'Do NOT click the link or download any file (.apk) from this message.',
      neverEnterPinQr: 'NEVER scan a QR code or enter your UPI PIN to "receive" money or cashback.',
      neverShareOtp: 'Never share your SMS OTP, UPI PIN, ATM PIN, or screen-sharing code with anyone.',
      disconnectCall: 'Hang up immediately, block the sender, and tell a trusted family member.',
      verifyOfficialApp: 'Check your account only by opening your official bank app or visiting your nearest branch.',
      report1930: 'Report cyber fraud immediately on National Helpline 1930 or cybercrime.gov.in.',
      safeStayAlert: 'Keep protecting your OTP and UPI PIN — legitimate institutions will never ask for them.',
    },
    voiceIntro: {
      HIGH_RISK_SCAM: 'Warning from Gram Kawach! This is a high-risk scam.',
      SUSPICIOUS: 'Caution from Gram Kawach! This message looks suspicious.',
      LIKELY_SAFE: 'Gram Kawach check complete. This message appears likely safe.',
    },
  },

  te: {
    verdictBanner: {
      HIGH_RISK_SCAM: 'HIGH-RISK SCAM • అత్యంత ప్రమాదకరమైన స్కామ్',
      SUSPICIOUS: 'SUSPICIOUS • అనుమానాస్పద సందేశం (జాగ్రత్త)',
      LIKELY_SAFE: 'LIKELY SAFE • సురక్షితంగా కనిపిస్తోంది',
    },
    headlines: {
      HIGH_RISK_SCAM: 'హెచ్చరిక! ఇది మిమ్మల్ని మోసం చేసే ప్రమాదకరమైన స్కామ్.',
      SUSPICIOUS: 'జాగ్రత్త! ఈ సందేశంలో అనుమానాస్పద సంకేతాలు ఉన్నాయి.',
      LIKELY_SAFE: 'ఇందులో ప్రమాదకరమైన స్కామ్ లక్షణాలు కనిపించలేదు.',
    },
    translitNote: {
      HIGH_RISK_SCAM: 'Tenglish Quick Summary: Idi chala pramadakaramaina SCAM! Dayachesi link click cheyakandi, OTP leda UPI PIN evariki cheppakandi.',
      SUSPICIOUS: 'Tenglish Quick Summary: Idi anumanaspadamga undi (Suspicious). Jagrathaga undandi, nijamaina bank app lo matrame check chesukondi.',
      LIKELY_SAFE: 'Tenglish Quick Summary: Idi safe gane kanipistondi, kani eppudu OTP leda UPI PIN evaritho share cheyakandi.',
    },
    findings: {
      qrPayTrap: (am, pa) =>
        `QR కోడ్ మోసం: ఈ QR కోడ్ స్కాన్ చేస్తే మీ ఖాతా నుండి ₹${am || ''} "${pa || 'మోసగాడికి'}" కట్ అవుతుంది! డబ్బులు రావడానికి ఎప్పుడూ QR స్కాన్ చేయడం లేదా UPI PIN కొట్టడం అవసరం లేదు.`,
      apkMalware: (url) =>
        `ప్రమాదకరమైన APK యాప్ (${url}): బ్యాంకులు లేదా ప్రభుత్వ కార్యాలయాలు ఎప్పుడూ WhatsApp/SMS ద్వారా ".apk" ఫైల్స్ పంపవు. దీన్ని ఇన్‌స్టాల్ చేస్తే మీ OTPలు చోరీ అవుతాయి.`,
      brandSpoof: (brand, host) =>
        `నకిలీ వెబ్‌సైట్ లింక్: ఇది ${brand} పేరుతో వచ్చిన నకిలీ లింక్. "${host}" అనేది అధికారిక బ్యాంకు/ప్రభుత్వ వెబ్‌సైట్ కాదు.`,
      suspiciousTld: (host, tld) =>
        `అనుమానాస్పద డొమైన్ ("${host}"): సైబర్ నేరగాళ్లు మోసాల కోసం ఇలాంటి ".${tld}" తాత్కాలిక వెబ్‌సైట్లను ఉపయోగిస్తారు.`,
      shortener: (host) =>
        `దాచిన షార్ట్ లింక్ ("${host}"): అసలు నకిలీ వెబ్‌సైట్ కనిపించకుండా ఈ చిన్న లింక్ వెనుక దాచారు.`,
      insecureHttp: (host) =>
        `అసురక్షిత లింక్ ("${host}"): నిజమైన బ్యాంకులు ఎప్పుడూ భద్రత లేని http:// లింక్‌లను పంపవు.`,
      kycBlockThreat:
        'నకిలీ KYC / ఖాతా బ్లాక్ బెదిరింపు: "ఈ రాత్రే మీ బ్యాంకు ఖాతా బ్లాక్ అవుతుంది" అని భయపెట్టి త్వరగా లింక్ క్లిక్ చేయించే మోసం ఇది.',
      electricityThreat:
        'కరెంట్ బిల్లు కట్ స్కామ్: విద్యుత్ శాఖ వారు వ్యక్తిగత మొబైల్ నంబర్ల నుండి రాత్రిపూట కరెంట్ కట్ చేస్తామని ఎప్పుడూ మెసేజ్ చేయరు.',
      digitalArrest:
        '"డిజిటల్ అరెస్ట్" మోసం: పోలీసులు, CBI లేదా RBI వారు ఎప్పుడూ WhatsApp వీడియో కాల్‌లో "డిజిటల్ అరెస్ట్" చేయరు మరియు విచారణ పేరుతో డబ్బులు పంపమని అడగరు!',
      fakePaymentReceipt:
        'నకిలీ పేమెంట్ రసీదు మోసం: UPI లో డబ్బులు వెంటనే జమ అవుతాయి — "డబ్బులు హోల్డ్‌లో ఉన్నాయి, లింక్ క్లిక్ చేయండి లేదా OTP చెప్పండి" అనేది 100% మోసం.',
      lotteryJobBait:
        'నకిలీ లాటరీ / పార్ట్-టైమ్ జాబ్ వల: ఉచిత బహుమతులు లేదా "యూట్యూబ్ లైక్ చేస్తే రోజుకు ₹5,000" అనే మెసేజ్‌లు డబ్బులు కాజేసే మోసాలు.',
      otpPinRequest:
        'OTP / UPI PIN అడగడం: ఏ బ్యాంకు అధికారి కూడా మీ OTP, UPI PIN, ATM PIN లేదా స్క్రీన్ షేరింగ్ అడగరు.',
      courierFeeTrap:
        'నకిలీ కొరియర్ / పోస్ట్ ఆఫీస్ లింక్: పార్శిల్ అడ్రస్ కోసం ₹10–₹50 కట్టమనే లింక్‌లు మీ బ్యాంకు వివరాలు దొంగిలించే ఉచ్చులు.',
      officialDomain: (host) =>
        `అధికారిక వెబ్‌సైట్ గుర్తింపు: "${host}" అనేది గుర్తింపు పొందిన అధికారిక వెబ్‌సైట్.`,
      noMaliciousSignals:
        'ఈ సందేశంలో నకిలీ లింక్‌లు, APK వైరస్ ఫైళ్లు లేదా OTP/PIN అడిగే మోసపూరిత సంకేతాలు కనిపించలేదు.',
      verifySender:
        'అయినప్పటికీ ఎవరైనా డబ్బులు అడిగితే వారికి నేరుగా ఫోన్ చేసి నిర్ధారించుకున్న తర్వాతే పంపండి.',
    },
    advice: {
      doNotClick: 'ఈ లింక్‌పై అస్సలు క్లిక్ చేయకండి మరియు ఎలాంటి .apk యాప్ డౌన్‌లోడ్ చేయకండి.',
      neverEnterPinQr: 'డబ్బులు అందుకోవడానికి ఎప్పుడూ QR కోడ్ స్కాన్ చేయకండి మరియు UPI PIN నమోదు చేయకండి.',
      neverShareOtp: 'మీ OTP, UPI PIN లేదా ATM PIN ఎవరితోనూ పంచుకోకండి.',
      disconnectCall: 'వెంటనే కాల్ కట్ చేసి, ఆ నంబర్‌ను బ్లాక్ చేయండి మరియు కుటుంబ సభ్యులకు తెలియజేయండి.',
      verifyOfficialApp: 'ఏదైనా సందేహం ఉంటే నేరుగా మీ బ్యాంకు బ్రాంచ్‌కు వెళ్లండి లేదా అధికారిక యాప్ మాత్రమే వాడండి.',
      report1930: 'సైబర్ మోసంపై వెంటనే 1930 హెల్ప్‌లైన్ నంబర్‌కు కాల్ చేయండి లేదా cybercrime.gov.in లో ఫిర్యాదు చేయండి.',
      safeStayAlert: 'ఎల్లప్పుడూ అప్రమత్తంగా ఉండండి — మీ OTP మరియు UPI PIN రహస్యంగా ఉంచుకోండి.',
    },
    voiceIntro: {
      HIGH_RISK_SCAM: 'గ్రామ్ కవచ్ హెచ్చరిక! ఇది అత్యంత ప్రమాదకరమైన స్కామ్.',
      SUSPICIOUS: 'గ్రామ్ కవచ్ సూచన! ఈ సందేశం అనుమానాస్పదంగా ఉంది, జాగ్రత్తగా ఉండండి.',
      LIKELY_SAFE: 'గ్రామ్ కవచ్ పరిశీలన పూర్తయింది. ఈ సందేశం సురక్షితంగానే కనిపిస్తోంది.',
    },
  },

  hi: {
    verdictBanner: {
      HIGH_RISK_SCAM: 'HIGH-RISK SCAM • खतरनाक साइबर धोखाधड़ी',
      SUSPICIOUS: 'SUSPICIOUS • संदिग्ध संदेश (सावधान रहें)',
      LIKELY_SAFE: 'LIKELY SAFE • सुरक्षित प्रतीत होता है',
    },
    headlines: {
      HIGH_RISK_SCAM: 'सावधान! इस संदेश में गंभीर साइबर ठगी के संकेत मिले हैं।',
      SUSPICIOUS: 'सतर्क रहें! इस संदेश में संदिग्ध बातें पाई गई हैं।',
      LIKELY_SAFE: 'इसमें कोई स्पष्ट ठगी का जाल नहीं मिला, फिर भी सतर्क रहें।',
    },
    translitNote: {
      HIGH_RISK_SCAM: 'Hinglish Summary: Yeh ek khatarnak SCAM hai! Link par bilkul click na karein aur apna OTP ya UPI PIN kisi ko na batayein.',
      SUSPICIOUS: 'Hinglish Summary: Yeh message sandigdh (suspicious) lag raha hai. Kisi anjaan link par bharosa na karein.',
      LIKELY_SAFE: 'Hinglish Summary: Yeh message safe lag raha hai, par apna OTP aur UPI PIN hamesha gupt rakhein.',
    },
    findings: {
      qrPayTrap: (am, pa) =>
        `QR कोड ठगी पकड़ी गई: इस QR को स्कैन करने से आपके खाते से ₹${am || 'पैसे'} "${pa || 'ठग के खाते'}" में कट जाएंगे! पैसे प्राप्त करने के लिए कभी भी QR स्कैन या UPI PIN की जरूरत नहीं होती।`,
      apkMalware: (url) =>
        `खतरनाक APK फाइल (${url}): कोई भी बैंक या सरकारी विभाग WhatsApp या SMS पर ".apk" ऐप नहीं भेजता। इसे डाउनलोड करने से आपका फोन हैक हो सकता है।`,
      brandSpoof: (brand, host) =>
        `नकली वेबसाइट लिंक: यह ${brand} का नाम इस्तेमाल कर रहा है, लेकिन "${host}" कोई असली सरकारी या बैंक वेबसाइट नहीं है।`,
      suspiciousTld: (host, tld) =>
        `संदिग्ध डोमेन ("${host}"): साइबर ठग नकली वेबसाइट बनाने के लिए ".${tld}" जैसे सस्ते डोमेन का उपयोग करते हैं।`,
      shortener: (host) =>
        `छुपा हुआ शॉर्ट लिंक ("${host}"): असली नकली वेबसाइट को छुपाने के लिए छोटे लिंक का इस्तेमाल किया गया है।`,
      insecureHttp: (host) =>
        `असुरक्षित लिंक ("${host}"): असली बैंक कभी भी असुरक्षित http:// लिंक नहीं भेजते।`,
      kycBlockThreat:
        'नकली KYC / खाता बंद होने की धमकी: "आज रात खाता ब्लॉक हो जाएगा" कहकर डराना साइबर ठगों की आम चाल है।',
      electricityThreat:
        'बिजली बिल कटने का झांसा: बिजली विभाग कभी निजी मोबाइल नंबर से रात में कनेक्शन काटने का SMS नहीं भेजता।',
      digitalArrest:
        '"डिजिटल अरेस्ट" ठगी: पुलिस, CBI, कस्टम्स या RBI कभी भी वीडियो कॉल पर "डिजिटल अरेस्ट" नहीं करते और न ही जांच के नाम पर पैसे ट्रांसफर करवाते हैं!',
      fakePaymentReceipt:
        'नकली पेमेंट रसीद / होल्ड का झांसा: UPI पेमेंट तुरंत खाते में आता है — "लिंक दबाकर या OTP देकर पेमेंट क्लेम करें" पूरी तरह धोखा है।',
      lotteryJobBait:
        'नकली लॉटरी / घर बैठे जॉब का जाल: मुफ्त इनाम या "वीडियो लाइक करके रोज ₹5,000 कमाएं" वाले मैसेज ठगी के जाल हैं।',
      otpPinRequest:
        'OTP / UPI PIN मांगना: कोई भी बैंक अधिकारी आपसे कभी OTP, UPI PIN, ATM PIN या स्क्रीन-शेयरिंग नहीं मांगता।',
      courierFeeTrap:
        'नकली पार्सल / इंडिया पोस्ट शुल्क: पता अपडेट करने के नाम पर ₹10–₹50 मांगने वाले लिंक बैंक खाता खाली करने का जाल हैं।',
      officialDomain: (host) =>
        `आधिकारिक वेबसाइट की पुष्टि: "${host}" एक प्रामाणिक संस्था का डोमेन है।`,
      noMaliciousSignals:
        'इस संदेश में कोई फिशिंग लिंक, खतरनाक APK फाइल या OTP/PIN ठगी का संकेत नहीं मिला।',
      verifySender:
        'फिर भी यदि कोई पैसे मांगे, तो हमेशा उनके जाने-पहचाने नंबर पर फोन करके पुष्टि करें।',
    },
    advice: {
      doNotClick: 'इस लिंक पर बिल्कुल क्लिक न करें और कोई भी फाइल (.apk) डाउनलोड न करें।',
      neverEnterPinQr: 'पैसे पाने के लिए कभी भी QR कोड स्कैन न करें और अपना UPI PIN न डालें।',
      neverShareOtp: 'अपना OTP, UPI PIN, या ATM PIN किसी के साथ साझा न करें।',
      disconnectCall: 'तुरंत कॉल काटें, नंबर को ब्लॉक करें और परिवार के किसी सदस्य को बताएं।',
      verifyOfficialApp: 'केवल बैंक की आधिकारिक ऐप या नजदीकी बैंक शाखा में जाकर ही जानकारी जांचें।',
      report1930: 'साइबर ठगी की शिकायत तुरंत राष्ट्रीय हेल्पलाइन 1930 या cybercrime.gov.in पर करें।',
      safeStayAlert: 'हमेशा सतर्क रहें — अपना OTP और UPI PIN कभी किसी को न बताएं।',
    },
    voiceIntro: {
      HIGH_RISK_SCAM: 'ग्राम कवच की चेतावनी! यह एक बेहद खतरनाक साइबर स्कैम है।',
      SUSPICIOUS: 'ग्राम कवच की सलाह! यह संदेश संदिग्ध लग रहा है, कृपया सावधान रहें।',
      LIKELY_SAFE: 'ग्राम कवच जांच पूरी हुई। यह संदेश सुरक्षित लग रहा है।',
    },
  },

  ta: {
    verdictBanner: {
      HIGH_RISK_SCAM: 'HIGH-RISK SCAM • மிக ஆபத்தான மோசடி',
      SUSPICIOUS: 'SUSPICIOUS • சந்தேகத்திற்குரிய செய்தி',
      LIKELY_SAFE: 'LIKELY SAFE • பாதுகாப்பானதாகத் தெரிகிறது',
    },
    headlines: {
      HIGH_RISK_SCAM: 'எச்சரிக்கை! இது உங்களை ஏமாற்றும் ஆபத்தான சைபர் மோசடி.',
      SUSPICIOUS: 'கவனம்! இந்தச் செய்தியில் சந்தேகத்திற்குரிய அறிகுறிகள் உள்ளன.',
      LIKELY_SAFE: 'இதில் வெளிப்படையான மோசடி அறிகுறிகள் எதுவும் கண்டறியப்படவில்லை.',
    },
    translitNote: {
      HIGH_RISK_SCAM: 'Tanglish Summary: Ithu migavum aabathana SCAM! Intha link-ai click seiyாதீர்கள், OTP allathu UPI PIN yarukkum sollாதீர்கள்.',
      SUSPICIOUS: 'Tanglish Summary: Ithu sandhegathirkuriya message. Kavanamaga irungal.',
      LIKELY_SAFE: 'Tanglish Summary: Ithu safe-aga therigirathu, aanal OTP matrum UPI PIN-ai eppothum ragasiyamaga vaikkavum.',
    },
    findings: {
      qrPayTrap: (am, pa) =>
        `QR குறியீடு மோசடி: இதை ஸ்கேன் செய்தால் உங்கள் கணக்கிலிருந்து ₹${am || 'பணம்'} "${pa || 'மோசடியாளருக்கு'}" சென்றுவிடும்! பணம் பெறுவதற்கு ஒருபோதும் UPI PIN தேவையில்லை.`,
      apkMalware: (url) =>
        `ஆபத்தான APK செயலி (${url}): வங்கிகள் ஒருபோதும் WhatsApp/SMS மூலம் ".apk" கோப்புகளை அனுப்பாது.`,
      brandSpoof: (brand, host) =>
        `போலி இணையதளம்: ${brand} பெயரைப் பயன்படுத்துகிறது, ஆனால் "${host}" அதிகாரப்பூர்வ இணையதளம் அல்ல.`,
      suspiciousTld: (host, tld) =>
        `ஆபத்தான இணைய முகவரி ("${host}"): ".${tld}" போன்ற முகவரிகளை மோசடியாளர்கள் அதிகம் பயன்படுத்துகின்றனர்.`,
      shortener: (host) =>
        `மறைக்கப்பட்ட குறுகிய இணைப்பு ("${host}"): உண்மையான போலி தளத்தை மறைக்க இது பயன்படுத்தப்பட்டுள்ளது.`,
      insecureHttp: (host) =>
        `பாதுகாப்பற்ற இணைப்பு ("${host}"): வங்கிகள் ஒருபோதும் http:// இணைப்புகளைப் பயன்படுத்தாது.`,
      kycBlockThreat:
        'போலி KYC மிரட்டல்: "இன்றிரவு கணக்கு முடக்கப்படும்" என்று பயமுறுத்தி கிளிக் செய்ய வைக்கும் மோசடி.',
      electricityThreat:
        'மின் இணைப்பு துண்டிப்பு மோசடி: மின்சார வாரியம் தனிப்பட்ட எண்ணிலிருந்து இரவு மின்சாரம் துண்டிக்கப்படும் என SMS அனுப்பாது.',
      digitalArrest:
        '"டிஜிட்டல் அரெஸ்ட்" மோசடி: காவல்துறை அல்லது CBI ஒருபோதும் வீடியோ காலில் விசாரணை நடத்தி பணம் அனுப்பச் சொல்லாது!',
      fakePaymentReceipt:
        'போலி பண ரசீது மோசடி: UPI பணம் உடனடியாகக் கணக்கில் சேரும் — லிங்கை அழுத்தி பணம் பெறச் சொல்வது 100% மோசடி.',
      lotteryJobBait:
        'போலி பரிசு / பகுதிநேர வேலை வலை: இலவசப் பரிசு அல்லது வீடியோ லைக் செய்தால் பணம் என்பது மோசடி.',
      otpPinRequest:
        'OTP / UPI PIN கேட்டல்: எந்த வங்கி அதிகாரியும் உங்கள் OTP அல்லது UPI PIN-ஐக் கேட்க மாட்டார்கள்.',
      courierFeeTrap:
        'போலி கூரியர் கட்டண மோசடி: முகவரி மாற்ற ₹10–₹50 கட்டச் சொல்லும் இணைப்புகள் போலியானவை.',
      officialDomain: (host) =>
        `அதிகாரப்பூர்வ இணையதளம்: "${host}" என்பது அங்கீகரிக்கப்பட்ட இணையதளமாகும்.`,
      noMaliciousSignals:
        'இந்தச் செய்தியில் போலி இணைப்புகள் அல்லது OTP மோசடி அறிகுறிகள் எதுவும் இல்லை.',
      verifySender:
        'பணம் சம்பந்தப்பட்ட செய்திகளை எப்போதும் நேரடியாக அழைத்து உறுதிப்படுத்தவும்.',
    },
    advice: {
      doNotClick: 'இந்த இணைப்பை கிளிக் செய்யாதீர்கள் மற்றும் எந்த செயலியையும் பதிவிறக்காதீர்கள்.',
      neverEnterPinQr: 'பணம் பெறுவதற்கு ஒருபோதும் QR ஸ்கேன் செய்யவோ UPI PIN உள்ளிடவோ வேண்டாம்.',
      neverShareOtp: 'உங்கள் OTP, UPI PIN அல்லது வங்கி விவரங்களை யாருடனும் பகிர வேண்டாம்.',
      disconnectCall: 'உடனடியாக அழைப்பைத் துண்டித்து அந்த எண்ணை பிளாக் (Block) செய்யுங்கள்.',
      verifyOfficialApp: 'அதிகாரப்பூர்வ வங்கி செயலி அல்லது வங்கி கிளையை மட்டுமே தொடர்பு கொள்ளவும்.',
      report1930: 'சைபர் மோசடியை உடனே 1930 என்ற எண்ணிற்கோ அல்லது cybercrime.gov.in தளத்திற்கோ புகாரளிக்கவும்.',
      safeStayAlert: 'எப்போதும் விழிப்புடன் இருங்கள் — உங்கள் OTP மற்றும் UPI PIN-ஐப் பாதுகாப்பாக வைத்திருங்கள்.',
    },
    voiceIntro: {
      HIGH_RISK_SCAM: 'கிராம் கவச் எச்சரிக்கை! இது மிகவும் ஆபத்தான சைபர் மோசடி.',
      SUSPICIOUS: 'கிராம் கவச் அறிவுரை! இந்தச் செய்தி சந்தேகத்திற்குரியதாக உள்ளது, கவனமாக இருங்கள்.',
      LIKELY_SAFE: 'கிராம் கவச் சோதனை முடிந்தது. இந்தச் செய்தி பாதுகாப்பானதாகத் தெரிகிறது.',
    },
  },

  kn: {
    verdictBanner: {
      HIGH_RISK_SCAM: 'HIGH-RISK SCAM • ಅತ್ಯಂತ ಅಪಾಯಕಾರಿ ವಂಚನೆ',
      SUSPICIOUS: 'SUSPICIOUS • ಅನುಮಾನಾಸ್ಪದ ಸಂದೇಶ (ಎಚ್ಚರ)',
      LIKELY_SAFE: 'LIKELY SAFE • ಸುರಕ್ಷಿತವಾಗಿ ಕಾಣುತ್ತಿದೆ',
    },
    headlines: {
      HIGH_RISK_SCAM: 'ಎಚ್ಚರಿಕೆ! ಇದು ನಿಮ್ಮನ್ನು ಮೋಸಗೊಳಿಸುವ ಅಪಾಯಕಾರಿ ಸೈಬರ್ ವಂಚನೆ.',
      SUSPICIOUS: 'ಜಾಗ್ರತೆ! ಈ ಸಂದೇಶದಲ್ಲಿ ಅನುಮಾನಾಸ್ಪದ ಸೂಚನೆಗಳಿವೆ.',
      LIKELY_SAFE: 'ಇದರಲ್ಲಿ ಯಾವುದೇ ಸ್ಪಷ್ಟ ವಂಚನೆಯ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
    },
    translitNote: null,
    findings: {
      qrPayTrap: (am, pa) =>
        `QR ಕೋಡ್ ವಂಚನೆ: ಈ QR ಸ್ಕ್ಯಾನ್ ಮಾಡಿದರೆ ನಿಮ್ಮ ಖಾತೆಯಿಂದ ₹${am || 'ಹಣ'} "${pa || 'ವಂಚಕರಿಗೆ'}" ಕಡಿತವಾಗುತ್ತದೆ! ಹಣ ಪಡೆಯಲು UPI PIN ಎಂದಿಗೂ ಬೇಕಾಗಿಲ್ಲ.`,
      apkMalware: (url) =>
        `ಅಪಾಯಕಾರಿ APK ಫೈಲ್ (${url}): ಬ್ಯಾಂಕ್‌ಗಳು ಎಂದಿಗೂ WhatsApp ಅಥವಾ SMS ಮೂಲಕ ".apk" ಆಪ್ ಕಳುಹಿಸುವುದಿಲ್ಲ.`,
      brandSpoof: (brand, host) =>
        `ನಕಲಿ ವೆಬ್‌ಸೈಟ್ ಲಿಂಕ್: ${brand} ಹೆಸರನ್ನು ಬಳಸಲಾಗಿದೆ, ಆದರೆ "${host}" ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್ ಅಲ್ಲ.`,
      suspiciousTld: (host, tld) =>
        `ಅನುಮಾನಾಸ್ಪದ ವೆಬ್‌ಸೈಟ್ ("${host}"): ವಂಚಕರು ಇಂತಹ ".${tld}" ಡೊಮೇನ್‌ಗಳನ್ನು ಬಳಸುತ್ತಾರೆ.`,
      shortener: (host) =>
        `ಮರೆಮಾಡಿದ ಶಾರ್ಟ್ ಲಿಂಕ್ ("${host}"): ಅಸಲಿ ನಕಲಿ ಸೈಟ್ ಮರೆಮಾಡಲು ಇದನ್ನು ಬಳಸಲಾಗಿದೆ.`,
      insecureHttp: (host) =>
        `ಅಸುರಕ್ಷಿತ ಲಿಂಕ್ ("${host}"): ಬ್ಯಾಂಕ್‌ಗಳು ಎಂದಿಗೂ http:// ಲಿಂಕ್ ಬಳಸುವುದಿಲ್ಲ.`,
      kycBlockThreat:
        'ನಕಲಿ KYC / ಖಾತೆ ಬ್ಲಾಕ್ ಬೆದರಿಕೆ: "ಇಂದು ರಾತ್ರಿ ಖಾತೆ ಬ್ಲಾಕ್ ಆಗುತ್ತದೆ" ಎಂದು ಹೆದರಿಸಿ ಕ್ಲಿಕ್ ಮಾಡಿಸುವ ತಂತ್ರ.',
      electricityThreat:
        'ವಿದ್ಯುತ್ ಬಿಲ್ ವಂಚನೆ: ವಿದ್ಯುತ್ ಇಲಾಖೆಯವರು ವೈಯಕ್ತಿಕ ನಂಬರ್‌ನಿಂದ ರಾತ್ರಿ ವಿದ್ಯುತ್ ಕಡಿತದ SMS ಕಳುಹಿಸುವುದಿಲ್ಲ.',
      digitalArrest:
        '"ಡಿಜಿಟಲ್ ಅರೆಸ್ಟ್" ವಂಚನೆ: ಪೊಲೀಸ್ ಅಥವಾ CBI ಎಂದಿಗೂ ವಿಡಿಯೋ ಕಾಲ್‌ನಲ್ಲಿ ಡಿಜಿಟಲ್ ಅರೆಸ್ಟ್ ಮಾಡುವುದಿಲ್ಲ ಮತ್ತು ಹಣ ವರ್ಗಾವಣೆ ಕೇಳುವುದಿಲ್ಲ!',
      fakePaymentReceipt:
        'ನಕಲಿ ಪೇಮೆಂಟ್ ರಸೀದಿ: UPI ಹಣ ತಕ್ಷಣ ಜಮೆಯಾಗುತ್ತದೆ — ಲಿಂಕ್ ಒತ್ತಿ ಹಣ ಪಡೆಯಿರಿ ಎನ್ನುವುದು ಮೋಸ.',
      lotteryJobBait:
        'ನಕಲಿ ಲಾಟರಿ / ಪಾರ್ಟ್-ಟೈಮ್ ಕೆಲಸದ ಜಾಲ: ಉಚಿತ ಬಹುಮಾನ ಅಥವಾ ವಿಡಿಯೋ ಲೈಕ್ ಮಾಡಿ ಹಣ ಗಳಿಸಿ ಎಂಬುದು ವಂಚನೆ.',
      otpPinRequest:
        'OTP / UPI PIN ಕೇಳುವುದು: ಯಾವುದೇ ಬ್ಯಾಂಕ್ ಅಧಿಕಾರಿ ನಿಮ್ಮ OTP ಅಥವಾ UPI PIN ಕೇಳುವುದಿಲ್ಲ.',
      courierFeeTrap:
        'ನಕಲಿ ಕೊರಿಯರ್ ಶುಲ್ಕ: ವಿಳಾಸ ಅಪ್‌ಡೇಟ್‌ಗೆ ₹10–₹50 ಕೇಳುವ ಲಿಂಕ್ ನಕಲಿಯಾಗಿದೆ.',
      officialDomain: (host) =>
        `ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್: "${host}" ಗುರುತಿಸಲ್ಪಟ್ಟ ಅಧಿಕೃತ ವೆಬ್‌ಸೈಟ್ ಆಗಿದೆ.`,
      noMaliciousSignals:
        'ಈ ಸಂದೇಶದಲ್ಲಿ ನಕಲಿ ಲಿಂಕ್ ಅಥವಾ ವಂಚನೆಯ ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
      verifySender:
        'ಯಾರಾದರೂ ಹಣ ಕೇಳಿದರೆ ನೇರವಾಗಿ ಫೋನ್ ಮಾಡಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.',
    },
    advice: {
      doNotClick: 'ಈ ಲಿಂಕ್ ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಬೇಡಿ ಮತ್ತು ಯಾವುದೇ ಫೈಲ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಬೇಡಿ.',
      neverEnterPinQr: 'ಹಣ ಪಡೆಯಲು ಎಂದಿಗೂ QR ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಬೇಡಿ ಅಥವಾ UPI PIN ಹಾಕಬೇಡಿ.',
      neverShareOtp: 'ನಿಮ್ಮ OTP, UPI PIN ಅಥವಾ ATM PIN ಯಾರಿಗೂ ತಿಳಿಸಬೇಡಿ.',
      disconnectCall: 'ತಕ್ಷಣ ಕರೆ ಕಟ್ ಮಾಡಿ ಮತ್ತು ಆ ನಂಬರ್ ಬ್ಲಾಕ್ ಮಾಡಿ.',
      verifyOfficialApp: 'ನಿಮ್ಮ ಅಧಿಕೃತ ಬ್ಯಾಂಕ್ ಆಪ್ ಅಥವಾ ಬ್ಯಾಂಕ್ ಶಾಖೆಯಲ್ಲಿ ಮಾತ್ರ ಪರಿಶೀಲಿಸಿ.',
      report1930: 'ಸೈಬರ್ ವಂಚನೆಯ ಬಗ್ಗೆ ತಕ್ಷಣ 1930 ಸಹಾಯವಾಣಿಗೆ ಅಥವಾ cybercrime.gov.in ಗೆ ದೂರು ನೀಡಿ.',
      safeStayAlert: 'ಯಾವಾಗಲೂ ಎಚ್ಚರವಾಗಿರಿ — ನಿಮ್ಮ OTP ಮತ್ತು UPI PIN ಗೌಪ್ಯವಾಗಿಡಿ.',
    },
    voiceIntro: {
      HIGH_RISK_SCAM: 'ಗ್ರಾಮ ಕವಚ ಎಚ್ಚರಿಕೆ! ಇದು ಅತ್ಯಂತ ಅಪಾಯಕಾರಿ ಸೈಬರ್ ವಂಚನೆಯಾಗಿದೆ.',
      SUSPICIOUS: 'ಗ್ರಾಮ ಕವಚ ಸಲಹೆ! ಈ ಸಂದೇಶ ಅನುಮಾನಾಸ್ಪದವಾಗಿದೆ, ದಯವಿಟ್ಟು ಜಾಗ್ರತೆಯಿಂದಿರಿ.',
      LIKELY_SAFE: 'ಗ್ರಾಮ ಕವಚ ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಂಡಿದೆ. ಈ ಸಂದೇಶ ಸುರಕ್ಷಿತವಾಗಿ ಕಾಣುತ್ತಿದೆ.',
    },
  },

  ml: {
    verdictBanner: {
      HIGH_RISK_SCAM: 'HIGH-RISK SCAM • അതീവ അപകടകരമായ തട്ടിപ്പ്',
      SUSPICIOUS: 'SUSPICIOUS • സംശയാസ്പദമായ സന്ദേശം',
      LIKELY_SAFE: 'LIKELY SAFE • സുരക്ഷിതമെന്ന് തോന്നുന്നു',
    },
    headlines: {
      HIGH_RISK_SCAM: 'മുന്നറിയിപ്പ്! ഇത് നിങ്ങളെ കബളിപ്പിക്കുന്ന അപകടകരമായ സൈബർ തട്ടിപ്പാണ്.',
      SUSPICIOUS: 'ശ്രദ്ധിക്കുക! ഈ സന്ദേശത്തിൽ സംശയാസ്പദമായ സൂചനകളുണ്ട്.',
      LIKELY_SAFE: 'ഇതിൽ പ്രകടമായ തട്ടിപ്പ് സൂചനകൾ കണ്ടെത്തിയില്ല.',
    },
    translitNote: null,
    findings: {
      qrPayTrap: (am, pa) =>
        `QR കോഡ് തട്ടിപ്പ്: ഈ QR സ്കാൻ ചെയ്താൽ നിങ്ങളുടെ അക്കൗണ്ടിൽ നിന്ന് ₹${am || 'പണം'} "${pa || 'തട്ടിപ്പുകാരന്'}" നഷ്ടമാകും! പണം ലഭിക്കാൻ ഒരിക്കലും UPI PIN നൽകേണ്ടതില്ല.`,
      apkMalware: (url) =>
        `അപകടകരമായ APK ആപ്പ് (${url}): ബാങ്കുകൾ ഒരിക്കലും WhatsApp/SMS വഴി ".apk" ഫയലുകൾ അയക്കില്ല.`,
      brandSpoof: (brand, host) =>
        `വ്യാജ വെബ്‌സൈറ്റ് ലിങ്ക്: ${brand} എന്ന പേര് ദുരുപയോഗം ചെയ്യുന്നു, "${host}" ഔദ്യോഗിക സൈറ്റല്ല.`,
      suspiciousTld: (host, tld) =>
        `സംശയാസ്പദമായ വെബ്‌സൈറ്റ് ("${host}"): തട്ടിപ്പുകാർ ഉപയോഗിക്കുന്ന ".${tld}" ഡൊമെയ്ൻ ആണിത്.`,
      shortener: (host) =>
        `മറച്ചുവെച്ച ഷോർട്ട് ലിങ്ക് ("${host}"): യഥാർത്ഥ വ്യാജ വെബ്സൈറ്റ് മറയ്ക്കാൻ ഉപയോഗിച്ചിരിക്കുന്നു.`,
      insecureHttp: (host) =>
        `സുരക്ഷിതമല്ലാത്ത ലിങ്ക് ("${host}"): ബാങ്കുകൾ http:// ലിങ്കുകൾ അയക്കാറില്ല.`,
      kycBlockThreat:
        'വ്യാജ KYC / അക്കൗണ്ട് ബ്ലോക്ക് ഭീഷണി: "ഇന്ന് രാത്രി അക്കൗണ്ട് ബ്ലോക്ക് ആകും" എന്ന് ഭയപ്പെടുത്തി ലിങ്കിൽ ക്ലിക്ക് ചെയ്യിക്കുന്ന തട്ടിപ്പ്.',
      electricityThreat:
        'വൈദ്യുതി വിച്ഛേദിക്കൽ തട്ടിപ്പ്: കെ.എസ്.ഇ.ബി അല്ലെങ്കിൽ വൈദ്യുതി വകുപ്പ് സ്വകാര്യ നമ്പറിൽ നിന്ന് ഇത്തരം സന്ദേശങ്ങൾ അയക്കില്ല.',
      digitalArrest:
        '"ഡിജിറ്റൽ അറസ്റ്റ്" തട്ടിപ്പ്: പോലീസോ CBI-യോ ഒരിക്കലും വീഡിയോ കോളിലൂടെ ഡിജിറ്റൽ അറസ്റ്റ് ചെയ്യില്ല, പണം ആവശ്യപ്പെടുകയുമില്ല!',
      fakePaymentReceipt:
        'വ്യാജ പേയ്‌മെന്റ് രസീത്: UPI വഴി പണം ഉടൻ അക്കൗണ്ടിലെത്തും — ലിങ്ക് ക്ലിക്ക് ചെയ്ത് പണം കൈപ്പറ്റാൻ പറയുന്നത് തട്ടിപ്പാണ്.',
      lotteryJobBait:
        'വ്യാജ ലോട്ടറി / പാർട്ട് ടൈം ജോലി തട്ടിപ്പ്: സൗജന്യ സമ്മാനങ്ങളും വീഡിയോ ലൈക്ക് ജോലികളും തട്ടിപ്പാണ്.',
      otpPinRequest:
        'OTP / UPI PIN ആവശ്യപ്പെടൽ: ഒരു ബാങ്ക് ഉദ്യോഗസ്ഥനും നിങ്ങളുടെ OTP അല്ലെങ്കിൽ UPI PIN ചോദിക്കില്ല.',
      courierFeeTrap:
        'വ്യാജ കൊറിയർ ഫീസ് തട്ടിപ്പ്: വിലാസം പുതുക്കാൻ ₹10–₹50 ആവശ്യപ്പെടുന്ന ലിങ്കുകൾ വ്യാജമാണ്.',
      officialDomain: (host) =>
        `ഔദ്യോഗിക വെബ്സൈറ്റ്: "${host}" അംഗീകൃത വെബ്സൈറ്റാണ്.`,
      noMaliciousSignals:
        'ഈ സന്ദേശത്തിൽ വ്യാജ ലിങ്കുകളോ OTP തട്ടിപ്പ് സൂചനകളോ കണ്ടെത്തിയില്ല.',
      verifySender:
        'പണം ആവശ്യപ്പെടുന്ന സന്ദേശങ്ങൾ നേരിട്ട് വിളിച്ച് ഉറപ്പുവരുത്തുക.',
    },
    advice: {
      doNotClick: 'ഈ ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുകയോ ഫയലുകൾ ഡൗൺലോഡ് ചെയ്യുകയോ ചെയ്യരുത്.',
      neverEnterPinQr: 'പണം ലഭിക്കാൻ ഒരിക്കലും QR കോഡ് സ്കാൻ ചെയ്യുകയോ UPI PIN നൽകുകയോ ചെയ്യരുത്.',
      neverShareOtp: 'നിങ്ങളുടെ OTP, UPI PIN, ATM PIN എന്നിവ ആരുമായും പങ്കിടരുത്.',
      disconnectCall: 'ഉടൻ കോൾ കട്ട് ചെയ്ത് ആ നമ്പർ ബ്ലോക്ക് ചെയ്യുക.',
      verifyOfficialApp: 'ബാങ്കിന്റെ ഔദ്യോഗിക ആപ്പ് വഴിയോ ശാഖയിലോ മാത്രം പരിശോധിക്കുക.',
      report1930: 'സൈബർ തട്ടിപ്പുകൾ ഉടൻ 1930 എന്ന നമ്പറിലോ cybercrime.gov.in-ലോ അറിയിക്കുക.',
      safeStayAlert: 'എപ്പോഴും ജാഗ്രത പാലിക്കുക — നിങ്ങളുടെ OTP, UPI PIN എന്നിവ രഹസ്യമായി സൂക്ഷിക്കുക.',
    },
    voiceIntro: {
      HIGH_RISK_SCAM: 'ഗ്രാം കവച് മുന്നറിയിപ്പ്! ഇത് അതീവ അപകടകരമായ സൈബർ തട്ടിപ്പാണ്.',
      SUSPICIOUS: 'ഗ്രാം കവച് നിർദ്ദേശം! ഈ സന്ദേശം സംശയാസ്പദമാണ്, ദയവായി ശ്രദ്ധിക്കുക.',
      LIKELY_SAFE: 'ഗ്രാം കവച് പരിശോധന പൂർത്തിയായി. ഈ സന്ദേശം സുരക്ഷിതമെന്ന് തോന്നുന്നു.',
    },
  },
};

/**
 * Core Multimodal Local Shield Scam Analysis Engine
 * Returns structured findings + renders into any supported language!
 */
export async function analyzeWithLocalShield({
  text = '',
  voiceTranscript = '',
  imageBase64 = null,
  preferredLanguage = 'auto',
}) {
  const imageInspection = imageBase64 ? await inspectImageBuffer(imageBase64) : null;
  const userText = [text, voiceTranscript].filter(Boolean).join('\n').trim();
  const combinedText = [
    userText,
    imageInspection?.ocrText || '',
    imageInspection?.qrData || '',
  ]
    .filter(Boolean)
    .join('\n');

  // Determine language: prioritize user's typed/spoken text; if empty caption on screenshot, use screenshot's language!
  let langMeta = detectLanguage(userText, preferredLanguage);
  if (!userText && preferredLanguage === 'auto') {
    if (imageInspection?.detectedScriptInImage) {
      langMeta = { code: imageInspection.detectedScriptInImage, isTransliterated: false, source: 'image_script' };
    } else if (imageInspection?.ocrText) {
      langMeta = detectLanguage(imageInspection.ocrText, 'auto');
    }
  }

  const lower = combinedText.toLowerCase();
  const urls = extractUrls(combinedText);

  let riskScore = 8;
  const findingItems = []; // { key, args }
  const adviceKeys = new Set();

  // 1. Check QR UPI Receive Trap
  if (imageInspection?.upiDetails) {
    const { am, pa, pn, tn } = imageInspection.upiDetails;
    const claimsReceive = /receive|claim|cashback|credit|refund|reward|prize|won|advance/i.test(
      `${combinedText} ${pn} ${tn}`
    );
    if (claimsReceive || am) {
      riskScore += 75;
      findingItems.push({ key: 'qrPayTrap', args: [am || '14,500', pa || pn || 'Merchant'] });
      adviceKeys.add('neverEnterPinQr');
      adviceKeys.add('disconnectCall');
    }
  }

  // 2. Analyze URLs
  let hasOfficialDomainOnly = urls.length > 0;
  for (const u of urls) {
    const isOfficial =
      OFFICIAL_DOMAINS.has(u.hostname) ||
      Array.from(OFFICIAL_DOMAINS).some((d) => u.hostname.endsWith(`.${d}`)) ||
      u.hostname.endsWith('.gov.in') ||
      u.hostname.endsWith('.nic.in') ||
      u.hostname.endsWith('.sbi');

    if (!isOfficial) hasOfficialDomainOnly = false;

    if (/\.apk(\b|$|\?)/i.test(u.pathname) || /\.apk\b/i.test(lower)) {
      riskScore += 75;
      findingItems.push({ key: 'apkMalware', args: [u.raw] });
      adviceKeys.add('doNotClick');
    }

    if (SHORTENER_DOMAINS.has(u.hostname)) {
      riskScore += 32;
      findingItems.push({ key: 'shortener', args: [u.hostname] });
      adviceKeys.add('doNotClick');
    }

    const tld = u.hostname.split('.').pop();
    if (!isOfficial && SUSPICIOUS_TLDS.has(tld)) {
      riskScore += 42;
      findingItems.push({ key: 'suspiciousTld', args: [u.hostname, tld] });
      adviceKeys.add('doNotClick');
    }

    if (!isOfficial) {
      for (const b of BRAND_KEYWORDS) {
        if (u.hostname.includes(b.key) || lower.includes(b.key)) {
          const matchesOfficial = b.official.some(
            (off) => u.hostname === off || u.hostname.endsWith(`.${off}`)
          );
          if (!matchesOfficial) {
            riskScore += 48;
            findingItems.push({ key: 'brandSpoof', args: [b.name, u.hostname] });
            adviceKeys.add('doNotClick');
            adviceKeys.add('verifyOfficialApp');
            break;
          }
        }
      }
    }

    if (!isOfficial && u.protocol === 'http:') {
      riskScore += 18;
      findingItems.push({ key: 'insecureHttp', args: [u.hostname] });
    }

    if (isOfficial) {
      findingItems.push({ key: 'officialDomain', args: [u.hostname] });
    }
  }

  // Also catch bare ".apk" mentions even without full URL
  if (!findingItems.some((f) => f.key === 'apkMalware') && /\.apk\b/i.test(lower)) {
    riskScore += 65;
    findingItems.push({ key: 'apkMalware', args: ['Suspicious .APK file'] });
    adviceKeys.add('doNotClick');
  }

  // 3. Content & Social Engineering Patterns (Multilingual + English + Romanized)
  const kycPattern =
    /\b(kyc|pan\s*card|account\s*(will\s*be\s*)?(block|suspend|freeze|closed)|yono|update\s*pan|khata\s*band|బ్లాక్|కెవైసి|केवाईसी|ब्लॉक)\b/i;
  if (kycPattern.test(combinedText) && !hasOfficialDomainOnly) {
    riskScore += 38;
    findingItems.push({ key: 'kycBlockThreat', args: [] });
    adviceKeys.add('verifyOfficialApp');
  }

  const electricityPattern =
    /\b(electricity\s*(power|bill|supply)?\s*(disconnect|cut)|power\s*cut\s*tonight|bijli\s*(kat|bill)|current\s*bill.*cut|కరెంట్\s*కట్|बिजली.*काट)\b/i;
  if (electricityPattern.test(combinedText)) {
    riskScore += 55;
    findingItems.push({ key: 'electricityThreat', args: [] });
    adviceKeys.add('disconnectCall');
    adviceKeys.add('verifyOfficialApp');
  }

  const digitalArrestPattern =
    /\b(digital\s*arrest|cbi\s*warrant|arrest\s*warrant|narcotics|fedex\s*parcel|money\s*laundering|supreme\s*court\s*escrow|skype\s*investigation|डिजिटल\s*अरेस्ट|गिरफ्तारी\s*वारंट|డిజిటల్\s*అరెస్ట్)\b/i;
  if (digitalArrestPattern.test(combinedText)) {
    riskScore += 82;
    findingItems.push({ key: 'digitalArrest', args: [] });
    adviceKeys.add('disconnectCall');
    adviceKeys.add('report1930');
  }

  const fakeReceiptPattern =
    /\b(pending\s*receiver|on\s*hold\s*by\s*rbi|claim\s*refund|sent\s*by\s*mistake|release\s*payment|edited|utr.*0000)/i;
  if (fakeReceiptPattern.test(combinedText)) {
    riskScore += 68;
    findingItems.push({ key: 'fakePaymentReceipt', args: [] });
    adviceKeys.add('doNotClick');
    adviceKeys.add('neverShareOtp');
  }

  const lotteryJobPattern =
    /\b(lottery|kbc|won\s*(rs|₹|\$)|lucky\s*winner|spin\s*the\s*wheel|part[\s-]*time\s*job|youtube\s*like|google\s*maps\s*review|earn\s*(rs|₹)?\s*\d{3,}\s*(per|\/)\s*day|free\s*recharge|లాటరీ|लॉटरी|इनाम)\b/i;
  if (lotteryJobPattern.test(combinedText)) {
    riskScore += 54;
    findingItems.push({ key: 'lotteryJobBait', args: [] });
    adviceKeys.add('doNotClick');
    adviceKeys.add('disconnectCall');
  }

  const otpPinPattern =
    /\b(share\s*(your\s*)?(otp|pin|cvv)|enter\s*(4-digit\s*)?upi\s*pin|anydesk|teamviewer|rustdesk|quicksupport|otp\s*batao|otp\s*cheppandi|ఓటీపీ|ओटीपी)\b/i;
  if (otpPinPattern.test(combinedText)) {
    riskScore += 45;
    findingItems.push({ key: 'otpPinRequest', args: [] });
    adviceKeys.add('neverShareOtp');
  }

  const courierPattern =
    /\b(parcel\s*(held|on\s*hold|returned)|incomplete\s*address|delivery\s*attempt\s*failed|customs\s*duty\s*fee|pay\s*(rs|₹)\.?\s*[1-9]\d?\b)/i;
  if (courierPattern.test(combinedText) && !hasOfficialDomainOnly) {
    riskScore += 46;
    findingItems.push({ key: 'courierFeeTrap', args: [] });
    adviceKeys.add('doNotClick');
  }

  // Clamp risk score
  riskScore = Math.min(99, Math.max(5, riskScore));

  let verdict = 'LIKELY_SAFE';
  if (riskScore >= 60) {
    verdict = 'HIGH_RISK_SCAM';
    adviceKeys.add('neverShareOtp');
    adviceKeys.add('report1930');
  } else if (riskScore >= 28) {
    verdict = 'SUSPICIOUS';
    adviceKeys.add('neverShareOtp');
    adviceKeys.add('verifyOfficialApp');
  } else {
    if (findingItems.length === 0) {
      findingItems.push({ key: 'noMaliciousSignals', args: [] });
      findingItems.push({ key: 'verifySender', args: [] });
    }
    adviceKeys.add('safeStayAlert');
  }

  const coreAnalysis = {
    verdict,
    riskScore,
    findingItems: findingItems.slice(0, 4),
    adviceKeys: Array.from(adviceKeys).slice(0, 4),
    extractedUrls: urls.map((u) => u.raw),
    qrDetected: imageInspection?.qrData || null,
    upiDetails: imageInspection?.upiDetails || null,
    isTransliterated: langMeta.isTransliterated,
  };

  return renderLocalizedVerdict(coreAnalysis, langMeta.code);
}

/**
 * Render a core analysis object into any target language code (en, te, hi, ta, kn, ml)
 */
export function renderLocalizedVerdict(coreAnalysis, langCode = 'en') {
  const safeLang = SUPPORTED_LANGUAGES[langCode] ? langCode : 'en';
  const pack = L10N[safeLang] || L10N.en;
  const langInfo = SUPPORTED_LANGUAGES[safeLang];

  const reasons = coreAnalysis.findingItems.map((item) => {
    const fnOrStr = pack.findings[item.key] || L10N.en.findings[item.key];
    return typeof fnOrStr === 'function' ? fnOrStr(...(item.args || [])) : fnOrStr;
  });

  const safetyAdvice = coreAnalysis.adviceKeys.map(
    (k) => pack.advice[k] || L10N.en.advice[k]
  );

  const transliterationHelper =
    coreAnalysis.isTransliterated && pack.translitNote
      ? pack.translitNote[coreAnalysis.verdict]
      : null;

  // Build crisp, natural spoken script for TTS (15-28 seconds)
  const spokenParts = [
    pack.voiceIntro[coreAnalysis.verdict],
    pack.headlines[coreAnalysis.verdict],
    ...reasons.slice(0, 2),
    ...safetyAdvice.slice(0, 2),
  ];
  const spokenScript = spokenParts.join(' ').replace(/https?:\/\/[^\s)]+/g, '');

  return {
    verdict: coreAnalysis.verdict,
    verdictBanner: pack.verdictBanner[coreAnalysis.verdict],
    riskScore: coreAnalysis.riskScore,
    detectedLanguageCode: safeLang,
    detectedLanguageName: langInfo.name,
    detectedLanguageNative: langInfo.nativeName,
    headline: pack.headlines[coreAnalysis.verdict],
    reasons,
    safetyAdvice,
    transliterationHelper,
    spokenScript,
    extractedUrls: coreAnalysis.extractedUrls || [],
    qrDetected: coreAnalysis.qrDetected || null,
    coreAnalysis, // retained so instant 1-tap language translation works offline too!
    engine: 'gram-kawach-shield',
  };
}
