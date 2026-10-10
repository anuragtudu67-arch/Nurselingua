// Public legal pages: Terms of Use and Privacy Policy.
// Deliberately plain and honest about what the product is and is not: a routine
// communication aid, never a medical device and never a substitute for a
// professional interpreter in critical moments.
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n/locale';
import { Icon } from '../components/icons';

// Placeholders that MUST be completed by the operator before launch.
const OPERATOR = '[OPERATOR LEGAL NAME]';
const DOMAIN = '[YOUR-DOMAIN]';
const CONTACT = '[PRIVACY-CONTACT@YOUR-DOMAIN]';
const JURISDICTION = '[GOVERNING LAW / JURISDICTION]';
const EFFECTIVE = '[EFFECTIVE DATE]';

type Section = { h: string; p: string[] };

function LegalShell({ title, updated, intro, sections }: {
  title: string; updated: string; intro: string; sections: Section[];
}) {
  const { t } = useLocale();
  return (
    <main id="main" className="page page-wide legal-page">
      <nav className="nav-public" aria-label="Public">
        <Link to="/" className="mark">{t('app.name')}</Link>
        <span style={{ flex: 1 }} />
        <Link to="/sign-in">{t('landing.signin')}</Link>
        <Link to="/sign-up" className="btn btn-primary">{t('landing.cta')}</Link>
      </nav>

      <article className="legal">
        <p className="eyebrow">Legal</p>
        <h1>{title}</h1>
        <p className="small muted">Published {EFFECTIVE}. Last updated {updated}.</p>
        <p className="lede">{intro}</p>

        {sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((para, i) => <p key={i}>{para}</p>)}
          </section>
        ))}

        <p className="small muted legal-foot">
          Questions about this document? Write to {CONTACT}. See also{' '}
          <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <Link to="/" className="legal-back">
          <Icon name="arrowRight" size={16} className="legal-back-ico" /> Back to NurseLinguo
        </Link>
      </article>
    </main>
  );
}

