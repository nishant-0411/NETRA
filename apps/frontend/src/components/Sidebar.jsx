import React from 'react';
import { 
  Shield, 
  Network, 
  LayoutDashboard, 
  Eye, 
  Radio, 
  Database, 
  AlertTriangle,
  Fingerprint,
  FileText,
  Lock,
  FolderLock,
  Bot,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, activeCase, casesCount, onOpenChatbot }) {
  return (
    <aside className="w-64 bg-[#0a1628] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800/80 select-none min-h-screen">
      {/* Top Section: Branding & Eye Insignia */}
      <div>
        {/* Portal & NETRA Eye Header */}
        <div className="p-5 border-b border-slate-800/80 bg-[#07101e]">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Eye className="w-6 h-6 text-white stroke-[2.2]" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold tracking-widest text-cyan-400 font-mono-code uppercase">
                  PROJECT NETRA
                </span>
                <span className="bg-cyan-950/80 text-cyan-300 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-cyan-800/50">
                  v2.4
                </span>
              </div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                POLICE CCTNS / ICJS
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Criminal Tactical Reconnaissance
              </p>
            </div>
          </div>

          {/* Classification Banner */}
          <div className="mt-3 px-2 py-1 bg-amber-950/40 border border-amber-600/30 rounded flex items-center justify-between">
            <span className="text-[10px] font-mono-code font-bold text-amber-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> RESTRICTED INTELLIGENCE
            </span>
            <span className="text-[9px] text-amber-500/90 font-mono-code">
              LAW ENFORCEMENT
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-3 space-y-1.5 mt-2">
          <div className="px-3 py-1.5 text-[11px] font-mono-code font-semibold uppercase tracking-wider text-slate-400">
            Core Analytical Engines
          </div>

          <button
            id="tab-dashboard-overview"
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-900/40 border-l-4 border-cyan-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-400" />
            <div className="flex-1">
              <div>Dashboard Overview</div>
              <div className="text-[10px] opacity-80 font-normal">Dossier, Leads & Live Matrix</div>
            </div>
          </button>

          <button
            id="tab-network-analysis"
            onClick={() => setActiveTab('network')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
              activeTab === 'network'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-900/40 border-l-4 border-cyan-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Network className="w-4 h-4 text-cyan-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span>Network Analysis</span>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded font-mono-code">
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
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-900/40 border-l-4 border-cyan-300'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FolderLock className="w-4 h-4 text-cyan-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span>Evidence Vault</span>
                <span className="bg-teal-500/20 text-teal-300 text-[10px] px-1.5 py-0.5 rounded font-mono-code font-bold">
                  FILES
                </span>
              </div>
              <div className="text-[10px] opacity-80 font-normal">Case Documents & Extraction</div>
            </div>
          </button>

          {/* AI Intelligence Assistant */}
          <div className="pt-2">
            <button
              id="sidebar-launch-copilot"
              type="button"
              onClick={onOpenChatbot}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-slate-900 via-[#0d223f] to-slate-900 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 transition-all text-left shadow-sm group cursor-pointer"
            >
              <div className="relative">
                <Bot className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">NETRA Copilot</span>
                  <span className="bg-cyan-900/70 text-cyan-300 text-[9px] px-1.5 py-0.2 rounded font-mono-code border border-cyan-700/60 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> AI
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal">Tactical Crime Assistant</div>
              </div>
            </button>
          </div>
        </nav>

        {/* Current Active Case Mini Badge */}
        <div className="mx-3 mt-4 p-3 rounded-lg bg-slate-900/70 border border-slate-800">
          <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Investigating Case</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ACTIVE
            </span>
          </div>
          <div className="mt-1 font-bold text-white text-xs truncate">
            {activeCase?.case_title || 'No case selected'}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono-code">
            <span>ID: <strong className="text-cyan-300">{activeCase?.case_id}</strong></span>
            <span>FIR: <strong className="text-slate-200">{activeCase?.fir_number?.split('/')[1] || '—'}</strong></span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Live Telemetry & Police Node Status */}
      <div className="p-4 border-t border-slate-800/80 bg-[#07101e] space-y-3">
        <div className="text-[10px] font-mono-code uppercase tracking-wider text-slate-400 font-semibold">
          National Grid Telemetry
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" /> ICJS Grid Hub
            </span>
            <span className="text-[11px] font-mono-code text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 99.98%
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" /> TAFCOP / CDR Tap
            </span>
            <span className="text-[11px] font-mono-code text-emerald-400 font-semibold">
              SYNCHRONIZED
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-blue-400" /> NAFIS Biometric
            </span>
            <span className="text-[11px] font-mono-code text-cyan-300 font-semibold">
              CONNECTED
            </span>
          </div>
        </div>

        {/* National Emblem & Security Seal */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-cyan-400" /> NCRB / MHA GOI
          </span>
          <span className="font-mono-code text-slate-400">
            DELHI SEC-NODE 04
          </span>
        </div>
      </div>
    </aside>
  );
}
