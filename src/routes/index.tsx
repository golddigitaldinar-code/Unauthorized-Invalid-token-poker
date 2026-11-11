import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Download, Gift, QrCode, ShieldCheck, Spade, Trophy, Users } from 'lucide-react';
import heroAsset from '@/assets/master-poker-hero.jpg.asset.json';
import { useAuth } from '@/hooks/useAuth';
import { CardFan } from '@/components/common/CardFan';
import { FloatingSuits } from '@/components/common/FloatingSuits';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Master Poker · Strategy, Skill, Victory' },
      {
        name: 'description',
        content: 'Play Texas Hold’em at Master Poker. Tables from ₱1 to ₱1000, free Sit & Go tournaments, ₱20 welcome bonus and quick QR recharge.',
      },
      { property: 'og:title', content: 'Master Poker · Strategy, Skill, Victory' },
      {
        property: 'og:description',
        content: 'Texas Hold’em tables from ₱1 to ₱1000, ₱20 welcome bonus, and quick QR recharge.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Gift, title: '₱20 welcome bonus', text: 'Free credit in your wallet the first time you sign in.' },
  { icon: QrCode, title: 'Scan to recharge', text: 'Scan our QR with GCash, Maya or any bank app, upload your receipt.' },
  { icon: Users, title: 'Invite friends', text: 'Every player gets a personal 8-character referral code.' },
  { icon: ShieldCheck, title: 'Fair tables', text: 'Every table plays the same rules. Every payment is reviewed and logged.' },
];

const APP_DOWNLOAD_URL = 'https://www.mediafire.com/file/0gsax22io7t0zza/KareraQueen_release_v1.0.3.aab/file';

const STAKES = ['₱0.50 / ₱1', '₱1 / ₱2', '₱2.50 / ₱5', '₱5 / ₱10', '₱10 / ₱20', '₱25 / ₱50', '₱50 / ₱100', '₱100 / ₱200', '₱500 / ₱1000'];

function Index() {
  const { user, loading } = useAuth();
  const signedIn = !loading && Boolean(user);

  return (
    <div className="bg-ambient min-h-screen overflow-x-hidden text-foreground">
      <FloatingSuits intensity={0.14} />
      <section className="relative isolate overflow-hidden">
        <img
          src={heroAsset.url}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-20 h-full w-full scale-110 object-cover opacity-30 blur-md"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-room/40 via-room/75 to-room" />

        <div className="mx-auto grid min-h-[86vh] max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_1fr]">
          <div className="order-2 lg:order-1">
            <span className="inline-flex w-fit animate-rise-in items-center gap-2 rounded-full border border-live/30 bg-live/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-live">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-live-ping rounded-full bg-live" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
              </span>
              Tables live now
            </span>
            <h1
              className="mt-6 animate-rise-in font-display text-5xl font-black leading-[1.02] sm:text-7xl"
              style={{ animationDelay: '0.1s' }}
            >
              <span className="text-gold-shimmer">Master Poker</span>
            </h1>
            <p className="mt-3 animate-rise-in font-display text-sm font-semibold uppercase tracking-[0.4em] text-gold-300" style={{ animationDelay: '0.15s' }}>
              Strategy · Skill · Victory
            </p>
            <p className="mt-6 max-w-xl animate-rise-in text-lg text-slate-300" style={{ animationDelay: '0.2s' }}>
              Texas Hold’em with a real peso wallet. Create your account in seconds and get{' '}
              <span className="font-bold text-gold">₱20 free</span> to start playing.
            </p>
            <div className="mt-9 flex animate-rise-in flex-wrap gap-3" style={{ animationDelay: '0.3s' }}>
              {signedIn ? (
                <Link to="/lobby" className="btn-gold inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold">
                  Go to the tables <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth"
                    search={{ mode: 'signup' }}
                    className="btn-gold inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold"
                  >
                    Create account · get ₱20 <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/auth"
                    className="rounded-xl border border-gold/40 bg-room/40 px-7 py-3.5 text-sm font-semibold text-gold-300 backdrop-blur transition hover:border-gold hover:text-gold"
                  >
                    Sign in
                  </Link>
                </>
              )}
              <a
                href={APP_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-live/40 bg-live/10 px-7 py-3.5 text-sm font-semibold text-live backdrop-blur transition hover:border-live hover:bg-live/20"
              >
                <Download className="h-4 w-4" /> Download the app
              </a>
            </div>
          </div>

          <div className="relative order-1 animate-rise-in lg:order-2" style={{ animationDelay: '0.05s' }}>
            <CardFan className="absolute -bottom-14 -left-10 z-10 hidden scale-90 md:block" />
            <div aria-hidden className="absolute -right-3 -top-5 z-10 hidden gap-1 md:flex">
              {['bg-chip-red', 'bg-chip-black', 'bg-chip-gold'].map((tone, index) => (
                <span
                  key={tone}
                  className={`animate-chip-hop h-9 w-9 rounded-full border-4 border-dashed border-chip-inlay/80 ${tone} shadow-lg`}
                  style={{ animationDelay: `${index * 0.35}s` }}
                />
              ))}
            </div>
            <div className="border-spin rounded-3xl p-1.5 shadow-2xl">
              <img
                src={heroAsset.url}
                alt="Master Poker emblem: a golden crowned M with two aces on stacks of poker chips"
                width={1408}
                height={768}
                className="w-full rounded-[1.25rem] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Live stakes ticker */}
      <div className="relative border-y border-gold/20 bg-wood-deep/70 py-3 backdrop-blur">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-sm font-semibold text-slate-300">
          {[...STAKES, ...STAKES].map((stake, index) => (
            <span key={index} className="inline-flex items-center gap-3">
              <span className="text-gold">{['♠', '♥', '♦', '♣'][index % 4]}</span> {stake}{' '}
              <span className="text-xs font-medium uppercase tracking-widest text-live">open</span>
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto mb-10 max-w-md text-center">
          <h2 className="font-display text-3xl font-bold text-gold-300">Why players choose us</h2>
          <div className="gold-rule mx-auto mt-4 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }, index) => (
            <div
              key={title}
              className="glass-panel card-lift shine-sweep group animate-rise-in rounded-2xl p-6"
              style={{ animationDelay: `${0.1 * index + 0.2}s`, ['--shine-delay' as string]: `${index * 1.2}s` }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 text-gold transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gold/15 py-8 text-center text-xs text-slate-500">
        <p className="inline-flex items-center gap-2">
          <Spade className="h-3.5 w-3.5 text-gold" /> Master Poker <Trophy className="h-3.5 w-3.5 text-gold" />
        </p>
      </footer>
    </div>
  );
}