export function TermsPage() {
  return (
    <LegalShell
      title="Terms of Use"
      updated={EFFECTIVE}
      intro={`These terms are an agreement between you and ${OPERATOR} for the use of NurseLinguo at ${DOMAIN}. By creating an account or using the service, you accept them.`}
      sections={[
        {
          h: '1. What NurseLinguo is',
          p: [
            'NurseLinguo is a communication aid for routine care conversations. It speaks and displays a small set of reviewed nursing phrases in a patient language, and it can translate short typed or spoken text so both people can read what was said.',
            'NurseLinguo is not a medical device and does not provide diagnosis, treatment advice, or clinical decision support. It is not an emergency service and must not be used for emergencies.',
            'For critical conversations, always use a qualified human interpreter. That includes informed consent, end-of-life discussions, complex diagnoses, medication changes, and safeguarding conversations.',
          ],
        },
        {
          h: '2. Eligibility and your account',
          p: [
            'You must be at least 18 years old and authorised by your employer to use a communication tool in the care setting where you work.',
            'Keep your sign-in details private. You are responsible for activity carried out with your account. Tell us promptly if you believe it has been used without your permission.',
            'A demonstration deployment may accept a development sign-in token and store data only in your browser. Demonstration data is not a clinical record.',
          ],
        },
        {
          h: '3. Acceptable use',
          p: [
            'Use NurseLinguo only for lawful, professional communication. Do not use it to harass, deceive, or discriminate against anyone.',
            'Do not enter information you are not permitted to share with the operator of this deployment, and do not use it to process data you have no lawful basis to process.',
            'Do not attempt to break, overload, scrape, or reverse engineer the service, or to access another person’s conversations.',
          ],
        },
        {
          h: '4. Translation quality',
          p: [
            'Phrasebook translations are reviewed by language professionals and marked as such in the app. Where free text is translated automatically, it is a best effort and can be wrong, especially for clinical, dialect, or cultural nuance.',
            'Romanised spellings are a reading aid, not a translation. Confirm meaning with the patient before acting on it, and never rely on an automatic translation for a decision that affects safety.',
          ],
        },
        {
          h: '5. Recording and patient information',
          p: [
            'Before you record a patient, make sure you are allowed to and that the patient knows they are being recorded.',
            'Recordings and conversation text are kept according to the retention setting on your account, and you can delete a conversation at any time. You are responsible for handling patient information in line with the rules that apply to your workplace.',
          ],
        },
        {
          h: '6. Availability and changes',
          p: [
            'NurseLinguo is provided on an as-available basis. It may be interrupted for maintenance, and features may change.',
            'A free or demonstration deployment comes with no availability guarantee. Do not build a clinical process that fails if this service is down. Keep your organisation’s standard interpreting route available at all times.',
          ],
        },
        {
          h: '7. Intellectual property',
          p: [
            'The app, its phrasebook, and its reviewed translations belong to their respective owners and are licensed to you for use as intended. Text you type stays yours.',
            'You may not copy, resell, or redistribute the phrasebook or the reviewed translations as a standalone product.',
          ],
        },
        {
          h: '8. Liability',
          p: [
            'To the fullest extent permitted by the law of ' + JURISDICTION + ', the service is provided without warranties of any kind, and the operator is not liable for indirect or consequential loss, or for loss arising from a translation being misunderstood.',
            'Nothing in these terms limits liability that cannot be limited by law, and nothing here replaces your professional duty of care.',
          ],
        },
        {
          h: '9. Ending the agreement',
          p: [
            'You may stop using NurseLinguo at any time and ask for your account to be deleted. We may suspend accounts that breach these terms or that put patients at risk.',
          ],
        },
        {
          h: '10. Governing law and contact',
          p: [
            `These terms are governed by the laws of ${JURISDICTION}. Questions may be sent to ${CONTACT}.`,
            'We will update this page when the terms change and will change the "last updated" date above.',
          ],
        },
      ]}
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated={EFFECTIVE}
      intro={`This policy explains what ${OPERATOR} collects through NurseLinguo at ${DOMAIN}, why, and what control you have. It covers data about you as a professional user and the patient information you choose to process through the app.`}
      sections={[
        {
          h: '1. In short',
          p: [
            'We collect the minimum needed to run the app: your sign-in identity, your language and voice settings, the conversations you create, audio only when you press record, and coarse usage counters.',
            'We do not sell your data. We do not run advertising trackers. We do not use your conversations to train models.',
          ],
        },
        {
          h: '2. What we collect',
          p: [
            'Account: your email address and, if you provide one, your name, plus the identity identifier issued by our authentication provider.',
            'Preferences: your language, the patient languages you selected, playback speed, and how long you keep conversation history.',
            'Conversation content: the text of each turn, its translation, any romanisation, the speaker label, the timestamp, and whether a reviewed phrasebook entry was matched.',
            'Audio: when you record the patient, the recording is uploaded to object storage and the app keeps a reference to it. We do not keep audio for turns you did not record.',
            'Operational data: event counters such as session starts, language pairs, and pipeline success or failure counts, used to keep the app working. Server logs may include IP address and browser information for security.',
          ],
        },
        {
          h: '3. Why we use it',
          p: [
            'To provide the service you asked for: showing, speaking, and translating each conversation turn, and remembering your settings.',
            'To keep the service safe and working: diagnosing failures, preventing abuse, and producing anonymous usage counts for the operator of this deployment.',
            'To comply with obligations that apply to the operator, for example responding to a lawful request.',
          ],
        },
        {
          h: '4. External providers',
          p: [
            'This deployment stores data in the hosting, database, and media services listed by the operator: [HOSTING PROVIDER], [DATABASE PROVIDER], [MEDIA STORAGE PROVIDER], and, when automation is enabled, [AUTOMATION PROVIDER].',
            'The bundled demonstration configuration performs no external translation or speech calls and completes speech jobs inside the backend. If your deployment enables an external translation, speech-to-text, or text-to-speech vendor, the text or audio for that single request is sent to that vendor to produce the result.',
          ],
        },
        {
          h: '5. How long we keep it',
          p: [
            'Conversation history follows the retention setting you choose: 24 hours, 7 days, or until you delete it. When a conversation expires it is removed from your history.',
            'Recordings are deleted with the conversation they belong to.',
            'Operational logs are kept for a short period for security and troubleshooting, then discarded.',
          ],
        },
        {
          h: '6. Your controls',
          p: [
            'Change retention, languages, and playback speed in Settings at any time.',
            'Delete an individual conversation from History, or ask for your whole account to be deleted.',
            'Ask us what we hold about you, and ask for a copy or a correction, by writing to ' + CONTACT + '.',
          ],
        },
        {
          h: '7. Security',
          p: [
            'Traffic is encrypted in transit. Access to stored data is limited to what the service needs to operate, and secrets are held in server-side configuration rather than in the app.',
            'No system is perfectly secure. If you believe patient information has been exposed, contact the operator immediately and follow your workplace incident process.',
          ],
        },
        {
          h: '8. Patient information and children',
          p: [
            'Patient information is processed by you, the professional, on the basis that your workplace has established. This policy does not replace your organisation’s own notice to patients.',
            'NurseLinguo accounts are for professionals aged 18 and over. Information about a child may only be processed by that child’s care professional, and only as their role requires.',
          ],
        },
        {
          h: '9. Regulatory status',
          p: [
            'NurseLinguo is a communication aid, not a medical device, and the operator makes no claim of certification under any health-privacy or medical-device regime. Each deployment must assess its own obligations before handling real patient information.',
            'Where "demo" or offline mode is in use, data stays in the browser or in the demonstration store and must not be treated as a clinical record.',
          ],
        },
        {
          h: '10. Changes and contact',
          p: [
            `We will post any change to this policy here and update the date above. Questions, requests, and complaints: ${CONTACT}.`,
          ],
        },
      ]}
    />
  );
}
