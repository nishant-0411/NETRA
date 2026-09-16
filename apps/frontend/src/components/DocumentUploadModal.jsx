import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Tag,
  ArrowRight,
  Database,
  Cpu
} from 'lucide-react';
import {
  uploadDocuments,
  validateDocument,
  formatBytes,
  DOCUMENT_TYPES,
  EVIDENCE_SOURCES
} from '../services/documentService';

export default function DocumentUploadModal({
  isOpen,
  onClose,
  activeCaseId,
  cases = [],
  currentUser,
  onUploadSuccess,
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [targetCaseId, setTargetCaseId] = useState(activeCaseId || '');
  const [documentType, setDocumentType] = useState('FIR');
  const [source, setSource] = useState('CCTNS Portal');
  const [uploadedBy, setUploadedBy] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('organized_crime, active_investigation');

  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0); // 0: idle, 1: upload, 2: etl extraction, 3: graph sync, 4: complete
  const [errorMessage, setErrorMessage] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeCaseId) setTargetCaseId(activeCaseId);
  }, [activeCaseId]);

  useEffect(() => {
    if (currentUser) {
      setUploadedBy([currentUser.rank, currentUser.username].filter(Boolean).join(' '));
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      handleFileSelection(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files?.length) {
      handleFileSelection(e.target.files);
    }
    // Allows the same file to be re-selected after it has been removed.
    e.target.value = '';
  };

  const handleFileSelection = (files) => {
    setErrorMessage(null);
    const candidates = Array.from(files || []);
    const invalid = candidates
      .map((file) => ({ file, validation: validateDocument(file) }))
      .filter(({ validation }) => !validation.valid);
    if (invalid.length) {
      setErrorMessage(invalid.map(({ file, validation }) => `${file.name}: ${validation.error}`).join(' '));
      return;
    }
    setSelectedFiles((current) => {
      const byFingerprint = new Map(current.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
      candidates.forEach((file) => byFingerprint.set(`${file.name}-${file.size}-${file.lastModified}`, file));
      return Array.from(byFingerprint.values());
    });
  };

  const handleResetForm = () => {
    setSelectedFiles([]);
    setErrorMessage(null);
    setUploadResult(null);
    setIsProcessing(false);
    setProcessingStep(0);
    setDescription('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) {
      setErrorMessage('Please select one or more evidence files to ingest.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep(1); // 1. Transmitting payload

    // Visual step progression simulator for high-fidelity intelligence feedback
    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 600);

    try {
      const result = await uploadDocuments({
        files: selectedFiles,
        caseId: targetCaseId,
        documentType,
        description,
        uploadedBy,
        tags: tagsInput,
        source,
      });

      clearInterval(stepInterval);
      setProcessingStep(4); // Completed
      setUploadResult(result);

      if (onUploadSuccess) onUploadSuccess(result.documents || []);
    } catch (err) {
      clearInterval(stepInterval);
      setIsProcessing(false);
      setProcessingStep(0);
      setErrorMessage(err.message || 'Evidence ingestion failed. Please verify server connection.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header: Tactical Espresso Theme */}
        <div className="bg-[#261B16] text-white px-6 py-4 flex items-center justify-between border-b border-[#1A120E] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#382822] border border-[#8C532B]/40 flex items-center justify-center text-[#8C532B]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-[#EDE4D8] uppercase font-mono-code">
                  Ingest Evidence & Investigative Dossier
                </h3>
                <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded bg-[#382822] text-[#D8CAB8] border border-[#382822]">
                  ETL PIPELINE v2.4
                </span>
              </div>
              <p className="text-xs text-[#A89F91]">
                Automated LangGraph NLP extraction & Neo4j Knowledge Graph synchronization
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleResetForm();
              onClose();
            }}
            className="text-[#A89F91] hover:text-white p-1 rounded-lg hover:bg-[#382822] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {uploadResult ? (
            /* Success State: Intelligence Extraction Report */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-900">
                    Document Ingestion & Knowledge Graph Synchronization Completed
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                    {uploadResult.successful || 0} of {uploadResult.total_files || 0} selected files were processed and linked to this dossier.
                  </p>
                  {uploadResult.is_simulated && (
                    <div className="mt-2 text-[11px] font-mono-code text-emerald-800 bg-emerald-100/70 px-2 py-1 rounded inline-block">
                      Note: Ran in High-Fidelity Simulation Mode (Backend is currently running locally or offline).
                    </div>
                  )}
                </div>
              </div>

              {/* Batch Extraction Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-[#F5EFEB]/60 border border-[#DDD4C7] text-center">
                  <span className="text-[10px] uppercase font-mono-code text-[#7A6D63] block">
                    Files Processed
                  </span>
                  <span className="text-lg font-mono-code font-bold text-[#2B211C] block mt-0.5">
                    {uploadResult.successful || 0}/{uploadResult.total_files || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#EDE4D8] border border-[#DDD4C7] text-center">
                  <span className="text-[10px] uppercase font-mono-code text-[#8C532B] block">
                    Entities Extracted
                  </span>
                  <span className="text-lg font-mono-code font-bold text-[#2B211C] block mt-0.5">
                    {(uploadResult.documents || []).reduce((total, document) => total + (document.processed_data?.summary?.total_entities_extracted || document.processed_data?.entities_extracted || 0), 0)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F5EFEB] border border-[#DDD4C7] text-center">
                  <span className="text-[10px] uppercase font-mono-code text-[#7A6D63] block">
                    Graph Links Created
                  </span>
                  <span className="text-lg font-mono-code font-bold text-[#2B211C] block mt-0.5">
                    {(uploadResult.documents || []).reduce((total, document) => total + (document.processed_data?.summary?.entities_matched_in_database || document.processed_data?.relationships_created || 0), 0)}
                  </span>
                </div>
              </div>

              {/* Summary details */}
              <div className="p-4 rounded-xl bg-[#F5EFEB]/50 border border-[#DDD4C7] space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#DDD4C7]/60 pb-1.5">
                  <span className="text-[#7A6D63] font-medium">Target Dossier:</span>
                  <span className="font-mono-code font-bold text-[#2B211C]">{uploadResult.case_id}</span>
                </div>
                <div className="flex justify-between border-b border-[#DDD4C7]/60 pb-1.5">
                  <span className="text-[#7A6D63] font-medium">Uploaded files:</span>
                  <span className="font-mono-code text-[#2B211C]">{(uploadResult.documents || []).map((document) => document.filename).join(', ')}</span>
                </div>
                <div className="flex justify-between border-b border-[#DDD4C7]/60 pb-1.5">
                  <span className="text-[#7A6D63] font-medium">Classification:</span>
                  <span className="text-[#2B211C] font-semibold">{documentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7A6D63] font-medium">Ingested By:</span>
                  <span className="text-[#2B211C]">{uploadedBy || 'Authenticated investigator'}</span>
                </div>
              </div>

              {uploadResult.errors?.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Some files could not be processed: {uploadResult.errors.map((item) => `${item.filename}: ${item.error}`).join(' · ')}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 text-xs font-semibold text-[#2B211C] bg-[#EDE4D8] hover:bg-[#D8CAB8] rounded-lg transition-colors cursor-pointer"
                >
                  Ingest Another File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleResetForm();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#8C532B] hover:bg-[#703F1E] rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>View Updated Dossier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : isProcessing ? (
            /* Ingestion in Progress HUD */
            <div className="py-8 px-4 text-center space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-[#EDE4D8] border-t-[#8C532B] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-[#8C532B] animate-pulse" />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#2B211C] uppercase font-mono-code tracking-wide">
                  Processing Evidence via LangGraph Pipeline
                </h4>
                <p className="text-xs text-[#7A6D63] mt-1 max-w-sm mx-auto">
                  Executing document ingestion, neural entity extraction, and linking to the CCTNS crime repository...
                </p>
              </div>

              {/* Progress Milestones */}
              <div className="max-w-md mx-auto space-y-2.5 text-left">
                <div className={`p-2.5 rounded-lg border flex items-center gap-3 transition-colors ${
                  processingStep >= 1 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-[#F5EFEB]/50 border-[#DDD4C7] text-[#7A6D63]'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${processingStep >= 1 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-xs font-mono-code flex-1">1. Fast Multipart Stream & Validation</span>
                  {processingStep > 1 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center gap-3 transition-colors ${
                  processingStep >= 2 ? 'bg-[#EDE4D8] border-[#DDD4C7] text-[#8C532B]' : 'bg-[#F5EFEB]/50 border-[#DDD4C7] text-[#7A6D63]'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${processingStep >= 2 ? 'bg-[#8C532B] animate-ping' : 'bg-slate-300'}`} />
                  <span className="text-xs font-mono-code flex-1">2. LangGraph NLP Entity & Relation Extraction</span>
                  {processingStep > 2 ? <CheckCircle2 className="w-4 h-4 text-[#8C532B]" /> : processingStep === 2 && <Loader2 className="w-4 h-4 animate-spin text-[#8C532B]" />}
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center gap-3 transition-colors ${
                  processingStep >= 3 ? 'bg-[#F5EFEB] border-[#DDD4C7] text-[#2B211C]' : 'bg-[#F5EFEB]/50 border-[#DDD4C7] text-[#7A6D63]'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${processingStep >= 3 ? 'bg-[#C27D26]' : 'bg-slate-300'}`} />
                  <span className="text-xs font-mono-code flex-1">3. Neo4j Knowledge Graph Edge Synthesis</span>
                  {processingStep > 3 ? <CheckCircle2 className="w-4 h-4 text-[#C27D26]" /> : processingStep === 3 && <Loader2 className="w-4 h-4 animate-spin text-[#C27D26]" />}
                </div>
              </div>
            </div>
          ) : (
            /* Upload Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                  <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Target Case Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase font-mono-code mb-1">
                    Target Investigation Dossier *
                  </label>
                  <select
                    value={targetCaseId}
                    onChange={(e) => setTargetCaseId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono-code font-bold bg-[#F5EFEB]/40 border border-[#DDD4C7] rounded-lg text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B]"
                  >
                    {cases.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_id} - {c.case_title?.split('-')[1]?.trim() || c.case_title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B211C] uppercase font-mono-code mb-1">
                    Document Classification *
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5EFEB]/40 border border-[#DDD4C7] rounded-lg text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B]"
                  >
                    {DOCUMENT_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-[#2B211C] uppercase font-mono-code mb-1">
                  Evidence File Attachments (Max 10 MB each) *
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.jpeg,.jpg,.png,.webp,application/pdf,text/plain,image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {selectedFiles.length ? (
                  <div className="p-3.5 rounded-xl border border-[#DDD4C7] bg-[#EDE4D8]/40 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#EDE4D8] flex items-center justify-center text-[#8C532B] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#2B211C] truncate">
                          {selectedFiles.length} evidence file{selectedFiles.length === 1 ? '' : 's'} selected
                        </div>
                        <div className="text-[11px] font-mono-code text-[#7A6D63]">
                          {formatBytes(selectedFiles.reduce((total, file) => total + file.size, 0))} total
                        </div>
                      </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-[#7A6D63] hover:text-rose-600 p-1.5 rounded-lg hover:bg-[#D8CAB8] transition-colors cursor-pointer"
                        title="Remove all files"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-24 overflow-y-auto divide-y divide-[#DDD4C7] rounded border border-[#DDD4C7] bg-white/80 px-2">
                      {selectedFiles.map((file) => (
                        <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-2 py-1.5 text-[11px]">
                          <span className="truncate text-[#2B211C]">{file.name}</span>
                          <span className="shrink-0 font-mono-code text-[#7A6D63]">{formatBytes(file.size)}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-lg border border-dashed border-[#8C532B]/60 bg-white px-3 py-2 text-xs font-bold text-[#8C532B] transition-colors hover:bg-[#EDE4D8] cursor-pointer"
                    >
                      + Add More Files
                    </button>
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`rounded-lg border border-dashed px-3 py-2 text-center text-[11px] text-[#7A6D63] transition-colors ${
                        dragActive ? 'border-[#8C532B] bg-[#EDE4D8]' : 'border-[#DDD4C7] bg-white/60'
                      }`}
                    >
                      Or drag additional files here
                    </div>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      dragActive
                        ? 'border-[#8C532B] bg-[#EDE4D8]'
                        : 'border-[#DDD4C7] hover:border-[#8C532B] bg-[#F5EFEB]/50 hover:bg-[#EDE4D8]/50'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8 text-[#8C532B] mx-auto mb-2" />
                    <div className="text-xs font-bold text-[#2B211C]">
                      Click to browse or drag and drop one or more investigation documents
                    </div>
                    <div className="text-[11px] text-[#7A6D63] mt-1">
                      Supported formats: PDF, TXT, JPEG, PNG, WEBP (Strict 10MB Limit)
                    </div>
                  </div>
                )}
              </div>

              {/* Source Agency & Officer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#2B211C] uppercase font-mono-code mb-1">
                    Originating Agency
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F5EFEB]/40 border border-[#DDD4C7] rounded-lg text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B]"
                  >
                    {EVIDENCE_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B211C] uppercase font-mono-code mb-1">
                    Investigating Officer (IO)
                  </label>
                  <input
                    type="text"
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    placeholder="Authenticated investigator"
                    className="w-full px-3 py-2 text-xs bg-[#F5EFEB]/40 border border-[#DDD4C7] rounded-lg text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B]"
                  />
                </div>
              </div>

              {/* Classification Tags */}
              <div>
                <label className="block text-xs font-bold text-[#2B211C] uppercase font-mono-code mb-1">
                  Tactical Classification Tags (Comma Separated)
                </label>
                <div className="relative">
                  <Tag className="w-3.5 h-3.5 text-[#7A6D63] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. narcotics, hawala, interstate, priority_target"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#F5EFEB]/40 border border-[#DDD4C7] rounded-lg text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B] font-mono-code"
                  />
                </div>
              </div>

              {/* Remarks / Context Notes */}
              <div>
                <label className="block text-xs font-bold text-[#2B211C] uppercase font-mono-code mb-1">
                  Investigative Remarks / Context Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context regarding how this evidence was acquired, seized, or received..."
                  className="w-full px-3 py-2 text-xs bg-[#F5EFEB]/40 border border-[#DDD4C7] rounded-lg text-[#2B211C] focus:outline-none focus:ring-2 focus:ring-[#8C532B] resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#DDD4C7]">
                <div className="text-[11px] text-[#7A6D63] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#7A6D63]" />
                  <span>Saves to MongoDB-2 & Neo4j Graph</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-[#2B211C] bg-[#EDE4D8] hover:bg-[#D8CAB8] rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedFiles.length}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#8C532B] hover:bg-[#703F1E] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5 font-mono-code uppercase cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Ingest {selectedFiles.length || ''} File{selectedFiles.length === 1 ? '' : 's'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
