// Local fallback content used when the API is unreachable (offline demo mode).
// Mirrors the /api/v1 contract exactly, so the swap to the real backend is a
// one-line change in store.tsx (see README "Demo-first data layer").
import type { Category, Language, Phrase, PhraseTranslation } from './client';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', ttsLocale: 'en-US', sttSupported: true, script: 'Latin', hasRomanization: false, uiLocaleSupport: true, rtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', ttsLocale: 'es-MX', sttSupported: true, script: 'Latin', hasRomanization: false, uiLocaleSupport: false, rtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', ttsLocale: 'hi-IN', sttSupported: true, script: 'Devanagari', hasRomanization: true, uiLocaleSupport: false, rtl: false },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', ttsLocale: 'bn-IN', sttSupported: true, script: 'Bengali', hasRomanization: true, uiLocaleSupport: false, rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', ttsLocale: 'fr-FR', sttSupported: true, script: 'Latin', hasRomanization: false, uiLocaleSupport: false, rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', ttsLocale: 'ar-SA', sttSupported: true, script: 'Arabic', hasRomanization: true, uiLocaleSupport: false, rtl: true },
];

export const CATEGORIES: Category[] = [
  { slug: 'symptoms', name: 'Symptoms', description: 'Describe what the patient feels and where.', position: 1 },
  { slug: 'medication', name: 'Medication', description: 'Doses, timing, and instructions.', position: 2 },
  { slug: 'pain', name: 'Pain', description: 'Locate and rate pain, including the 0–10 scale.', position: 3 },
  { slug: 'allergies', name: 'Allergies', description: 'Ask about drug, food, and other allergies.', position: 4 },
  { slug: 'patient_care', name: 'Patient Care', description: 'Everyday comfort, routines, and positions.', position: 5 },
];

// Demo phrase subset (the backend seeds 72 phrases × 8 languages; this offline
// demo carries the highest-priority ones so every flow is demonstrable).
// Row: [id, category, english, translation, isQuestion, cardType?]
type Row = [string, string, string, string, boolean, ('STANDARD' | 'PAIN_SCALE')?];

const ES: Row[] = [
  ['ph-sym-01', 'symptoms', 'What symptoms do you have?', '¿Qué síntomas tiene?', true],
  ['ph-sym-02', 'symptoms', "I've had a headache since yesterday.", 'He tenido dolor de cabeza desde ayer.', false],
  ['ph-sym-03', 'symptoms', 'Do you have a fever?', '¿Tiene fiebre?', true],
  ['ph-sym-09', 'symptoms', 'Do you have trouble breathing?', '¿Tiene dificultad para respirar?', true],
  ['ph-sym-11', 'symptoms', 'How long have you felt this way?', '¿Desde cuándo se siente así?', true],
  ['ph-med-01', 'medication', 'Take one tablet after meals.', 'Tome una pastilla después de comer.', false],
  ['ph-med-02', 'medication', 'Take this medicine twice a day.', 'Tome este medicamento dos veces al día.', false],
  ['ph-med-03', 'medication', 'Take it with food.', 'Tómelo con comida.', false],
  ['ph-med-09', 'medication', 'Do you take any medications at home?', '¿Toma algún medicamento en casa?', true],
  ['ph-pain-01', 'pain', 'Where is your pain?', '¿Dónde le duele?', true],
  ['ph-pain-02', 'pain', 'How bad is your pain? Rate it from 0 to 10.', '¿Qué tan fuerte es su dolor? Califíquelo de 0 a 10.', true, 'PAIN_SCALE'],
  ['ph-pain-03', 'pain', 'Is the pain sharp, dull, or burning?', '¿El dolor es agudo, sordo o como quemadura?', true],
  ['ph-pain-09', 'pain', 'Have you taken anything for the pain?', '¿Ha tomado algo para el dolor?', true],
  ['ph-alg-01', 'allergies', 'Do you have any allergies?', '¿Tiene alguna alergia?', true],
  ['ph-alg-02', 'allergies', 'Are you allergic to any medications?', '¿Es alérgico a algún medicamento?', true],
  ['ph-alg-08', 'allergies', 'Do you have swelling of the face or throat?', '¿Tiene hinchazón en la cara o en la garganta?', true],
  ['ph-care-01', 'patient_care', 'I am your nurse.', 'Soy su enfermera(o).', false],
  ['ph-care-03', 'patient_care', 'How are you feeling?', '¿Cómo se siente?', true],
  ['ph-care-07', 'patient_care', 'I am going to check your blood pressure.', 'Voy a tomarle la presión arterial.', false],
  ['ph-care-10', 'patient_care', 'Do you need the bathroom?', '¿Necesita ir al baño?', true],
  ['ph-care-11', 'patient_care', 'Call me if you need anything.', 'Llámeme si necesita algo.', false],
];

