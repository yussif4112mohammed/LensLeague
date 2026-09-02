import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, ShieldCheck, Users } from 'lucide-react';
import Logo from '@/components/Logo';

/* ------------------------------------------------------------------------- *
 * Shared shell for the three legal routes.
 *
 * These are real pages on real routes, styled from the same design tokens as
 * the rest of LensLeague - no modals holding a single sentence, which is what
 * Settings used to show for Privacy and Terms.
 * ------------------------------------------------------------------------- */

const LAST_UPDATED = 'September 2026';

function LegalLayout({ icon: Icon, eyebrow, title, summary, children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[820px] items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight">LensLeague</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-5 pb-24 pt-12">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          <Icon className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted-foreground">{summary}</p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">Last updated {LAST_UPDATED}</p>

        <div className="mt-10 space-y-9">{children}</div>

        <div className="mt-14 rounded-xl border border-border bg-card p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            These pages describe how LensLeague actually works today and are written in plain
            language. They are <span className="font-semibold text-foreground">not legal advice</span>,
            and they have not been reviewed by a lawyer. Before LensLeague operates commercially or
            handles payments, have a qualified solicitor review them against the jurisdictions you
            operate in.
          </p>
        </div>

        <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
          <Link to="/terms" className="transition-colors hover:text-foreground">Terms of Service</Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link>
          <Link to="/guidelines" className="transition-colors hover:text-foreground">Community Guidelines</Link>
        </nav>
      </main>
    </div>
  );
}

