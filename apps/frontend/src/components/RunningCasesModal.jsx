import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Clock,
  UserCheck,
  Users,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  Sparkles,
  Layers,
  FileText,
  MapPin,
  RefreshCw,
  Inbox,
  Lock,
  Unlock,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import {
  getAllSystemCases,
  getCaseAccessSummary,
  requestCaseAccess,
  getPendingAccessRequests,
  decideAccessRequest,
  getMyAccessRequests
} from '../services/caseAccessService';

export default function RunningCasesModal({
  isOpen,
  onClose,
  currentUser,
  authorizedCases = [],
  activeCaseId,
  onSelectCase,
  onAccessGranted,
  onShowToast
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unauthorized' | 'my-requests' | 'lead-inbox'
  const [systemCases, setSystemCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessSummaries, setAccessSummaries] = useState({});
  const [myRequests, setMyRequests] = useState([]);
  const [leadRequests, setLeadRequests] = useState([]); // Pending requests for cases led by current user
  const [requestingCaseId, setRequestingCaseId] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequestId, setSubmittingRequestId] = useState(null);
  const [decidingId, setDecidingId] = useState(null);

  // Set of authorized case IDs
  const authorizedIds = useMemo(() => {
    return new Set(authorizedCases.map((c) => c.case_id));
  }, [authorizedCases]);

  // Fetch running cases, my requests, and lead review queues
  const loadData = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const [allCases, myReqs] = await Promise.all([
        getAllSystemCases().catch(() => []),
        getMyAccessRequests().catch(() => [])
      ]);
      setSystemCases(allCases);
      setMyRequests(myReqs || []);

      // Identify cases led by current user
      const userPoliceId = currentUser?.police_id;
      const ledCaseIds = allCases
        .filter(c => c.lead_investigator_police_id === userPoliceId || c.lead_investigator?.police_id === userPoliceId)
        .map(c => c.case_id);

      // Fetch pending requests for all cases led by this user
      if (ledCaseIds.length > 0) {
        const leadReqsNested = await Promise.all(
          ledCaseIds.map(id =>
            getPendingAccessRequests(id)
              .then(res => res?.requests || [])
              .catch(() => [])
          )
        );
        setLeadRequests(leadReqsNested.flat());
      } else {
        setLeadRequests([]);
      }
    } catch (err) {
      console.error('[RunningCasesModal] Failed to load running cases:', err);
      if (onShowToast) {
        onShowToast('Failed to load system cases registry.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setRequestingCaseId(null);
      setRequestMessage('');
    }
  }, [isOpen]);

  // Handle access request submit
  const handleSendRequest = async (caseId) => {
    if (!caseId) return;
    setSubmittingRequestId(caseId);
    try {
      const newRequest = await requestCaseAccess(caseId, requestMessage);
      setMyRequests(prev => [...prev, newRequest]);
      setRequestingCaseId(null);
      setRequestMessage('');
      if (onShowToast) {
        onShowToast(`Access request submitted to Lead Investigator for ${caseId}.`, 'success');
      }
    } catch (err) {
      const msg = err.message || 'Failed to submit access request.';
      if (onShowToast) {
        onShowToast(msg, 'error');
      }
    } finally {
      setSubmittingRequestId(null);
    }
  };

  // Handle lead decision (approve/reject)
  const handleDecision = async (caseId, requestId, approve) => {
    setDecidingId(requestId);
    try {
      await decideAccessRequest(caseId, requestId, approve);
      setLeadRequests(prev => prev.filter(r => r.id !== requestId));
      if (onShowToast) {
        onShowToast(
          `Request for ${caseId} ${approve ? 'Approved! Investigator granted access.' : 'Rejected.'}`,
          approve ? 'success' : 'warning'
        );
      }
      if (onAccessGranted) {
        onAccessGranted(caseId);
      }
      // Refresh cases list
      loadData();
    } catch (err) {
      if (onShowToast) {
        onShowToast(err.message || 'Failed to record decision.', 'error');
      }
    } finally {
      setDecidingId(null);
    }
  };

  // Filter cases based on search and active tab
  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return systemCases.filter(c => {
      const isAuthorized = authorizedIds.has(c.case_id);
      const isPending = myRequests.some(r => r.case_id === c.case_id && r.status === 'pending');
      const isLead = c.lead_investigator_police_id === currentUser?.police_id;

      if (activeTab === 'unauthorized' && isAuthorized) return false;
      if (activeTab === 'authorized' && !isAuthorized) return false;

      if (!q) return true;
      const leadName = c.lead_investigator?.username || '';
      const leadRank = c.lead_investigator?.rank || '';
      return (
        c.case_id?.toLowerCase().includes(q) ||
        c.case_title?.toLowerCase().includes(q) ||
        c.fir_number?.toLowerCase().includes(q) ||
        c.crime_type?.toLowerCase().includes(q) ||
        c.police_station?.toLowerCase().includes(q) ||
        leadName.toLowerCase().includes(q) ||
        leadRank.toLowerCase().includes(q)
      );
    });
  }, [systemCases, authorizedIds, myRequests, activeTab, searchQuery, currentUser]);

  const pendingRequestsCount = myRequests.filter(r => r.status === 'pending').length;
  const leadInboxCount = leadRequests.length;
  const unassignedCount = systemCases.filter(c => !authorizedIds.has(c.case_id)).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1A120E]/75 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-[#DDD4C7] w-full max-w-5xl max-h-[90vh] flex flex-col z-10 overflow-hidden text-[#2B211C]">
        {/* Header Bar */}
        <div className="bg-[#261B16] text-white px-6 py-4 border-b border-[#1A120E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8C532B] flex items-center justify-center text-white shadow-sm border border-[#8C532B]/50">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  National Criminal Cases Registry &amp; Access Control
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#4A6B53]/20 text-[#4A6B53] border border-[#4A6B53]/40">
                  ICJS / CCTNS GRID
                </span>
              </div>
              <p className="text-xs text-[#D8CAB8]/80 font-normal mt-0.5">
                Discover running criminal cases across state jurisdictions, inspect designated lead investigators, and request operational clearance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#EDE4D8] transition-colors cursor-pointer"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-[#EDE4D8] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls & Tab Navigation Bar */}
        <div className="p-4 bg-[#F5EFEB] border-b border-[#DDD4C7] flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-white rounded-xl border border-[#DDD4C7] shadow-2xs text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-[#8C532B] text-white shadow-xs'
                  : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#EDE4D8]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Running Cases</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-code ${
                activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-[#EDE4D8] text-[#8C532B]'
              }`}>
                {systemCases.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unauthorized')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unauthorized'
                  ? 'bg-[#8C532B] text-white shadow-xs'
                  : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#EDE4D8]'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Needs Clearance</span>
              {unassignedCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-code ${
                  activeTab === 'unauthorized' ? 'bg-white/20 text-white' : 'bg-[#C27D26]/15 text-[#C27D26]'
                }`}>
                  {unassignedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('my-requests')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my-requests'
                  ? 'bg-[#8C532B] text-white shadow-xs'
                  : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#EDE4D8]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My Sent Requests</span>
              {pendingRequestsCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-code ${
                  activeTab === 'my-requests' ? 'bg-white/20 text-white' : 'bg-[#A83A32]/15 text-[#A83A32]'
                }`}>
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {leadInboxCount > 0 && (
              <button
                onClick={() => setActiveTab('lead-inbox')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'lead-inbox'
                    ? 'bg-[#A83A32] text-white shadow-xs'
                    : 'text-[#A83A32] bg-[#A83A32]/10 hover:bg-[#A83A32]/20 font-bold'
                }`}
              >
                <Inbox className="w-3.5 h-3.5 animate-bounce" />
                <span>Lead Review Inbox</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono-code bg-[#A83A32] text-white">
                  {leadInboxCount}
                </span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#7A6D63] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FIR, title, officer..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#DDD4C7] bg-white text-xs text-[#2B211C] placeholder-[#7A6D63] focus:outline-none focus:border-[#8C532B] shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A6D63] hover:text-[#2B211C]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body / Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F5EFEB]">
          {loading && systemCases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#7A6D63]">
              <RefreshCw className="w-8 h-8 animate-spin text-[#8C532B] mb-3" />
              <span className="text-xs font-semibold font-mono-code">Connecting to National Dossier Registry…</span>
            </div>
          ) : activeTab === 'lead-inbox' ? (
            /* Lead Review Queue */
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-[#DDD4C7] shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#8C532B]" />
                  <div>
                    <h3 className="text-xs font-bold text-[#2B211C]">
                      Pending Collaborator Requisitions for Cases You Lead
                    </h3>
                    <p className="text-[11px] text-[#7A6D63]">
                      Grant or deny access to investigation network graphs, CDR evidence vaults, and AI analytics dossiers.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono-code font-bold text-[#8C532B] bg-[#EDE4D8] px-2.5 py-1 rounded-md">
                  {leadRequests.length} Pending
                </span>
              </div>

              {leadRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-[#DDD4C7] p-8 shadow-2xs">
                  <CheckCircle2 className="w-10 h-10 text-[#4A6B53] mx-auto mb-2 opacity-80" />
                  <div className="text-xs font-bold text-[#2B211C]">Inbox Zero — All Access Requests Decided</div>
                  <p className="text-[11px] text-[#7A6D63] mt-1 max-w-sm mx-auto">
                    There are currently no outstanding collaborator requests awaiting your review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leadRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-[#382822] text-[#EDE4D8] border border-[#8C532B]/30">
                            {req.case_id}
                          </span>
                          <div className="text-xs font-bold text-[#2B211C] mt-1.5 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#8C532B]" />
                            <span>
                              {[req.requester?.rank, req.requester?.username].filter(Boolean).join(' ') || req.requester?.police_id || 'Investigator'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#7A6D63] font-mono-code">
                            Police ID: {req.requester?.police_id} • {req.requester?.department || 'Crime Branch'}
                          </div>
                        </div>

                        <span className="text-[10px] text-[#7A6D63] font-mono-code flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN') : 'Recent'}
                        </span>
                      </div>

                      {req.message && (
                        <div className="p-2.5 rounded-lg bg-[#F5EFEB] border border-[#DDD4C7] text-xs text-[#2B211C] font-medium leading-relaxed italic">
                          "{req.message}"
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#DDD4C7]/60 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDecision(req.case_id, req.id, false)}
                          disabled={decidingId === req.id}
                          className="px-3 py-1.5 rounded-lg border border-[#DDD4C7] bg-white hover:bg-[#EDE4D8] text-[#A83A32] text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleDecision(req.case_id, req.id, true)}
                          disabled={decidingId === req.id}
                          className="px-3.5 py-1.5 rounded-lg bg-[#4A6B53] hover:bg-[#3D5744] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          {decidingId === req.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve Access</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'my-requests' ? (
            /* My Submitted Requests */
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-[#DDD4C7] shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#8C532B]" />
                  <div>
                    <h3 className="text-xs font-bold text-[#2B211C]">
                      Your Pending Access Requisitions
                    </h3>
                    <p className="text-[11px] text-[#7A6D63]">
                      Tracking clearances submitted to designated case Lead Investigators.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono-code font-bold text-[#8C532B] bg-[#EDE4D8] px-2.5 py-1 rounded-md">
                  {myRequests.length} Tracked
                </span>
              </div>

              {myRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-[#DDD4C7] p-8 shadow-2xs">
                  <Inbox className="w-10 h-10 text-[#7A6D63] mx-auto mb-2 opacity-50" />
                  <div className="text-xs font-bold text-[#2B211C]">No Active Requests</div>
                  <p className="text-[11px] text-[#7A6D63] mt-1 max-w-sm mx-auto">
                    You have not submitted any pending requests. Browse the "All Running Cases" tab to request clearance for unassigned dossiers.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myRequests.map((req) => (
                    <div
                      key={req.id || req.case_id}
                      className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-[#382822] text-[#EDE4D8] border border-[#8C532B]/30">
                            {req.case_id}
                          </span>
                          <div className="text-xs font-bold text-[#2B211C] mt-1.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#C27D26]" />
                            <span className="capitalize">{req.status || 'Pending Review'}</span>
                          </div>
                        </div>

                        <span className="text-[10px] text-[#7A6D63] font-mono-code">
                          {req.created_at ? new Date(req.created_at).toLocaleString('en-IN') : 'Submitted recently'}
                        </span>
                      </div>

                      {req.message && (
                        <div className="p-2.5 rounded-lg bg-[#F5EFEB] border border-[#DDD4C7] text-xs text-[#2B211C] font-medium leading-relaxed italic">
                          "{req.message}"
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#DDD4C7]/60 flex items-center justify-between text-[11px] text-[#7A6D63]">
                        <span>Awaiting Lead Officer Decision</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-[#C27D26]/15 text-[#C27D26] border border-[#C27D26]/30">
                          PENDING
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* All Running Cases Grid */
            <div className="space-y-4">
              {filteredCases.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-[#DDD4C7] p-8 shadow-2xs">
                  <AlertCircle className="w-10 h-10 text-[#7A6D63] mx-auto mb-2 opacity-50" />
                  <div className="text-sm font-bold text-[#2B211C]">No matching cases found</div>
                  <p className="text-xs text-[#7A6D63] mt-1">
                    Try adjusting your search criteria or switch tabs.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCases.map((c) => {
                    const isAuthorized = authorizedIds.has(c.case_id);
                    const isCurrentActive = c.case_id === activeCaseId;
                    const isLead = c.lead_investigator_police_id === currentUser?.police_id || c.lead_investigator?.police_id === currentUser?.police_id;
                    const hasPendingReq = myRequests.some(r => r.case_id === c.case_id && r.status === 'pending');
                    const isPromptOpen = requestingCaseId === c.case_id;

                    const leadName = [c.lead_investigator?.rank, c.lead_investigator?.username].filter(Boolean).join(' ') || c.investigating_officer || 'Unassigned';

                    return (
                      <div
                        key={c.case_id}
                        className={`bg-white rounded-2xl p-5 border transition-all shadow-2xs space-y-3.5 flex flex-col justify-between ${
                          isCurrentActive
                            ? 'border-[#8C532B] ring-1 ring-[#8C532B]'
                            : 'border-[#DDD4C7] hover:border-[#8C532B]/50'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-[#382822] text-[#EDE4D8] border border-[#8C532B]/30">
                                {c.case_id}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase ${
                                c.threat_level === 'CRITICAL'
                                  ? 'bg-[#A83A32]/15 text-[#A83A32] border border-[#A83A32]/30'
                                  : c.threat_level === 'HIGH'
                                  ? 'bg-[#C27D26]/15 text-[#C27D26] border border-[#C27D26]/30'
                                  : 'bg-[#4A6B53]/15 text-[#4A6B53] border border-[#4A6B53]/30'
                              }`}>
                                {c.threat_level || 'MEDIUM'}
                              </span>
                            </div>

                            {/* Access Status Pill */}
                            {isLead ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#8C532B]/15 text-[#8C532B] border border-[#8C532B]/30 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> LEAD INVESTIGATOR
                              </span>
                            ) : isAuthorized ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#4A6B53]/15 text-[#4A6B53] border border-[#4A6B53]/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> AUTHORIZED
                              </span>
                            ) : hasPendingReq ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#C27D26]/15 text-[#C27D26] border border-[#C27D26]/30 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> PENDING CLEARANCE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#7A6D63]/15 text-[#7A6D63] border border-[#7A6D63]/30 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> CLEARANCE REQUIRED
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-[#2B211C] leading-snug">
                            {c.case_title}
                          </h3>

                          {c.master_plot && (
                            <p className="text-xs text-[#7A6D63] line-clamp-2 leading-relaxed font-normal">
                              {c.master_plot}
                            </p>
                          )}
                        </div>

                        {/* Metadata Details Grid */}
                        <div className="bg-[#F5EFEB] p-3 rounded-xl border border-[#DDD4C7] grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-[#7A6D63] font-mono-code block text-[10px] uppercase">
                              FIR &amp; Police Station
                            </span>
                            <span className="font-semibold text-[#2B211C] truncate block font-mono-code">
                              {c.fir_number}
                            </span>
                            <span className="text-[#7A6D63] truncate block text-[10px]">
                              {c.police_station}
                            </span>
                          </div>

                          <div>
                            <span className="text-[#7A6D63] font-mono-code block text-[10px] uppercase">
                              Lead Investigator
                            </span>
                            <span className="font-semibold text-[#8C532B] truncate block">
                              {leadName}
                            </span>
                            <span className="text-[#7A6D63] truncate block text-[10px] font-mono-code">
                              ID: {c.lead_investigator_police_id || c.lead_investigator?.police_id || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons & Expandable Request Form */}
                        <div className="space-y-2 pt-1 border-t border-[#DDD4C7]/60">
                          {isPromptOpen ? (
                            <div className="bg-[#F5EFEB] p-3 rounded-xl border border-[#8C532B]/30 space-y-2.5 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-[#2B211C] flex items-center gap-1">
                                  <Send className="w-3.5 h-3.5 text-[#8C532B]" /> Operational Justification Note
                                </span>
                                <span className="text-[10px] text-[#7A6D63] font-mono-code">
                                  {requestMessage.length}/500
                                </span>
                              </div>

                              <textarea
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value.slice(0, 500))}
                                placeholder="State your operational reason (e.g., Assigned to analyse CDR phone intercepts and financial trails)..."
                                rows={2}
                                className="w-full p-2 rounded-lg border border-[#DDD4C7] bg-white text-xs text-[#2B211C] placeholder-[#7A6D63] focus:outline-none focus:border-[#8C532B] resize-none font-medium"
                              />

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRequestingCaseId(null);
                                    setRequestMessage('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-[#DDD4C7] bg-white text-xs font-semibold text-[#7A6D63] hover:text-[#2B211C] transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSendRequest(c.case_id)}
                                  disabled={submittingRequestId === c.case_id}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#8C532B] hover:bg-[#703F1E] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                  {submittingRequestId === c.case_id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  <span>Submit Request</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-mono-code text-[#7A6D63] flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> {c.authorised_personnel_count || 1} Assigned
                              </span>

                              {isAuthorized ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectCase(c.case_id);
                                    onClose();
                                  }}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5 ${
                                    isCurrentActive
                                      ? 'bg-[#EDE4D8] text-[#8C532B] border border-[#8C532B]/30'
                                      : 'bg-[#8C532B] hover:bg-[#703F1E] text-white'
                                  }`}
                                >
                                  <span>{isCurrentActive ? 'Active Dossier' : 'Open Dossier'}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : hasPendingReq ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-3.5 py-1.5 rounded-lg bg-[#F5EFEB] text-[#C27D26] border border-[#C27D26]/30 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed font-mono-code"
                                >
                                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                                  <span>Pending Approval</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRequestingCaseId(c.case_id);
                                    setRequestMessage('');
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-[#261B16] hover:bg-[#382822] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                                >
                                  <Unlock className="w-3.5 h-3.5 text-[#C27D26]" />
                                  <span>Request Access</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-[#261B16] text-[#D8CAB8] px-6 py-3 border-t border-[#1A120E] flex items-center justify-between text-xs font-mono-code shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#8C532B]" />
            <span>National Case Graph Security Protocol — Access is governed by CrPC Section 173 guidelines.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