const HI: Row[] = [
  ['ph-sym-01', 'symptoms', 'What symptoms do you have?', 'आपको क्या तकलीफ़ है?', true],
  ['ph-sym-02', 'symptoms', "I've had a headache since yesterday.", 'मुझे कल से सिर दर्द है', false],
  ['ph-sym-03', 'symptoms', 'Do you have a fever?', 'क्या आपको बुखार है?', true],
  ['ph-sym-09', 'symptoms', 'Do you have trouble breathing?', 'क्या आपको सांस लेने में दिक्कत हो रही है?', true],
  ['ph-sym-11', 'symptoms', 'How long have you felt this way?', 'आपको यह तकलीफ़ कितने दिन से है?', true],
  ['ph-med-01', 'medication', 'Take one tablet after meals.', 'खाने के बाद एक गोली लें।', false],
  ['ph-med-02', 'medication', 'Take this medicine twice a day.', 'यह दवा दिन में दो बार लें।', false],
  ['ph-med-03', 'medication', 'Take it with food.', 'इसे खाने के साथ लें।', false],
  ['ph-med-09', 'medication', 'Do you take any medications at home?', 'क्या आप घर पर कोई दवा लेते हैं?', true],
  ['ph-pain-01', 'pain', 'Where is your pain?', 'दर्द कहाँ है?', true],
  ['ph-pain-02', 'pain', 'How bad is your pain? Rate it from 0 to 10.', 'आपका दर्द कितना तीव्र है? 0 से 10 तक बताइए।', true, 'PAIN_SCALE'],
  ['ph-pain-03', 'pain', 'Is the pain sharp, dull, or burning?', 'दर्द तेज़, सुस्त या जलन जैसा है?', true],
  ['ph-pain-09', 'pain', 'Have you taken anything for the pain?', 'क्या आपने दर्द की कोई दवा ली है?', true],
  ['ph-alg-01', 'allergies', 'Do you have any allergies?', 'क्या आपको कोई एलर्जी है?', true],
  ['ph-alg-02', 'allergies', 'Are you allergic to any medications?', 'क्या आप किसी दवा से एलर्जी हैं?', true],
  ['ph-alg-08', 'allergies', 'Do you have swelling of the face or throat?', 'क्या चेहरे या गले में सूजन है?', true],
  ['ph-care-01', 'patient_care', 'I am your nurse.', 'मैं आपकी नर्स हूँ।', false],
  ['ph-care-03', 'patient_care', 'How are you feeling?', 'आप कैसा महसूस कर रहे हैं?', true],
  ['ph-care-07', 'patient_care', 'I am going to check your blood pressure.', 'मैं आपका ब्लड प्रेशर नापूँगा/नापूँगी।', false],
  ['ph-care-10', 'patient_care', 'Do you need the bathroom?', 'क्या आपको बाथरूम जाना है?', true],
  ['ph-care-11', 'patient_care', 'Call me if you need anything.', 'कुछ भी चाहिए तो मुझे बुला लीजिए।', false],
];

const BN: Row[] = [
  ['ph-sym-02', 'symptoms', "I've had a headache since yesterday.", 'গতকাল থেকে আমার মাথা ব্যথা করছে', false],
  ['ph-sym-03', 'symptoms', 'Do you have a fever?', 'আপনার কি জ্বর আছে?', true],
  ['ph-med-01', 'medication', 'Take one tablet after meals.', 'খাবারের পরে একটি বড়ি খাবেন।', false],
  ['ph-pain-01', 'pain', 'Where is your pain?', 'ব্যথা কোথায়?', true],
  ['ph-pain-02', 'pain', 'How bad is your pain? Rate it from 0 to 10.', 'আপনার ব্যথা কতটা তীব্র? 0 থেকে 10 এ বলুন।', true, 'PAIN_SCALE'],
  ['ph-alg-01', 'allergies', 'Do you have any allergies?', 'আপনার কি কোনো অ্যালার্জি আছে?', true],
  ['ph-care-03', 'patient_care', 'How are you feeling?', 'আপনার কেমন লাগছে?', true],
  ['ph-care-11', 'patient_care', 'Call me if you need anything.', 'কিছু লাগলে আমাকে ডাকুন।', false],
];

