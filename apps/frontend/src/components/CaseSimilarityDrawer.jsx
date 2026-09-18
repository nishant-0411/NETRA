import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Search, 
  UploadCloud, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  AlertCircle,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
  Filter
} from 'lucide-react';
import { 
  searchSimilarCases, 
  getSimilarCasesForDossier, 
  uploadAndSearchSimilar 
} from '../services/similarityService';

export default function CaseSimilarityDrawer({ 
  isOpen, 
  onClose, 
  activeCase, 
  onSelectCase 
}) {
  const [activeMode, setActiveMode] = useState('dossier'); // 'dossier' | 'search' | 'upload'
  const [searchQuery, setSearchQuery] = useState('');
  const [minConfidence, setMinConfidence] = useState(0); // 0 | 50 | 70
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Auto-fetch similar cases for activeCase when opened in 'dossier' mode
  useEffect(() => {
    if (!isOpen || !activeCase?.case_id) return;
    if (activeMode === 'dossier') {
      loadDossierSimilarities();
    }
  }, [isOpen, activeCase?.case_id, activeMode]);

  const loadDossierSimilarities = async () => {
    if (!activeCase?.case_id) return;
    setLoading(true);
    setError(null);
    try {
      // Use dossier title / master plot or call case similarity endpoint
      const query = activeCase.master_plot || activeCase.case_title || activeCase.case_id;
      const data = await searchSimilarCases(query, 6, activeCase.case_id);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Unable to compute vector similarity.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchSimilarCases(searchQuery, 6);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to search similar case vectors.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await uploadAndSearchSimilar(file);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Document embedding analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter results by confidence threshold
  const filteredResults = useMemo(() => {
    return results.filter(r => (r.match_percent || 0) >= minConfidence);
  }, [results, minConfidence]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel - Sized for rich multi-paragraph case reports */}
      <div className="relative w-full sm:w-[600px] md:w-[680px] lg:w-[760px] max-w-[95vw] h-full bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300 select-none border-l border-slate-200">
        
        {/* Drawer Header */}
        <div className="p-5 bg-[#261B16] text-white border-b border-[#382822] flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8C532B] flex items-center justify-center text-white shadow-md shadow-[#8C532B]/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  AI Cross-Case Similarity Analyzer
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono-code font-bold bg-[#382822] text-[#EDE4D8] border border-[#8C532B]/40">
                  SIH VECTOR DB
                </span>
              </div>
              <p className="text-[11px] text-[#D8CAB8]/80 font-medium mt-0.5">
                ChromaDB • sentence-transformers/all-mpnet-base-v2 embeddings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A39284] hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Close Similarity Panel"
            aria-label="Close Similarity Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Navigation Tabs */}
        <div className="bg-[#F5EFEB] border-b border-[#DDD4C7] px-5 py-2.5 flex items-center justify-between shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#EDE4D8] p-1 rounded-lg">
            <button
              onClick={() => setActiveMode('dossier')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeMode === 'dossier'
                  ? 'bg-white text-[#2B211C] shadow-xs'
                  : 'text-[#7A6D63] hover:text-[#2B211C]'
              }`}
            >
              Dossier Match ({activeCase?.case_id || 'Current'})
            </button>
            <button
              onClick={() => setActiveMode('search')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeMode === 'search'
                  ? 'bg-white text-[#2B211C] shadow-xs'
                  : 'text-[#7A6D63] hover:text-[#2B211C]'
              }`}
            >
              Modus Operandi Query
            </button>
            <button
              onClick={() => setActiveMode('upload')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeMode === 'upload'
                  ? 'bg-white text-[#2B211C] shadow-xs'
                  : 'text-[#7A6D63] hover:text-[#2B211C]'
              }`}
            >
              File Match
            </button>
          </div>

          {/* Threshold Filter */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-[#7A6D63]">
            <Filter className="w-3.5 h-3.5 text-[#7A6D63]" />
            <span>Min:</span>
            <select
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              className="bg-white border border-[#DDD4C7] rounded px-1.5 py-0.5 text-xs text-[#2B211C] font-semibold focus:outline-none focus:ring-1 focus:ring-[#8C532B]"
            >
              <option value={0}>All Matches</option>
              <option value={50}>&gt;50% Moderate</option>
              <option value={70}>&gt;70% High</option>
            </select>
          </div>
        </div>

        {/* Search & Query Sub-section */}
        <div className="p-4 border-b border-[#DDD4C7] bg-white shrink-0">
          {activeMode === 'dossier' && (
            <div className="flex items-center justify-between gap-3 bg-[#F5EFEB] p-3 rounded-xl border border-[#DDD4C7]">
              <div className="min-w-0">
                <span className="text-[10px] font-mono-code font-bold uppercase text-[#8C532B] block">
                  Active Reference Case
                </span>
                <div className="text-xs font-bold text-[#2B211C] truncate mt-0.5">
                  {activeCase?.case_id} — {activeCase?.case_title}
                </div>
                <div className="text-[11px] text-[#7A6D63] truncate mt-0.5">
                  {activeCase?.master_plot || 'Master criminal pattern analysis'}
                </div>
              </div>

              <button
                onClick={loadDossierSimilarities}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-[#8C532B] hover:bg-[#703F1E] text-white text-xs font-bold shrink-0 transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Rescan Vector DB</span>
              </button>
            </div>
          )}

          {activeMode === 'search' && (
            <form onSubmit={handleRunSearch} className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-[#7A6D63] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter suspect pattern, modus operandi, narcotics, bank cyber trail..."
                  className="w-full pl-9 pr-24 py-2 text-xs rounded-xl border border-[#DDD4C7] focus:outline-none focus:ring-2 focus:ring-[#8C532B] focus:border-transparent bg-[#F5EFEB]/60 font-medium text-[#2B211C]"
                />
                <button
                  type="submit"
                  disabled={loading || !searchQuery.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-[#8C532B] hover:bg-[#703F1E] text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Embedding…' : 'Search'}
                </button>
              </div>

              {/* Quick suggestion chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-[#7A6D63] font-mono-code">Try:</span>
                {[
                  'Narcotics truck checkpoint transport',
                  'Counterfeit currency Hawala racket',
                  'SIM swap online banking cyber fraud',
                  'Luxury car theft chop shop'
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setSearchQuery(chip);
                      searchSimilarCases(chip, 6).then(setResults).catch(() => {});
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5EFEB] hover:bg-[#EDE4D8] text-[#7A6D63] hover:text-[#8C532B] border border-[#DDD4C7] hover:border-[#8C532B]/40 transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </form>
          )}

          {activeMode === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              className={`p-4 border-2 border-dashed rounded-xl text-center transition ${
                dragOver ? 'border-[#8C532B] bg-[#EDE4D8]/40' : 'border-[#DDD4C7] hover:border-[#8C532B]/60 bg-[#F5EFEB]/50'
              }`}
            >
              <UploadCloud className="w-7 h-7 text-[#8C532B] mx-auto mb-1" />
              <div className="text-xs font-bold text-[#2B211C]">
                Drop FIR, Interrogation Memo, or Case Report (.txt)
              </div>
              <p className="text-[11px] text-[#7A6D63] mt-0.5">
                Extracts text embeddings and compares against all past cases in SIH Vector DB
              </p>
              <label className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-[#8C532B] hover:bg-[#703F1E] text-white text-xs font-bold cursor-pointer shadow-2xs">
                <span>Browse File</span>
                <input
                  type="file"
                  accept=".txt,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Results List - Sized for multi-paragraph content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F5EFEB]">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#8C532B] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold text-[#2B211C]">
                Generating Vector Embeddings &amp; Querying Chroma DB…
              </div>
              <p className="text-[11px] text-[#7A6D63] font-mono-code">
                Computing multi-dimensional cosine similarity across all case dossiers
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-xl bg-[#A83A32]/10 border border-[#A83A32]/30 text-[#A83A32] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[#A83A32] shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Error querying similarity:</strong> {error}
              </div>
            </div>
          )}

          {!loading && !error && filteredResults.length === 0 && (
            <div className="py-14 text-center space-y-2">
              <Database className="w-10 h-10 text-[#7A6D63]/40 mx-auto" />
              <div className="text-sm font-bold text-[#2B211C]">No Similar Cases Found</div>
              <p className="text-xs text-[#7A6D63] max-w-sm mx-auto">
                No past case reports exceeded the selected confidence threshold. Try switching to "All Matches" or searching with broader keywords.
              </p>
            </div>
          )}

          {!loading && !error && filteredResults.map((item, index) => {
            const isExpanded = expandedDoc === index;
            const matchScore = item.match_percent || 50;
            const isHigh = matchScore >= 70;
            const isModerate = matchScore >= 50 && matchScore < 70;

            return (
              <div 
                key={index}
                className="bg-white rounded-2xl border border-[#DDD4C7] shadow-xs hover:shadow-md transition-all overflow-hidden"
              >
                {/* Match Card Header */}
                <div className="p-4 bg-[#F5EFEB]/60 border-b border-[#DDD4C7] flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold bg-[#261B16] text-[#EDE4D8] border border-[#8C532B]/40">
                      {item.case_id}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#2B211C] font-mono-code">
                      <FileText className="w-3.5 h-3.5 text-[#8C532B]" />
                      {item.report}
                    </span>
                  </div>

                  {/* Confidence Pill & Meter */}
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-[#DDD4C7] rounded-full h-2 overflow-hidden hidden sm:block">
                      <div 
                        className={`h-full rounded-full ${
                          isHigh ? 'bg-[#4A6B53]' : isModerate ? 'bg-[#8C532B]' : 'bg-[#C27D26]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, matchScore))}%` }}
                      />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono-code border ${
                      isHigh 
                        ? 'bg-[#4A6B53]/10 text-[#4A6B53] border-[#4A6B53]/30' 
                        : isModerate 
                          ? 'bg-[#8C532B]/10 text-[#8C532B] border-[#8C532B]/30' 
                          : 'bg-[#C27D26]/10 text-[#C27D26] border-[#C27D26]/30'
                    }`}>
                      {matchScore}% Match
                    </span>
                  </div>
                </div>

                {/* Match Content Preview */}
                <div className="p-4 space-y-3">
                  <div className="text-xs text-[#2B211C] leading-relaxed font-sans line-clamp-3">
                    {item.content}
                  </div>

                  {/* Expandable Document Text View */}
                  {isExpanded && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#261B16] text-[#D8CAB8] font-mono-code text-[11px] leading-relaxed border border-[#8C532B]/30 max-h-96 overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                      {item.content}
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="pt-2 border-t border-[#DDD4C7] flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedDoc(isExpanded ? null : index)}
                        className="flex items-center gap-1 font-semibold text-[#8C532B] hover:text-[#703F1E] cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Collapse Document</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>Read Full Report Document</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(item.content, index)}
                        className="flex items-center gap-1 text-[#7A6D63] hover:text-[#2B211C] font-medium cursor-pointer"
                        title="Copy document content"
                      >
                        {copiedId === index ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#4A6B53]" />
                            <span className="text-[#4A6B53] font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {onSelectCase && item.case_id !== activeCase?.case_id && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCase(item.case_id);
                          onClose();
                        }}
                        className="flex items-center gap-1 font-bold text-[#8C532B] hover:text-[#703F1E] bg-[#EDE4D8] hover:bg-[#D8CAB8] px-2.5 py-1 rounded-lg border border-[#DDD4C7] transition cursor-pointer"
                      >
                        <span>Cross-Reference {item.case_id}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer Footer Summary */}
        <div className="p-4 bg-[#F5EFEB] border-t border-[#DDD4C7] flex items-center justify-between text-xs text-[#7A6D63] shrink-0 font-mono-code">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#8C532B]" />
            <span>Found {filteredResults.length} matching case documents</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#DDD4C7] hover:bg-[#C9BEB0] text-[#2B211C] font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
