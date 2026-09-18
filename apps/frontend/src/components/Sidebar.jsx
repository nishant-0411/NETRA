import React from 'react';
import { 
  Network, 
  LayoutDashboard, 
  Eye, 
  FolderLock,
  Bot,
  Sparkles,
  X,
  KeyRound
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  activeCase, 
  casesCount, 
  onOpenChatbot, 
  onClose,
  onOpenRunningCases
}) {
  return (
    <aside className="w-64 bg-[#261B16] text-[#D8CAB8] flex flex-col justify-between shrink-0 border-r border-[#1A120E] select-none h-full min-h-screen">
      {/* Top Section: Branding & Eye Insignia */}
      <div className="flex-1 overflow-y-auto">
        {/* Portal & NETRA Eye Header */}
        <div className="p-4 border-b border-[#1A120E] bg-[#1A120E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#8C532B] text-white shadow-md">
              <Eye className="w-5 h-5 text-white stroke-[2.2]" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A6B53] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4A6B53]"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold tracking-widest text-white font-mono-code uppercase">
                  PROJECT NETRA
                </span>
                <span className="bg-[#382822] text-[#D8CAB8] text-[10px] font-semibold px-1.5 py-0.2 rounded border border-[#8C532B]/40">
                  v2.4
                </span>
              </div>
              <h1 className="text-xs font-bold text-[#D8CAB8]/90 tracking-wide">
                POLICE CCTNS / ICJS
              </h1>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A39284] hover:text-white hover:bg-[#382822] transition cursor-pointer"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1.5 mt-2">
          <div className="px-3 py-1.5 text-[11px] font-mono-code font-semibold uppercase tracking-wider text-[#A39284]">
            Core Analytical Engines
          </div>

          <button
            id="tab-dashboard-overview"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#8C532B] text-white shadow-sm border-l-4 border-[#C27D26]'
                : 'text-[#D8CAB8] hover:text-white hover:bg-[#382822]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#EDE4D8]" />
            <div className="flex-1">
              <div>Dashboard Overview</div>
              <div className="text-[10px] opacity-80 font-normal">Dossier, Leads &amp; Live Matrix</div>
            </div>
          </button>

          <button
            id="tab-network-analysis"
            onClick={() => setActiveTab('network')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
              activeTab === 'network'
                ? 'bg-[#8C532B] text-white shadow-sm border-l-4 border-[#C27D26]'
                : 'text-[#D8CAB8] hover:text-white hover:bg-[#382822]'
            }`}
          >
            <Network className="w-4 h-4 text-[#EDE4D8]" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span>Network Analysis</span>
                <span className="bg-[#382822] text-[#D8CAB8] text-[10px] px-1.5 py-0.5 rounded font-mono-code font-bold">
                  VIS
                </span>
              </div>
              <div className="text-[10px] opacity-80 font-normal">Interactive Relationship Graph</div>
            </div>
          </button>

          {/* Evidence Vault Button */}
          <button
            id="tab-evidence-vault"
            onClick={() => setActiveTab('vault')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
              activeTab === 'vault'
                ? 'bg-[#8C532B] text-white shadow-sm border-l-4 border-[#C27D26]'
                : 'text-[#D8CAB8] hover:text-white hover:bg-[#382822]'
            }`}
          >
            <FolderLock className="w-4 h-4 text-[#EDE4D8]" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span>Evidence Vault</span>
                <span className="bg-[#382822] text-[#4A6B53] text-[10px] px-1.5 py-0.5 rounded font-mono-code font-bold">
                  FILES
                </span>
              </div>
              <div className="text-[10px] opacity-80 font-normal">Case Documents &amp; Extraction</div>
            </div>
          </button>

          {/* Running Cases & Access Request */}
          <button
            id="tab-running-cases"
            onClick={() => {
              if (onOpenRunningCases) onOpenRunningCases();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-[#D8CAB8] hover:text-white hover:bg-[#382822] transition-all duration-150 text-left cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-[#C27D26]" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span>Running Cases</span>
                <span className="bg-[#382822] text-[#C27D26] text-[10px] px-1.5 py-0.5 rounded font-mono-code font-bold">
                  GRID
                </span>
              </div>
              <div className="text-[10px] opacity-80 font-normal">Browse &amp; Request Access</div>
            </div>
          </button>

          {/* AI Intelligence Assistant */}
          <div className="pt-2">
            <button
              id="sidebar-launch-copilot"
              type="button"
              onClick={onOpenChatbot}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-[#382822] border border-[#8C532B]/50 text-white hover:bg-[#48342D] transition-all text-left shadow-sm group cursor-pointer"
            >
              <div className="relative">
                <Bot className="w-4 h-4 text-[#EAD8C7] group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#4A6B53] rounded-full animate-ping" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">NETRA Copilot</span>
                  <span className="bg-[#261B16] text-[#D8CAB8] text-[9px] px-1.5 py-0.2 rounded font-mono-code border border-[#8C532B]/40 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#C27D26]" /> AI
                  </span>
                </div>
                <div className="text-[10px] text-[#A39284] font-normal">Tactical Crime Assistant</div>
              </div>
            </button>
          </div>
        </nav>

        {/* Current Active Case Mini Badge */}
        <div className="mx-3 my-4 p-3 rounded-lg bg-[#382822] border border-[#8C532B]/30">
          <div className="text-[10px] font-mono-code text-[#A39284] uppercase tracking-wider flex items-center justify-between">
            <span>Investigating Case</span>
            <span className="text-[#4A6B53] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B53] animate-pulse"></span> ACTIVE
            </span>
          </div>
          <div className="mt-1 font-bold text-white text-xs truncate">
            {activeCase?.case_title || 'No case selected'}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[#D8CAB8]/80 font-mono-code">
            <span>ID: <strong className="text-[#EAD8C7]">{activeCase?.case_id}</strong></span>
            <span>FIR: <strong className="text-slate-200">{activeCase?.fir_number?.split('/')[1] || '—'}</strong></span>
          </div>
        </div>
      </div>
    </aside>
  );
}
