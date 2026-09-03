import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Lightbox from '../../components/Lightbox/Lightbox';
import { Search, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Explore — mockup 2a.
   Masonry canvas with a region filter across the top and a context column on
   the right. Photo detail opens as a lightbox over this grid rather than a
   route change, so browsing never loses your place. */

const REGIONS = ['Ghana', 'Nigeria', 'Kenya', 'Global'];


const SORTS = ['Trending', 'Recent', 'Featured'];

/* Masonry rhythm from the mockup: a 2×2 anchor, a 1×2 tall, the rest square.
   Deterministic on index so the grid is stable between renders. */
function spanFor(i) {
  const slot = i % 8;
  if (slot === 0) return 'col-span-2 row-span-2';
  if (slot === 3) return 'row-span-2';
  return '';
}

function SectionLabel({ children }) {
  return (
    <span className="font-mono text-[9px] font-semibold tracking-[.11em] text-foreground/[.42]">
      {children}
    </span>
  );
}

function HatchAvatar({ src, name, size }) {
  if (src) {
    return (
      <img src={src} alt="" style={{ width: size, height: size }} className="flex-none rounded-full object-cover" />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        backgroundImage: 'repeating-linear-gradient(135deg,#232427 0 6px,#1b1c1f 6px 12px)',
        fontSize: Math.max(9, size * 0.38),
      }}
      className="flex flex-none items-center justify-center rounded-full font-semibold text-white/50"
    >
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default function DiscoverPage() {
  // Categories come from the database (one platform-controlled list) rather
  // than a hardcoded array. There used to be four such arrays across the app,
  // all disagreeing - a photo uploaded as one category was unfilterable in
  // another screen, and one list's "Commercial" existed nowhere else at all.
  const { categories: CATEGORIES } = useApp();
  const navigate = useNavigate();
  const { photos, users, currentUser, follows, followUser, challenges } = useApp();

  const [region, setRegion] = useState('Ghana');
  const [sort, setSort] = useState('Trending');
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [openIndex, setOpenIndex] = useState(null);

  const lower = (v) => (v || '').toString().toLowerCase();

  const visible = useMemo(() => {
    const q = lower(query);
    let list = (photos || []).filter((p) => {
      const inRegion =
        region === 'Global' ||
        lower(p.location).includes(lower(region)) ||
        lower(users.find((u) => u.id === p.ownerId)?.location).includes(lower(region));
      const inCategory = !category || lower(p.category) === lower(category);
      const inQuery =
        !q ||
        lower(p.caption).includes(q) ||
        lower(p.ownerName).includes(q) ||
        lower(p.category).includes(q);
      return inRegion && inCategory && inQuery;
    });

    // A region with nothing in it is a dead end, so fall back to everything
    // rather than showing an empty grid the person cannot act on.
    if (list.length === 0 && region !== 'Global' && !query && !category) {
      list = photos || [];
    }

    const sorted = [...list];
    if (sort === 'Recent') {
      sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sort === 'Featured') {
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.customStyle)) - Number(Boolean(a.customStyle)) ||
          (b.likes || 0) - (a.likes || 0)
      );
    } else {
      sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }
    return sorted;
  }, [photos, users, region, category, query, sort]);

  const followingIds = (follows || [])
    .filter((f) => (f.follower_id || f.followerId) === currentUser?.id)
    .map((f) => f.following_id || f.followingId);

  const rising = (users || [])
    .filter(
      (u) =>
        (u.role || u.account_type) === 'photographer' &&
        u.id !== currentUser?.id &&
        !followingIds.includes(u.id)
    )
    .slice(0, 3);

  const openLeague = (challenges || []).find((c) => c.status === 'active') || (challenges || [])[0];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">

      {/* ── Top bar ── */}
      {/* 1c puts the region rail on top on mobile; 2a keeps it inline on desktop. */}
      <header className="flex flex-none flex-col gap-2.5 border-b border-white/[.08] px-4 py-3 sm:h-[62px] sm:flex-row sm:items-center sm:gap-4 sm:py-0 md:gap-[18px] md:px-[26px]">
        <label className="relative flex h-9 w-full max-w-[420px] flex-1 items-center gap-[9px] rounded-[9px] border border-white/[.09] bg-card px-3">
          <Search className="h-4 w-4 flex-none text-foreground/[.38]" strokeWidth={1.7} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search photographers, tags, categories"
            aria-label="Search"
            className="w-full bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-foreground/[.38]"
          />
        </label>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 text-[11.5px] sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={cn(
                'flex-none rounded-full px-[11px] py-[7px] transition-colors',
                region === r
                  ? 'bg-brand font-semibold text-brand-foreground'
                  : 'bg-white/[.07] text-white/70 hover:text-foreground'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Canvas ── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 pt-[22px] md:px-[26px]">
          <div className="flex flex-wrap items-baseline justify-between gap-3 pb-3.5">
            <div className="flex flex-col gap-[5px]">
              <h1 className="text-[22px] font-bold leading-none tracking-[-.015em]">
                {category ? `${category} in ${region}` : `Trending in ${region}`}
              </h1>
              <span className="text-[12.5px] leading-none text-white/50">
                Community picks from the last 7 days
              </span>
            </div>
            <div className="flex gap-4 text-[12.5px]">
              {SORTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    'pb-[5px] transition-colors',
                    sort === s
                      ? 'border-b-2 border-brand font-semibold text-foreground'
                      : 'text-white/45 hover:text-white/80'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {category && (
            <button
              onClick={() => setCategory(null)}
              className="mb-3 self-start rounded-md bg-white/[.06] px-2.5 py-1 text-[11px] text-white/70 hover:text-foreground"
            >
              Clear “{category}” ✕
            </button>
          )}

          {visible.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-16 text-center">
              <ImageOff className="h-8 w-8 text-white/25" strokeWidth={1.4} />
              <p className="text-[15px] font-semibold">Nothing here yet</p>
              <p className="max-w-[320px] text-[13px] leading-relaxed text-white/50">
                No work matches this filter. Try another region or category — or upload the first frame.
              </p>
              <button
                onClick={() => navigate('/upload')}
                className="mt-1 rounded-lg bg-brand px-4 py-2 text-[12.5px] font-semibold text-brand-foreground transition-opacity hover:opacity-90"
              >
                Upload work
              </button>
            </div>
          ) : (
            <div className="grid auto-rows-[104px] grid-cols-3 gap-1.5 pb-8 sm:auto-rows-[154px] sm:grid-cols-2 sm:gap-2 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setOpenIndex(i)}
                  className={cn(
                    'group relative overflow-hidden rounded-lg bg-muted outline-none ring-brand transition-transform focus-visible:ring-2',
                    spanFor(i)
                  )}
                  aria-label={photo.caption || 'Open photo'}
                >
                  {photo.isVideo ? (
                    <video src={photo.url} muted loop playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img
                      src={photo.url}
                      alt={photo.caption || ''}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                  <span className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="truncate font-mono text-[9px] text-white/80">
                      {lower(photo.category || 'work')} · {lower(photo.ownerName || '')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Context column ── */}
        <aside className="hidden w-[268px] flex-none flex-col gap-[22px] overflow-y-auto border-l border-white/[.08] px-[22px] pb-6 pt-[22px] lg:flex">

          {rising.length > 0 && (
            <div className="flex flex-col gap-[11px]">
              <SectionLabel>RISING CREATORS</SectionLabel>
              {rising.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <button onClick={() => navigate(`/profile/${u.id}`)} className="flex-none">
                    <HatchAvatar src={u.avatar_url || u.avatar} name={u.name} size={34} />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <button
                      onClick={() => navigate(`/profile/${u.id}`)}
                      className="truncate text-left text-[12px] font-semibold leading-none hover:underline"
                    >
                      {u.name || u.username}
                    </button>
                    <span className="truncate font-mono text-[10px] leading-none text-foreground/[.42]">
                      {lower((u.service_categories || [])[0] || 'photography')} · {lower(u.location || 'earth')}
                    </span>
                  </div>
                  <button
                    onClick={() => followUser?.(u.id)}
                    className="flex-none text-[11px] text-brand transition-opacity hover:opacity-80"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <SectionLabel>CATEGORIES</SectionLabel>
            <div className="flex flex-wrap gap-1.5 text-[11.5px] text-foreground/[.72]">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(category === c ? null : c)}
                  className={cn(
                    'rounded-[7px] px-2.5 py-[7px] transition-colors',
                    category === c
                      ? 'bg-brand font-semibold text-brand-foreground'
                      : 'bg-white/[.06] hover:bg-white/[.1] hover:text-foreground'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex flex-col gap-[7px] rounded-[10px] border border-brand/[.22] p-[13px]"
            style={{ backgroundImage: 'linear-gradient(160deg,#1c2620,#151617)' }}
          >
            <span className="font-mono text-[9px] tracking-[.11em] text-brand">
              OPEN LEAGUE{openLeague?.days_left ? ` · ${openLeague.days_left}D LEFT` : ''}
            </span>
            <span className="text-[13px] font-semibold leading-tight">
              {openLeague?.title || 'Street vs Street'}
            </span>
            <span className="text-[11.5px] leading-[1.4] text-white/60">
              {openLeague?.entry_count
                ? `${openLeague.entry_count.toLocaleString()} photographers in. One frame each.`
                : 'One frame each. Category rooms only.'}
            </span>
            <button
              onClick={() => navigate('/compete/vote')}
              className="mt-[3px] flex h-8 items-center justify-center rounded-[7px] bg-brand text-[12px] font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              Enter a frame
            </button>
          </div>
        </aside>
      </div>

      {openIndex !== null && (
        <Lightbox
          photos={visible}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}
