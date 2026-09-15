import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import NetworkGraph from './components/NetworkGraph';
import EntityDrawer from './components/EntityDrawer';
import DocumentUploadModal from './components/DocumentUploadModal';
import EvidenceVault from './components/EvidenceVault';
import AIChatbotDrawer from './components/AIChatbotDrawer';
import CaseCreationModal from './components/CaseCreationModal';
import { getCases, getCaseById } from './services/caseService';
import { fetchCaseDocuments } from './services/documentService';

import Login from './pages/login'
import Register from './pages/register'

import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X, 
  ShieldCheck, 
  Eye,
  FileCheck,
  Bot,
  Sparkles
} from 'lucide-react';

export default function App() {
    const [authPage, setAuthPage] = useState('login')

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('netra_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('netra_user', JSON.stringify(userData))
  }

  const handleLogout = async () => {
    const token = localStorage.getItem('netra_token')

    if (token) {
      try {
        await fetch('http://127.0.0.1:8000/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch {
        // Backend may already be unavailable
      }
    }

    localStorage.removeItem('netra_token')
    localStorage.removeItem('netra_user')
    setUser(null)
    setAuthPage('login')
  }

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'network' | 'vault'
  const [cases, setCases] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCaseCreationOpen, setIsCaseCreationOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [evidenceStore, setEvidenceStore] = useState([]);

  // Sync cases from backend on mount
  useEffect(() => {
    let isMounted = true;
    getCases().then((backendCases) => {
      if (!isMounted || !Array.isArray(backendCases)) return;
      setCases(backendCases);
      setActiveCaseId((current) => backendCases.some((caseData) => caseData.case_id === current)
        ? current
        : (backendCases[0]?.case_id || ''));
    }).catch(() => {
      if (isMounted) setCases([]);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load the selected dossier and its evidence directly from the API.
  useEffect(() => {
    if (!activeCaseId) return;
    let isMounted = true;
    getCaseById(activeCaseId).then((caseDetails) => {
      if (!isMounted) return;
      setCases((current) => current.map((caseData) => (
        caseData.case_id === activeCaseId ? caseDetails : caseData
      )));
    }).catch(() => undefined);
    fetchCaseDocuments(activeCaseId).then((backendDocs) => {
      if (isMounted && Array.isArray(backendDocs)) {
        setEvidenceStore((prevStore) => {
          const existingCaseIndex = prevStore.findIndex((c) => c.case_id === activeCaseId);
          const formattedDocs = backendDocs.map((doc) => ({
            document_id: doc.document_id,
            filename: doc.filename,
            document_type: doc.document_type || 'Case Evidence',
            file_size: doc.file_size || 0,
            content_type: doc.content_type || '',
            uploaded_at: doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('en-IN') : '',
            uploaded_by: doc.uploaded_by || '',
            source: doc.source || '',
            processing_status: doc.processing_status || '',
            tags: doc.tags || [],
            description: doc.description || '',
            extracted_entities: doc.processed_data?.extracted_entities || [],
            summary: doc.processed_data?.summary || {},
          }));

          if (existingCaseIndex >= 0) {
            const currentCaseDocs = prevStore[existingCaseIndex].documents || [];
            // Merge unique docs
            const docIdMap = new Map();
            [...formattedDocs, ...currentCaseDocs].forEach(d => docIdMap.set(d.document_id || d.filename, d));
            const mergedDocs = Array.from(docIdMap.values());
            
            return prevStore.map((c, i) => i === existingCaseIndex ? { ...c, documents: mergedDocs } : c);
          } else {
            return [...prevStore, { case_id: activeCaseId, documents: formattedDocs }];
          }
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeCaseId]);

  // Active Case Data
  const activeCase = cases.find(c => c.case_id === activeCaseId) || cases[0] || null;

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(prev => (prev?.id ? null : prev));
    }, 4000);
  };

  const handleRefreshSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast('ICJS National Criminal Grid Live Resynchronization Completed.');
    }, 1200);
  };

  const handleCaseChange = (caseId) => {
    setActiveCaseId(caseId);
    setSelectedEntity(null);
    showToast(`Investigative Dossier switched to ${caseId}. Graph models updated.`);
  };

  const handleSelectEntity = (entityData) => {
    setSelectedEntity(entityData);
  };

  const handleUploadSuccess = (results) => {
    const documents = Array.isArray(results) ? results : [results];
    setEvidenceStore((prev) => {
      const grouped = documents.reduce((result, document) => {
        const caseId = document.case_id;
        if (!caseId) return result;
        result[caseId] = [...(result[caseId] || []), {
          ...document,
          extracted_entities: document.processed_data?.extracted_entities || [],
          relationships_created: document.processed_data?.summary?.entities_matched_in_database || 0,
        }];
        return result;
      }, {});
      return Object.entries(grouped).reduce((store, [caseId, newDocuments]) => {
        const existing = store.find((entry) => entry.case_id === caseId);
        if (existing) return store.map((entry) => entry.case_id === caseId
          ? { ...entry, documents: [...newDocuments, ...entry.documents] }
          : entry);
        return [...store, { case_id: caseId, documents: newDocuments }];
      }, prev);
    });
    showToast(`${documents.length} evidence file${documents.length === 1 ? '' : 's'} added to the case dossier.`, 'success');
  };

  const handleCaseCreated = (caseData) => {
    setCases((current) => [...current, caseData]);
    setActiveCaseId(caseData.case_id);
    setActiveTab('dashboard');
    showToast(`Case ${caseData.case_id} opened. You are its lead investigator.`);
  };

  if (!user) {
    if (authPage === 'register') {
      return (
        <Register
          onRegister={() => setAuthPage('login')}
          onBackToLogin={() => setAuthPage('login')}
        />
      )
    }

    return (
      <Login
        onLogin={handleLogin}
        onCreateAccount={() => setAuthPage('register')}
      />
    )
  }
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC]">
      {/* Dark Navy Sidebar (#0a1628) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCase={activeCase}
        casesCount={cases.length}
        onOpenChatbot={() => setIsChatbotOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <Header
          cases={cases}
          activeCaseId={activeCaseId}
          currentUser={user}
          onSelectCase={handleCaseChange}
          isSyncing={isSyncing}
          onRefreshSync={handleRefreshSync}
          onTriggerAlertNotification={(msg) => showToast(msg, 'warning')}
          onOpenUploadModal={() => activeCase && setIsUploadModalOpen(true)}
          onOpenCreateCase={() => setIsCaseCreationOpen(true)}
        />

        {/* Workspace Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto h-full">
            {!activeCase ? (
              <div className="flex min-h-[60vh] items-center justify-center">
                <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="text-sm font-bold text-slate-900">No investigation dossier is assigned to you.</div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">Open a case to become its lead investigator. Once created, you can upload multiple evidence files and grant case access to other investigators.</p>
                  <button onClick={() => setIsCaseCreationOpen(true)} className="mt-5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800">Open Your First Case</button>
                </div>
              </div>
            ) : activeTab === 'dashboard' ? (
              <DashboardOverview
                caseData={activeCase}
                onSelectEntity={handleSelectEntity}
                setActiveTab={setActiveTab}
                onTriggerAction={(msg) => showToast(msg, 'success')}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
              />
            ) : activeTab === 'network' ? (
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                        Full-Screen Criminal Relationship Network Analyzer
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono-code font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                        {activeCase.case_id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Multi-tier relational link analysis visualizing syndicate hierarchy, financial trails, weapon flows, and vehicle registries.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code text-slate-500">
                      FIR: <strong className="text-slate-700">{activeCase.fir_number}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-h-[560px]">
                  <NetworkGraph
                    caseData={activeCase}
                    onSelectEntity={handleSelectEntity}
                    selectedEntityId={selectedEntity?.id}
                    isMini={false}
                    height="calc(100vh - 165px)"
                  />
                </div>
              </div>
            ) : (
              <EvidenceVault
                cases={cases}
                activeCaseId={activeCaseId}
                onSelectCase={handleCaseChange}
                evidenceStore={evidenceStore}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                onInspectEntity={handleSelectEntity}
              />
            )}
          </div>
        </main>
      </div>

      {/* Slide-out Entity Inspection Drawer */}
      {selectedEntity && (
        <EntityDrawer
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
          onFocusNode={(id) => {
            // Already handled in graph
          }}
        />
      )}

      {/* Document Ingestion Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        activeCaseId={activeCaseId}
        cases={cases}
        currentUser={user}
        onUploadSuccess={handleUploadSuccess}
      />

      <CaseCreationModal
        isOpen={isCaseCreationOpen}
        onClose={() => setIsCaseCreationOpen(false)}
        onCaseCreated={handleCaseCreated}
      />

      {/* Floating AI Copilot Trigger Beacon */}
      {!isChatbotOpen && (
        <button
          id="floating-copilot-btn"
          type="button"
          onClick={() => setIsChatbotOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#0a1628] via-[#0d223f] to-teal-950 text-white border border-cyan-400/60 shadow-2xl hover:border-cyan-300 hover:scale-105 active:scale-95 transition-all cursor-pointer group select-none"
          title="Open NETRA AI Copilot Intelligence Analyst"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-cyan-300 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-[11px] font-bold font-mono-code text-cyan-300 flex items-center gap-1">
              <span>NETRA COPILOT</span>
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-[9px] text-slate-400 font-mono-code">AI Crime Analyst</div>
          </div>
        </button>
      )}

      {/* AI Intelligence Assistant Chatbot Drawer */}
      <AIChatbotDrawer
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        activeCase={activeCase}
        cases={cases}
        onSelectEntity={handleSelectEntity}
        onTriggerAction={(msg) => showToast(msg, 'success')}
      />

      {/* Toast Notification HUD */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
          <div className="bg-[#0a1628] text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-cyan-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-slate-100 font-mono-code uppercase tracking-wider">
                CCTNS Tactical Alert
              </div>
              <div className="text-slate-300 mt-0.5 leading-snug">
                {toastMessage.message}
              </div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
