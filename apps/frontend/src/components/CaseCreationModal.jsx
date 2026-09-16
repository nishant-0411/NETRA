import React, { useState } from 'react';
import { AlertCircle, FolderPlus, Loader2, Shield, X } from 'lucide-react';
import { createCase } from '../services/caseService';

const initialForm = {
  case_id: '',
  case_title: '',
  fir_number: '',
  police_station: '',
  crime_type: '',
  threat_level: 'MEDIUM',
  ipc_sections: '',
  master_plot: '',
};

export default function CaseCreationModal({ isOpen, onClose, onCaseCreated }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setCreating(true);
    try {
      const caseData = await createCase({
        ...form,
        case_id: form.case_id.trim() || undefined,
        ipc_sections: form.ipc_sections.split(',').map((section) => section.trim()).filter(Boolean),
      });
      setForm(initialForm);
      onCaseCreated?.(caseData);
      onClose();
    } catch (err) {
      setError(err.message || 'Unable to create the case dossier.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1A120E] bg-[#261B16] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#8C532B]/40 bg-[#382822] text-[#8C532B]"><FolderPlus className="h-5 w-5" /></div>
            <div>
              <h2 className="font-mono-code text-sm font-bold uppercase tracking-wider text-[#EDE4D8]">Open Investigation Dossier</h2>
              <p className="mt-0.5 text-xs text-[#A89F91]">You will be recorded as this case’s initial lead investigator.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-[#A89F91] hover:bg-[#382822] hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 p-6">
          {error && <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Case reference (optional)" value={form.case_id} onChange={update('case_id')} placeholder="CASE-2026-001" />
            <Field label="FIR number *" required value={form.fir_number} onChange={update('fir_number')} placeholder="FIR-2026/001" />
          </div>
          <Field label="Case title *" required value={form.case_title} onChange={update('case_title')} placeholder="Operation / investigation title" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Police station *" required value={form.police_station} onChange={update('police_station')} placeholder="Station or unit" />
            <Field label="Crime type *" required value={form.crime_type} onChange={update('crime_type')} placeholder="e.g. Cyber fraud" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Applicable sections" value={form.ipc_sections} onChange={update('ipc_sections')} placeholder="IPC 420, IT Act 66D" />
            <label className="block text-xs font-bold uppercase text-[#2B211C]">Threat level
              <select value={form.threat_level} onChange={update('threat_level')} className="mt-1 w-full rounded-lg border border-[#DDD4C7] bg-[#F5EFEB]/40 px-3 py-2 text-xs text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B]">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => <option key={level}>{level}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs font-bold uppercase text-[#2B211C]">Initial case summary
            <textarea value={form.master_plot} onChange={update('master_plot')} rows={3} placeholder="Brief facts known at registration..." className="mt-1 w-full resize-none rounded-lg border border-[#DDD4C7] bg-[#F5EFEB]/40 px-3 py-2 text-xs text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B]" />
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-[#DDD4C7] px-6 py-4">
          <span className="flex items-center gap-1.5 text-[11px] text-[#7A6D63]"><Shield className="h-3.5 w-3.5" />Creates the case and lead-access record together.</span>
          <button disabled={creating} className="flex items-center gap-1.5 rounded-lg bg-[#8C532B] px-4 py-2 text-xs font-bold text-white hover:bg-[#703F1E] disabled:opacity-60 cursor-pointer">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />} Open Case
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, ...props }) {
  return <label className="block text-xs font-bold uppercase text-[#2B211C]">{label}<input required={required} {...props} className="mt-1 w-full rounded-lg border border-[#DDD4C7] bg-[#F5EFEB]/40 px-3 py-2 text-xs text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B]" /></label>;
}
