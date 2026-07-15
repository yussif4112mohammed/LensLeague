import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import './AdminPage.css';

const TABS = [
  { label: 'Moderation Queue', value: 'mod' },
  { label: 'User Directory', value: 'users' },
  { label: 'Battle Disputes', value: 'disputes' }
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { 
    users, 
    reports, 
    disputes, 
    approvePhotoReport, 
    removeReportedPhoto, 
    verifyPhotographer, 
    banPhotographer, 
    resolveDispute 
  } = useApp();

  const [activeTab, setActiveTab] = useState('mod');

  // Stats summaries
  const pendingReportsCount = reports.filter(r => r.status === 'pending').length;
  const bannedUsersCount = users.filter(u => u.banned).length;
  const pendingDisputesCount = disputes.filter(d => d.status === 'pending').length;

  return (
    <div className="admin-page">
      {/* Admin header */}
      <div className="admin-header">
        <div className="admin-header__brand-row">
          <button className="admin-back-btn" onClick={() => navigate('/')} title="Back to home">
            ← Exit Console
          </button>
          <div className="admin-badge">🛡️ System Operator</div>
        </div>
        <h1 className="display-lg">Admin Control Center</h1>
        <p className="body-md text-secondary">Manage platform policies, verify creators, and resolve dispute tickets.</p>
      </div>

      {/* Admin Stats Grid */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <span className="admin-stat-label">Pending Flags</span>
          <span className="admin-stat-value text-red">{pendingReportsCount}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Banned Accounts</span>
          <span className="admin-stat-value">{bannedUsersCount}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Disputes Pending</span>
          <span className="admin-stat-value text-yellow">{pendingDisputesCount}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs-row">
        <SegmentedControl options={TABS} value={activeTab} onChange={setActiveTab} id="admin-segment" />
      </div>

      {/* Tab Contents */}
      <div className="admin-content-area">
        
        {/* Moderation Queue */}
        {activeTab === 'mod' && (
          <div className="admin-list">
            <h2 className="heading-1">Reported Media Items</h2>
            {reports.length === 0 ? (
              <p className="body-md text-secondary empty-msg">No reported items.</p>
            ) : (
              reports.map(rep => (
                <div key={rep.id} className="admin-row admin-row--report" id={`report-${rep.id}`}>
                  <img src={rep.photoUrl} alt="Reported submission" className="admin-row-thumb" />
                  <div className="admin-row-info">
                    <div className="heading-2">By: {rep.photographerName}</div>
                    <div className="body-sm text-secondary">Reason: <strong className="text-red">"{rep.reason}"</strong></div>
                    <div className="body-sm text-tertiary">Flagged by: {rep.reporter}</div>
                    <div className="body-sm text-tertiary">Status: <span className={`status-pill status-pill--${rep.status}`}>{rep.status}</span></div>
                  </div>
                  
                  {rep.status === 'pending' && (
                    <div className="admin-row-actions">
                      <button 
                        className="admin-action-btn admin-action-btn--approve"
                        onClick={() => approvePhotoReport(rep.id)}
                        id={`approve-report-${rep.id}`}
                      >
                        Dismiss Flag
                      </button>
                      <button 
                        className="admin-action-btn admin-action-btn--danger"
                        onClick={() => removeReportedPhoto(rep.id)}
                        id={`remove-photo-${rep.id}`}
                      >
                        Remove Photo
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* User Directory */}
        {activeTab === 'users' && (
          <div className="admin-list">
            <h2 className="heading-1">Creator Management</h2>
            <div className="admin-user-grid">
              {users.map(u => (
                <div key={u.id} className={`admin-user-card ${u.banned ? 'admin-user-card--banned' : ''}`} id={`user-card-${u.id}`}>
                  <div className="admin-user-card__header">
                    <img src={u.avatar} alt={u.name} className="admin-user-card__avatar" />
                    <div>
                      <div className="body-md font-bold text-primary">
                        {u.name} {u.verified && <span className="verified-badge-tick">✓</span>}
                      </div>
                      <div className="body-sm text-secondary">@{u.username} · {u.location}</div>
                    </div>
                  </div>
                  
                  <div className="admin-user-card__meta body-sm text-tertiary">
                    <div>🏆 {u.wins} competition wins</div>
                    <div>⭐ {u.avgRating} average rating</div>
                  </div>

                  <div className="admin-user-card__actions">
                    {!u.verified && (
                      <button 
                        className="admin-btn admin-btn--verify"
                        onClick={() => verifyPhotographer(u.id)}
                        id={`verify-${u.id}`}
                      >
                        Verify Creator
                      </button>
                    )}
                    <button 
                      className={`admin-btn ${u.banned ? 'admin-btn--unban' : 'admin-btn--ban'}`}
                      onClick={() => banPhotographer(u.id)}
                      id={`ban-${u.id}`}
                    >
                      {u.banned ? 'Unban Account' : 'Ban Account'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disputes */}
        {activeTab === 'disputes' && (
          <div className="admin-list">
            <h2 className="heading-1">Battle Dispute Tickets</h2>
            {disputes.length === 0 ? (
              <p className="body-md text-secondary empty-msg">No disputes filed.</p>
            ) : (
              disputes.map(dsp => (
                <div key={dsp.id} className="admin-row admin-row--dispute" id={`dispute-${dsp.id}`}>
                  <div className="admin-row-info">
                    <div className="heading-2">{dsp.title}</div>
                    <div className="body-sm text-secondary">Complaint: <span className="text-yellow">"{dsp.reason}"</span></div>
                    <div className="body-sm text-tertiary">Filed by: {dsp.reporter} | Votes: {dsp.votesA} vs {dsp.votesB}</div>
                    <div className="body-sm text-tertiary">Status: <span className={`status-pill status-pill--${dsp.status}`}>{dsp.status}</span></div>
                    {dsp.resolution && <div className="body-sm text-green">Resolution: {dsp.resolution}</div>}
                  </div>

                  {dsp.status === 'pending' && (
                    <div className="admin-row-actions">
                      <button 
                        className="admin-action-btn admin-action-btn--approve"
                        onClick={() => resolveDispute(dsp.id, 'Dismissed case: No bot traffic detected.')}
                        id={`dismiss-dispute-${dsp.id}`}
                      >
                        Dismiss Case
                      </button>
                      <button 
                        className="admin-action-btn admin-action-btn--danger"
                        onClick={() => resolveDispute(dsp.id, 'Resolved case: Bot votes scrubbed, ranking recalculated.')}
                        id={`resolve-dispute-${dsp.id}`}
                      >
                        Scrub Bot Votes
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
