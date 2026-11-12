import { SampleCase, LanguageOption } from '../types';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'auto', bcp47: 'auto', name: 'Auto-Detect', nativeName: 'Auto' },
  { code: 'te', bcp47: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'hi', bcp47: 'hi-IN', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', bcp47: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'kn', bcp47: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', bcp47: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'en', bcp47: 'en-IN', name: 'English', nativeName: 'English' },
];

export const QUICK_TRANSLATE_PILLS: LanguageOption[] = LANGUAGE_OPTIONS.filter(
  (l) => l.code !== 'auto'
);

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'tenglish-kyc-apk',
    badge: 'Tenglish + APK Link',
    badgeColor: 'red',
    title: '"Idi scam aa?" — Fake SBI KYC .APK Trap',
    subtitle: 'Tests Romanized Telugu (Tenglish) -> Native తెలుగు reply + Telugu Voice Alert',
    languageTag: 'Tenglish → తెలుగు',
    text: 'Anna naaku ee SMS vachindi, idi scam aa? Dear customer your SBI YONO account will be blocked tonight, update PAN KYC immediately: http://sbi-kyc-panupdate.top/SBI-KYC.apk',
  },
  {
    id: 'upi-qr-poster',
    badge: 'QR Screenshot',
    badgeColor: 'red',
    title: 'OLX Buyer "Scan QR to Receive ₹14,500"',
    subtitle: 'Uploads UPI QR poster & decodes real upi://pay QR trap inside image',
    languageTag: 'Screenshot + QR Scan',
    text: 'An OLX buyer sent me this QR code saying scan in PhonePe and enter UPI PIN to receive ₹14,500 advance. Should I scan it?',
    sampleImageUrl: '/samples/upi-qr-scam.png',
    sampleImageName: 'upi-qr-scam.png',
  },
  {
    id: 'telugu-screenshot-only',
    badge: 'Image Only (తెలుగు)',
    badgeColor: 'red',
    title: 'Telugu Bank Alert Screenshot (No Caption)',
    subtitle: 'Uploads Telugu SMS screenshot with zero text — auto-replies & speaks in తెలుగు',
    languageTag: 'తెలుగు Image',
    text: '',
    sampleImageUrl: '/samples/telugu-sbi-kyc.png',
    sampleImageName: 'telugu-sbi-kyc.png',
  },
  {
    id: 'digital-arrest-hindi',
    badge: 'हिंदी Screenshot',
    badgeColor: 'red',
    title: 'CBI "Digital Arrest" Warrant (हिंदी)',
    subtitle: 'Tests fake FedEx/CBI video-call extortion notice with Hindi Voice Alert',
    languageTag: 'हिंदी',
    text: 'मुझे WhatsApp पर यह CBI डिजिटल अरेस्ट नोटिस भेजा गया है और पैसे ट्रांसफर करने को कह रहे हैं। क्या यह असली है?',
    sampleImageUrl: '/samples/digital-arrest-hindi.png',
    sampleImageName: 'digital-arrest-hindi.png',
  },
  {
    id: 'fake-upi-receipt',
    badge: 'Fake Receipt',
    badgeColor: 'amber',
    title: 'Doctored ₹25,000 "Payment On Hold" Screenshot',
    subtitle: 'Tests edited UPI payment confirmation asking to click refund link & share OTP',
    languageTag: 'English Screenshot',
    text: 'A customer sent this ₹25,000 screenshot saying payment is on hold by RBI server and I must click the link to receive it.',
    sampleImageUrl: '/samples/fake-upi-receipt.png',
    sampleImageName: 'fake-upi-receipt.png',
  },
  {
    id: 'safe-rbi-link',
    badge: 'Safe Check',
    badgeColor: 'green',
    title: 'Official RBI Website Check (rbi.org.in)',
    subtitle: 'Verifies how Gram Kawach confirms legitimate official domains as LIKELY SAFE',
    languageTag: 'English',
    text: 'My bank branch shared https://rbi.org.in to read official Reserve Bank customer awareness guidelines. Is this link safe?',
  },
];
