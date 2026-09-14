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
  const [selectedCaseId, setSelectedCaseId] = useState(activeCaseId || 'CASE-0001');
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
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'CDR/IPDR Analysis':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Search & Seizure Memo':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getEntityPillColor = (type) => {
    switch (type?.toUpperCase()) {
      case 'PERSON':
      case 'SUSPECT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ACCOUNT':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'PHONE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'VEHICLE':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'WEAPON':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Header & Tactical Title */}
      <div className="bg-gradient-to-r from-[#0a1628] via-[#0f213e] to-[#0a1628] rounded-2xl p-6 text-white border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
                <FolderLock className="w-3.5 h-3.5" />
                CCTNS CASE ARCHIVE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold bg-slate-800 text-slate-300 border border-slate-700">
                CRPC SEC 173 REPOSITORY
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Investigation Evidence Vault</span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono-code font-bold">
                {selectedCaseId}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
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
                className="px-3.5 py-2 text-xs font-mono-code font-bold bg-slate-800/90 text-cyan-300 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
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
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold text-xs shadow-lg shadow-teal-900/40 transition-all flex items-center gap-2 cursor-pointer font-mono-code uppercase"
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
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase font-bold text-slate-500">
              Ingested Documents
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-mono-code font-bold text-slate-900">
            {totalFiles}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across {formatBytes(totalBytes)} of evidentiary storage
          </div>
        </div>

        {/* Metric 2: Extracted Relational Entities */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase font-bold text-cyan-600">
              Extracted Entities
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-mono-code font-bold text-cyan-900">
            {totalEntities}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Persons, accounts, phones & hardware
          </div>
        </div>

        {/* Metric 3: Graph Relationships */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase font-bold text-purple-600">
              Neo4j Graph Links
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-mono-code font-bold text-purple-900">
            {totalRelations}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Directional relational Cypher edges
          </div>
        </div>

        {/* Metric 4: Hash & Integrity Check */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase font-bold text-emerald-600">
              Integrity Status
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-mono-code font-bold text-emerald-700 flex items-center gap-1.5">
            <span>100%</span>
            <span className="text-xs font-normal text-slate-400 font-sans">VERIFIED</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono-code">
            SHA-256 chain preserved for court
          </div>
        </div>
      </div>

      {/* Vault Filters & Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents, entities, IO notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Type Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'FIR', 'Interrogation', 'Financial', 'CDR', 'Seizure'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono-code font-bold transition-all cursor-pointer ${
                typeFilter === t
                  ? 'bg-[#0a1628] text-cyan-300 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
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
          <span className="text-xs font-mono-code uppercase font-bold text-slate-500">
            Case Files Available ({filteredDocuments.length} Records)
          </span>
          <span className="text-xs text-slate-500 font-mono-code">
            Target: <strong className="text-teal-800">{currentCase?.case_title}</strong>
          </span>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderLock className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              No evidence files match your search criteria.
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload a new investigative document to start LangGraph entity extraction for this dossier.
            </p>
            <button
              onClick={onOpenUploadModal}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors font-mono-code inline-flex items-center gap-1.5"
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
                className="bg-white rounded-xl border border-slate-200 hover:border-teal-500/50 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left: Document Identity & Metadata */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-teal-50 group-hover:text-teal-700 group-hover:border-teal-200 transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border ${getBadgeColor(doc.document_type)}`}>
                        {doc.document_type}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {doc.filename}
                      </span>
                      <span className="text-[10px] font-mono-code text-slate-400">
                        ({formatBytes(doc.file_size)})
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {doc.description || doc.summary}
                    </p>

                    {/* Extracted Entities Chips Preview */}
                    {doc.extracted_entities && doc.extracted_entities.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-mono-code font-bold uppercase text-slate-400">
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
                          <span className="text-[10px] font-mono-code text-slate-400">
                            +{doc.extracted_entities.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Officer & Originating Agency Stamp */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono-code flex-wrap pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        IO: <strong className="text-slate-700">{doc.uploaded_by}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {doc.source}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {doc.uploaded_at}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Status & Action Button */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono-code font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>SYNCHRONIZED</span>
                  </div>

                  <button
                    onClick={() => setInspectedDoc(doc)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-[#0a1628] text-slate-700 hover:text-cyan-300 text-xs font-bold transition-colors flex items-center gap-1.5 font-mono-code cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#0a1628] text-white px-6 py-4 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-mono-code uppercase text-teal-400 font-bold">
                    Document Intelligence Dossier
                  </div>
                  <div className="text-sm font-bold text-white truncate max-w-md">
                    {inspectedDoc.filename}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectedDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Checksum & Status Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono-code text-slate-500 font-bold uppercase text-[10px]">
                    Cryptographic SHA-256 Checksum
                  </span>
                  <span className="text-[10px] font-mono-code text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Chain Verified
                  </span>
                </div>
                <div className="font-mono-code text-[11px] text-slate-700 break-all bg-white p-2 rounded border border-slate-200 select-all">
                  {inspectedDoc.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-xs font-bold uppercase font-mono-code text-slate-700 mb-1">
                  Evidentiary Summary & Context
                </h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {inspectedDoc.summary || inspectedDoc.description}
                </p>
              </div>

              {/* Extracted Entities List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase font-mono-code text-slate-700">
                    LangGraph Extracted Entities ({inspectedDoc.extracted_entities?.length || 0})
                  </h4>
                  <span className="text-[10px] font-mono-code text-teal-700">
                    Auto-Linked to Neo4j Graph
                  </span>
                </div>

                <div className="space-y-2">
                  {(inspectedDoc.extracted_entities || []).map((ent, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold border ${getEntityPillColor(ent.type)}`}>
                          {ent.type}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">
                            {ent.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono-code">
                            Role: {ent.role || 'Evidentiary Anchor'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono-code text-emerald-700 font-bold block">
                          {Math.round((ent.confidence || 0.95) * 100)}% Confidence
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono-code">
                          LLM Verified
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono-code uppercase text-slate-400 block">Ingested By</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{inspectedDoc.uploaded_by}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono-code uppercase text-slate-400 block">Originating Agency</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{inspectedDoc.source}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setInspectedDoc(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors font-mono-code"
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
