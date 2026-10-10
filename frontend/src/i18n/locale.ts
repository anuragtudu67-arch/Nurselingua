// Locale dictionary: the UI is English by default and localizes to the nurse's
// language via this add-a-file design (spec §7.1). Add a language by appending a
// flat dictionary; `uiLocaleSupport` on /languages marks what's available.
import { createContext, useContext } from 'react';

export type LocaleCode = 'en' | 'es';

const en = {
  'app.name': 'NurseLinguo',
  'app.tagline': 'Communicate now, in the patient’s language.',
  'nav.home': 'Home',
  'nav.phrasebook': 'Learn',
  'nav.review': 'Review',
  'nav.history': 'Progress',
  'nav.settings': 'Profile',
  'nav.conversation': 'Conversation',
  'stage.title': 'Support level',
  'stage.support': 'Full Support',
  'stage.blend': 'Guided Blend',
  'stage.focus': 'Target Focus',
  'stage.immersion': 'Immersion',
  'stage.support.desc': 'Both languages always visible, with labels on every line.',
  'stage.blend.desc': 'Target language first, your language right beneath it.',
  'stage.focus.desc': 'Target language leads; your language appears when you reveal it.',
  'stage.immersion.desc': 'Only the target language on screen; your language stays one tap away.',
  'stage.help': 'A stage is a preference, not a score. Change it whenever you like and switch back at any time.',
  'stage.change': 'Change support level',
  'common.retry': 'Retry',
  'common.loading': 'Loading…',
  'common.play': 'Play',
  'common.playing': 'Playing…',
  'common.close': 'Close',
  'common.remove': 'Remove',
  'common.search': 'Search',
  'common.nurse': 'Nurse',
  'common.patient': 'Patient',
  'landing.title': 'Speak your patient’s language, in one tap.',
  'landing.body': 'Phrasebook first: tap a reviewed nursing question and it is spoken aloud in the patient’s language. When you speak or type freely, both languages stay on screen side by side.',
  'landing.cta': 'Create an account',
  'landing.signin': 'Sign in',
  'disclaimer.body': 'NurseLinguo is a routine communication aid, not a substitute for professional interpreters in critical decisions.',
  'disclaimer.interpreter': 'Request an interpreter',
  'onboarding.nurseLanguage': 'Your language',
  'onboarding.patientLanguages': 'Patient languages you commonly encounter',
  'onboarding.speechRate': 'Playback speed for patient audio',
  'onboarding.speechRate.slow': 'Slow (easier for patients)',
  'onboarding.speechRate.normal': 'Normal',
  'onboarding.retention': 'Keep conversation history',
  'onboarding.retention.24h': '24 hours',
  'onboarding.retention.7days': '7 days',
  'onboarding.retention.off': 'Until I delete it',
  'onboarding.finish': 'Start communicating',
  'home.start': 'Start a conversation',
  'home.categories': 'Common phrases by category',
  'home.recents': 'Recently used',
  'home.noRecents': 'Phrases you use will appear here for one-tap reuse.',
  'phrasebook.searchPlaceholder': 'Search phrases…',
  'phrasebook.empty': 'No phrases match your search.',
  'conversation.speak': 'Patient speaking',
  'conversation.typePlaceholder': 'Type in your language…',
  'conversation.send': 'Send',
  'conversation.listening': 'Listening…',
  'conversation.processing': 'Translating…',
  'conversation.couldntHear': "Couldn't hear that. Please try again.",
  'conversation.empty': 'Every turn shows both languages. Start with a phrase, your voice, or typing.',
  'history.empty': 'No conversations yet. Start one from Home.',
  'history.delete': 'Delete conversation',
  'history.autoExpiry': 'History auto-expires based on your privacy setting.',
  'settings.title': 'Profile',
  'settings.saved': 'Saved',
} as const;

const es: Partial<Record<keyof typeof en, string>> = {
  'app.tagline': 'Comuníquese ahora, en el idioma del paciente.',
  'nav.home': 'Inicio',
  'nav.phrasebook': 'Aprender',
  'nav.review': 'Repaso',
  'nav.history': 'Progreso',
  'nav.settings': 'Perfil',
  'nav.conversation': 'Conversación',
  'stage.title': 'Nivel de apoyo',
  'stage.support': 'Apoyo total',
  'stage.blend': 'Mezcla guiada',
  'stage.focus': 'Foco en el idioma meta',
  'stage.immersion': 'Inmersión',
  'stage.help': 'Una etapa es una preferencia, no una calificación. Cámbiala cuando quieras.',
  'stage.change': 'Cambiar nivel de apoyo',
  'common.retry': 'Reintentar',
  'common.loading': 'Cargando…',
  'common.play': 'Reproducir',
  'common.playing': 'Reproduciendo…',
  'common.nurse': 'Enfermera(o)',
  'common.patient': 'Paciente',
  'landing.title': 'Hable el idioma de su paciente en un solo toque.',
  'landing.cta': 'Crear una cuenta',
  'disclaimer.body': 'NurseLinguo es una ayuda de comunicación de rutina, no sustituye a un intérprete profesional en decisiones críticas.',
  'disclaimer.interpreter': 'Solicitar intérprete',
  'home.start': 'Iniciar una conversación',
  'home.categories': 'Frases comunes por categoría',
  'home.recents': 'Usadas recientemente',
  'conversation.send': 'Enviar',
  'conversation.typePlaceholder': 'Escriba en su idioma…',
};

const DICTS: Record<LocaleCode, Partial<Record<keyof typeof en, string>>> = { en, es };

export type TKey = keyof typeof en;

export function translate(locale: LocaleCode, key: TKey): string {
  return DICTS[locale]?.[key] ?? en[key] ?? key;
}

export interface LocaleValue {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  t: (key: TKey) => string;
}

export const LocaleCtx = createContext<LocaleValue>({
  locale: 'en',
  setLocale: () => undefined,
  t: (k) => translate('en', k),
});

export const useLocale = () => useContext(LocaleCtx);
