import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { avatarUrlOf, initialsOf } from '@/lib/avatars';
import { cn } from '@/lib/utils';
import { Search, Star, MapPin, MessageSquare, Verified, Users, Loader2 } from 'lucide-react';

/**
 * Find a photographer.
 *
 * WHAT WAS WRONG: every filter on this page was applied to `users` from
 * AppContext, which is capped at the first 100 profiles loaded on mount. The
 * filters themselves were careful - they refused to treat an unrated
 * photographer as five stars, and would not pass someone with no declared
 * categories through a category filter - and all of that care was spent on the
 * wrong hundred rows. Photographer 101 could not be found by name, ever.
 *
 * The same rules now run in search_photographers (migration v36), across every
 * row, and the count shown is the real one.
 *
 * TWO SORTS WERE REMOVED. "Most Booked" and "Nearest" sorted by nothing:
 * nothing counts bookings per photographer and nothing stores a coordinate.
 * A control that looks like it ranks and does not is worse than its absence.
 */

const SORTS = [
  { key: 'rating',  label: 'Best rated' },
  { key: 'reviews', label: 'Most reviewed' },
  { key: 'wins',    label: 'Most wins' },
  { key: 'recent',  label: 'Newest' }
];

const PAGE_SIZE = 24;

export default function ClientSearch() {
  const navigate = useNavigate();
  // Categories come from the database (one platform-controlled list) rather
  // than a hardcoded array. There used to be four such arrays across the app,
  // all disagreeing.
  const { categories, searchPhotographers } = useApp();
  const CATEGORIES = ['All', ...categories];

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState('rating');

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // The search box asks the database, so it is debounced. Without this every
  // keystroke is a round trip, which is fine at eight users and a denial of
  // service against ourselves at ten thousand.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Guards against an older, slower response overwriting a newer one.
  const requestRef = useRef(0);

  const run = useCallback(async (nextPage, { append = false } = {}) => {
    const ticket = ++requestRef.current;
    setLoading(true);
    setError(null);

    const result = await searchPhotographers({
      query: debounced, category, minRating, availableOnly, sort,
      page: nextPage, limit: PAGE_SIZE
    });

    if (ticket !== requestRef.current) return;

    if (!result.success) {
      setError('Search is unavailable right now.');
      setResults([]);
      setTotal(0);
      setHasMore(false);
    } else {
      setResults(prev => (append ? [...prev, ...result.results] : result.results));
      setTotal(result.total);
      setHasMore(result.hasMore);
    }
    setLoading(false);
  }, [searchPhotographers, debounced, category, minRating, availableOnly, sort]);

  useEffect(() => {
    setPage(0);
    run(0);
  }, [run]);

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setMinRating(0);
    setAvailableOnly(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 animate-in fade-in duration-500">

      <div className="max-w-5xl mx-auto mb-8 md:mb-10">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3 text-foreground">
          Find a photographer
        </h1>
        <p className="text-muted-foreground mb-6 md:mb-8 max-w-lg">
          Search by what you need shot, where you need it, or by name.
        </p>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Portraits in Accra, wedding, a name…"
            aria-label="Search photographers"
            id="photographer-search"
            className="w-full h-14 pl-12 bg-card/80 border-border text-base md:text-lg rounded-2xl placeholder:text-muted-foreground focus-visible:ring-primary transition-all hover:bg-card"
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">

        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-7">
          <div>
            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Category</h3>
            <div className="flex flex-wrap lg:flex-col gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all text-left active:scale-95',
                    category === c
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Minimum rating</h3>
            <div className="flex flex-wrap gap-2">
              {[0, 4, 4.5, 4.8].map(r => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95',
                    minRating === r
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {r === 0 ? 'Any' : `${r}+`}
                </button>
              ))}
            </div>
            {minRating > 0 && (
              <p className="text-[12px] text-muted-foreground mt-2">
                Photographers nobody has reviewed are excluded.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Availability</h3>
            <button
              onClick={() => setAvailableOnly(v => !v)}
              aria-pressed={availableOnly}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95',
                availableOnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              Available for work
            </button>
          </div>

          <div>
            <h3 className="text-sm font-bold tracking-widest text-muted-foreground uppercase mb-3">Sort by</h3>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              aria-label="Sort results"
              className="w-full bg-card/50 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              {SORTS.map(s => <option key={s.key} value={s.key} className="bg-card">{s.label}</option>)}
            </select>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {!loading && !error && (
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {total} {total === 1 ? 'photographer' : 'photographers'}
            </p>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400" role="alert">
              {error}
            </div>
          )}

          {loading && results.length === 0 ? (
            <div className="flex flex-col gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-card/50 rounded-xl animate-pulse border border-border/50" />
              ))}
            </div>
          ) : results.length === 0 && !error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-3xl bg-card/20">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Nobody matches that</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Try a broader category, or drop the minimum rating.
              </p>
              <Button variant="outline" onClick={clearFilters} className="border-border text-foreground hover:bg-muted">
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {results.map(p => {
                const tags = [...(p.service_categories || []), ...(p.specialties || [])]
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .slice(0, 4);
                return (
                  <Card key={p.id} className="bg-card/40 border-border/50 overflow-hidden transition-all hover:bg-card/80 hover:border-border">
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col md:flex-row gap-5 md:gap-6">

                        <div className="flex flex-1 gap-4 min-w-0">
                          <Avatar
                            className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-border cursor-pointer shrink-0"
                            onClick={() => navigate(`/profile/${p.id}`)}
                          >
                            <AvatarImage src={avatarUrlOf(p.avatar_url)} className="object-cover" alt="" />
                            <AvatarFallback className="bg-muted text-xl">{initialsOf(p.name)}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h2
                                className="text-lg sm:text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                                onClick={() => navigate(`/profile/${p.id}`)}
                              >
                                {p.name}
                              </h2>
                              {p.verified && <Verified className="w-5 h-5 text-blue-500 shrink-0" />}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-3">
                              {p.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" /> {p.location}
                                </span>
                              )}
                              {/* The count in brackets used to be `wins`, sitting
                                  next to a star, where every reader takes it for
                                  a review count. It is the review count now. */}
                              <span className="flex items-center gap-1 text-foreground">
                                <Star className="w-4 h-4" />
                                {p.rating != null
                                  ? <>
                                      <span className="font-medium tabular-nums">{Number(p.rating).toFixed(1)}</span>
                                      <span className="text-muted-foreground tabular-nums">
                                        ({p.review_count} {p.review_count === 1 ? 'review' : 'reviews'})
                                      </span>
                                    </>
                                  : <span className="text-muted-foreground">No reviews yet</span>}
                              </span>
                              {p.wins > 0 && (
                                <span className="text-muted-foreground tabular-nums">
                                  {p.wins} {p.wins === 1 ? 'battle won' : 'battles won'}
                                </span>
                              )}
                            </div>

                            {tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2">
                                {tags.map(tag => (
                                  <span key={tag} className="px-2.5 py-1 rounded-md bg-muted text-xs font-medium text-foreground">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end justify-between gap-3 md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                          {/* The starting rate is deliberately not shown. The
                              column is a bare integer with no currency stored
                              anywhere, so "from 800" would be a number a client
                              has to guess at - and guessing wrong about price is
                              the expensive kind of wrong. It goes back on this
                              card when a currency goes in the database. */}
                          <div className="flex flex-col gap-2 w-full">
                            <Button
                              onClick={() => navigate(`/profile/${p.id}`)}
                              className="w-full bg-primary text-primary-foreground font-bold hover:bg-primary/90"
                            >
                              View portfolio
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/client/inbox?chat=${p.id}`)}
                              className="w-full border-border text-foreground hover:bg-muted"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" /> Message
                            </Button>
                          </div>
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => { const next = page + 1; setPage(next); run(next, { append: true }); }}
                    className="rounded-xl bg-card text-foreground border-border hover:bg-muted"
                    id="search-load-more"
                  >
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…</> : 'Show more'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
