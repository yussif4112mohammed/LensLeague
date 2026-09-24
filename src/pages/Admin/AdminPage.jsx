import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { avatarUrlOf, initialsOf } from '@/lib/avatars';
import Logo from '@/components/Logo';
import {
  Shield, ArrowLeft, ShieldAlert, Ban, CheckCircle, AlertTriangle, UserX,
  Gavel, FileImage, UserCheck, RotateCcw, Search, ScrollText, RefreshCw,
  Users as UsersIcon, Camera, CalendarPlus
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

/**
 * The admin console.
 *
 * Everything on this page comes from the database through a SECURITY DEFINER
 * RPC that checks the caller's permission for itself. The `isAdmin` guard below
 * hides the page; it does not protect anything. Bypassing it in devtools shows
 * an empty console and every action refused.
 *
 * WHAT WAS WRONG BEFORE: the moderation and dispute queues were local React
 * state that nothing ever filled from the database, and "Remove Photo" wrote a
 * status onto the report while leaving the photograph public.
 */

function StatTile({ label, value, icon: Icon, tone = 'default' }) {
  return (
    <Card className="bg-card/50 border-border/50 rounded-2xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={cn(
          'w-4 h-4 shrink-0',
          tone === 'alert' ? 'text-red-400' : tone === 'warn' ? 'text-yellow-500' : 'text-muted-foreground'
        )} />
      </CardHeader>
      <CardContent>
        {/* Never invent a number: an em dash until the database has answered. */}
        <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
          {value === null || value === undefined ? '—' : value}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 border border-border/50 border-dashed rounded-2xl bg-card/20 text-center">
      <Icon className="w-10 h-10 text-muted-foreground mb-4" />
      <p className="text-muted-foreground font-medium">{children}</p>
    </div>
  );
}