const FR: Row[] = [
  ['ph-sym-01', 'symptoms', 'What symptoms do you have?', 'Quels symptômes avez-vous ?', true],
  ['ph-sym-02', 'symptoms', "I've had a headache since yesterday.", "J'ai mal à la tête depuis hier.", false],
  ['ph-sym-03', 'symptoms', 'Do you have a fever?', 'Avez-vous de la fièvre ?', true],
  ['ph-med-01', 'medication', 'Take one tablet after meals.', 'Prenez un comprimé après les repas.', false],
  ['ph-med-02', 'medication', 'Take this medicine twice a day.', 'Prenez ce médicament deux fois par jour.', false],
  ['ph-pain-01', 'pain', 'Where is your pain?', 'Où avez-vous mal ?', true],
  ['ph-pain-02', 'pain', 'How bad is your pain? Rate it from 0 to 10.', "Quelle est l'intensité de votre douleur ? Notez de 0 à 10.", true, 'PAIN_SCALE'],
  ['ph-alg-01', 'allergies', 'Do you have any allergies?', 'Avez-vous des allergies ?', true],
  ['ph-care-01', 'patient_care', 'I am your nurse.', 'Je suis votre infirmière(ier).', false],
  ['ph-care-11', 'patient_care', 'Call me if you need anything.', 'Appelez-moi si vous avez besoin de quelque chose.', false],
];

const AR: Row[] = [
  ['ph-sym-01', 'symptoms', 'What symptoms do you have?', 'ما هي الأعراض التي تشعر بها؟', true],
  ['ph-sym-02', 'symptoms', "I've had a headache since yesterday.", 'أشعر بصداع منذ أمس.', false],
  ['ph-sym-03', 'symptoms', 'Do you have a fever?', 'هل لديك حمى؟', true],
  ['ph-med-01', 'medication', 'Take one tablet after meals.', 'تناول قرصًا واحدًا بعد الوجبات.', false],
  ['ph-pain-01', 'pain', 'Where is your pain?', 'أين يوجد الألم؟', true],
  ['ph-pain-02', 'pain', 'How bad is your pain? Rate it from 0 to 10.', 'ما مدى شدة الألم؟ قيّمه من 0 إلى 10.', true, 'PAIN_SCALE'],
  ['ph-alg-01', 'allergies', 'Do you have any allergies?', 'هل لديك أي حساسية؟', true],
  ['ph-care-01', 'patient_care', 'I am your nurse.', 'أنا ممرضتك.', false],
  ['ph-care-11', 'patient_care', 'Call me if you need anything.', 'نادني إذا احتجت أي شيء.', false],
];

