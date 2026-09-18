import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  ArrowRightLeft,
  Users,
  FolderOpen,
  Filter,
  Search,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  X,
  History,
  ShieldAlert,
  Briefcase
} from 'lucide-react';

import {
  getSupervisorCases,
  getStationOfficers,
  assignCase,
  transferCase,
  getAssignmentHistory,
  getSupervisorAuditLogs
} from '../services/supervisorService';

export default function SupervisorDashboard({ currentUser, onTriggerToast, onSwitchToInvestigatorView, onCaseAssignedOrTransferred }) {
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'officers' | 'history' | 'audit'

  // Data states
  const [cases, setCases] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [history, setHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [officerFilter, setOfficerFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedCaseForAction, setSelectedCaseForAction] = useState(null);
  const [actionType, setActionType] = useState(null); // 'assign' | 'transfer'
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [fetchedCases, fetchedOfficers, fetchedHistory, fetchedAudit] = await Promise.all([
        getSupervisorCases().catch(() => []),
        getStationOfficers(currentUser?.department).catch(() => []),
        getAssignmentHistory().catch(() => []),
        getSupervisorAuditLogs().catch(() => []),
      ]);

      setCases(Array.isArray(fetchedCases) ? fetchedCases : []);
      setOfficers(Array.isArray(fetchedOfficers) ? fetchedOfficers : []);
      setHistory(Array.isArray(fetchedHistory) ? fetchedHistory : []);
      setAuditLogs(Array.isArray(fetchedAudit) ? fetchedAudit : []);
    } catch (err) {
      onTriggerToast?.(`Failed to load supervisor data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  // Derived KPI Stats
  const kpis = useMemo(() => {
    const unassignedCount = cases.filter(c => !c.assigned_officer_police_id || (c.status && c.status.toUpperCase() === 'UNASSIGNED')).length;
    const activeCount = cases.filter(c => c.assigned_officer_police_id && c.status?.toUpperCase() !== 'CLOSED').length;
    const totalOfficers = officers.length;
    const transfersCount = history.filter(h => h.action === 'TRANSFERRED').length;

    return {
      unassigned: unassignedCount,
      active: activeCount,
      totalCases: cases.length,
      officersCount: totalOfficers,
      transfers: transfersCount,
    };
  }, [cases, officers, history]);

  // Filtered cases list
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'UNASSIGNED' && c.assigned_officer_police_id) return false;
        if (statusFilter === 'ASSIGNED' && !c.assigned_officer_police_id) return false;
        if (statusFilter !== 'UNASSIGNED' && statusFilter !== 'ASSIGNED') {
          if ((c.status || '').toUpperCase() !== statusFilter) return false;
        }
      }

      // Threat/Priority filter
      if (priorityFilter !== 'ALL') {
        if ((c.threat_level || 'MEDIUM').toUpperCase() !== priorityFilter) return false;
      }

      // Officer filter
      if (officerFilter !== 'ALL') {
        if (officerFilter === 'UNASSIGNED' && c.assigned_officer_police_id) return false;
        if (officerFilter !== 'UNASSIGNED' && c.assigned_officer_police_id !== officerFilter) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (c.case_title || '').toLowerCase();
        const fir = (c.fir_number || '').toLowerCase();
        const cid = (c.case_id || '').toLowerCase();
        const officerName = (c.lead_investigator?.username || c.assigned_officer_name || '').toLowerCase();
        return title.includes(q) || fir.includes(q) || cid.includes(q) || officerName.includes(q);
      }

      return true;
    });
  }, [cases, statusFilter, priorityFilter, officerFilter, searchQuery]);

  // Handle Assign / Transfer submit
  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!selectedCaseForAction || !selectedOfficerId) return;

    setIsSubmittingAction(true);
    const caseId = selectedCaseForAction.case_id;

    try {
      if (actionType === 'assign') {
        await assignCase(caseId, selectedOfficerId);
        onTriggerToast?.(`Case ${caseId} assigned to officer (${selectedOfficerId}) successfully.`, 'success');
      } else if (actionType === 'transfer') {
        await transferCase(caseId, selectedOfficerId, transferReason);
        onTriggerToast?.(`Case ${caseId} transferred to officer (${selectedOfficerId}) successfully.`, 'success');
      }

      // Close modal & reload dashboard
      setSelectedCaseForAction(null);
      setActionType(null);
      setSelectedOfficerId('');
      setTransferReason('');
      await loadDashboardData();
      onCaseAssignedOrTransferred?.(caseId);
    } catch (err) {
      onTriggerToast?.(`Action failed: ${err.message}`, 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5EFEB] overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#DDD4C7] shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#8C532B] flex items-center justify-center text-white shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#2B211C] tracking-tight">Supervisor Command & Case Allocation Portal</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDE4D8] text-[#8C532B] border border-[#8C532B]/30 uppercase">
                {currentUser?.department || 'Station Command'}
              </span>
            </div>
            <p className="text-xs text-[#7A6D63] mt-0.5">
              Supervise police personnel, assign unallocated dossiers, manage officer case transfers, and monitor station workload logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToInvestigatorView && (
            <button
              onClick={onSwitchToInvestigatorView}
              className="px-3.5 py-2 rounded-xl bg-[#EDE4D8] text-[#2B211C] hover:bg-[#E3D7C7] text-xs font-semibold border border-[#DDD4C7] transition cursor-pointer flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4 text-[#8C532B]" />
              <span>Switch to Investigator View</span>
            </button>
          )}
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-[#DDD4C7] text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#EDE4D8] transition cursor-pointer shadow-2xs"
            title="Reload Station Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#8C532B]' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DDD4C7] shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#2B211C] font-mono-code">{kpis.unassigned}</div>
            <div className="text-xs font-medium text-[#7A6D63]">Unassigned / New Cases</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDD4C7] shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 flex items-center justify-center shrink-0">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#2B211C] font-mono-code">{kpis.active}</div>
            <div className="text-xs font-medium text-[#7A6D63]">Active Investigation Dossiers</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDD4C7] shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#2B211C] font-mono-code">{kpis.officersCount}</div>
            <div className="text-xs font-medium text-[#7A6D63]">Station Police Officers</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DDD4C7] shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#2B211C] font-mono-code">{kpis.transfers}</div>
            <div className="text-xs font-medium text-[#7A6D63]">Total Case Transfers</div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white p-1.5 rounded-2xl border border-[#DDD4C7] shadow-2xs flex flex-wrap items-center gap-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab('cases')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'cases'
              ? 'bg-[#8C532B] text-white shadow-xs'
              : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#F5EFEB]'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Case Assignment &amp; Dossiers ({filteredCases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('officers')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'officers'
              ? 'bg-[#8C532B] text-white shadow-xs'
              : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#F5EFEB]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Police Officers &amp; Workload ({officers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#8C532B] text-white shadow-xs'
              : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#F5EFEB]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Assignment &amp; Transfer History ({history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-[#8C532B] text-white shadow-xs'
              : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#F5EFEB]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Supervisor Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: CASES TABLE & ALLOCATION */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-[#DDD4C7] shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#7A6D63] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter cases by title, FIR, ID, or officer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] text-xs font-medium text-[#2B211C] focus:outline-none focus:border-[#8C532B]"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] text-xs font-semibold text-[#2B211C] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNASSIGNED">Unassigned Only</option>
                <option value="ASSIGNED">Assigned Only</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed / Completed</option>
              </select>

              {/* Priority / Threat Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] text-xs font-semibold text-[#2B211C] focus:outline-none"
              >
                <option value="ALL">All Threat Levels</option>
                <option value="HIGH">CRITICAL / HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>

              {/* Officer Filter */}
              <select
                value={officerFilter}
                onChange={(e) => setOfficerFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] text-xs font-semibold text-[#2B211C] focus:outline-none"
              >
                <option value="ALL">All Officers</option>
                <option value="UNASSIGNED">Unassigned</option>
                {officers.map(off => (
                  <option key={off.police_id} value={off.police_id}>
                    {off.rank} {off.username} ({off.police_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-mono-code font-bold text-[#7A6D63]">
              Showing <strong className="text-[#2B211C]">{filteredCases.length}</strong> of {cases.length} cases
            </div>
          </div>

          {/* Cases Grid / Table */}
          <div className="bg-white rounded-2xl border border-[#DDD4C7] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5EFEB] border-b border-[#DDD4C7] text-[11px] font-bold text-[#7A6D63] uppercase tracking-wider">
                    <th className="py-3 px-4">Case ID & FIR</th>
                    <th className="py-3 px-4">Case Title & Type</th>
                    <th className="py-3 px-4">Threat / Priority</th>
                    <th className="py-3 px-4">Assigned Officer</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD4C7]/60 text-xs">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7A6D63] font-medium">
                        No investigation cases match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map(c => {
                      const isUnassigned = !c.assigned_officer_police_id;
                      const lead = c.lead_investigator;

                      return (
                        <tr key={c.case_id} className="hover:bg-[#F5EFEB]/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#2B211C] font-mono-code">{c.case_id}</div>
                            <div className="text-[11px] text-[#7A6D63] font-mono-code">FIR: {c.fir_number}</div>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-bold text-[#2B211C] truncate" title={c.case_title}>
                              {c.case_title}
                            </div>
                            <div className="text-[11px] text-[#7A6D63] truncate">
                              {c.crime_type || 'General Offence'} • {c.police_station}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono-code ${
                              (c.threat_level || '').toUpperCase() === 'HIGH' || (c.threat_level || '').toUpperCase() === 'CRITICAL'
                                ? 'bg-red-500/10 text-red-700 border border-red-500/20'
                                : (c.threat_level || '').toUpperCase() === 'LOW'
                                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                            }`}>
                              {c.threat_level || 'MEDIUM'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isUnassigned ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/30 text-[11px] font-bold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Unassigned
                              </span>
                            ) : (
                              <div>
                                <div className="font-bold text-[#2B211C] flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-[#8C532B]" />
                                  <span>{lead?.rank || ''} {lead?.username || c.assigned_officer_name || 'Assigned Officer'}</span>
                                </div>
                                <div className="text-[11px] text-[#7A6D63] font-mono-code">ID: {c.assigned_officer_police_id}</div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono-code ${
                              isUnassigned
                                ? 'bg-amber-100 text-amber-800'
                                : (c.status || '').toUpperCase() === 'CLOSED'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {c.status || (isUnassigned ? 'UNASSIGNED' : 'ACTIVE')}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isUnassigned ? (
                                <button
                                  onClick={() => {
                                    setSelectedCaseForAction(c);
                                    setActionType('assign');
                                    setSelectedOfficerId('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#8C532B] hover:bg-[#703F1E] text-white text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Assign Officer</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedCaseForAction(c);
                                    setActionType('transfer');
                                    setSelectedOfficerId('');
                                    setTransferReason('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-white border border-[#DDD4C7] hover:bg-[#EDE4D8] text-[#2B211C] text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#8C532B]" />
                                  <span>Transfer Case</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: OFFICERS & WORKLOAD */}
      {activeTab === 'officers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {officers.map(off => (
            <div key={off.police_id} className="bg-white p-5 rounded-2xl border border-[#DDD4C7] shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EDE4D8] border border-[#DDD4C7] text-[#8C532B] flex items-center justify-center font-bold text-sm">
                      {off.username ? off.username[0].toUpperCase() : 'O'}
                    </div>
                    <div>
                      <div className="font-bold text-[#2B211C] text-sm">
                        {off.rank} {off.username}
                      </div>
                      <div className="text-xs text-[#7A6D63] font-mono-code">ID: {off.police_id}</div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-code ${
                    off.role === 'supervisor' ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30' : 'bg-blue-500/10 text-blue-700 border border-blue-500/30'
                  }`}>
                    {(off.role || 'investigator').toUpperCase()}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#DDD4C7]/60 text-xs text-[#7A6D63] space-y-1">
                  <div><strong>Email:</strong> {off.email}</div>
                  <div><strong>Department:</strong> {off.department || 'Police Station'}</div>
                </div>
              </div>

              {/* Workload Metric Pills */}
              <div className="bg-[#F5EFEB] p-3 rounded-xl border border-[#DDD4C7] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#2B211C]">
                  <span>Assigned Workload</span>
                  <span className="font-mono-code text-[#8C532B]">{off.total_assigned_cases} Active Cases</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-white p-1.5 rounded-lg border border-[#DDD4C7]">
                    <div className="font-bold text-[#2B211C] font-mono-code">{off.active_cases_count}</div>
                    <div className="text-[9px] text-[#7A6D63]">Active</div>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-[#DDD4C7]">
                    <div className="font-bold text-amber-700 font-mono-code">{off.pending_cases_count}</div>
                    <div className="text-[9px] text-[#7A6D63]">Pending</div>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-[#DDD4C7]">
                    <div className="font-bold text-emerald-700 font-mono-code">{off.completed_cases_count}</div>
                    <div className="text-[9px] text-[#7A6D63]">Completed</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB CONTENT 3: ASSIGNMENT HISTORY TIMELINE */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-[#DDD4C7] shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[#2B211C] flex items-center gap-2">
            <History className="w-5 h-5 text-[#8C532B]" />
            <span>Case Assignment & Transfer History Log</span>
          </h2>

          <div className="divide-y divide-[#DDD4C7]/60">
            {history.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#7A6D63]">No case assignments or transfers recorded yet.</div>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-2 rounded-xl ${
                      item.action === 'TRANSFERRED' ? 'bg-purple-500/10 text-purple-700' : 'bg-emerald-500/10 text-emerald-700'
                    }`}>
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#2B211C] font-mono-code">
                        Case: {item.case_id} — <span className="uppercase">{item.action}</span>
                      </div>
                      <div className="text-[#7A6D63] mt-0.5">
                        Performed by: <strong>{item.performed_by_name}</strong> ({item.performed_by_police_id})
                      </div>
                      <div className="text-[11px] text-[#2B211C] mt-1 bg-[#F5EFEB] px-2.5 py-1 rounded-lg inline-block border border-[#DDD4C7]">
                        {item.previous_officer ? `${item.previous_officer.username || item.previous_officer.police_id}` : 'Unassigned'}
                        <span className="mx-1 text-[#8C532B]">➔</span>
                        <strong>{item.new_officer ? `${item.new_officer.username || item.new_officer.police_id}` : 'N/A'}</strong>
                      </div>
                      {item.reason && (
                        <div className="text-[11px] text-[#7A6D63] italic mt-1">Reason: "{item.reason}"</div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-[#7A6D63] font-mono-code shrink-0">
                    {item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : 'N/A'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-[#DDD4C7] shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[#2B211C] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#8C532B]" />
            <span>Station Supervisor Audit Logs</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5EFEB] border-b border-[#DDD4C7] text-[11px] font-bold text-[#7A6D63] uppercase">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Supervisor</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target Case</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD4C7]/60">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#7A6D63]">No supervisor audit logs available.</td>
                  </tr>
                ) : (
                  auditLogs.map((log, i) => (
                    <tr key={i} className="hover:bg-[#F5EFEB]/50">
                      <td className="py-2.5 px-3 font-mono-code text-[11px] text-[#7A6D63]">
                        {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#2B211C]">
                        {log.supervisor_rank} {log.supervisor_name} ({log.supervisor_police_id})
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-[#EDE4D8] text-[#8C532B] font-mono-code font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono-code font-bold text-[#2B211C]">
                        {log.target_case_id || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 text-[#7A6D63]">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN / TRANSFER CASE */}
      {selectedCaseForAction && (
        <div className="fixed inset-0 z-50 bg-[#1A120E]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#DDD4C7] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#261B16] text-white p-4 px-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#EDE4D8]" />
                <h3 className="font-bold text-sm">
                  {actionType === 'assign' ? 'Assign Investigation Case' : 'Transfer Case Lead Officer'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedCaseForAction(null);
                  setActionType(null);
                }}
                className="text-[#A39284] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="p-6 space-y-4">
              <div className="bg-[#F5EFEB] p-3 rounded-xl border border-[#DDD4C7] text-xs">
                <div className="font-mono-code font-bold text-[#8C532B]">{selectedCaseForAction.case_id}</div>
                <div className="font-bold text-[#2B211C] mt-0.5">{selectedCaseForAction.case_title}</div>
                <div className="text-[11px] text-[#7A6D63] mt-1">FIR: {selectedCaseForAction.fir_number} • Station: {selectedCaseForAction.police_station}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B211C] mb-1.5">
                  Select Police Officer (In Same Station)
                </label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD4C7] text-xs font-semibold text-[#2B211C] focus:outline-none focus:border-[#8C532B]"
                >
                  <option value="">-- Choose Officer --</option>
                  {officers.map(off => (
                    <option key={off.police_id} value={off.police_id}>
                      {off.rank} {off.username} ({off.police_id}) — {off.total_assigned_cases} Active Cases
                    </option>
                  ))}
                </select>
              </div>

              {actionType === 'transfer' && (
                <div>
                  <label className="block text-xs font-bold text-[#2B211C] mb-1.5">
                    Reason for Case Transfer (Mandatory Audit Note)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter reason for reallocating this case dossier..."
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#DDD4C7] text-xs text-[#2B211C] focus:outline-none focus:border-[#8C532B]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCaseForAction(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[#DDD4C7] text-xs font-bold text-[#7A6D63] hover:bg-[#EDE4D8]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingAction || !selectedOfficerId}
                  className="px-4 py-2 rounded-xl bg-[#8C532B] hover:bg-[#703F1E] text-white text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingAction
                    ? 'Processing...'
                    : actionType === 'assign'
                    ? 'Assign Case'
                    : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
