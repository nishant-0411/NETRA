import React, { useState } from 'react';
import { 
  Eye, 
  ChevronDown, 
  RefreshCw, 
  ShieldCheck, 
  Award
} from 'lucide-react';

export default function Header({ 
  cases = [], 
  activeCaseId, 
  currentUser,
  onSelectCase, 
  isSyncing, 
  onRefreshSync,
  onOpenOfficerDetails,
  isSupervisorView,
  onToggleSupervisorPortal,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeCase = cases.find(c => c.case_id === activeCaseId) || cases[0];

  return (
    <header className="h-16 bg-[#261B16] text-white border-b border-[#1A120E] px-4 sm:px-6 flex items-center justify-between shadow-sm sticky top-0 z-30 select-none">
      {/* Left: Emblem Branding & Portal Identity */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          {/* Eye & Emblem Icon */}
          <div className="w-9 h-9 rounded-lg bg-[#382822] flex items-center justify-center text-[#8C532B] shadow-sm border border-[#8C532B]/40">
            <Eye className="w-5 h-5 text-[#8C532B] stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold tracking-widest text-white uppercase font-mono-code">
                NETRA
              </span>
              <span className="text-[10px] bg-[#382822] text-[#D8CAB8] font-semibold px-1.5 py-0.2 rounded border border-[#8C532B]/30">
                GOVT OF INDIA
              </span>
            </div>
            <div className="text-xs font-medium text-[#D8CAB8]/90 tracking-tight flex items-center gap-1.5">
              <span>Police Intelligence &amp; Crime Analysis</span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-7 w-px bg-[#4F3B34] hidden md:block" />

        {isSupervisorView ? (
          /* Supervisor Portal Title Badge */
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#382822] border border-[#8C532B]/50 text-[#EDE4D8] font-bold text-xs font-mono-code">
            <ShieldCheck className="w-4 h-4 text-[#C27D26]" />
            <span>STATION SUPERVISOR COMMAND &amp; ALLOCATION PORTAL</span>
          </div>
        ) : (
          /* Active Case Selector Dropdown for Investigator View */
          <div className="relative">
            <button
              id="active-case-selector-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#8C532B]/40 bg-[#382822] hover:bg-[#48342D] transition-colors text-left"
            >
              <div className="w-2 h-2 rounded-full bg-[#4A6B53] animate-pulse" />
              <div>
                <div className="text-[10px] font-mono-code font-bold uppercase text-[#D8CAB8]/80">
                  Active Dossier
                </div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="font-mono-code text-[#EAD8C7]">{activeCase?.case_id || 'N/A'}</span>
                  {activeCase && <span className="text-[#A39284]">•</span>}
                  <span className="truncate max-w-[160px] sm:max-w-[220px] text-[#EDE4D8]">
                    {activeCase?.case_title?.split('-')[1]?.trim() || activeCase?.case_title || 'Select Case'}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[#D8CAB8] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-[#DDD4C7] py-1.5 z-50 text-[#2B211C] animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5 border-b border-[#DDD4C7]/60 flex items-center justify-between text-[11px] font-mono-code font-bold text-[#7A6D63] uppercase">
                  <span>Select Investigative Dossier</span>
                  <span className="text-[#8C532B]">{cases.length} Loaded</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#DDD4C7]/50">
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
                        className={`w-full px-3 py-2.5 text-left hover:bg-[#F5EFEB] transition-colors flex items-start gap-2.5 ${
                          isCurrent ? 'bg-[#EDE4D8]' : ''
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isCurrent ? 'bg-[#8C532B] ring-2 ring-[#8C532B]/30' : 'bg-[#DDD4C7]'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-mono-code font-bold text-xs text-[#2B211C]">
                              {c.case_id}
                            </span>
                            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#C27D26]/15 text-[#C27D26] border border-[#C27D26]/30">
                              {c.threat_level || 'CRITICAL'}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-[#2B211C] truncate mt-0.5">
                            {c.case_title}
                          </div>
                          <div className="text-[11px] text-[#7A6D63] font-mono-code truncate">
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
        )}
      </div>

      {/* Right Side: Compact ICJS Status, Mode Switcher & Officer Profile */}
      <div className="flex items-center gap-3">
        {/* Compact ICJS Live Status Badge (only in Investigator view) */}
        {!isSupervisorView && (
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#382822] border border-[#4A6B53]/40 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A6B53] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4A6B53]"></span>
            </span>
            <span className="text-[10px] font-mono-code font-bold uppercase text-[#4A6B53]">
              ICJS LIVE
            </span>
            <button 
              onClick={onRefreshSync}
              title="Force ICJS Grid Resync"
              className="p-0.5 hover:bg-[#4F3B34] rounded text-[#4A6B53] transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-white' : ''}`} />
            </button>
          </div>
        )}

        {/* Mode Switcher Button (SUPERVISOR PORTAL / INVESTIGATOR VIEW) */}
        {onToggleSupervisorPortal && (
          <button
            type="button"
            onClick={onToggleSupervisorPortal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs font-mono-code border ${
              isSupervisorView
                ? 'bg-[#8C532B] text-white border-[#8C532B] hover:bg-[#703F1E]'
                : 'bg-[#382822] text-[#EDE4D8] border-[#8C532B]/50 hover:bg-[#48342D]'
            }`}
            title="Switch between Supervisor Portal and Investigator Analysis View"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isSupervisorView ? 'INVESTIGATOR VIEW' : 'SUPERVISOR PORTAL'}</span>
          </button>
        )}

        {/* Officer Profile Badge */}
        <button 
          type="button" 
          onClick={onOpenOfficerDetails} 
          className="flex items-center gap-2.5 rounded-lg py-1 pl-2 pr-1 text-left transition hover:bg-[#382822] focus:outline-none" 
          title="View officer profile details"
        >
          <div className="text-right hidden sm:block">
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs font-bold text-white">
                {[currentUser?.rank, currentUser?.username].filter(Boolean).join(' ') || 'Officer'}
              </span>
              <Award className="w-3.5 h-3.5 text-[#C27D26]" />
            </div>
            <div className="text-[10px] font-mono-code text-[#D8CAB8]/80 font-medium">
              ID: <span className="text-[#EAD8C7] font-semibold">{currentUser?.police_id || 'P411'}</span> • {currentUser?.department || 'Crime Branch'}
            </div>
          </div>

          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#8C532B] text-white font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-[#4A6B53]">
              {(currentUser?.username || 'OFFICER').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#4A6B53] border-2 border-[#261B16]" title="Officer Authenticated & Active" />
          </div>
        </button>
      </div>
    </header>
  );
}
