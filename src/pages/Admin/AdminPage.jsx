import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import { Shield, ArrowLeft, ShieldAlert, Ban, CheckCircle, Trophy, Star, AlertTriangle, UserX, Gavel, FileImage, UserCheck } from 'lucide-react';

export default function AdminPage() {
  const navigate = useNavigate();
  const { 
    userEmail,
    users, 
    reports, 
    disputes, 
    approvePhotoReport, 
    removeReportedPhoto, 
    verifyPhotographer, 
    banPhotographer, 
    resolveDispute 
  } = useApp();

  // Route guard
  if (userEmail !== 'admin@lensleague.com') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 text-center p-6 bg-background animate-in fade-in zoom-in duration-500">
        <div className="text-7xl drop-shadow-[0_4px_12px_rgba(255,77,109,0.2)]">🔒</div>
        <h1 className="text-4xl font-extrabold text-white">Access Denied</h1>
        <p className="text-zinc-400 max-w-md leading-relaxed">
          This console is strictly restricted to administrative system operators. Please log in with an authorized administrator account to continue.
        </p>
        <Button 
          onClick={() => navigate('/login')} 
          size="lg"
          className="mt-4 font-bold rounded-xl bg-white text-black hover:bg-zinc-200"
          id="go-to-login-btn"
        >
          Go to Log In
        </Button>
      </div>
    );
  }

  // Stats summaries
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const bannedUsersCount = users.filter(u => u.banned).length;
  const pendingDisputesCount = disputes.filter(d => d.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background text-zinc-400 p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Admin header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="text-zinc-400 hover:text-white hover:bg-zinc-900/50 -ml-4"
              title="Back to home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Exit Console
            </Button>
            <Badge variant="outline" className="bg-zinc-900/50 border-zinc-800 text-zinc-300 gap-2 py-1.5 px-3">
              <Shield className="w-3.5 h-3.5 text-indigo-400" /> System Operator
            </Badge>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <Logo className="w-10 h-10" />
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Admin Control Center</h1>
            </div>
            <p className="text-zinc-400 text-lg">Manage platform policies, verify creators, and resolve dispute tickets.</p>
          </div>
        </div>

        {/* Admin Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-zinc-400">Pending Flags</CardTitle>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{pendingReportsCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-zinc-400">Banned Accounts</CardTitle>
              <UserX className="w-4 h-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{bannedUsersCount}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-zinc-400">Disputes Pending</CardTitle>
              <Gavel className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{pendingDisputesCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="mod" className="w-full">
          <TabsList className="bg-zinc-900/50 border border-zinc-800/50 p-1 rounded-xl w-full md:w-auto h-auto grid grid-cols-3 gap-1">
            <TabsTrigger value="mod" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 py-2.5">
              Moderation Queue
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 py-2.5">
              User Directory
            </TabsTrigger>
            <TabsTrigger value="disputes" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 py-2.5">
              Battle Disputes
            </TabsTrigger>
          </TabsList>

          {/* Moderation Queue */}
          <TabsContent value="mod" className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Reported Media Items</h2>
                <p className="text-zinc-500">Review flagged content and take action.</p>
              </div>

              {reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/20">
                  <FileImage className="w-12 h-12 text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-medium">No reported items in the queue.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {reports.map(rep => (
                    <Card key={rep.id} className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl overflow-hidden" id={`report-${rep.id}`}>
                      <div className="flex flex-col md:flex-row">
                        <div className="w-full md:w-48 h-48 md:h-auto shrink-0 bg-zinc-950">
                          <img src={rep.photoUrl} alt="Reported submission" className="w-full h-full object-cover" />
                        </div>
                        <div className="p-6 flex flex-col justify-between flex-grow">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-white">By: {rep.photographerName}</h3>
                                <div className="text-sm text-zinc-500 mt-1">Flagged by: {rep.reporter}</div>
                              </div>
                              <Badge variant={rep.status === 'pending' ? 'outline' : 'secondary'} className={cn(
                                "capitalize rounded-full",
                                rep.status === 'pending' ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/10" : "bg-zinc-800 text-zinc-300"
                              )}>
                                {rep.status}
                              </Badge>
                            </div>
                            
                            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex gap-3">
                              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium text-red-200">Reason for report</div>
                                <div className="text-red-400 font-medium italic mt-1">"{rep.reason}"</div>
                              </div>
                            </div>
                          </div>
                          
                          {rep.status === 'pending' && (
                            <div className="flex gap-3 mt-6 pt-6 border-t border-zinc-800/50">
                              <Button 
                                variant="outline"
                                className="bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 rounded-xl"
                                onClick={() => approvePhotoReport(rep.id)}
                                id={`approve-report-${rep.id}`}
                              >
                                Dismiss Flag
                              </Button>
                              <Button 
                                variant="destructive"
                                className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl"
                                onClick={() => removeReportedPhoto(rep.id)}
                                id={`remove-photo-${rep.id}`}
                              >
                                Remove Photo
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* User Directory */}
          <TabsContent value="users" className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Creator Management</h2>
                <p className="text-zinc-500">Manage user accounts and verification status.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map(u => (
                  <Card key={u.id} className={cn(
                    "bg-zinc-900/50 border-zinc-800/50 rounded-2xl transition-all",
                    u.banned && "opacity-75 border-red-500/20"
                  )} id={`user-card-${u.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 border-2 border-zinc-800">
                            <AvatarImage src={u.avatar} alt={u.name} />
                            <AvatarFallback className="bg-zinc-800 text-white">{u.name.substring(0, 2)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-white">{u.name}</h3>
                              {u.verified && <CheckCircle className="w-4 h-4 text-blue-400" />}
                              {u.banned && <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20 py-0 h-5">Banned</Badge>}
                            </div>
                            <div className="text-sm text-zinc-500">@{u.username} &middot; {u.location}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-6 mt-6 mb-6">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Trophy className="w-4 h-4 text-zinc-500" />
                          <span className="text-white font-medium">{u.wins}</span> wins
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Star className="w-4 h-4 text-zinc-500" />
                          <span className="text-white font-medium">{u.avgRating}</span> rating
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-zinc-800/50">
                        {!u.verified && (
                          <Button 
                            variant="outline"
                            className="bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 rounded-xl flex-1"
                            onClick={() => verifyPhotographer(u.id)}
                            id={`verify-${u.id}`}
                          >
                            <UserCheck className="w-4 h-4 mr-2" /> Verify Creator
                          </Button>
                        )}
                        <Button 
                          variant={u.banned ? "outline" : "destructive"}
                          className={cn(
                            "rounded-xl flex-1",
                            u.banned 
                              ? "bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800" 
                              : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                          )}
                          onClick={() => banPhotographer(u.id)}
                          id={`ban-${u.id}`}
                        >
                          {u.banned ? 'Unban Account' : (
                            <><Ban className="w-4 h-4 mr-2" /> Ban Account</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Disputes */}
          <TabsContent value="disputes" className="mt-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Battle Dispute Tickets</h2>
                <p className="text-zinc-500">Resolve voting anomalies and match conflicts.</p>
              </div>

              {disputes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/20">
                  <Gavel className="w-12 h-12 text-zinc-700 mb-4" />
                  <p className="text-zinc-500 font-medium">No disputes filed.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {disputes.map(dsp => (
                    <Card key={dsp.id} className="bg-zinc-900/50 border-zinc-800/50 rounded-2xl" id={`dispute-${dsp.id}`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="space-y-4 flex-grow">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-white">{dsp.title}</h3>
                                <div className="text-sm text-zinc-500 mt-1">Filed by: {dsp.reporter}</div>
                              </div>
                              <Badge variant={dsp.status === 'pending' ? 'outline' : 'secondary'} className={cn(
                                "capitalize rounded-full shrink-0",
                                dsp.status === 'pending' ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/10" : "bg-zinc-800 text-zinc-300"
                              )}>
                                {dsp.status}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/50">
                                <div className="text-xs text-zinc-500 uppercase font-semibold mb-1">Complaint</div>
                                <div className="text-sm text-yellow-400 font-medium">"{dsp.reason}"</div>
                              </div>
                              <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800/50">
                                <div className="text-xs text-zinc-500 uppercase font-semibold mb-1">Current Votes</div>
                                <div className="text-sm font-medium text-zinc-300">
                                  <span className="text-white">{dsp.votesA}</span> vs <span className="text-white">{dsp.votesB}</span>
                                </div>
                              </div>
                            </div>

                            {dsp.resolution && (
                              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-sm font-medium text-emerald-200">Resolution</div>
                                  <div className="text-emerald-400 text-sm mt-1">{dsp.resolution}</div>
                                </div>
                              </div>
                            )}
                          </div>

                          {dsp.status === 'pending' && (
                            <div className="flex flex-col gap-3 shrink-0 w-full md:w-48 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-zinc-800/50 md:pl-6">
                              <Button 
                                variant="outline"
                                className="bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800 rounded-xl w-full justify-start"
                                onClick={() => resolveDispute(dsp.id, 'Dismissed case: No bot traffic detected.')}
                                id={`dismiss-dispute-${dsp.id}`}
                              >
                                Dismiss Case
                              </Button>
                              <Button 
                                variant="destructive"
                                className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl w-full justify-start"
                                onClick={() => resolveDispute(dsp.id, 'Resolved case: Bot votes scrubbed, ranking recalculated.')}
                                id={`resolve-dispute-${dsp.id}`}
                              >
                                Scrub Bot Votes
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
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

