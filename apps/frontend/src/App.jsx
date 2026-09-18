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
import OfficerDetailsModal from './components/OfficerDetailsModal';
import RunningCasesModal from './components/RunningCasesModal';
import { getCases, getCaseById } from './services/caseService';
import { fetchCaseDocuments } from './services/documentService';
import { apiFetch } from './services/apiClient';
import { getCurrentUser } from './services/authService';

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
  Sparkles,
  Menu
} from 'lucide-react';

export default function App() {
  const [authPage, setAuthPage] = useState('login')

  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem('netra_token')))

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('netra_user', JSON.stringify(userData));
    setAuthLoading(false);
  };

  // Refresh the investigator profile from the backend on every app load.
  // localStorage is kept only as a cache, never as the source of truth.
  useEffect(() => {
    const token = localStorage.getItem('netra_token');
    if (!token) {
      localStorage.removeItem('netra_user');
      setUser(null);
      setAuthLoading(false);
      return;
    }

    let isMounted = true;
    getCurrentUser()
      .then((currentUser) => {
        if (!isMounted) return;
        setUser(currentUser);
        localStorage.setItem('netra_user', JSON.stringify(currentUser));
      })
      .catch(() => {
        if (!isMounted) return;
        // An expired/revoked token must not leave the UI looking authenticated.
        localStorage.removeItem('netra_token');
        localStorage.removeItem('netra_user');
        setUser(null);
        setAuthPage('login');
      })
      .finally(() => {
        if (isMounted) setAuthLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('netra_token');

    if (token) {
      try {
        await apiFetch('/auth/logout', { method: 'POST' });
      } catch {
        // Backend may already be unavailable
      }
    }

    localStorage.removeItem('netra_token');
    localStorage.removeItem('netra_user');
    setUser(null);
    setCases([]);
    setActiveCaseId('');
    setAuthPage('login');
  };

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'network' | 'vault'
  const [cases, setCases] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCaseCreationOpen, setIsCaseCreationOpen] = useState(false);
  const [isOfficerDetailsOpen, setIsOfficerDetailsOpen] = useState(false);
  const [isRunningCasesOpen, setIsRunningCasesOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [evidenceStore, setEvidenceStore] = useState([]);

  const refreshAuthorizedCases = async (targetCaseId) => {
    try {
      const backendCases = await getCases();
      if (Array.isArray(backendCases)) {
        setCases(backendCases);
        if (targetCaseId && backendCases.some((c) => c.case_id === targetCaseId)) {
          setActiveCaseId(targetCaseId);
        } else if (!activeCaseId && backendCases.length > 0) {
          setActiveCaseId(backendCases[0].case_id);
        }
      }
    } catch (err) {
      console.warn('[App] Failed to refresh authorized cases:', err.message);
    }
  };

  // Close sidebar on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    if (isSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Fetch only after a valid login or restored authenticated session.
  useEffect(() => {
    if (authLoading || !user) return;
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
  }, [authLoading, user]);

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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-600">
        Verifying investigator session…
      </div>
    )
  }

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
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5EFEB] relative">
      {/* Sidebar Backdrop Overlay when open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#1A120E]/70 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Slide-out Sidebar Drawer (non-permanent) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
          activeCase={activeCase}
          casesCount={cases.length}
          onOpenChatbot={() => {
            setIsSidebarOpen(false);
            setIsChatbotOpen(true);
          }}
          onClose={() => setIsSidebarOpen(false)}
          onOpenRunningCases={() => {
            setIsSidebarOpen(false);
            setIsRunningCasesOpen(true);
          }}
        />
      </div>

      {/* Main Content Area - spans full width */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#F5EFEB]">
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
          onOpenOfficerDetails={() => setIsOfficerDetailsOpen(true)}
          onOpenRunningCases={() => setIsRunningCasesOpen(true)}
        />

        {/* Action & Breadcrumb Bar Just Below Nav Bar */}
        <div className="bg-[#F5EFEB] border-b border-[#DDD4C7] px-4 sm:px-6 py-2.5 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              id="sidebar-toggle-btn"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-[#EDE4D8] text-[#2B211C] border border-[#DDD4C7] transition-all shadow-2xs cursor-pointer active:scale-95 group font-semibold text-xs"
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-4 h-4 text-[#2B211C] group-hover:text-[#8C532B]" />
              <span>Menu</span>
            </button>
            <div className="h-4 w-px bg-[#DDD4C7]" />
            <div className="flex items-center gap-1.5 text-xs text-[#7A6D63] font-medium">
              <span className="font-medium">Dashboard</span>
              <span>&gt;</span>
              <span className="font-semibold text-[#2B211C] capitalize">
                {activeTab === 'dashboard' && 'Case Overview'}
                {activeTab === 'network' && 'Network Analysis Graph'}
                {activeTab === 'vault' && 'Evidence Vault'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick tab switcher pills in the sub-bar */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#DDD4C7] text-xs shadow-2xs">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${activeTab === 'dashboard'
                    ? 'bg-[#8C532B] text-white shadow-xs'
                    : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#EDE4D8]'
                  }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('network')}
                className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${activeTab === 'network'
                    ? 'bg-[#8C532B] text-white shadow-xs'
                    : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#EDE4D8]'
                  }`}
              >
                Network Graph
              </button>
              <button
                onClick={() => setActiveTab('vault')}
                className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${activeTab === 'vault'
                    ? 'bg-[#8C532B] text-white shadow-xs'
                    : 'text-[#7A6D63] hover:text-[#2B211C] hover:bg-[#EDE4D8]'
                  }`}
              >
                Evidence Vault
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Container */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-[#F5EFEB]">
          <div className="w-full h-full">
            {!activeCase ? (
              <div className="flex min-h-[60vh] items-center justify-center">
                <div className="max-w-lg rounded-2xl border border-[#DDD4C7] bg-white p-8 text-center shadow-sm">
                  <div className="text-sm font-bold text-[#2B211C]">No investigation dossier is assigned to you.</div>
                  <p className="mt-2 text-xs leading-relaxed text-[#7A6D63]">Open a case to become its lead investigator or discover running cases across the national registry to request operational clearance.</p>
                  <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
                    <button onClick={() => setIsCaseCreationOpen(true)} className="rounded-lg bg-[#8C532B] hover:bg-[#703F1E] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer">Open Your First Case</button>
                    <button onClick={() => setIsRunningCasesOpen(true)} className="rounded-lg border border-[#DDD4C7] bg-white hover:bg-[#EDE4D8] px-4 py-2 text-xs font-bold text-[#2B211C] shadow-2xs cursor-pointer">Browse Running Cases</button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'dashboard' ? (
              <DashboardOverview
                caseData={activeCase}
                onSelectEntity={handleSelectEntity}
                setActiveTab={setActiveTab}
                onTriggerAction={(msg) => showToast(msg, 'success')}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                onSelectCase={handleCaseChange}
              />
            ) : activeTab === 'network' ? (
              <div className="space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#2B211C] tracking-tight">
                        Full-Screen Criminal Relationship Network Analyzer
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono-code font-bold bg-[#EDE4D8] text-[#8C532B] border border-[#8C532B]/30">
                        {activeCase.case_id}
                      </span>
                    </div>
                    <p className="text-xs text-[#7A6D63]">
                      Multi-tier relational link analysis visualizing syndicate hierarchy, financial trails, weapon flows, and vehicle registries.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code text-[#7A6D63]">
                      FIR: <strong className="text-[#2B211C]">{activeCase.fir_number}</strong>
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
                    onSelectCase={handleCaseChange}
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

      {isOfficerDetailsOpen && (
        <OfficerDetailsModal
          officer={user}
          onClose={() => setIsOfficerDetailsOpen(false)}
          onLogout={() => {
            setIsOfficerDetailsOpen(false);
            handleLogout();
          }}
        />
      )}

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

      <RunningCasesModal
        isOpen={isRunningCasesOpen}
        onClose={() => setIsRunningCasesOpen(false)}
        currentUser={user}
        authorizedCases={cases}
        activeCaseId={activeCaseId}
        onSelectCase={handleCaseChange}
        onAccessGranted={(grantedCaseId) => {
          refreshAuthorizedCases(grantedCaseId);
          showToast(`Access updated for ${grantedCaseId}. Synchronizing authorized dossiers...`, 'success');
        }}
        onShowToast={(msg, type) => showToast(msg, type || 'info')}
      />

      {/* Floating AI Copilot Trigger Beacon */}
      {!isChatbotOpen && (
        <button
          id="floating-copilot-btn"
          type="button"
          onClick={() => setIsChatbotOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#261B16] text-white border border-[#8C532B]/50 shadow-2xl hover:border-[#8C532B] hover:scale-105 active:scale-95 transition-all cursor-pointer group select-none"
          title="Open NETRA AI Copilot Intelligence Analyst"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-[#EDE4D8] group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#4A6B53] rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#4A6B53] rounded-full" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-[11px] font-bold font-mono-code text-[#EDE4D8] flex items-center gap-1">
              <span>NETRA COPILOT</span>
              <Sparkles className="w-3 h-3 text-[#C27D26]" />
            </div>
            <div className="text-[9px] text-[#A39284] font-mono-code">AI Crime Analyst</div>
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
          <div className="bg-[#261B16] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#8C532B]/40 flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-[#4A6B53]">
              <CheckCircle2 className="w-5 h-5 text-[#4A6B53]" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-[#EDE4D8] font-mono-code uppercase tracking-wider">
                CCTNS Tactical Alert
              </div>
              <div className="text-[#D8CAB8] mt-0.5 leading-snug">
                {toastMessage.message}
              </div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#A39284] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
