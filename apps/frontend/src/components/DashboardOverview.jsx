import React, { useState } from 'react';
import { 
  Users, 
  FileCheck, 
  Car, 
  ShieldAlert, 
  Crosshair, 
  AlertCircle, 
  Radio, 
  Clock, 
  Send, 
  FileSpreadsheet, 
  PhoneCall, 
  Landmark, 
  ArrowRight, 
  Eye, 
  CheckCircle2, 
  MapPin, 
  Cpu, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Fingerprint,
  UploadCloud
} from 'lucide-react';
import NetworkGraph from './NetworkGraph';

export default function DashboardOverview({ 
  caseData, 
  onSelectEntity, 
  setActiveTab,
  onTriggerAction,
  onOpenUploadModal
}) {
  const [leadStatus, setLeadStatus] = useState({});

  if (!caseData) return null;

  const totalSuspects = (caseData.suspects || []).length;
  const detainedCount = (caseData.suspects || []).filter(s => 
    s.status?.toLowerCase().includes('arrested') || s.status?.toLowerCase().includes('detained')
  ).length;
  const abscondingCount = totalSuspects - detainedCount;

  const totalVehicles = (caseData.vehicles || []).length;
  const seizedVehiclesCount = (caseData.vehicles || []).filter(v => 
    v.status?.toLowerCase().includes('seized') || v.status?.toLowerCase().includes('impounded')
  ).length;

  const totalWeapons = (caseData.weapons || []).length;
  const totalFinancialTransfers = (caseData.financial_transfers || []).length;

  const handleLeadAction = (leadId, actionName) => {
    setLeadStatus(prev => ({ ...prev, [leadId]: actionName }));
    if (onTriggerAction) {
      onTriggerAction(`Lead [${leadId}] marked: ${actionName}`);
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Active Case Hero Banner */}
      <div className="bg-gradient-to-r from-[#0a1628] via-[#0f213e] to-[#0a1628] rounded-2xl p-6 text-white border border-slate-800 shadow-md relative overflow-hidden">
        {/* Background tactical grid lines */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                {caseData.threat_level || 'CRITICAL'} THREAT
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {caseData.case_id}
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                FIR: <strong className="text-slate-200">{caseData.fir_number}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {caseData.case_title}
            </h1>

            <p className="text-sm text-slate-300 max-w-4xl mt-2 leading-relaxed font-normal">
              {caseData.master_plot}
            </p>

            <div className="mt-3 flex items-center gap-4 text-xs text-slate-400 flex-wrap font-mono-code">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400" /> {caseData.police_station}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-400" /> IO: {caseData.investigating_officer}
              </span>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 shrink-0">
            <button
              id="hero-jump-to-graph-btn"
              onClick={() => setActiveTab('network')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold text-xs shadow-lg shadow-teal-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Explore Network Graph</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="hero-ingest-evidence-btn"
              onClick={onOpenUploadModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white font-bold text-xs border border-teal-500/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono-code shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-teal-300" />
              <span>Ingest Case Evidence</span>
            </button>
            <button
              onClick={() => onTriggerAction && onTriggerAction('Charge Sheet Summary Generated')}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>Charge Sheet Brief</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Suspects */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono-code">
              Total Suspects
            </span>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-code">
              {totalSuspects}
            </span>
            <span className="text-xs font-semibold text-red-600 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> Active Syndicate
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>In Custody: <strong className="text-amber-700">{detainedCount}</strong></span>
            <span>Absconding: <strong className="text-red-600">{abscondingCount}</strong></span>
          </div>
        </div>

        {/* Metric 2: Synced FIRs */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono-code">
              Synced FIRs & Sections
            </span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-code">
              {(caseData.ipc_sections || []).length}
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              IPC & Special Acts
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="truncate max-w-[180px]">{caseData.fir_number}</span>
            <span className="text-emerald-700 font-bold font-mono-code">ICJS LIVE</span>
          </div>
        </div>

        {/* Metric 3: Tracked Vehicles */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono-code">
              Tracked Vehicles
            </span>
            <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-code">
              {totalVehicles}
            </span>
            <span className="text-xs font-semibold text-pink-700">
              RTO & ANPR Alert
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Seized: <strong className="text-slate-800">{seizedVehiclesCount}</strong></span>
            <span>FASTag Hotlisted: <strong className="text-pink-600">{totalVehicles - seizedVehiclesCount}</strong></span>
          </div>
        </div>

        {/* Metric 4: Seized Weapons */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono-code">
              Arms & Contraband
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <Crosshair className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-code">
              {totalWeapons}
            </span>
            <span className="text-xs font-semibold text-purple-700">
              Weapons Seized
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Ballistics FSL: <strong className="text-emerald-700">Matched</strong></span>
            <span>Memos: <strong className="text-purple-700">Logged</strong></span>
          </div>
        </div>
      </div>

      {/* LIVE INTERACTIVE GRAPH ON FRONT PAGE (User Explicit Request) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  NETRA Live Network Surveillance Visual Graph
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  LIVE INTERACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Interactive relationship visualization between suspects, victims, phones, vehicles, and illicit fund flows.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('network')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <span>Full Canvas View</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>

        {/* Embedded Live Graph Canvas */}
        <NetworkGraph
          caseData={caseData}
          onSelectEntity={onSelectEntity}
          isMini={true}
          onExpand={() => setActiveTab('network')}
        />
      </div>

      {/* Two Column Layout: Modus Operandi Dossier & Priority Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Modus Operandi Dossier */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/60">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Modus Operandi Dossier
                </h3>
                <span className="text-[11px] text-slate-500 font-mono-code">
                  NCRB Standard Operational Pattern Analysis
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
              {caseData.crime_type}
            </span>
          </div>

          {/* Operational Methodology Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="text-xs font-bold text-slate-700 uppercase font-mono-code flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-600" /> Operational Methodology
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {caseData.modus_operandi?.summary}
            </p>
          </div>

          {/* Syndicate Hierarchy */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
            <div className="text-[11px] font-mono-code font-bold text-slate-500 uppercase">
              Syndicate Command & Hierarchy
            </div>
            <p className="text-xs font-semibold text-slate-800">
              {caseData.modus_operandi?.syndicate_hierarchy}
            </p>
          </div>

          {/* Digital Footprint & Target Demographics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-mono-code font-bold text-slate-500 uppercase text-[10px] block">
                Target Demographics
              </span>
              <span className="font-medium text-slate-700">
                {caseData.modus_operandi?.target_demographics}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="font-mono-code font-bold text-slate-500 uppercase text-[10px] block">
                Digital & Comms Footprint
              </span>
              <span className="font-medium text-slate-700 font-mono-code text-[11px]">
                {caseData.modus_operandi?.digital_footprint}
              </span>
            </div>
          </div>

          {/* IPC Sections Tag Cloud */}
          <div className="pt-2">
            <div className="text-xs font-bold text-slate-700 mb-2">
              Invoked Penal Sections & Special Enactments:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(caseData.ipc_sections || []).map((sec, idx) => (
                <span 
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-semibold border border-teal-200/80 font-mono-code"
                >
                  {sec}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Priority Leads Feed */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center border border-red-200/60">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Priority Leads Intelligence Feed
                </h3>
                <span className="text-[11px] text-slate-500 font-mono-code">
                  Real-time Intercepts & Informer Alerts
                </span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          </div>

          {/* Lead List */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {(caseData.priority_leads || []).map((lead) => {
              const status = leadStatus[lead.id];
              return (
                <div 
                  key={lead.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold font-mono-code px-2 py-0.5 rounded uppercase ${
                      lead.priority === 'CRITICAL' 
                        ? 'bg-red-100 text-red-800 border border-red-200' 
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {lead.priority}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono-code flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {lead.timestamp}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {lead.title}
                  </h4>

                  <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
                    {lead.description}
                  </p>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                    <span className="font-mono-code text-teal-700 font-semibold">
                      Src: {lead.source}
                    </span>

                    {status ? (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {status}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleLeadAction(lead.id, 'QRT Dispatched')}
                          className="px-2 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
                        >
                          Deploy QRT
                        </button>
                        <button
                          onClick={() => handleLeadAction(lead.id, 'Verified & Logged')}
                          className="px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors"
                        >
                          Verify
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono-code">
            Tactical Quick Action Protocols
          </h3>
          <span className="text-xs text-slate-500 font-mono-code">
            Inter-Agency Dispatch Grid
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action 1: ZIPNET Alert */}
          <button
            onClick={() => onTriggerAction && onTriggerAction('Inter-State ZIPNET Alert Dispatched to 8 State Police HQs')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-500 hover:bg-teal-50/30 transition-all text-left group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
              Generate ZIPNET Alert
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Broadcast stolen vehicles, absconding suspects to NCR border police checkpoints.
            </p>
          </button>

          {/* Action 2: Charge Sheet Summary */}
          <button
            onClick={() => onTriggerAction && onTriggerAction('Charge Sheet Summary Exported to PDF')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-cyan-500 hover:bg-cyan-50/30 transition-all text-left group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-cyan-800 transition-colors">
              Export Charge Sheet
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Generate Section 173 CrPC evidentiary summary with graph relationship matrix.
            </p>
          </button>

          {/* Action 3: Phone Wiretap Request */}
          <button
            onClick={() => onTriggerAction && onTriggerAction('Wiretap & CDR Dump Order Issued to Telecom Nodal Officers')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-500 hover:bg-amber-50/30 transition-all text-left group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
              Trigger Wiretap Order
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Issue lawful interception requisition under Section 5(2) Indian Telegraph Act.
            </p>
          </button>

          {/* Action 4: Asset Freeze */}
          <button
            onClick={() => onTriggerAction && onTriggerAction('Provisional Attachment Requisition Sent to FIU-IND and Enforcement Directorate')}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-red-500 hover:bg-red-50/30 transition-all text-left group shadow-2xs"
          >
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 group-hover:text-red-800 transition-colors">
              Initiate FIU Asset Freeze
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Direct banks and exchanges to freeze identified beneficiary mule accounts.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