function ReportCard({ report, onDismiss, onRemove, onRestore }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    const result = await fn();
    if (!result?.success) setError(result?.error || 'That did not work.');
    setBusy(false);
    setConfirming(false);
  };

  const isPending = report.status === 'pending';
  const isPhoto = report.target_type === 'portfolio_item';

  return (
    <Card className="bg-card/50 border-border/50 rounded-2xl overflow-hidden" id={`report-${report.id}`}>
      <div className="flex flex-col sm:flex-row">
        {/* A preview only when there is genuinely something to preview. A report
            on a message has no image, and a grey box pretending otherwise is
            worse than the honest absence of one. */}
        {report.target_preview ? (
          <div className="w-full sm:w-44 h-44 sm:h-auto shrink-0 bg-background">
            <img
              src={report.target_preview}
              alt={`Reported ${report.target_type.replace('_', ' ')}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="w-full sm:w-44 h-20 sm:h-auto shrink-0 bg-background/60 flex items-center justify-center">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {report.target_type?.replace('_', ' ')}
            </span>
          </div>
        )}

        <div className="p-5 sm:p-6 flex flex-col justify-between grow gap-4 min-w-0">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {report.target_label}
                </h3>
                <div className="text-sm text-muted-foreground mt-1 truncate">
                  {report.target_owner_name ? `By ${report.target_owner_name} · ` : ''}
                  Flagged by {report.reporter_name}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {report.target_removed && (
                  <Badge variant="outline" className="rounded-full border-red-500/30 text-red-400 bg-red-500/10">
                    Removed
                  </Badge>
                )}
                <Badge variant={isPending ? 'outline' : 'secondary'} className={cn(
                  'capitalize rounded-full',
                  isPending ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' : 'bg-muted text-foreground'
                )}>
                  {report.status}
                </Badge>
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">Reason given</div>
                <div className="text-red-400 mt-1 break-words">&ldquo;{report.reason}&rdquo;</div>
              </div>
            </div>

            {report.resolution_notes && !isPending && (
              <div className="text-sm text-muted-foreground">
                Outcome: {report.resolution_notes}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400" role="alert">{error}</div>
            )}
          </div>

          {isPending && (
            <div className="pt-4 border-t border-border/50 space-y-3">
              {confirming ? (
                <div className="space-y-3">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why is this being removed? (recorded against the photograph)"
                    className="bg-card border-border text-foreground"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      disabled={busy}
                      className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl"
                      onClick={() => run(() => onRemove(report.id, note))}
                      id={`confirm-remove-${report.id}`}
                    >
                      {busy ? 'Removing…' : 'Yes, take it down'}
                    </Button>
                    <Button variant="ghost" disabled={busy} className="rounded-xl" onClick={() => setConfirming(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    className="bg-card text-foreground border-border hover:bg-muted rounded-xl"
                    onClick={() => run(() => onDismiss(report.id))}
                    id={`dismiss-report-${report.id}`}
                  >
                    {busy ? 'Working…' : 'Dismiss flag'}
                  </Button>
                  {isPhoto && (
                    <Button
                      variant="destructive"
                      disabled={busy}
                      className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl"
                      onClick={() => setConfirming(true)}
                      id={`remove-content-${report.id}`}
                    >
                      Remove photograph
                    </Button>
                  )}
                  {!isPhoto && (
                    <span className="text-sm text-muted-foreground self-center">
                      Use the People tab to act on an account.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {!isPending && report.target_removed && (
            <div className="pt-4 border-t border-border/50">
              <Button
                variant="outline"
                disabled={busy}
                className="bg-card text-foreground border-border hover:bg-muted rounded-xl"
                onClick={() => run(() => onRestore(report.target_id))}
                id={`restore-content-${report.target_id}`}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Put it back
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Briefs.
 *
 * The Brief only works if somebody sets one every week. Without this panel that
 * means hand-writing SQL against production every Monday, which is the kind of
 * chore that gets skipped once and then never resumed - and a feature that
 * depends on a weekly chore nobody does is a feature that does not exist.
 *
 * The one-brief-at-a-time rule is an exclusion constraint in the database. This
 * form does not duplicate it; it reports what the database said.
 */
function BriefsPanel({ briefs, onCreate, onRefresh }) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => { onRefresh(); }, [onRefresh]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const result = await onCreate({
      title: title.trim(),
      prompt: prompt.trim(),
      opensAt: new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString()
    });
    if (result.success) {
      setDone(`"${title.trim()}" is scheduled.`);
      setTitle(''); setPrompt(''); setOpensAt(''); setClosesAt('');
    } else {
      setError(result.error);
    }
    setBusy(false);
  };

  const valid = title.trim() && prompt.trim() && opensAt && closesAt
    && new Date(closesAt) > new Date(opensAt);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Briefs</h2>
        <p className="text-muted-foreground">
          One constraint at a time. Only photographs uploaded inside a brief&rsquo;s window can be entered into it.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-border/50 bg-card/30 p-5 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="brief-title" className="text-sm font-medium text-foreground">Title</label>
            <Input
              id="brief-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Golden hour, no sun"
              className="mt-2 h-11 bg-card border-border text-foreground rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="brief-prompt" className="text-sm font-medium text-foreground">The constraint</label>
            <Textarea
              id="brief-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="One or two sentences. Say what they may not do, not only what they should."
              className="mt-2 bg-card border-border text-foreground rounded-xl min-h-[90px]"
            />
          </div>
          <div>
            <label htmlFor="brief-opens" className="text-sm font-medium text-foreground">Opens</label>
            <Input
              id="brief-opens" type="datetime-local" value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
              className="mt-2 h-11 bg-card border-border text-foreground rounded-xl"
            />
          </div>
          <div>
            <label htmlFor="brief-closes" className="text-sm font-medium text-foreground">Closes</label>
            <Input
              id="brief-closes" type="datetime-local" value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="mt-2 h-11 bg-card border-border text-foreground rounded-xl"
            />
          </div>
        </div>

        {error && <div className="text-sm text-red-400" role="alert">{error}</div>}
        {done && <div className="text-sm text-emerald-400">{done}</div>}

        <Button
          type="submit"
          disabled={!valid || busy}
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          id="create-brief"
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          {busy ? 'Scheduling…' : 'Schedule brief'}
        </Button>
      </form>

      {briefs.length === 0 ? (
        <EmptyState icon={Camera}>No brief has been set yet.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {briefs.map(b => (
            <Card key={b.id} className="bg-card/50 border-border/50 rounded-2xl" id={`brief-${b.id}`}>
              <CardContent className="p-5 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-foreground">{b.title}</h3>
                  <Badge variant={b.state === 'open' ? 'outline' : 'secondary'} className={cn(
                    'capitalize rounded-full',
                    b.state === 'open' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'bg-muted text-foreground'
                  )}>
                    {b.state}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{b.prompt}</p>
                <div className="text-[12px] text-muted-foreground tabular-nums">
                  {new Date(b.opens_at).toLocaleDateString()} – {new Date(b.closes_at).toLocaleDateString()}
                  {' · '}{b.entries_total} {b.entries_total === 1 ? 'frame' : 'frames'}
                  {' · '}{b.photographers} {b.photographers === 1 ? 'photographer' : 'photographers'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const {
    isAdmin,
    authLoading,
    currentUser,
    users,
    reports,
    disputes,
    auditLog,
    platformStats,
    adminLoading,
    adminError,
    loadAdminConsole,
    dismissReport,
    removeReportedContent,
    restoreContent,
    verifyPhotographer,
    banPhotographer,
    resolveDispute,
    allBriefs,
    loadAllBriefs,
    createBrief
  } = useApp();

  const [userQuery, setUserQuery] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    if (isAdmin) loadAdminConsole();
  }, [isAdmin, loadAdminConsole]);

  const visibleReports = useMemo(
    () => (showResolved ? reports : reports.filter(r => r.status === 'pending')),
    [reports, showResolved]
  );

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] bg-background">
        <span className="text-sm font-medium text-muted-foreground tracking-wide">Checking access…</span>
      </div>
    );
  }

  if (!isAdmin) {
    // Two different situations, and telling them apart matters. Someone signed
    // out needs to sign in. Someone signed in without the role does not - and
    // sending them to /login, which redirects to /feed on success, walks them
    // in a circle with no explanation of what actually went wrong.
    const signedIn = Boolean(currentUser);

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 text-center p-6 bg-background animate-in fade-in zoom-in duration-500">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          {signedIn ? 'Not an operator account' : 'Sign in to continue'}
        </h1>
        <p className="text-muted-foreground max-w-md leading-relaxed">
          {signedIn
            ? `You are signed in as ${currentUser.name || currentUser.username || 'this account'}, which does not hold an operator role. Access here is granted in the database, not by signing in again.`
            : 'This console is restricted to platform operators.'}
        </p>
        <Button
          onClick={() => navigate(signedIn ? '/feed' : '/login')}
          size="lg"
          className="mt-2 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          id={signedIn ? 'back-to-feed-btn' : 'go-to-login-btn'}
        >
          {signedIn ? 'Back to the feed' : 'Go to log in'}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-muted-foreground p-4 sm:p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground hover:bg-card/50 -ml-2 sm:-ml-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Exit console
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAdminConsole}
                disabled={adminLoading}
                className="text-muted-foreground hover:text-foreground rounded-xl"
                id="admin-refresh"
              >
                <RefreshCw className={cn('w-4 h-4 sm:mr-2', adminLoading && 'animate-spin')} />
                <span className="hidden sm:inline">{adminLoading ? 'Loading…' : 'Refresh'}</span>
              </Button>
              <Badge variant="outline" className="bg-card/50 border-border text-foreground gap-2 py-1.5 px-3 hidden sm:flex">
                <Shield className="w-3.5 h-3.5 text-indigo-400" /> Operator
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <Logo className="w-9 h-9 sm:w-10 sm:h-10" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Admin console
              </h1>
            </div>
            <p className="text-muted-foreground sm:text-lg">
              Moderation, accounts, disputes and the record of who did what.
            </p>
          </div>

          {adminError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400" role="alert">
              Some of this console could not load — {adminError}
            </div>
          )}
        </div>

        {/* Counted platform-wide by the database, not derived from whatever
            profiles this browser happens to be holding. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatTile label="Pending flags"   value={platformStats?.reports_pending}  icon={ShieldAlert} tone="alert" />
          <StatTile label="Open disputes"   value={platformStats?.disputes_pending} icon={Gavel}      tone="warn" />
          <StatTile label="People"          value={platformStats?.users_total}      icon={UsersIcon} />
          <StatTile label="Photographs"     value={platformStats?.items_total}      icon={Camera} />
          <StatTile label="Banned accounts" value={platformStats?.banned_total}     icon={UserX} />
          <StatTile label="Verified"        value={platformStats?.verified_total}   icon={UserCheck} />
          <StatTile label="Removed content" value={platformStats?.items_removed}    icon={FileImage} />
          <StatTile label="New this week"   value={platformStats?.signups_last_7_days} icon={UsersIcon} />
        </div>

        <Tabs defaultValue="mod" className="w-full">
          <TabsList className="bg-card/50 border border-border/50 rounded-xl p-1 w-full grid grid-cols-2 sm:grid-cols-5 gap-1 h-auto">
            <TabsTrigger value="mod" className="rounded-lg data-[active]:bg-muted data-[active]:text-foreground text-muted-foreground py-2.5">
              Moderation
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[active]:bg-muted data-[active]:text-foreground text-muted-foreground py-2.5">
              People
            </TabsTrigger>
            <TabsTrigger value="briefs" className="rounded-lg data-[active]:bg-muted data-[active]:text-foreground text-muted-foreground py-2.5">
              Briefs
            </TabsTrigger>
            <TabsTrigger value="disputes" className="rounded-lg data-[active]:bg-muted data-[active]:text-foreground text-muted-foreground py-2.5">
              Disputes
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg data-[active]:bg-muted data-[active]:text-foreground text-muted-foreground py-2.5">
              Activity
            </TabsTrigger>
          </TabsList>

          {/* ── Moderation ─────────────────────────────────────────────── */}
          <TabsContent value="mod" className="mt-6">
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Reported content</h2>
                  <p className="text-muted-foreground">Everything anyone has flagged, oldest pending first.</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowResolved(v => !v)}
                  className="rounded-xl text-muted-foreground hover:text-foreground"
                  id="toggle-resolved"
                >
                  {showResolved ? 'Show pending only' : 'Show everything'}
                </Button>
              </div>

              {adminLoading && reports.length === 0 ? (
                <EmptyState icon={RefreshCw}>Loading the queue…</EmptyState>
              ) : visibleReports.length === 0 ? (
                <EmptyState icon={FileImage}>
                  {showResolved ? 'Nothing has been reported yet.' : 'Nothing is waiting on a decision.'}
                </EmptyState>
              ) : (
                <div className="grid gap-4">
                  {visibleReports.map(report => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onDismiss={dismissReport}
                      onRemove={removeReportedContent}
                      onRestore={restoreContent}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── People ─────────────────────────────────────────────────── */}
          <TabsContent value="users" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">People</h2>
                <p className="text-muted-foreground">
                  Verify an account, or suspend one. {platformStats?.users_total > users.length && (
                    <span>Showing the {users.length} loaded of {platformStats.users_total} — search is over those.</span>
                  )}
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Search by name or username"
                  className="pl-9 h-11 bg-card border-border text-foreground rounded-xl"
                  id="admin-user-search"
                />
              </div>

              {filteredUsers.length === 0 ? (
                <EmptyState icon={UsersIcon}>No account matches that.</EmptyState>
              ) : (
                <div className="grid gap-3">
                  {filteredUsers.map(u => (
                    <Card key={u.id} className="bg-card/50 border-border/50 rounded-2xl" id={`user-${u.id}`}>
                      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarImage src={avatarUrlOf(u.avatar_url, u.avatar)} alt="" />
                            <AvatarFallback>{initialsOf(u.name || u.username)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-foreground truncate">{u.name || 'Unnamed'}</h3>
                              {u.verified && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                              {u.banned && (
                                <Badge variant="outline" className="rounded-full border-red-500/30 text-red-400 bg-red-500/10">
                                  Suspended
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              @{u.username || 'no-username'} · {u.role || 'photographer'}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {!u.verified && (
                            <Button
                              variant="outline"
                              className="bg-card text-foreground border-border hover:bg-muted rounded-xl"
                              onClick={() => verifyPhotographer(u.id)}
                              id={`verify-${u.id}`}
                            >
                              <UserCheck className="w-4 h-4 mr-2" /> Verify
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className={cn(
                              'rounded-xl border',
                              u.banned
                                ? 'bg-card text-foreground border-border hover:bg-muted'
                                : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                            )}
                            onClick={() => banPhotographer(u.id)}
                            id={`ban-${u.id}`}
                          >
                            <Ban className="w-4 h-4 mr-2" /> {u.banned ? 'Lift suspension' : 'Suspend'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Briefs ─────────────────────────────────────────────────── */}
          <TabsContent value="briefs" className="mt-6">
            <BriefsPanel briefs={allBriefs} onCreate={createBrief} onRefresh={loadAllBriefs} />
          </TabsContent>

          {/* ── Disputes ───────────────────────────────────────────────── */}
          <TabsContent value="disputes" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Disputes</h2>
                <p className="text-muted-foreground">Contested results, raised by photographers.</p>
              </div>

              {disputes.length === 0 ? (
                <EmptyState icon={Gavel}>No dispute has been raised.</EmptyState>
              ) : (
                <div className="grid gap-4">
                  {disputes.map(d => (
                    <Card key={d.id} className="bg-card/50 border-border/50 rounded-2xl" id={`dispute-${d.id}`}>
                      <CardContent className="p-5 sm:p-6 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-foreground truncate">{d.title}</h3>
                            <div className="text-sm text-muted-foreground">Raised by {d.reporter}</div>
                          </div>
                          <Badge variant={d.status === 'pending' ? 'outline' : 'secondary'} className={cn(
                            'capitalize rounded-full',
                            d.status === 'pending'
                              ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10'
                              : 'bg-muted text-foreground'
                          )}>
                            {d.status}
                          </Badge>
                        </div>

                        <div className="text-muted-foreground break-words">{d.reason}</div>

                        <div className="flex gap-6 text-sm text-muted-foreground tabular-nums">
                          <span>Votes A: <span className="text-foreground font-semibold">{d.votes_a}</span></span>
                          <span>Votes B: <span className="text-foreground font-semibold">{d.votes_b}</span></span>
                        </div>

                        {d.resolution && (
                          <div className="text-sm text-muted-foreground">Outcome: {d.resolution}</div>
                        )}

                        {d.status === 'pending' && (
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
                            <Button
                              variant="outline"
                              className="bg-card text-foreground border-border hover:bg-muted rounded-xl"
                              onClick={() => resolveDispute(d.id, 'Dismissed: no irregularity found in the voting record.')}
                              id={`dismiss-dispute-${d.id}`}
                            >
                              Dismiss
                            </Button>
                            <Button
                              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
                              onClick={() => resolveDispute(d.id, 'Upheld: irregular votes removed and the result recalculated.')}
                              id={`uphold-dispute-${d.id}`}
                            >
                              Uphold
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Activity ───────────────────────────────────────────────── */}
          <TabsContent value="activity" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Activity</h2>
                <p className="text-muted-foreground">
                  Every moderation action, with who took it. Written by the database, not by this screen.
                </p>
              </div>

              {auditLog.length === 0 ? (
                <EmptyState icon={ScrollText}>Nothing has been recorded yet.</EmptyState>
              ) : (
                <div className="rounded-2xl border border-border/50 bg-card/30 divide-y divide-border/50 overflow-hidden">
                  {auditLog.map(entry => (
                    <div key={entry.id} className="p-4 flex flex-wrap items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-foreground font-medium">{entry.actor_name}</span>
                        <span className="text-muted-foreground"> · {entry.action.toLowerCase().replace(/_/g, ' ')}</span>
                        {entry.target_type && (
                          <span className="text-muted-foreground"> · {entry.target_type.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                      <time className="text-sm text-muted-foreground tabular-nums shrink-0">
                        {new Date(entry.created_at).toLocaleString()}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