// Romanization for non-Latin scripts, keyed `${lang}|${translation}`.
const ROMAN: Record<string, string> = {
  'hi|आपको क्या तकलीफ़ है?': 'Aapko kya takleef hai?',
  'hi|मुझे कल से सिर दर्द है': 'Mujhe kal se sir dard hai',
  'hi|क्या आपको बुखार है?': 'Kya aapko bukhaar hai?',
  'hi|क्या आपको सांस लेने में दिक्कत हो रही है?': 'Kya aapko saans lene mein dikkatt ho rahi hai?',
  'hi|आपको यह तकलीफ़ कितने दिन से है?': 'Aapko yah takleef kitne din se hai?',
  'hi|खाने के बाद एक गोली लें।': 'Khaane ke baad ek goli len.',
  'hi|यह दवा दिन में दो बार लें।': 'Yah dava din mein do baar len.',
  'hi|इसे खाने के साथ लें।': 'Ise khaane ke saath len.',
  'hi|क्या आप घर पर कोई दवा लेते हैं?': 'Kya aap ghar par koi dava lete hain?',
  'hi|दर्द कहाँ है?': 'Dard kahan hai?',
  'hi|आपका दर्द कितना तीव्र है? 0 से 10 तक बताइए।': 'Aapka dard kitna teevr hai? 0 se 10 tak bataiye.',
  'hi|दर्द तेज़, सुस्त या जलन जैसा है?': 'Dard tez, sust yaa jalan jaisa hai?',
  'hi|क्या आपने दर्द की कोई दवा ली है?': 'Kya aapne dard ki koi dava lee hai?',
  'hi|क्या आपको कोई एलर्जी है?': 'Kya aapko koi allergy hai?',
  'hi|क्या आप किसी दवा से एलर्जी हैं?': 'Kya aap kisi dawa se allergy hain?',
  'hi|क्या चेहरे या गले में सूजन है?': 'Kya chehre ya gale mein soojan hai?',
  'hi|मैं आपकी नर्स हूँ।': 'Main aapki nurse hoon.',
  'hi|आप कैसा महसूस कर रहे हैं?': 'Aap kaisa mehsoos kar rahe hain?',
  'hi|मैं आपका ब्लड प्रेशर नापूँगा/नापूँगी।': 'Main aapka blood pressure naapoonga/naapoongi.',
  'hi|क्या आपको बाथरूम जाना है?': 'Kya aapko bathroom jaana hai?',
  'hi|कुछ भी चाहिए तो मुझे बुला लीजिए।': 'Kuchh bhi chahiye to mujhe bula lijiye.',
  'bn|गতকাল থেকে আমার মাথা ব্যথা করছে': 'Gotokal theke amar matha byatha korche',
  'bn|আপনার কি জ্বর আছে?': 'Apnar ki jor ache?',
  'bn|খাবারের পরে একটি বড়ি খাবেন।': 'Khabarer pore ekti bori khaben.',
  'bn|ব্যথা কোথায়?': 'Byatha kothay?',
  'bn|আপনার ব্যথা কতটা তীব্র? 0 থেকে 10 এ বলুন।': 'Apnar byatha kotota tibro? 0 theke 10 e bolun.',
  'bn|আপনার কি কোনো অ্যালার্জি আছে?': 'Apnar ki kono allergy ache?',
  'bn|আপনার কেমন লাগছে?': 'Apnar kemon lagchhe?',
  'bn|কিছু লাগলে আমাকে ডাকুন।': 'Kichhu lagle amake dakun.',
  'ar|ما هي الأعراض التي تشعر بها؟': 'ma hi al-aʻrad allati tashʻur biha?',
  'ar|أشعر بصداع منذ أمس.': 'ashʻur bi-sudaʻ mundhu ams.',
  'ar|هل لديك حمى؟': 'hal ladayka humma?',
  'ar|تناول قرصًا واحدًا بعد الوجبات.': 'tanawal qur-san wahidan baʻd al-wajabat.',
  'ar|أين يوجد الألم؟': 'ayna yujad al-alam?',
  'ar|ما مدى شدة الألم؟ قيّمه من 0 إلى 10.': 'ma mudda shiddat al-alam? qawwimhu min 0 ila 10.',
  'ar|هل لديك أي حساسية؟': 'hal ladayka ay hasasiya?',
  'ar|أنا ممرضتك.': 'ana mumaridatuk.',
  'ar|نادني إذا احتجت أي شيء.': 'nadini idha ihtajt ay shayʾ.',
};

function romanize(lang: string, text: string): string | null {
  return ROMAN[`${lang}|${text}`] ?? null;
}

function assemble(): Phrase[] {
  const phrases = new Map<string, Phrase>();
  const push = (lang: string, rows: Row[]) => {
    for (const [id, cat, base, text, q, card] of rows) {
      if (!phrases.has(id)) {
        phrases.set(id, {
          id, categorySlug: cat, baseText: base, isQuestion: q, cardType: card ?? 'STANDARD',
          tags: ['Where is your pain?', 'Take one tablet after meals.'].includes(base)
            || base.startsWith("I've had a headache") ? ['anchor'] : [],
          priority: 10, translations: [], favorite: false,
        });
      }
      const t: PhraseTranslation = {
        languageCode: lang, text, romanization: romanize(lang, text),
        audioRef: `demo-audio://${lang}/${id}.mp3`, professionallyReviewed: true,
      };
      phrases.get(id)!.translations.push(t);
    }
  };
  push('es', ES); push('hi', HI); push('bn', BN); push('fr', FR); push('ar', AR);
  return [...phrases.values()];
}

export const PHRASES: Phrase[] = assemble();
