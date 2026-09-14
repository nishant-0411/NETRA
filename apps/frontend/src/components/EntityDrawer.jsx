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
        className="p-5 border-b border-slate-200 text-white relative flex items-start justify-between"
        style={{ backgroundColor: '#0a1628' }}
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
              <span className="text-xs font-mono-code text-slate-400">
                {entity.id}
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight mt-1 leading-snug">
              {entity.name || entity.case_title || entity.type || entity.reg_number || entity.number}
            </h2>
            {entity.alias && (
              <p className="text-xs text-amber-300 font-mono-code">
                Alias: "{entity.alias}"
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          id="btn-close-entity-drawer"
          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Close Inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Navigation Tabs inside Drawer */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'overview' 
              ? 'border-teal-600 text-teal-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Overview & Identity
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'financials' 
              ? 'border-teal-600 text-teal-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Financial Trail
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
            activeTab === 'evidence' 
              ? 'border-teal-600 text-teal-700 bg-white' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
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
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Primary Contact:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-code font-bold text-teal-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {entity.phone || entity.number}
                    </span>
                    <button
                      onClick={() => handleCopy(entity.phone || entity.number, 'phone')}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500"
                    >
                      {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle Registration */}
              {entity.reg_number && (
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">RTO Plate:</span>
                  <span className="font-mono-code font-bold text-pink-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {entity.reg_number}
                  </span>
                </div>
              )}

              {/* IMEI Number */}
              {entity.imei && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Device IMEI:</span>
                  <span className="font-mono-code text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {entity.imei}
                  </span>
                </div>
              )}
            </div>

            {/* Address & Known Locations */}
            {entity.address && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                <div className="text-[11px] font-mono-code font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" /> Registered Domicile & Coordinates
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {entity.address}
                </p>
                {entity.known_locations && (
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold">Active Hubs:</span>
                    {entity.known_locations.map((loc, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                        {loc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vehicle Details Card */}
            {entity.model && (
              <div className="p-3.5 rounded-xl border border-pink-200 bg-pink-50/50 space-y-2">
                <div className="flex items-center justify-between text-pink-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-pink-600" /> Vehicle Record
                  </span>
                  <span className="font-mono-code text-xs text-pink-700">{entity.rto}</span>
                </div>
                <div className="text-slate-700 font-medium">{entity.model}</div>
                <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded border border-pink-200/60">
                  <strong>Notes:</strong> {entity.notes}
                </div>
              </div>
            )}

            {/* Weapon Details Card */}
            {entity.serial_number && (
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2">
                <div className="flex items-center justify-between text-purple-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Crosshair className="w-4 h-4 text-purple-600" /> Arms Seizure Record
                  </span>
                  <span className="font-mono-code text-xs text-purple-700">{entity.serial_number}</span>
                </div>
                <div className="text-slate-800 font-semibold">{entity.type}</div>
                <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded border border-purple-200/60">
                  <strong>Ballistics FSL Report:</strong> {entity.ballistics_report}
                </div>
              </div>
            )}

            {/* Victim Incident Narrative */}
            {entity.incident_narrative && (
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="text-amber-900 font-bold flex items-center justify-between">
                  <span>Victim Statement & Loss</span>
                  <span className="font-mono-code text-red-700 font-bold">{entity.loss_amount}</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{entity.incident_narrative}</p>
              </div>
            )}

            {/* Witness Statement */}
            {entity.statement && (
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                <div className="text-blue-900 font-bold flex items-center justify-between">
                  <span>Deposition & Statement</span>
                  <span className="text-slate-500 font-mono-code text-[10px]">{entity.designation}</span>
                </div>
                <p className="text-slate-700 leading-relaxed italic">"{entity.statement}"</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-[11px] font-mono-code font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Illicit Fund Flow Tracking
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Cumulative Sent</span>
                  <span className="text-xs font-mono-code font-bold text-red-600">
                    {entity.financials?.list?.filter(t => t.from_entity === entity.id).map(t => t.amount).join(', ') || 'None Recorded'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase block">Cumulative Received</span>
                  <span className="text-xs font-mono-code font-bold text-emerald-700">
                    {entity.financials?.list?.filter(t => t.to_entity === entity.id).map(t => t.amount).join(', ') || 'None Recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Ledger Slips */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">Associated Transactions</div>
              {entity.financials?.list && entity.financials.list.length > 0 ? (
                entity.financials.list.map((txn) => {
                  const isOutflow = txn.from_entity === entity.id;
                  return (
                    <div key={txn.id} className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono-code font-bold text-xs flex items-center gap-1 ${isOutflow ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isOutflow ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                          {txn.amount}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono-code">
                          {txn.timestamp}
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px] font-medium">
                        Channel: <strong>{txn.channel}</strong>
                      </div>
                      <div className="text-[10px] font-mono-code text-slate-500 truncate bg-slate-50 p-1 rounded">
                        Ref: {txn.reference}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-slate-400 font-medium">
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
              <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-1.5">
                <div className="text-[11px] font-mono-code font-bold text-purple-900 uppercase">
                  Seized Contraband & Proceeds of Crime
                </div>
                <p className="text-slate-800 font-medium leading-relaxed">
                  {entity.seized_assets}
                </p>
              </div>
            )}

            {/* Criminal Record Dossier */}
            {entity.criminal_history && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                <div className="text-[11px] font-mono-code font-bold text-slate-600 uppercase flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-teal-600" /> CCTNS Prior Convictions & FIR History
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {entity.criminal_history}
                </p>
              </div>
            )}

            {/* Seizure Memo Status */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-[11px] font-mono-code font-bold text-slate-500 uppercase">
                Chain of Custody & Evidence Memo
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div>• Evidence Tag: <strong className="font-mono-code text-slate-800">CCTNS-EVD-{entity.id}-2024</strong></div>
                <div>• FSL Dispatch: <strong className="text-emerald-700">Verified & Sealed</strong></div>
                <div>• Section: <strong className="text-slate-800">Sec 102 CrPC / Sec 105 BNSS</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Action Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs">
        <button
          onClick={() => alert(`Look Out Circular (LOC) alert generated for ${entity.name || entity.id}. Transmitted to Bureau of Immigration.`)}
          className="flex-1 py-2 px-3 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Issue LOC</span>
        </button>

        <button
          onClick={() => alert(`Wiretap and CDR request for ${entity.name || entity.id} dispatched to DoT Nodal Unit.`)}
          className="flex-1 py-2 px-3 rounded-lg bg-teal-700 text-white hover:bg-teal-800 font-semibold transition-colors shadow-2xs flex items-center justify-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Tap Request</span>
        </button>

        <button
          onClick={() => handleCopy(JSON.stringify(entity, null, 2), 'export')}
          className="py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition-colors shadow-2xs"
          title="Copy Entity JSON"
        >
          {copiedField === 'export' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
