import React, { useState } from 'react';
import casesData from './data/casesData.json';
import initialEvidenceStore from './data/evidenceData.json';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardOverview from './components/DashboardOverview';
import NetworkGraph from './components/NetworkGraph';
import EntityDrawer from './components/EntityDrawer';
import DocumentUploadModal from './components/DocumentUploadModal';
import EvidenceVault from './components/EvidenceVault';
import AIChatbotDrawer from './components/AIChatbotDrawer';
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
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'network' | 'vault'
  const [activeCaseId, setActiveCaseId] = useState('CASE-0001');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [evidenceStore, setEvidenceStore] = useState(initialEvidenceStore);

  // Active Case Data
  const activeCase = casesData.find(c => c.case_id === activeCaseId) || casesData[0];

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

  const handleUploadSuccess = (result) => {
    const entitiesCount = result.processed_data?.entities_extracted || 0;
    const relationsCount = result.processed_data?.relationships_created || 0;

    // Immediately register the newly uploaded document in the Evidence Vault
    const newDoc = {
      document_id: result.document_id || 'DOC-' + Date.now(),
      filename: result.filename,
      document_type: result.document_type || 'Case Evidence',
      file_size: result.file_size || 1500000,
      content_type: result.content_type || 'application/pdf',
      uploaded_at: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      uploaded_by: result.uploaded_by || 'Sub-Inspector A. K. Banerjee',
      source: result.source || 'CCTNS National Police Portal',
      processing_status: 'completed',
      sha256: 'sha256-' + Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14),
      tags: Array.isArray(result.tags) ? result.tags : ['tactical_ingestion'],
      description: result.description || 'Ingested evidence document processed through the LangGraph intelligence pipeline.',
      extracted_entities: result.processed_data?.extracted_entities || [
        { type: 'PERSON', name: 'Identified Entity Record', role: 'Tracked Target', confidence: 0.96 }
      ],
      relationships_created: relationsCount || 5,
      summary: `Automated LangGraph ingestion extracted ${entitiesCount} entities and synthesized ${relationsCount} graph links for dossier ${result.case_id}.`
    };

    setEvidenceStore((prev) => {
      const existingCase = prev.find((c) => c.case_id === result.case_id);
      if (existingCase) {
        return prev.map((c) =>
          c.case_id === result.case_id
            ? { ...c, documents: [newDoc, ...c.documents] }
            : c
        );
      } else {
        return [...prev, { case_id: result.case_id, documents: [newDoc] }];
      }
    });

    showToast(
      `Evidence Ingested for ${result.case_id}: ${entitiesCount} entities extracted & added to Evidence Vault.`,
      'success'
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC]">
      {/* Dark Navy Sidebar (#0a1628) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCase={activeCase}
        casesCount={casesData.length}
        onOpenChatbot={() => setIsChatbotOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <Header
          cases={casesData}
          activeCaseId={activeCaseId}
          onSelectCase={handleCaseChange}
          isSyncing={isSyncing}
          onRefreshSync={handleRefreshSync}
          onTriggerAlertNotification={(msg) => showToast(msg, 'warning')}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
        />

        {/* Workspace Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === 'dashboard' ? (
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
                cases={casesData}
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
        cases={casesData}
        onUploadSuccess={handleUploadSuccess}
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
        cases={casesData}
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
