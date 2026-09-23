import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { avatarUrlOf, initialsOf } from '@/lib/avatars';
import { callToAction, formatRemaining } from '@/lib/brief';
import SmartImage from '@/components/SmartImage/SmartImage';
import { Camera, Clock, Users, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * The Brief — docs/SPEC-the-brief.md.
 *
 * One constraint a week. It exists because an open-ended invitation to "post a
 * photograph" is the easiest thing in the world to postpone, and because two
 * hundred answers to the same question are worth scrolling where two hundred
 * unrelated photographs are not.
 *
 * Everything shown here is counted by the database. There is no rank on this
 * page and no losses, by the standing product rules.
 */

function SectionLabel({ children, className }) {
  return (
    <span className={cn('font-mono text-[9px] font-semibold tracking-[.11em] text-foreground/[.42]', className)}>
      {children}
    </span>
  );
}

export default function BriefPage() {
  const navigate = useNavigate();
  const {
    currentBrief,
    briefEntries,
    briefLoading,
    loadCurrentBrief,
    loadBriefEntries
  } = useApp();

  const [entriesLoading, setEntriesLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadCurrentBrief();
  }, [loadCurrentBrief]);

  useEffect(() => {
    let cancelled = false;
    if (!currentBrief?.id) {
      setEntriesLoading(false);
      return undefined;
    }
    setEntriesLoading(true);
    loadBriefEntries(currentBrief.id).then(result => {
      if (cancelled) return;
      setHasMore(Boolean(result.hasMore));
      setEntriesLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentBrief?.id, loadBriefEntries]);

  const loadMore = useCallback(async () => {
    const last = briefEntries[briefEntries.length - 1];
    if (!last) return;
    setLoadingMore(true);
    const result = await loadBriefEntries(currentBrief.id, { cursor: last.entered_at });
    setHasMore(Boolean(result.hasMore));
    setLoadingMore(false);
  }, [briefEntries, currentBrief, loadBriefEntries]);

  const cta = useMemo(() => callToAction(currentBrief), [currentBrief]);

  if (briefLoading && !currentBrief) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Never an empty page: if no brief has ever run, say exactly that.
  if (!currentBrief) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
        <Camera className="w-10 h-10 mx-auto text-muted-foreground" />
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">No brief yet</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          The Brief is a weekly constraint everyone shoots to. The first one has not been set.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">

      {/* The constraint, large, first thing on the page. */}
      <header className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <SectionLabel>{currentBrief.is_open ? 'THIS WEEK' : 'LAST BRIEF'}</SectionLabel>
          {currentBrief.category && (
            <SectionLabel className="text-foreground/[.6]">{currentBrief.category.toUpperCase()}</SectionLabel>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-[1.05]">
          {currentBrief.title}
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {currentBrief.prompt}
        </p>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {currentBrief.is_open
              ? formatRemaining(currentBrief.seconds_remaining)
              : `closed ${new Date(currentBrief.closes_at).toLocaleDateString()}`}
          </span>
          <span className="inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            {currentBrief.photographers ?? 0} {currentBrief.photographers === 1 ? 'photographer' : 'photographers'}
            {' · '}
            {currentBrief.entries_total ?? 0} {currentBrief.entries_total === 1 ? 'frame' : 'frames'}
          </span>
        </div>

        {currentBrief.is_open ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="lg"
              disabled={cta?.done}
              onClick={() => navigate('/upload')}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              id="brief-cta"
            >
              {cta?.done && <CheckCircle2 className="w-4 h-4 mr-2" />}
              {cta?.label}
            </Button>
            <span className="text-sm text-muted-foreground">
              {/* The rule stated plainly, because being refused at the end of an
                  upload with no warning is how a feature loses someone. */}
              Shoot it during the week — only photographs uploaded while the brief is open can be entered.
            </span>
          </div>
        ) : (
          <div className="pt-1 text-sm text-muted-foreground">
            {currentBrief.next_opens_at
              ? `The next brief opens ${new Date(currentBrief.next_opens_at).toLocaleDateString()}.`
              : 'The next brief has not been set yet.'}
          </div>
        )}
      </header>

      {/* Entries. A grid rather than a feed: the point is comparison. */}
      <section className="space-y-4">
        <SectionLabel>{currentBrief.is_open ? 'ANSWERS SO FAR' : 'WHAT CAME IN'}</SectionLabel>

        {entriesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : briefEntries.length === 0 ? (
          <div className="py-16 text-center border border-border/50 border-dashed rounded-2xl bg-card/20">
            <p className="text-muted-foreground font-medium">
              {currentBrief.is_open ? 'Nobody has answered yet. Be first.' : 'This brief closed with no entries.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {briefEntries.map(entry => (
                <figure key={entry.item_id} className="group space-y-2">
                  <div className="overflow-hidden rounded-xl bg-card aspect-[4/5]">
                    <SmartImage
                      src={entry.media_url}
                      alt={entry.caption || `Entry by ${entry.owner_name}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <figcaption className="flex items-center gap-2 min-w-0">
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarImage src={avatarUrlOf(entry.owner_avatar)} alt="" />
                      <AvatarFallback className="text-[10px]">{initialsOf(entry.owner_name)}</AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${entry.owner_id}`)}
                      className="text-[13px] text-muted-foreground hover:text-foreground transition-colors truncate"
                    >
                      {entry.owner_name}
                    </button>
                  </figcaption>
                </figure>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-xl bg-card text-foreground border-border hover:bg-muted"
                  id="brief-load-more"
                >
                  {loadingMore ? 'Loading…' : 'Show more'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
