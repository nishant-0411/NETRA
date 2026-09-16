import React, { useState } from 'react';
import { 
  X, 
  User, 
  ShieldAlert, 
  Phone, 
  Car, 
  Crosshair, 
  FileText, 
  CreditCard, 
  MapPin, 
  Copy, 
  Check, 
  AlertTriangle, 
  ExternalLink, 
  ArrowUpRight, 
  ArrowDownLeft,
  Share2,
  Download,
  Fingerprint,
  Calendar,
  Lock
} from 'lucide-react';
import { ENTITY_COLORS, ENTITY_TYPES } from '../utils/graphParser';

export default function EntityDrawer({ entity, onClose, onFocusNode }) {
  const [copiedField, setCopiedField] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  if (!entity) return null;

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getEntityColor = (category) => {
    if (!category) return '#10B981';
    const upper = category.toUpperCase();
    if (upper.includes('SUSPECT')) return ENTITY_COLORS.SUSPECT;
    if (upper.includes('VICTIM')) return ENTITY_COLORS.VICTIM;
    if (upper.includes('WITNESS')) return ENTITY_COLORS.WITNESS;
    if (upper.includes('VEHICLE')) return ENTITY_COLORS.VEHICLE;
    if (upper.includes('PHONE')) return ENTITY_COLORS.PHONE;
    if (upper.includes('WEAPON')) return ENTITY_COLORS.WEAPON;
    return ENTITY_COLORS.CASE;
  };

  const entityColor = getEntityColor(entity.entityCategory || entity.crime_type ? 'CASE' : 'SUSPECT');

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] md:w-[480px] bg-white border-l border-slate-300/80 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-250 select-none">
      {/* Drawer Header with Category Indicator */}
      <div 
        className="p-5 border-b border-[#1A120E] text-white relative flex items-start justify-between"
        style={{ backgroundColor: '#261B16' }}
      >
        <div className="flex items-start gap-3.5 pr-6">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md font-mono-code font-bold text-base"
            style={{ backgroundColor: entityColor }}
          >
            {entity.entityCategory?.charAt(0) || 'E'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="text-[10px] font-bold font-mono-code px-2 py-0.5 rounded uppercase tracking-wider text-white"
                style={{ backgroundColor: entityColor }}
              >
                {entity.entityCategory || (entity.fir_number ? 'CRIME INCIDENT' : 'ENTITY')}
              </span>
              <span className="text-xs font-mono-code text-[#A89F91]">
                {entity.id}
              </span>
            </div>
            <h2 className="text-base font-bold text-[#EDE4D8] tracking-tight mt-1 leading-snug">
              {entity.name || entity.case_title || entity.type || entity.reg_number || entity.number}
            </h2>
            {entity.alias && (
              <p className="text-xs text-[#C27D26] font-mono-code">
                Alias: "{entity.alias}"
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          id="btn-close-entity-drawer"
          className="p-1.5 rounded-lg bg-[#382822] text-[#A89F91] hover:text-white hover:bg-[#8C532B] transition-colors cursor-pointer"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Navigation Tabs inside Drawer */}
      <div className="flex border-b border-[#DDD4C7] bg-[#F5EFEB]/50 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'overview' 
              ? 'border-[#8C532B] text-[#8C532B] bg-white font-bold' 
              : 'border-transparent text-[#7A6D63] hover:text-[#2B211C]'
          }`}
        >
          Overview & Identity
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'financials' 
              ? 'border-[#8C532B] text-[#8C532B] bg-white font-bold' 
              : 'border-transparent text-[#7A6D63] hover:text-[#2B211C]'
          }`}
        >
          Financial Trail
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'evidence' 
              ? 'border-[#8C532B] text-[#8C532B] bg-white font-bold' 
              : 'border-transparent text-[#7A6D63] hover:text-[#2B211C]'
          }`}
        >
          Legal & Seizures
        </button>
      </div>

      {/* Drawer Body Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {activeTab === 'overview' && (
          <>
            {/* Threat Meter for Suspects */}
            {entity.threat_score && (
              <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-red-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" /> THREAT ASSESSMENT SCORE
                  </span>
                  <span className="font-mono-code font-bold text-red-700 text-sm">
                    {entity.threat_score} / 100
                  </span>
                </div>
                <div className="w-full bg-red-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-red-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${entity.threat_score}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-red-700 font-mono-code">
                  <span>HIGH RISK SYNDICATE MEMBER</span>
                  <span>CATEGORY A</span>
                </div>
              </div>
            )}

            {/* Core Identifiers Box (PAN, Aadhaar, Phone, Status) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="text-[11px] font-mono-code font-bold text-slate-500 uppercase tracking-wider">
                Government & Biometric Identifiers
              </div>

              {/* PAN Number */}
              {entity.pan_number && (
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Income Tax PAN:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-code font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {entity.pan_number}
                    </span>
                    <button
                      onClick={() => handleCopy(entity.pan_number, 'pan')}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500"
                      title="Copy PAN"
                    >
                      {copiedField === 'pan' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Aadhaar Hash */}
              {entity.aadhaar_hash && (
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Aadhaar (Masked):</span>
                  <span className="font-mono-code text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {entity.aadhaar_hash}
                  </span>
                </div>
              )}

              {/* Status / Custody */}
              {entity.status && (
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Current Status:</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                    entity.status.toLowerCase().includes('arrested') || entity.status.toLowerCase().includes('detained')
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : entity.status.toLowerCase().includes('seized')
                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {entity.status}
                  </span>
                </div>
              )}

              {/* Contact Phone */}
              {(entity.phone || entity.number) && (
                <div className="flex items-center justify-between py-1 border-b border-[#DDD4C7]/60">
                  <span className="text-[#7A6D63] font-medium">Primary Contact:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-code font-bold text-[#8C532B] bg-[#EDE4D8] px-2 py-0.5 rounded border border-[#DDD4C7]">
                      {entity.phone || entity.number}
                    </span>
                    <button
                      onClick={() => handleCopy(entity.phone || entity.number, 'phone')}
                      className="p-1 hover:bg-[#EDE4D8] rounded text-[#7A6D63] cursor-pointer"
                    >
                      {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-[#4A6B53]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle Registration */}
              {entity.reg_number && (
                <div className="flex items-center justify-between py-1 border-b border-[#DDD4C7]/60">
                  <span className="text-[#7A6D63] font-medium">RTO Plate:</span>
                  <span className="font-mono-code font-bold text-[#8C532B] bg-[#EDE4D8] px-2 py-0.5 rounded border border-[#DDD4C7]">
                    {entity.reg_number}
                  </span>
                </div>
              )}

              {/* IMEI Number */}
              {entity.imei && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#7A6D63] font-medium">Device IMEI:</span>
                  <span className="font-mono-code text-[#2B211C] bg-[#EDE4D8] px-2 py-0.5 rounded border border-[#DDD4C7]">
                    {entity.imei}
                  </span>
                </div>
              )}
            </div>

            {/* Address & Known Locations */}
            {entity.address && (
              <div className="p-3.5 rounded-xl border border-[#DDD4C7] bg-white shadow-2xs space-y-1.5">
                <div className="text-[11px] font-mono-code font-bold text-[#7A6D63] uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#8C532B]" /> Registered Domicile & Coordinates
                </div>
                <p className="text-[#2B211C] font-medium leading-relaxed">
                  {entity.address}
                </p>
                {entity.known_locations && (
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-[#7A6D63] font-semibold">Active Hubs:</span>
                    {entity.known_locations.map((loc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#EDE4D8] text-[#2B211C] text-[10px] font-medium border border-[#DDD4C7]">
                        {loc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vehicle Details Card */}
            {entity.model && (
              <div className="p-3.5 rounded-xl border border-[#DDD4C7] bg-[#EDE4D8]/30 space-y-2">
                <div className="flex items-center justify-between text-[#8C532B] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-[#8C532B]" /> Vehicle Record
                  </span>
                  <span className="font-mono-code text-xs text-[#8C532B]">{entity.rto}</span>
                </div>
                <div className="text-[#2B211C] font-medium">{entity.model}</div>
                <div className="text-[11px] text-[#7A6D63] bg-white/80 p-2 rounded border border-[#DDD4C7]">
                  <strong>Notes:</strong> {entity.notes}
                </div>
              </div>
            )}

            {/* Weapon Details Card */}
            {entity.serial_number && (
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <div className="flex items-center justify-between text-rose-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-rose-600" /> Arms Seizure Record
                  </span>
                  <span className="font-mono-code text-xs text-rose-700">{entity.serial_number}</span>
                </div>
                <div className="text-[#2B211C] font-semibold">{entity.type}</div>
                <div className="text-[11px] text-[#7A6D63] bg-white/80 p-2 rounded border border-rose-200/60">
                  <strong>Ballistics FSL Report:</strong> {entity.ballistics_report}
                </div>
              </div>
            )}

            {/* Victim Incident Narrative */}
            {entity.incident_narrative && (
              <div className="p-3.5 rounded-xl border border-[#C27D26]/30 bg-[#EDE4D8]/40 space-y-2">
                <div className="text-[#8C532B] font-bold flex items-center justify-between">
                  <span>Victim Statement & Loss</span>
                  <span className="font-mono-code text-[#A83A32] font-bold">{entity.loss_amount}</span>
                </div>
                <p className="text-[#2B211C] leading-relaxed">{entity.incident_narrative}</p>
              </div>
            )}

            {/* Witness Statement */}
            {entity.statement && (
              <div className="p-3.5 rounded-xl border border-[#DDD4C7] bg-[#F5EFEB]/50 space-y-2">
                <div className="text-[#2B211C] font-bold flex items-center justify-between">
                  <span>Deposition & Statement</span>
                  <span className="text-[#7A6D63] font-mono-code text-[10px]">{entity.designation}</span>
                </div>
                <p className="text-[#2B211C] leading-relaxed italic">"{entity.statement}"</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-3">
            <div className="p-3 bg-[#EDE4D8]/50 border border-[#DDD4C7] rounded-xl">
              <div className="text-[11px] font-mono-code font-bold text-[#8C532B] uppercase flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#8C532B]" /> Illicit Fund Flow Tracking
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-[#DDD4C7]">
                  <span className="text-[10px] text-[#7A6D63] font-semibold uppercase block">Cumulative Sent</span>
                  <span className="text-xs font-mono-code font-bold text-[#A83A32]">
                    {entity.financials?.list?.filter(t => t.from_entity === entity.id).map(t => t.amount).join(', ') || 'None Recorded'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-[#DDD4C7]">
                  <span className="text-[10px] text-[#7A6D63] font-semibold uppercase block">Cumulative Received</span>
                  <span className="text-xs font-mono-code font-bold text-[#4A6B53]">
                    {entity.financials?.list?.filter(t => t.to_entity === entity.id).map(t => t.amount).join(', ') || 'None Recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Ledger Slips */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#2B211C]">Associated Transactions</div>
              {entity.financials?.list && entity.financials.list.length > 0 ? (
                entity.financials.list.map((txn) => {
                  const isOutflow = txn.from_entity === entity.id;
                  return (
                    <div key={txn.id} className="p-3 rounded-lg border border-[#DDD4C7] bg-white shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono-code font-bold text-xs flex items-center gap-1 ${isOutflow ? 'text-[#A83A32]' : 'text-[#4A6B53]'}`}>
                          {isOutflow ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                          {txn.amount}
                        </span>
                        <span className="text-[10px] text-[#7A6D63] font-mono-code">
                          {txn.timestamp}
                        </span>
                      </div>
                      <div className="text-[#2B211C] text-[11px] font-medium">
                        Channel: <strong>{txn.channel}</strong>
                      </div>
                      <div className="text-[10px] font-mono-code text-[#7A6D63] truncate bg-[#F5EFEB] p-1 rounded">
                        Ref: {txn.reference}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-[#7A6D63] font-medium">
                  No direct financial transfers attached to this entity node.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-3">
            {/* Seized Assets */}
            {entity.seized_assets && (
              <div className="p-3.5 rounded-xl border border-[#DDD4C7] bg-[#EDE4D8]/40 space-y-1.5">
                <div className="text-[11px] font-mono-code font-bold text-[#8C532B] uppercase">
                  Seized Contraband & Proceeds of Crime
                </div>
                <p className="text-[#2B211C] font-medium leading-relaxed">
                  {entity.seized_assets}
                </p>
              </div>
            )}

            {/* Criminal Record Dossier */}
            {entity.criminal_history && (
              <div className="p-3.5 rounded-xl border border-[#DDD4C7] bg-white shadow-2xs space-y-1.5">
                <div className="text-[11px] font-mono-code font-bold text-[#7A6D63] uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#8C532B]" /> CCTNS Prior Convictions & FIR History
                </div>
                <p className="text-[#2B211C] leading-relaxed font-medium">
                  {entity.criminal_history}
                </p>
              </div>
            )}

            {/* Seizure Memo Status */}
            <div className="p-3 bg-[#F5EFEB]/60 border border-[#DDD4C7] rounded-xl space-y-2">
              <div className="text-[11px] font-mono-code font-bold text-[#7A6D63] uppercase">
                Chain of Custody & Evidence Memo
              </div>
              <div className="text-[11px] text-[#7A6D63] space-y-1">
                <div>• Evidence Tag: <strong className="font-mono-code text-[#2B211C]">CCTNS-EVD-{entity.id}-2024</strong></div>
                <div>• FSL Dispatch: <strong className="text-[#4A6B53]">Verified & Sealed</strong></div>
                <div>• Section: <strong className="text-[#2B211C]">Sec 102 CrPC / Sec 105 BNSS</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Action Footer */}
      <div className="p-4 border-t border-[#DDD4C7] bg-[#F5EFEB]/50 flex items-center justify-between gap-2 text-xs">
        <button
          onClick={() => alert(`Look Out Circular (LOC) alert generated for ${entity.name || entity.id}. Transmitted to Bureau of Immigration.`)}
          className="flex-1 py-2 px-3 rounded-lg bg-[#A83A32] text-white hover:bg-[#8e2e27] font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Issue LOC</span>
        </button>

        <button
          onClick={() => alert(`Wiretap and CDR request for ${entity.name || entity.id} dispatched to DoT Nodal Unit.`)}
          className="flex-1 py-2 px-3 rounded-lg bg-[#8C532B] text-white hover:bg-[#703F1E] font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Tap Request</span>
        </button>

        <button
          onClick={() => handleCopy(JSON.stringify(entity, null, 2), 'export')}
          className="py-2 px-3 rounded-lg border border-[#DDD4C7] bg-white hover:bg-[#EDE4D8] text-[#2B211C] font-semibold transition-colors shadow-2xs cursor-pointer"
          title="Copy Entity JSON"
        >
          {copiedField === 'export' ? <Check className="w-4 h-4 text-[#4A6B53]" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
