import React, { useState } from 'react';
import { 
  Eye, 
  ChevronDown, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  Award, 
  Bell, 
  Share2, 
  Download,
  AlertCircle,
  UploadCloud
} from 'lucide-react';

export default function Header({ 
  cases = [], 
  activeCaseId, 
  currentUser,
  onSelectCase, 
  isSyncing, 
  onRefreshSync,
  onTriggerAlertNotification,
  onOpenUploadModal,
  onOpenCreateCase,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeCase = cases.find(c => c.case_id === activeCaseId) || cases[0];

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shadow-xs sticky top-0 z-30 select-none">
      {/* Left: Emblem Branding & Portal Identity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          {/* Eye & Emblem Icon */}
          <div className="w-9 h-9 rounded-lg bg-[#0a1628] flex items-center justify-center text-cyan-400 shadow-sm border border-slate-700/60">
            <Eye className="w-5 h-5 text-cyan-400 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold tracking-wider text-teal-700 uppercase font-mono-code">
                NETRA TACTICAL
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded border border-slate-200">
                GOVT OF INDIA
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>POLICE CCTNS / ICJS</span>
              <span className="text-xs font-normal text-slate-600 font-mono-code">
                | CRIME INTELLIGENCE GRID
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-7 w-px bg-slate-200 hidden md:block" />

        {/* Active Case Selector Dropdown */}
        <div className="relative">
          <button
            id="active-case-selector-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-400 transition-colors text-left"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <div className="text-[10px] font-mono-code font-bold uppercase text-slate-500">
                Active Dossier
              </div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="font-mono-code text-teal-800">{activeCase?.case_id}</span>
                <span className="text-slate-400">•</span>
                <span className="truncate max-w-[170px] sm:max-w-[240px] text-slate-700">
                  {activeCase?.case_title?.split('-')[1]?.trim() || activeCase?.case_title}
                </span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-mono-code font-bold text-slate-500 uppercase">
                <span>Select Investigative Dossier</span>
                <span className="text-teal-600">{cases.length} Loaded</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {cases.map((c) => {
                  const isCurrent = c.case_id === activeCaseId;
                  return (
                    <button
                      key={c.case_id}
                      id={`select-case-${c.case_id.toLowerCase()}`}
                      onClick={() => {
                        onSelectCase(c.case_id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-start gap-2.5 ${
                        isCurrent ? 'bg-teal-50/60' : ''
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isCurrent ? 'bg-teal-600 ring-2 ring-teal-300' : 'bg-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-mono-code font-bold text-xs text-slate-900">
                            {c.case_id}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            {c.threat_level || 'CRITICAL'}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                          {c.case_title}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-code truncate">
                          {c.fir_number} • {c.crime_type}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Ingest Evidence Button */}
        <button
          id="header-ingest-evidence-btn"
          type="button"
          onClick={onOpenUploadModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer font-mono-code border border-teal-600/40"
          title="Upload FIR / Evidence to LangGraph ETL Pipeline"
          disabled={!activeCase}
        >
          <UploadCloud className="w-3.5 h-3.5 text-teal-300" />
          <span className="hidden sm:inline">INGEST EVIDENCE</span>
        </button>
        <button
          type="button"
          onClick={onOpenCreateCase}
          className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg border border-teal-700 text-teal-800 text-xs font-bold hover:bg-teal-50"
          title="Open a new case as lead investigator"
        >
          + CASE
        </button>
      </div>

      {/* Right: Live ICJS Sync & Officer Profile */}
      <div className="flex items-center gap-4">
        {/* ICJS Live Sync Badge */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
          <div className="relative flex items-center justify-center w-2.5 h-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-emerald-800">
                ICJS LIVE SYNCED
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-[10px] font-mono-code text-emerald-700">
              {activeCase?.last_synced || '2026-09-05 18:45 IST'}
            </div>
          </div>
          <button 
            onClick={onRefreshSync}
            title="Force ICJS Grid Resync"
            className="ml-1 p-1 hover:bg-emerald-100 rounded text-emerald-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>

        {/* Investigating Officer Profile Badge */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs font-bold text-slate-900">
                {[currentUser?.rank, currentUser?.username].filter(Boolean).join(' ') || 'Authenticated Investigator'}
              </span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-[10px] font-mono-code text-slate-500 font-medium">
              ID: <span className="text-teal-700 font-semibold">{currentUser?.police_id || '—'}</span> • {currentUser?.department || 'Police Department'}
            </div>
          </div>

          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0a1628] to-slate-700 text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-teal-500/30">
              {(currentUser?.username || 'IO').split(/\s+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="Officer On Duty - Authenticated" />
          </div>
        </div>
      </div>
    </header>
  );
}