function Section({ id, heading, children }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="mb-2.5 text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-brand [&_a:hover]:underline [&_strong]:font-semibold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="ml-4 list-disc space-y-1.5 marker:text-muted-foreground/50">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

/* ========================================================================= */

export function TermsPage() {
  return (
    <LegalLayout
      icon={Scale}
      eyebrow="Terms"
      title="Terms of Service"
      summary="The agreement between you and LensLeague when you create an account, upload photography, or vote in battles."
    >
      <Section id="accounts" heading="1. Your account">
        <p>
          You need an account to upload, vote, or message. You must be old enough to consent to a
          service like this where you live, and the information you give us at signup must be
          accurate. You are responsible for what happens under your account, so keep your password
          to yourself.
        </p>
        <p>
          One person, one account. Accounts created to inflate votes, points, or follower counts
          will be removed along with any standings they produced.
        </p>
      </Section>

      <Section id="ownership" heading="2. Your photography stays yours">
        <p>
          <strong>You keep full copyright in everything you upload.</strong> LensLeague claims no
          ownership of your images.
        </p>
        <p>
          To run the service, you give us a limited licence to store your photographs and display
          them where you have chosen to put them: your Gallery, the Feed, battles they are entered
          into, and search results within LensLeague. That licence exists so the product can show
          your work to other users. It ends when you delete the photograph, except for copies
          already cached or held in routine backups, which age out.
        </p>
        <p>
          We do not sell, sublicense, or use your photography in advertising without asking you
          first, in writing, each time.
        </p>
      </Section>

      <Section id="battles" heading="3. Battles, votes and points">
        <p>
          Photographs you publish are entered into battles automatically. Battles are decided by
          votes from other users, counted on our servers. Points and wins are awarded server-side.
        </p>
        <p>You may not:</p>
        <Bullets items={[
          'Vote for your own work, directly or through another account',
          'Use scripts, bots, or automated tooling to cast votes',
          'Coordinate vote trading, or pay for votes',
          'Attempt to change your points, wins, or ranking by modifying requests from your browser',
        ]} />
        <p>
          We may void results, remove points, or suspend accounts where we find manipulation.
          Standings are a reflection of community voting, not a promise of any prize or payment.
        </p>
      </Section>

      <Section id="conduct" heading="4. What you may not upload">
        <p>
          The <Link to="/guidelines">Community Guidelines</Link> are part of these terms. In short:
          upload photography you made or have the rights to, do not upload sexual content involving
          minors or anything illegal, and do not use LensLeague to harass people.
        </p>
      </Section>

      <Section id="inquiries" heading="5. Inquiries and bookings">
        <p>
          LensLeague lets clients contact photographers through the built-in messaging system. Any
          work, fee, or contract that follows is between the two of you. LensLeague is not a party
          to it, does not process payment for it, and does not guarantee that either side performs.
        </p>
      </Section>

      <Section id="termination" heading="6. Ending your account">
        <p>
          You can deactivate or delete your account from Settings at any time. See{' '}
          <Link to="/privacy#deletion">what deletion actually removes</Link>.
        </p>
        <p>
          We may suspend or close an account that breaks these terms, that is used to manipulate
          battles, or where we are required to by law. Where it is reasonable to do so, we will tell
          you why.
        </p>
      </Section>

      <Section id="asis" heading="7. The service is provided as it is">
        <p>
          LensLeague is offered without warranty. We work to keep it available and to keep your
          uploads safe, but we cannot promise it will never be interrupted or that data will never
          be lost. Keep your own copies of your original files. To the extent the law allows, we are
          not liable for indirect or consequential loss.
        </p>
      </Section>

      <Section id="changes" heading="8. Changes">
        <p>
          We will update these terms as the product changes. If a change materially affects your
          rights, we will tell you in the app before it takes effect.
        </p>
      </Section>
    </LegalLayout>
  );
}

/* ========================================================================= */

export function PrivacyPage() {
  return (
    <LegalLayout
      icon={ShieldCheck}
      eyebrow="Privacy"
      title="Privacy Policy"
      summary="What LensLeague collects, why it collects it, who can see it, and how you get rid of it."
    >
      <Section id="collect" heading="1. What we collect">
        <p><strong>Because you gave it to us:</strong></p>
        <Bullets items={[
          'Your email address and password, used to sign you in. Passwords are hashed by our authentication provider — LensLeague never sees or stores your plaintext password.',
          'Your profile: display name, username, bio, website, avatar, photography category and personal style.',
          'The photographs you upload, together with the caption, category and any camera or gear details you type in.',
          'Messages you send to other users through the app.',
          'A location, only if you choose to set one.',
        ]} />
        <p className="pt-1"><strong>Because you used the product:</strong></p>
        <Bullets items={[
          'Votes you cast, so a photograph cannot be voted on twice by the same person.',
          'Likes, comments, follows and saves, which are the relationships the product is built on.',
          'Points, wins and battle history, calculated on our servers.',
        ]} />
      </Section>

      <Section id="location" heading="2. Location">
        <p>
          Location is <strong>optional and off unless you turn it on.</strong> We ask only when a
          feature needs it, we explain why before asking, and you can decline and use LensLeague
          normally.
        </p>
        <p>
          We do not track you in the background and we do not store a continuous location history.
          Where a location is shown publicly it is shown at city level, never as precise
          coordinates. You can change or remove it from Settings at any time, and you can also
          revoke the browser permission itself.
        </p>
      </Section>

      <Section id="visible" heading="3. What other people can see">
        <p>
          Public: your username, display name, avatar, bio, photography category and personal style,
          your Gallery, your points, wins and recognition, and your follower and following counts.
        </p>
        <p>
          <strong>Never public: your email address and phone number.</strong> These are restricted at
          the database level, not merely hidden in the interface — the public API key cannot read
          those columns at all.
        </p>
        <p>
          Private to you: your settings, your saved items, and your messages, which are readable only
          by the people in the conversation.
        </p>
      </Section>

      <Section id="processors" heading="4. Who else handles your data">
        <p>
          We use Supabase for our database, authentication and file storage, and Vercel to host and
          serve the application. They process data on our instructions in order to run LensLeague.
        </p>
        <p>
          We do not sell your personal data. We do not share it with advertisers. LensLeague carries
          no advertising.
        </p>
      </Section>

      <Section id="cookies" heading="5. Cookies and analytics">
        <p>
          LensLeague sets the cookies and local browser storage needed to keep you signed in and to
          remember interface preferences such as your chosen Gallery layout. These are essential to
          the product working.
        </p>
        <p>
          We do not run third-party advertising or cross-site tracking. If we add product analytics
          later, this section will be updated before it goes live and you will be told what is
          measured.
        </p>
      </Section>

      <Section id="rights" heading="6. Your rights">
        <Bullets items={[
          'See and correct your profile information from Settings.',
          'Deactivate your account, which hides your profile while keeping your data.',
          'Delete your account and your photography.',
          'Ask for a copy of your data, or ask us to delete it, by contacting us.',
          'Withdraw a permission — location above all — at any time.',
        ]} />
      </Section>

      <Section id="deletion" heading="7. What deletion actually removes">
        <p>
          Deleting your account removes your profile, your uploaded photographs and their files,
          your comments, likes, saves and follow relationships.
        </p>
        <p>
          Two things survive, and we would rather be straight about it than pretend otherwise.
          Messages you sent remain visible to the person you sent them to, because they are part of
          that person&apos;s conversation as much as yours. And completed battles keep their result,
          because deleting a finished result would change other photographers&apos; standings —
          though it is no longer attached to your name.
        </p>
        <p>Routine encrypted backups age out on their own schedule.</p>
      </Section>

      <Section id="security" heading="8. How we protect it">
        <p>
          Everything travels over HTTPS. Access is enforced by row-level security policies in the
          database, so authorisation is decided by the server rather than by the browser. Sensitive
          columns are revoked from the public role. Points, wins and moderation flags cannot be
          written by the client — a database trigger reverts any attempt.
        </p>
        <p>
          No system is perfectly secure. If we discover a breach affecting your data, we will tell
          you.
        </p>
      </Section>
    </LegalLayout>
  );
}

/* ========================================================================= */

export function GuidelinesPage() {
  return (
    <LegalLayout
      icon={Users}
      eyebrow="Community"
      title="Community Guidelines"
      summary="LensLeague is a competitive space for photographers. Competition only works if the contest is honest and the room is worth being in."
    >
      <Section id="own" heading="Post your own work">
        <p>
          Upload photographs you shot, or that you hold the rights to. Passing off someone
          else&apos;s photograph as yours is the one thing that breaks this platform completely,
          because every point on it is awarded by comparison.
        </p>
        <p>
          Editing, compositing and heavy processing are all photography. Claiming authorship of an
          image you did not make is not.
        </p>
      </Section>

      <Section id="fair" heading="Compete honestly">
        <p>
          Vote for the photograph you think is stronger. Do not vote for your own work, run second
          accounts, trade votes, or automate anything.
        </p>
        <p>
          Losing a battle is not a judgement on you as a photographer. It is one set of people
          preferring one frame on one day.
        </p>
      </Section>

      <Section id="respect" heading="Treat people like colleagues">
        <p>
          Critique the photograph, never the person. No harassment, no targeted abuse, no hate
          directed at anyone for who they are. Do not post other people&apos;s private information.
        </p>
        <p>
          If someone is making the platform worse, report them rather than engaging.
        </p>
      </Section>

      <Section id="limits" heading="Hard limits">
        <p>These result in immediate removal and, where required, a report to the authorities:</p>
        <Bullets items={[
          'Any sexual content involving minors',
          'Content produced through non-consensual acts',
          'Content promoting terrorism or mass violence',
          'Images taken of people in private settings without their knowledge',
          'Malware, phishing, or scams',
        ]} />
      </Section>

      <Section id="consent" heading="Photographing people">
        <p>
          If a recognisable person is the subject of your photograph, make sure you had their
          agreement to take it and to publish it. This matters most for children, for medical or
          distressing situations, and for anywhere someone would reasonably expect privacy.
        </p>
      </Section>

      <Section id="enforcement" heading="How we enforce this">
        <p>
          Reports go to a human. Depending on what happened, we may remove the photograph, void a
          battle result, remove points earned through manipulation, restrict an account, or close
          it.
        </p>
        <p>
          We aim to explain what happened and to let you respond. Nothing on this page is a promise
          that we will catch everything — reporting genuinely helps.
        </p>
      </Section>
    </LegalLayout>
  );
}
