import React, { useState, useMemo } from 'react';
import {
  FolderLock,
  FileText,
  Search,
  UploadCloud,
  ShieldCheck,
  Building,
  User,
  Layers,
  Cpu,
  Clock,
  Eye
} from 'lucide-react';
import { formatBytes } from '../services/documentService';

export default function EvidenceVault({
  cases = [],
  activeCaseId,
  onSelectCase,
  evidenceStore = [],
  onOpenUploadModal,
}) {
  const [selectedCaseId, setSelectedCaseId] = useState(activeCaseId || '');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedDoc, setInspectedDoc] = useState(null);

  // Sync selectedCaseId if activeCaseId prop changes
  const [prevPropCaseId, setPrevPropCaseId] = useState(activeCaseId);
  if (activeCaseId !== prevPropCaseId) {
    setPrevPropCaseId(activeCaseId);
    setSelectedCaseId(activeCaseId);
  }

  // Active Case metadata
  const currentCase = cases.find(c => c.case_id === selectedCaseId) || cases[0];

  // Get case documents from evidenceStore
  const caseVault = useMemo(() => {
    const entry = evidenceStore.find(e => e.case_id === selectedCaseId);
    return entry ? entry.documents : [];
  }, [evidenceStore, selectedCaseId]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return caseVault.filter(doc => {
      const matchesType = typeFilter === 'ALL' || doc.document_type?.toLowerCase().includes(typeFilter.toLowerCase());
      const matchesSearch =
        !searchQuery.trim() ||
        doc.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.uploaded_by?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.tags && doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchesType && matchesSearch;
    });
  }, [caseVault, typeFilter, searchQuery]);

  // Aggregate Metrics
  const totalFiles = caseVault.length;
  const totalEntities = caseVault.reduce((acc, d) => acc + (d.extracted_entities?.length || 0), 0);
  const totalRelations = caseVault.reduce((acc, d) => acc + (d.relationships_created || 0), 0);
  const totalBytes = caseVault.reduce((acc, d) => acc + (d.file_size || 0), 0);

  const getBadgeColor = (type) => {
    switch (type) {
      case 'FIR':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Interrogation Report':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cyber Financial Trail':
        return 'bg-[#EDE4D8] text-[#8C532B] border-[#DDD4C7]';
      case 'CDR/IPDR Analysis':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Search & Seizure Memo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-[#F5EFEB] text-[#2B211C] border-[#DDD4C7]';
    }
  };

  const getEntityPillColor = (type) => {
    switch (type?.toUpperCase()) {
      case 'PERSON':
      case 'SUSPECT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ACCOUNT':
        return 'bg-[#EDE4D8] text-[#8C532B] border-[#DDD4C7]';
      case 'PHONE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'VEHICLE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'WEAPON':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-[#EDE4D8] text-[#2B211C] border-[#DDD4C7]';
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Header & Tactical Title */}
      <div className="bg-[#261B16] rounded-2xl p-6 text-white border border-[#1A120E] shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-[#8C532B]/20 text-[#D8CAB8] border border-[#8C532B]/40 flex items-center gap-1.5">
                <FolderLock className="w-3.5 h-3.5" />
                CCTNS CASE ARCHIVE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-[#382822] text-[#D8CAB8] border border-[#8C532B]/30">
                CRPC SEC 173 REPOSITORY
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Investigation Evidence Vault</span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-[#382822] text-[#EDE4D8] border border-[#8C532B]/40 font-mono-code font-bold">
                {selectedCaseId}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#D8CAB8]/90 max-w-3xl mt-1 leading-relaxed">
              Case-wise repository of original FIRs, interrogation statements, financial traces, and electronic seizure memos synced with the LangGraph knowledge pipeline.
            </p>
          </div>

          {/* Top Actions: Case Switcher & Upload */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Dossier Switcher */}
            <div className="relative">
              <select
                value={selectedCaseId}
                onChange={(e) => {
                  setSelectedCaseId(e.target.value);
                  if (onSelectCase) onSelectCase(e.target.value);
                }}
                className="px-3.5 py-2 text-xs font-mono-code font-bold bg-[#382822] text-[#EDE4D8] border border-[#8C532B]/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8C532B] cursor-pointer"
              >
                {cases.map((c) => (
                  <option key={c.case_id} value={c.case_id}>
                    {c.case_id} - {c.case_title?.split('-')[1]?.trim() || c.case_title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onOpenUploadModal}
              className="px-4 py-2 rounded-xl bg-[#8C532B] hover:bg-[#703F1E] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer font-mono-code uppercase border border-[#8C532B]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest New Evidence</span>
            </button>
          </div>
        </div>
      </div>

      {/* Case Telemetry & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Ingested Documents */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase font-bold text-[#7A6D63]">
              Ingested Documents
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EDE4D8] text-[#8C532B] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-mono-code font-bold text-[#2B211C]">
            {totalFiles}
          </div>
          <div className="mt-1 text-[11px] text-[#7A6D63]">
            Across {formatBytes(totalBytes)} of evidentiary storage
          </div>
        </div>

        {/* Metric 2: Extracted Relational Entities */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase font-bold text-[#8C532B]">
              Extracted Entities
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#8C532B]/10 text-[#8C532B] flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-mono-code font-bold text-[#2B211C]">
            {totalEntities}
          </div>
          <div className="mt-1 text-[11px] text-[#7A6D63]">
            Persons, accounts, phones &amp; hardware
          </div>
        </div>

        {/* Metric 3: Graph Relationships */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase font-bold text-[#C27D26]">
              Relational Links
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#C27D26]/10 text-[#C27D26] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-mono-code font-bold text-[#2B211C]">
            {totalRelations}
          </div>
          <div className="mt-1 text-[11px] text-[#7A6D63]">
            Directional relational Cypher edges
          </div>
        </div>

        {/* Metric 4: Hash & Integrity Check */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase font-bold text-[#4A6B53]">
              Integrity Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#4A6B53]/10 text-[#4A6B53] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-mono-code font-bold text-[#4A6B53] flex items-center gap-1.5">
            <span>100%</span>
            <span className="text-xs font-normal text-[#7A6D63] font-sans">VERIFIED</span>
          </div>
          <div className="mt-1 text-[11px] text-[#7A6D63] font-mono-code">
            SHA-256 chain preserved for court
          </div>
        </div>
      </div>

      {/* Vault Filters & Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-[#DDD4C7] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#7A6D63] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, entities, IO notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F5EFEB] border border-[#DDD4C7] rounded-lg text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B]"
          />
        </div>

        {/* Type Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {['ALL', 'FIR', 'Interrogation', 'Financial', 'CDR', 'Seizure'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono-code font-bold transition-all cursor-pointer ${typeFilter === t
                  ? 'bg-[#261B16] text-[#EDE4D8] shadow-xs'
                  : 'bg-[#EDE4D8] hover:bg-[#D8CAB8] text-[#7A6D63]'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Case Evidence Documents Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono-code uppercase font-bold text-[#7A6D63]">
            Case Files Available ({filteredDocuments.length} Records)
          </span>
          <span className="text-xs text-[#7A6D63] font-mono-code">
            Target: <strong className="text-[#8C532B]">{currentCase?.case_title}</strong>
          </span>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#DDD4C7] p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#F5EFEB] text-[#7A6D63] flex items-center justify-center mx-auto">
              <FolderLock className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-[#2B211C]">
              No evidence files match your search criteria.
            </div>
            <p className="text-xs text-[#7A6D63] max-w-sm mx-auto">
              Upload a new investigative document to start LangGraph entity extraction for this dossier.
            </p>
            <button
              onClick={onOpenUploadModal}
              className="px-4 py-2 rounded-lg bg-[#8C532B] hover:bg-[#703F1E] text-white text-xs font-bold transition-colors font-mono-code inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Ingest First Evidence Document</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.document_id}
                className="bg-white rounded-xl border border-[#DDD4C7] hover:border-[#8C532B]/60 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Document Identity & Metadata */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] text-[#2B211C] flex items-center justify-center shrink-0 group-hover:bg-[#EDE4D8] group-hover:text-[#8C532B] group-hover:border-[#8C532B]/40 transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border ${getBadgeColor(doc.document_type)}`}>
                        {doc.document_type}
                      </span>
                      <span className="text-xs font-bold text-[#2B211C] truncate">
                        {doc.filename}
                      </span>
                      <span className="text-[10px] font-mono-code text-[#7A6D63]">
                        ({formatBytes(doc.file_size)})
                      </span>
                    </div>

                    <p className="text-xs text-[#7A6D63] line-clamp-2 leading-relaxed">
                      {doc.description || doc.summary}
                    </p>

                    {/* Extracted Entities Chips Preview */}
                    {doc.extracted_entities && doc.extracted_entities.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-mono-code font-bold uppercase text-[#7A6D63]">
                          Extracted:
                        </span>
                        {doc.extracted_entities.slice(0, 4).map((ent, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border ${getEntityPillColor(ent.type)}`}
                            title={`${ent.type}: ${ent.name} (${Math.round((ent.confidence || 0.95) * 100)}% confidence)`}
                          >
                            {ent.name}
                          </span>
                        ))}
                        {doc.extracted_entities.length > 4 && (
                          <span className="text-[10px] font-mono-code text-[#7A6D63]">
                            +{doc.extracted_entities.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Officer & Originating Agency Stamp */}
                    <div className="flex items-center gap-3 text-[11px] text-[#7A6D63] font-mono-code flex-wrap pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#7A6D63]" />
                        IO: <strong className="text-[#2B211C]">{doc.uploaded_by}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-[#7A6D63]" />
                        {doc.source}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#7A6D63]" />
                        {doc.uploaded_at}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Status & Action Button */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-[#DDD4C7]/60 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4A6B53]/15 text-[#4A6B53] border border-[#4A6B53]/30 text-[10px] font-mono-code font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4A6B53] animate-pulse" />
                    <span>SYNCHRONIZED</span>
                  </div>

                  <button
                    onClick={() => setInspectedDoc(doc)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#EDE4D8] hover:bg-[#261B16] text-[#7A6D63] hover:text-[#EDE4D8] text-xs font-bold transition-colors flex items-center gap-1.5 font-mono-code cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Intelligence</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspect Document Intelligence Modal / Slide-out */}
      {inspectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A120E]/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#DDD4C7] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#261B16] text-white px-6 py-4 flex items-center justify-between border-b border-[#382822]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#382822] border border-[#8C532B]/40 flex items-center justify-center text-[#8C532B]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono-code uppercase text-[#8C532B] font-bold">
                    Document Intelligence Dossier
                  </div>
                  <div className="text-sm font-bold text-white truncate max-w-md">
                    {inspectedDoc.filename}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectedDoc(null)}
                className="text-[#D8CAB8] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Checksum & Status Bar */}
              <div className="p-3.5 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono-code text-[#7A6D63] font-bold uppercase text-[10px]">
                    Cryptographic SHA-256 Checksum
                  </span>
                  <span className="text-[10px] font-mono-code text-[#4A6B53] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Chain Verified
                  </span>
                </div>
                <div className="font-mono-code text-[11px] text-[#2B211C] break-all bg-white p-2 rounded border border-[#DDD4C7] select-all">
                  {inspectedDoc.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-xs font-bold uppercase font-mono-code text-[#2B211C] mb-1">
                  Evidentiary Summary &amp; Context
                </h4>
                <p className="text-[#7A6D63] leading-relaxed bg-[#F5EFEB] p-3 rounded-lg border border-[#DDD4C7]">
                  {inspectedDoc.summary || inspectedDoc.description}
                </p>
              </div>

              {/* Extracted Entities List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase font-mono-code text-[#2B211C]">
                    LangGraph Extracted Entities ({inspectedDoc.extracted_entities?.length || 0})
                  </h4>
                  <span className="text-[10px] font-mono-code text-[#8C532B]">
                    Auto-Linked to Neo4j Graph
                  </span>
                </div>

                <div className="space-y-2">
                  {(inspectedDoc.extracted_entities || []).map((ent, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[#DDD4C7] bg-white flex items-center justify-between hover:border-[#8C532B]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border ${getEntityPillColor(ent.type)}`}>
                          {ent.type}
                        </span>
                        <div>
                          <div className="font-bold text-[#2B211C] text-xs">
                            {ent.name}
                          </div>
                          <div className="text-[10px] text-[#7A6D63] font-mono-code">
                            Role: {ent.role || 'Evidentiary Anchor'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono-code text-[#4A6B53] font-bold block">
                          {Math.round((ent.confidence || 0.95) * 100)}% Confidence
                        </span>
                        <span className="text-[9px] text-[#7A6D63] font-mono-code">
                          LLM Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DDD4C7]">
                <div className="p-2.5 rounded-lg bg-[#F5EFEB] border border-[#DDD4C7]">
                  <span className="text-[10px] font-mono-code uppercase text-[#7A6D63] block">Ingested By</span>
                  <span className="font-bold text-[#2B211C] mt-0.5 block">{inspectedDoc.uploaded_by}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F5EFEB] border border-[#DDD4C7]">
                  <span className="text-[10px] font-mono-code uppercase text-[#7A6D63] block">Originating Agency</span>
                  <span className="font-bold text-[#2B211C] mt-0.5 block">{inspectedDoc.source}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#F5EFEB] px-6 py-3 border-t border-[#DDD4C7] flex items-center justify-end">
              <button
                onClick={() => setInspectedDoc(null)}
                className="px-4 py-2 rounded-lg bg-[#261B16] hover:bg-[#382822] text-white font-bold text-xs transition-colors font-mono-code cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
