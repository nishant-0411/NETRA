import { useEffect } from 'react';
import { BadgeCheck, Building2, IdCard, LogOut, Mail, MapPin, ShieldCheck, UserRound, X } from 'lucide-react';

const detailRows = [
  { key: 'police_id', label: 'Police ID', icon: IdCard },
  { key: 'email', label: 'Official email', icon: Mail },
  { key: 'department', label: 'Department', icon: Building2 },
  { key: 'state', label: 'State / jurisdiction', icon: MapPin },
];

export default function OfficerDetailsModal({ officer, onClose, onLogout }) {
  useEffect(() => {
    const handleKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!officer) return null;
  const initials = (officer.username || 'IO').split(/\s+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#DDD4C7] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="officer-details-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="relative bg-[#261B16] border-b border-[#1A120E] px-6 pb-7 pt-6 text-white">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-[#A89F91] transition hover:bg-[#382822] hover:text-white" aria-label="Close officer details"><X className="h-5 w-5" /></button>
          <div className="flex items-center gap-4 pr-9">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#382822] border border-[#8C532B]/40 text-[#EDE4D8] text-lg font-bold">{initials}</div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D8CAB8]">Authenticated investigator</p>
              <h2 id="officer-details-title" className="mt-1 text-xl font-bold tracking-tight text-[#EDE4D8]">{officer.rank ? `${officer.rank} ` : ''}{officer.username || 'Investigator'}</h2>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#4A6B53]/20 px-2.5 py-1 text-[11px] font-bold text-[#D8CAB8] ring-1 ring-[#4A6B53]/40"><ShieldCheck className="h-3.5 w-3.5 text-[#4A6B53]" />ACTIVE SESSION</div>
            </div>
          </div>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {detailRows.map(({ key, label, icon: Icon }) => <div key={key} className="rounded-xl border border-[#DDD4C7] bg-[#F5EFEB]/40 p-3.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7A6D63]"><Icon className="h-3.5 w-3.5 text-[#8C532B]" />{label}</div><p className="mt-2 break-words text-sm font-semibold text-[#2B211C]">{officer[key] || 'Not provided'}</p></div>)}
          </div>
          <div className="rounded-xl border border-[#DDD4C7] bg-[#EDE4D8]/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2B211C]">
                <BadgeCheck className="h-4 w-4 text-[#8C532B]" />
                <span>Assigned Dossiers ({officer.case_access_ids?.length || 0})</span>
              </div>
              {officer.role && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase bg-[#8C532B]/15 text-[#8C532B] border border-[#8C532B]/30">
                  {officer.role}
                </span>
              )}
            </div>
            {officer.case_access_ids?.length ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {officer.case_access_ids.map((cid) => (
                  <span key={cid} className="px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold bg-white border border-[#DDD4C7] text-[#8C532B] shadow-2xs">
                    {cid}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-xs leading-relaxed text-[#7A6D63]">
                No investigation dossiers are currently assigned.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-[#DDD4C7] pt-4 text-[11px] text-[#7A6D63]"><UserRound className="h-3.5 w-3.5" />Profile information is loaded from the authenticated backend session.</div>
          <button type="button" onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300 cursor-pointer"><LogOut className="h-4 w-4" />Log out of NETRA</button>
        </div>
      </section>
    </div>
  );
}
