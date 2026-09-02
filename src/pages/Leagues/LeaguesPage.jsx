import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import { Trophy, Bell, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Leagues — mockup 1f, carried up to the desktop system.
   Category rooms only: a room never mixes categories. No ranked leaderboard and
   no losses anywhere on this page; recognition is the four tiers from the spec,
   and everyone who entered is named. */

const TIERS = [
  { key: 'winner', label: 'WINNER' },
  { key: 'runner_up', label: 'RUNNER-UP' },
  { key: 'honorable_mention', label: 'HONORABLE MENTION' },
  { key: 'participated', label: 'PARTICIPATED' },
];

function SectionLabel({ children, className }) {
  return (
    <span className={cn('font-mono text-[9px] font-semibold tracking-[.11em] text-foreground/[.42]', className)}>
      {children}
    </span>
  );
}

function roomStatusLine(room) {
  if (room.status === 'open') return `${room.days_left}d left · ${room.entry_count} in`;
  if (room.status === 'voting') return `judging · ${room.voter_count} voting`;
  return `closed · ${room.entry_count} entered`;
}

export default function LeaguesPage() {
  const navigate = useNavigate();
  const { currentUser } = useApp();

  const [rooms, setRooms] = useState([]);
  const [recognition, setRecognition] = useState([]);
  const [resultRoom, setResultRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('league_rooms')
        .select('*')
        .order('ends_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        // The v12 migration has not been applied yet. Say so plainly rather
        // than rendering an empty page that looks broken.
        console.warn('league_rooms unavailable:', error.message);
        setSchemaReady(false);
        setLoading(false);
        return;
      }

      setRooms(data || []);

      const lastClosed = (data || []).filter(r => r.status === 'closed').pop();
      if (lastClosed) {
        setResultRoom(lastClosed);
        const { data: rec } = await supabase.rpc('get_room_recognition', {
          p_competition_id: lastClosed.id,
        });
        if (!cancelled) setRecognition(rec || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  const openRoom = rooms.find(r => r.status === 'open');
  const otherRooms = rooms.filter(r => r.id !== openRoom?.id && r.status !== 'closed');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-7 md:px-8">

      <header className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-bold leading-none tracking-[-.015em] xl:text-[26px]">Leagues</h1>
        <p className="text-[13px] text-white/50">
          Category rooms. One frame each, judged inside its own category — never across them.
        </p>
      </header>

      {!schemaReady && (
        <div className="mt-6 rounded-xl border border-white/[.1] bg-card p-5">
          <p className="text-[14px] font-semibold">Leagues aren’t switched on yet</p>
          <p className="mt-1.5 max-w-[520px] text-[13px] leading-relaxed text-white/60">
            Run <code className="rounded bg-white/[.07] px-1.5 py-0.5 font-mono text-[12px]">supabase/migration_v12_recognition_tiers.sql</code> in
            the Supabase SQL editor to create the room and recognition tables. Nothing else on the site depends on it.
          </p>
        </div>
      )}

      {/* ── Open now ── */}
      {openRoom && (
        <section
          className="mt-5 flex flex-col gap-2.5 rounded-xl border border-brand/[.25] p-5"
          style={{ backgroundImage: 'linear-gradient(160deg,#1c2620,#151617)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <SectionLabel className="text-brand">
              OPEN NOW · {String(openRoom.category || '').toUpperCase()}
            </SectionLabel>
            <span className="font-mono text-[10px] text-white/50">{openRoom.days_left}d left</span>
          </div>

          <h2 className="text-[17px] font-semibold leading-[1.25] xl:text-[19px]">{openRoom.name}</h2>
          <p className="max-w-[620px] text-[12.5px] leading-[1.45] text-white/60 text-pretty">
            One frame per photographer. Community picks plus a guest judge. Everyone who enters gets a
            credit on their profile — there is no losing here.
          </p>

          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              onClick={() => navigate(currentUser ? '/upload' : '/login')}
              className="flex h-9 items-center justify-center rounded-lg bg-brand px-5 text-[12.5px] font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              Enter a frame
            </button>
            <span className="flex h-9 items-center rounded-lg border border-white/[.16] px-3.5 text-[12.5px] font-semibold text-white/80">
              {Number(openRoom.entry_count || 0).toLocaleString()} in
            </span>
          </div>
        </section>
      )}

      {/* ── Other rooms ── */}
      {otherRooms.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between">
            <SectionLabel>OTHER ROOMS</SectionLabel>
            <span className="text-[11px] text-brand">All {rooms.length}</span>
          </div>

          <div className="mt-2.5 grid gap-1.5 md:grid-cols-2">
            {otherRooms.map(room => (
              <div key={room.id} className="flex items-center gap-[11px] rounded-[10px] bg-card p-2.5">
                <span
                  className="h-10 w-10 flex-none rounded-[7px]"
                  style={{ backgroundImage: 'repeating-linear-gradient(135deg,#242529 0 6px,#1c1d21 6px 12px)' }}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="truncate text-[12.5px] font-semibold leading-none">{room.name}</span>
                  <span className="truncate font-mono text-[10px] leading-none text-foreground/[.42]">
                    {roomStatusLine(room)}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/compete/vote')}
                  className="flex flex-none items-center gap-1 text-[11px] text-white/50 transition-colors hover:text-foreground"
                >
                  {room.status === 'voting' ? 'View' : 'Notify'}
                  {room.status === 'voting' ? <ArrowRight className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Last results: four tiers, no ranking, no losses ── */}
      {resultRoom && recognition.length > 0 && (
        <section className="mt-7">
          <SectionLabel>
            {new Date(resultRoom.ends_at).toLocaleDateString(undefined, { month: 'long' }).toUpperCase()} ·{' '}
            {String(resultRoom.category || '').toUpperCase()} ROOM
          </SectionLabel>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5 lg:grid-cols-4">
            {TIERS.map(tier => {
              const row = recognition.find(r => r.tier === tier.key);
              if (!row) return null;
              const isWinner = tier.key === 'winner';
              return (
                <div
                  key={tier.key}
                  className={cn(
                    'flex flex-col gap-[5px] rounded-[10px] p-2.5',
                    isWinner
                      ? 'border border-brand/30 bg-brand/[.12]'
                      : 'bg-card'
                  )}
                >
                  <span className={cn(
                    'font-mono text-[10px] font-semibold',
                    isWinner ? 'text-brand-tint' : 'text-foreground/[.55]'
                  )}>
                    {tier.label}
                  </span>
                  <span className="text-[12px] font-semibold leading-[1.25]">{row.headline}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {schemaReady && rooms.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[.12] py-16 text-center">
          <Trophy className="h-7 w-7 text-white/25" strokeWidth={1.4} />
          <p className="text-[15px] font-semibold">No rooms open yet</p>
          <p className="max-w-[340px] text-[13px] leading-relaxed text-white/50">
            League rooms run per category. When one opens you’ll be able to enter a single frame.
          </p>
        </div>
      )}
    </div>
  );
}
