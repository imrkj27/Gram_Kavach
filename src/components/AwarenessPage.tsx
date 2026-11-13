import React from 'react';
import {
  ArrowLeft,
  Banknote,
  ExternalLink,
  FileText,
  HeartHandshake,
  Phone,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';

interface AwarenessPageProps {
  onBack: () => void;
}

const scams = [
  {
    titleTe: 'నకిలీ SBI KYC సందేశాలు',
    titleEn: 'Fake SBI KYC messages',
    bodyTe: 'మీ ఖాతా బ్లాక్ అవుతుందని చెప్పి లింక్ పంపడం లేదా APK యాప్ ఇన్‌స్టాల్ చేయమని అడగడం మోసం కావచ్చు. సందేశంలోని లింక్‌ను తెరవకండి; OTP, PIN లేదా కార్డు వివరాలు ఇవ్వకండి. బ్యాంకును అధికారిక యాప్ లేదా కార్డు వెనుక ఉన్న నంబర్ ద్వారా సంప్రదించండి.',
    bodyEn: 'A message threatening to block your account and asking you to open a link or install an APK may be a scam. Do not open its link or share an OTP, PIN, or card details. Contact your bank using its official app or the number printed on your card.',
  },
  {
    titleTe: 'OLX కొనుగోలుదారు / UPI QR మోసం',
    titleEn: 'OLX buyer / UPI QR scams',
    bodyTe: 'కొనుగోలుదారు డబ్బు పంపడానికి QR స్కాన్ చేయమని లేదా UPI PIN నమోదు చేయమని చెబితే జాగ్రత్త. డబ్బు స్వీకరించడానికి PIN అవసరం లేదు. స్క్రీన్-షేరింగ్ యాప్‌లు ఇన్‌స్టాల్ చేయకండి; వస్తువు అందజేసే ముందు చెల్లింపు నిజంగా వచ్చిందో మీ బ్యాంక్ యాప్‌లో చూడండి.',
    bodyEn: 'Be cautious if a buyer asks you to scan a QR code or enter your UPI PIN to receive money. You never need a PIN to receive money. Do not install screen-sharing apps; confirm payment in your bank app before handing over an item.',
  },
  {
    titleTe: 'తెలుగు బ్యాంక్ అలర్ట్ పేరుతో మోసం',
    titleEn: 'Fake Telugu bank alerts',
    bodyTe: 'తెలుగులో వచ్చిన బ్యాంక్ హెచ్చరికలా కనిపించే SMS లేదా కాల్‌లో ఖాతా నిలిపివేత, రివార్డు లేదా KYC అప్‌డేట్ పేరుతో లింక్/OTP అడగవచ్చు. సందేశంలోని నంబర్‌కు తిరిగి కాల్ చేయకండి; అధికారిక బ్యాంక్ మార్గాలనే ఉపయోగించండి.',
    bodyEn: 'A Telugu SMS or call pretending to be a bank alert may ask for a link, OTP, or details under the pretext of an account block, reward, or KYC update. Do not call numbers in the message; use official bank channels.',
  },
  {
    titleTe: 'CBI / పోలీస్ “డిజిటల్ అరెస్ట్” బెదిరింపులు',
    titleEn: 'CBI / police “digital arrest” threats',
    bodyTe: 'అధికారులమని చెప్పి వీడియో కాల్‌లో ఉండమని, రహస్యంగా ఉంచమని లేదా “వెరిఫికేషన్” కోసం డబ్బు పంపమని చెప్పడం మోసం. చట్ట అమలు సంస్థలు వీడియో కాల్‌లో డబ్బు బదిలీ చేయమని లేదా మీ ఖాతాను “సేఫ్ అకౌంట్”లో పెట్టమని అడగవు. కాల్ ముగించి పోలీసులకు నివేదించండి.',
    bodyEn: 'Scammers posing as officials may demand that you stay on a video call, keep it secret, or transfer money for “verification.” Law-enforcement agencies do not ask you to transfer money on a video call or move it to a “safe account.” End the call and report it to police.',
  },
  {
    titleTe: 'డాక్టర్ / ఆసుపత్రి చెల్లింపు “హోల్డ్” మోసం',
    titleEn: 'Doctor / hospital payment “on hold” scam',
    bodyTe: 'చెల్లింపు నిలిచిపోయిందని చెప్పి రీఫండ్ లింక్, QR కోడ్, OTP లేదా స్క్రీన్ షేర్ కోరవచ్చు. ఆసుపత్రి/డాక్టర్‌ను మీకు తెలిసిన అధికారిక నంబర్‌లో ధృవీకరించండి. రీఫండ్ పొందడానికి UPI PIN ఇవ్వకండి, QR స్కాన్ చేయకండి.',
    bodyEn: 'A caller may claim a payment is on hold and ask you to use a refund link, QR code, OTP, or screen share. Verify with the doctor or hospital using a known official number. Never enter your UPI PIN or scan a QR code to receive a refund.',
  },
];

const urgentSteps = [
  {
    icon: Phone,
    titleTe: '1930కు వెంటనే కాల్ చేయండి',
    titleEn: 'Call 1930 immediately',
    bodyTe: 'ఆన్‌లైన్ ఆర్థిక మోసాన్ని వీలైనంత త్వరగా జాతీయ సైబర్ క్రైమ్ హెల్ప్‌లైన్ 1930కు నివేదించండి. లావాదేవీ సమయం, మొత్తం, UTR/లావాదేవీ ID, మీ ఫోన్ నంబర్ సిద్ధంగా ఉంచండి. ఫిర్యాదు గుర్తింపు సంఖ్య వస్తే దాన్ని భద్రపరచండి.',
    bodyEn: 'Report online financial fraud to the national cybercrime helpline at 1930 as soon as possible. Keep the transaction time, amount, UTR/transaction ID, and your phone number ready. Save the complaint acknowledgement/reference number you receive.',
  },
  {
    icon: Banknote,
    titleTe: 'బ్యాంక్ / చెల్లింపు యాప్‌ను సంప్రదించండి',
    titleEn: 'Contact your bank / payment app',
    bodyTe: 'మీ బ్యాంక్ అధికారిక హెల్ప్‌లైన్ లేదా బ్రాంచ్‌కు వెంటనే తెలియజేసి, సంబంధిత ఖాతా/కార్డు/UPIని నిలిపివేయడం లేదా బ్లాక్ చేయడం, అనధికార లావాదేవీపై వివాదం నమోదు చేయడం కోరండి. ఫిర్యాదు/టికెట్ నంబర్ తీసుకోండి. డబ్బు తిరిగి వస్తుందని హామీ లేదు; త్వరగా నివేదించడం వల్ల లావాదేవీని గుర్తించి నిలిపే అవకాశం పెరుగుతుంది.',
    bodyEn: 'Notify your bank through its official helpline or branch immediately. Ask them to block the affected account/card/UPI access and raise a dispute for unauthorized transactions. Get a complaint/ticket number. A refund is not guaranteed, but prompt reporting may help trace or stop funds.',
  },
  {
    icon: FileText,
    titleTe: 'పోర్టల్‌లో ఫిర్యాదు చేసి ఆధారాలు భద్రపరచండి',
    titleEn: 'File a portal complaint and preserve evidence',
    bodyTe: '1930లో నివేదించిన తర్వాత సూచించిన విధంగా నేషనల్ సైబర్ క్రైమ్ రిపోర్టింగ్ పోర్టల్‌లో ఫిర్యాదును పూర్తి చేయండి. స్క్రీన్‌షాట్‌లు, SMS/చాట్‌లు, ఫోన్ నంబర్లు, బ్యాంక్ స్టేట్‌మెంట్, UTR మరియు ఫిర్యాదు నంబర్లను భద్రపరచండి. ఆధారాలను తొలగించకండి.',
    bodyEn: 'After reporting on 1930, complete the complaint on the National Cyber Crime Reporting Portal as instructed. Preserve screenshots, SMS/chats, phone numbers, bank statements, UTRs, and complaint references. Do not delete evidence.',
  },
  {
    icon: Smartphone,
    titleTe: 'మీ యాక్సెస్‌ను సురక్షితం చేయండి',
    titleEn: 'Secure your access',
    bodyTe: 'బ్యాంక్ సూచనలతో కార్డు/నెట్ బ్యాంకింగ్/UPIని బ్లాక్ చేయండి; సురక్షిత పరికరం నుంచి పాస్‌వర్డ్‌లను మార్చండి. అనుమానాస్పద రిమోట్ యాక్సెస్ యాప్‌ను తొలగించండి. OTP, UPI PIN, పాస్‌వర్డ్ ఎవరికీ చెప్పకండి.',
    bodyEn: 'Block your card/net banking/UPI with your bank’s guidance and change passwords from a secure device. Remove suspicious remote-access apps. Never disclose an OTP, UPI PIN, or password.',
  },
];

export const AwarenessPage: React.FC<AwarenessPageProps> = ({ onBack }) => (
  <div className="relative app-viewport w-full bg-[#D1D7DB] flex items-center justify-center sm:py-3 sm:px-4 overflow-hidden">
    <div className="hidden sm:block fixed top-0 left-0 right-0 h-32 bg-[#00A884] z-0" />
    <main className="relative z-10 w-full max-w-[780px] h-full sm:h-[calc(100dvh-1.5rem)] sm:rounded-xl border border-black/10 bg-[#ECE5DD] shadow-[0_12px_36px_rgba(11,20,26,0.25)] flex flex-col overflow-hidden">
      <header className="bg-[#075E54] text-white px-3 sm:px-4 py-2.5 safe-top flex items-center gap-3 shrink-0 shadow-sm z-20">
        <button type="button" onClick={onBack} aria-label="వెనక్కి / Back" className="w-9 h-9 rounded-full hover:bg-white/15 flex items-center justify-center shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5 text-[#D9FDD3]" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-[15px] sm:text-base leading-tight">మోసానికి గురైతే ఏమి చేయాలి? <span className="text-[#D9FDD3]">/ What to do after a scam?</span></h1>
          <p className="text-[11px] text-[#D9FDD3]">సహాయం • అవగాహన / Help • Awareness</p>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto wa-scrollbar wa-chat-bg px-3 sm:px-6 py-4 sm:py-5">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="bg-[#FFEECD]/95 border border-[#F3D999] text-[#3B4750] rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-white text-[#075E54] flex items-center justify-center shrink-0"><HeartHandshake className="w-5 h-5" /></span>
              <div>
                <h2 className="font-bold text-sm">తెలుగు: మీరు ఒంటరిగా లేరు — వెంటనే చర్య తీసుకోండి.</h2>
                <p className="text-sm mt-1 leading-relaxed">English: You are not alone — act immediately. Report the incident to 1930 and your bank; quick reporting can help authorities and the bank respond.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              <a href="tel:1930" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#075E54] hover:bg-[#054640] text-white font-bold text-sm px-4 py-3"><Phone className="w-4 h-4" />1930కు కాల్ చేయండి / Call 1930</a>
              <a href="https://cybercrime.gov.in/" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white hover:bg-emerald-50 border border-[#B7DCCD] text-[#075E54] font-bold text-sm px-4 py-3"><ExternalLink className="w-4 h-4" />సైబర్ క్రైమ్ పోర్టల్ / Portal</a>
            </div>
          </div>

          <section aria-labelledby="urgent-heading" className="space-y-2">
            <h2 id="urgent-heading" className="text-[#075E54] font-extrabold text-base px-1">ఇప్పుడే చేయాల్సినవి <span className="text-[#54656F] font-semibold">/ Act now</span></h2>
            {urgentSteps.map(({ icon: Icon, titleTe, titleEn, bodyTe, bodyEn }, index) => (
              <article key={titleEn} className="bg-white/95 border border-black/5 rounded-xl shadow-sm p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#E7F8F0] text-[#075E54] flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-[#111B21]">{index + 1}. {titleTe}</h3>
                    <p className="text-[13px] font-semibold text-[#075E54] mt-0.5">{titleEn}</p>
                    <p className="text-[13px] leading-relaxed text-[#3B4750] mt-2">{bodyTe}</p>
                    <p className="text-[13px] leading-relaxed text-[#54656F] mt-1.5">{bodyEn}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section aria-labelledby="scams-heading" className="space-y-2">
            <h2 id="scams-heading" className="text-[#075E54] font-extrabold text-base px-1">ఈ మోసాల పట్ల జాగ్రత్త <span className="text-[#54656F] font-semibold">/ Know these scams</span></h2>
            {scams.map(({ titleTe, titleEn, bodyTe, bodyEn }) => (
              <article key={titleEn} className="bg-white/95 border border-black/5 rounded-xl shadow-sm p-3.5 sm:p-4">
                <h3 className="font-bold text-sm text-[#111B21]">{titleTe}</h3>
                <p className="text-[13px] font-semibold text-[#075E54] mt-0.5">{titleEn}</p>
                <p className="text-[13px] leading-relaxed text-[#3B4750] mt-2">{bodyTe}</p>
                <p className="text-[13px] leading-relaxed text-[#54656F] mt-1.5">{bodyEn}</p>
              </article>
            ))}
          </section>

          <div className="bg-white/90 border border-gray-200 rounded-xl p-3.5 text-[12px] leading-relaxed text-[#54656F]">
            <p className="font-bold text-[#075E54]">ముఖ్య గమనిక / Important</p>
            <p className="mt-1">బ్యాంక్ మరియు అధికారుల అధికారిక మార్గాలనే ఉపయోగించండి. డబ్బు తిరిగి పొందడం హామీ కాదు; సైబర్ క్రైమ్ పోర్టల్‌లోని తాజా సూచనలను అనుసరించండి. / Use only official bank and authority channels. Recovery is not guaranteed; follow the latest instructions on the cybercrime portal.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
);

export default AwarenessPage;
