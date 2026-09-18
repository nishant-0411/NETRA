import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileCheck, 
  Car, 
  Crosshair, 
  AlertCircle, 
  Radio, 
  Clock, 
  Eye, 
  CheckCircle2, 
  MapPin, 
  Cpu, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UploadCloud,
  ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import NetworkGraph from './NetworkGraph';
import { getCaseGraphStats } from '../services/graphService';

export default function DashboardOverview({ 
  caseData, 
  currentUser,
  onSelectEntity, 
  setActiveTab,
  onTriggerAction,
  onOpenUploadModal,
  onSelectCase
}) {
  const [leadStatus, setLeadStatus] = useState({});
  const [graphStats, setGraphStats] = useState(null);
  useEffect(() => {
    if (!caseData?.case_id) return;

    getCaseGraphStats(caseData.case_id)
      .then(setGraphStats)
      .catch(err => {
        console.error('[DashboardOverview] Failed to fetch graph stats:', err);
        setGraphStats(null);
      });
  }, [caseData?.case_id]);
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
    <div className="w-full space-y-6 pb-12 select-none">
      {/* Active Case Hero Banner */}
      <div className="bg-[#261B16] text-white rounded-2xl p-6 border border-[#1A120E] shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-[#C27D26] text-white flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {caseData.threat_level || 'MEDIUM'} THREAT
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-[#382822] text-[#D8CAB8] border border-[#8C532B]/30">
                {caseData.case_id}
              </span>
              <span className="text-xs text-[#D8CAB8]/80 font-mono-code">
                FIR: <strong className="text-white">{caseData.fir_number}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {caseData.case_title}
            </h1>

            <p className="text-sm text-[#D8CAB8]/90 max-w-4xl mt-2 leading-relaxed font-normal">
              {caseData.master_plot}
            </p>

            <div className="mt-3 flex items-center gap-3 text-xs text-[#D8CAB8]/80 flex-wrap font-mono-code">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#8C532B]" /> {caseData.police_station}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#C27D26]" /> Lead: {[caseData.lead_investigator?.rank, caseData.lead_investigator?.username].filter(Boolean).join(' ') || caseData.assigned_officer_name || caseData.investigating_officer || 'Not assigned'}
              </span>
              {(caseData?.lead_investigator_police_id || caseData?.assigned_officer_police_id) && (
                currentUser?.police_id === (caseData.lead_investigator_police_id || caseData.assigned_officer_police_id) ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#4A6B53]/30 text-[#6EB882] border border-[#4A6B53]/50 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#6EB882]" /> YOU ARE LEAD INVESTIGATOR
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#C27D26]/25 text-[#F5D7B0] border border-[#C27D26]/50 flex items-center gap-1">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#C27D26]" /> ASSIGNED TO: {[caseData.lead_investigator?.rank, caseData.lead_investigator?.username].filter(Boolean).join(' ') || caseData.assigned_officer_name || caseData.investigating_officer}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 shrink-0">
            <button
              id="hero-jump-to-graph-btn"
              onClick={() => setActiveTab('network')}
              className="px-4 py-2.5 rounded-xl bg-[#8C532B] hover:bg-[#703F1E] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Eye className="w-4 h-4" />
              <span>Explore Network Graph</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="hero-ingest-evidence-btn"
              onClick={onOpenUploadModal}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#EDE4D8] font-bold text-xs border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono-code shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#8C532B]" />
              <span>Ingest Case Evidence</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Suspects */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A6D63] uppercase tracking-wider font-mono-code">
              Total Suspects
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#A83A32]/10 text-[#A83A32] flex items-center justify-center border border-[#A83A32]/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#2B211C] font-mono-code">
              {graphStats?.persons ?? totalSuspects}
            </span>
            <span className="text-xs font-semibold text-[#A83A32] flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> Active Syndicate
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#7A6D63]">
            <span>In Custody: <strong className="text-[#C27D26]">{detainedCount}</strong></span>
            <span>Absconding: <strong className="text-[#A83A32]">{abscondingCount}</strong></span>
          </div>
        </div>

        {/* Metric 2: Synced FIRs */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A6D63] uppercase tracking-wider font-mono-code">
              Synced FIRs &amp; Sections
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#4A6B53]/10 text-[#4A6B53] flex items-center justify-center border border-[#4A6B53]/20">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#2B211C] font-mono-code">
              {(caseData.ipc_sections || []).length}
            </span>
            <span className="text-xs font-semibold text-[#4A6B53]">
              IPC &amp; Special Acts
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#7A6D63]">
            <span className="truncate max-w-[180px]">{caseData.fir_number}</span>
            <span className="text-[#4A6B53] font-bold font-mono-code">ICJS LIVE</span>
          </div>
        </div>

        {/* Metric 3: Tracked Vehicles */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A6D63] uppercase tracking-wider font-mono-code">
              Tracked Vehicles
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#8C532B]/10 text-[#8C532B] flex items-center justify-center border border-[#8C532B]/20">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#2B211C] font-mono-code">
              {graphStats?.vehicles ?? totalVehicles}
            </span>
            <span className="text-xs font-semibold text-[#8C532B]">
              RTO &amp; ANPR Alert
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#7A6D63]">
            <span>Seized: <strong className="text-[#2B211C]">{seizedVehiclesCount}</strong></span>
            <span>Hotlisted: <strong className="text-[#C27D26]">{totalVehicles - seizedVehiclesCount}</strong></span>
          </div>
        </div>

        {/* Metric 4: Seized Weapons */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A6D63] uppercase tracking-wider font-mono-code">
              Arms &amp; Contraband
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#C27D26]/10 text-[#C27D26] flex items-center justify-center border border-[#C27D26]/20">
              <Crosshair className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#2B211C] font-mono-code">
              {totalWeapons}
            </span>
            <span className="text-xs font-semibold text-[#C27D26]">
              Weapons Seized
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#7A6D63]">
            <span>Ballistics FSL: <strong className="text-[#4A6B53]">Matched</strong></span>
            <span>Memos: <strong className="text-[#C27D26]">Logged</strong></span>
          </div>
        </div>
      </div>

      {/* LIVE INTERACTIVE GRAPH ON FRONT PAGE (User Explicit Request) */}
      <div className="bg-white rounded-2xl p-5 border border-[#DDD4C7] shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EDE4D8] flex items-center justify-center text-[#8C532B]">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#2B211C] tracking-tight">
                  NETRA Live Network Surveillance Visual Graph
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#4A6B53]/15 text-[#4A6B53] border border-[#4A6B53]/30">
                  LIVE INTERACTIVE
                </span>
              </div>
              <p className="text-xs text-[#7A6D63]">
                Interactive relationship visualization between suspects, victims, phones, vehicles, and illicit fund flows.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('network')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#261B16] hover:bg-[#382822] text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <span>Full Canvas View</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#C27D26]" />
          </button>
        </div>

        {/* Embedded Live Graph Canvas */}
        <NetworkGraph
          caseData={caseData}
          onSelectEntity={onSelectEntity}
          isMini={true}
          onExpand={() => setActiveTab('network')}
          onSelectCase={onSelectCase}
        />
      </div>

      {/* Two Column Layout: Modus Operandi Dossier & Priority Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Modus Operandi Dossier */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-[#DDD4C7] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD4C7]/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C27D26]/10 text-[#C27D26] flex items-center justify-center border border-[#C27D26]/20">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2B211C]">
                  Modus Operandi Dossier
                </h3>
                <span className="text-[11px] text-[#7A6D63] font-mono-code">
                  NCRB Standard Operational Pattern Analysis
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-[#8C532B] bg-[#EDE4D8] px-2.5 py-1 rounded-md border border-[#8C532B]/30">
              {caseData.crime_type}
            </span>
          </div>

          {/* Operational Methodology Summary */}
          <div className="bg-[#F5EFEB] p-4 rounded-xl border border-[#DDD4C7] space-y-1.5">
            <div className="text-xs font-bold text-[#2B211C] uppercase font-mono-code flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#8C532B]" /> Operational Methodology
            </div>
            <p className="text-xs text-[#2B211C] leading-relaxed font-medium">
              {caseData.modus_operandi?.summary}
            </p>
          </div>

          {/* Syndicate Hierarchy */}
          <div className="p-3.5 rounded-xl border border-[#DDD4C7] bg-white shadow-2xs space-y-1">
            <div className="text-[11px] font-mono-code font-bold text-[#7A6D63] uppercase">
              Syndicate Command &amp; Hierarchy
            </div>
            <p className="text-xs font-semibold text-[#2B211C]">
              {caseData.modus_operandi?.syndicate_hierarchy}
            </p>
          </div>

          {/* Digital Footprint & Target Demographics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] space-y-1">
              <span className="font-mono-code font-bold text-[#7A6D63] uppercase text-[10px] block">
                Target Demographics
              </span>
              <span className="font-medium text-[#2B211C]">
                {caseData.modus_operandi?.target_demographics}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] space-y-1">
              <span className="font-mono-code font-bold text-[#7A6D63] uppercase text-[10px] block">
                Digital &amp; Comms Footprint
              </span>
              <span className="font-medium text-[#2B211C] font-mono-code text-[11px]">
                {caseData.modus_operandi?.digital_footprint}
              </span>
            </div>
          </div>

          {/* IPC Sections Tag Cloud */}
          <div className="pt-2">
            <div className="text-xs font-bold text-[#2B211C] mb-2">
              Invoked Penal Sections &amp; Special Enactments:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(caseData.ipc_sections || []).map((sec, idx) => (
                <span 
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-[#EDE4D8] text-[#8C532B] text-[11px] font-semibold border border-[#8C532B]/30 font-mono-code"
                >
                  {sec}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Priority Leads Feed */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-[#DDD4C7] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD4C7]/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A83A32]/10 text-[#A83A32] flex items-center justify-center border border-[#A83A32]/20">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2B211C]">
                  Priority Leads Intelligence Feed
                </h3>
                <span className="text-[11px] text-[#7A6D63] font-mono-code">
                  Real-time Intercepts &amp; Informer Alerts
                </span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#A83A32] animate-ping" />
          </div>

          {/* Lead List */}
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {(caseData.priority_leads || []).map((lead) => {
              const status = leadStatus[lead.id];
              return (
                <div 
                  key={lead.id}
                  className="p-3.5 rounded-xl border border-[#DDD4C7] bg-[#F5EFEB]/50 hover:bg-[#F5EFEB] transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold font-mono-code px-2 py-0.5 rounded uppercase ${
                      lead.priority === 'CRITICAL' 
                        ? 'bg-[#A83A32]/15 text-[#A83A32] border border-[#A83A32]/30' 
                        : 'bg-[#C27D26]/15 text-[#C27D26] border border-[#C27D26]/30'
                    }`}>
                      {lead.priority}
                    </span>
                    <span className="text-[11px] text-[#7A6D63] font-mono-code flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {lead.timestamp}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#2B211C] leading-snug">
                    {lead.title}
                  </h4>

                  <p className="text-[11px] text-[#7A6D63] leading-relaxed font-normal">
                    {lead.description}
                  </p>

                  <div className="pt-2 border-t border-[#DDD4C7]/60 flex items-center justify-between text-[10px]">
                    <span className="font-mono-code text-[#8C532B] font-semibold">
                      Src: {lead.source}
                    </span>

                    {status ? (
                      <span className="font-semibold text-[#4A6B53] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {status}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleLeadAction(lead.id, 'QRT Dispatched')}
                          className="px-2 py-1 rounded bg-[#8C532B] hover:bg-[#703F1E] text-white font-semibold transition-colors cursor-pointer"
                        >
                          Deploy QRT
                        </button>
                        <button
                          onClick={() => handleLeadAction(lead.id, 'Verified & Logged')}
                          className="px-2 py-1 rounded border border-[#DDD4C7] bg-white hover:bg-[#EDE4D8] text-[#2B211C] font-medium transition-colors cursor-pointer"
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
    </div>
  );
}
