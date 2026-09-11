import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Check,
  Terminal,
  ArrowRight
} from 'lucide-react';

export default function AIChatbotDrawer({
  isOpen,
  onClose,
  activeCase,
  cases = [],
  onSelectEntity,
  onTriggerAction
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize or update conversation when activeCase changes
  useEffect(() => {
    if (!activeCase) return;

    const initialGreeting = {
      id: 'msg-init',
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Tactical Intelligence Copilot initialized for **${activeCase.case_id}** (*${activeCase.case_title}*).\n\n` +
            `• **Threat Level**: ${activeCase.threat_level || 'CRITICAL'}\n` +
            `• **FIR Particulars**: ${activeCase.fir_number}\n` +
            `• **Entities Indexed**: ${(activeCase.suspects || []).length} Suspects, ${(activeCase.vehicles || []).length} Vehicles, ${(activeCase.weapons || []).length} Seized Assets.\n\n` +
            `Ask me anything regarding syndicate hierarchy, financial mule accounts, telecom IMEI pings, or to draft statutory notices (Sec 41A CrPC / Sec 91 CrPC).`,
      suggestions: [
        'Summarize kingpin & syndicate hierarchy',
        'List suspicious bank accounts & fund flow',
        'Analyze burner phones & IMEI telemetry',
        'Draft Section 41A CrPC Notice for IO'
      ]
    };

    setMessages([initialGreeting]);
  }, [activeCase?.case_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClearHistory = () => {
    if (!activeCase) return;
    setMessages([
      {
        id: 'msg-reset-' + Date.now(),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Conversation reset. Intelligence models re-anchored on active dossier **${activeCase.case_id}**.`,
        suggestions: [
          'Summarize kingpin & syndicate hierarchy',
          'List suspicious bank accounts & fund flow',
          'Draft Section 41A CrPC Notice for IO'
        ]
      }
    ]);
  };

  const handleSend = (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query) return;

    const userMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate intelligent tactical reasoning anchored on caseData
    setTimeout(() => {
      const botResponse = generateTacticalResponse(query, activeCase);
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 900);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden transition-all duration-200 animate-in slide-in-from-bottom-5 ${
        isExpanded
          ? 'w-[94vw] sm:w-[680px] h-[85vh] max-w-4xl'
          : 'w-[94vw] sm:w-[440px] h-[580px]'
      }`}
      role="dialog"
      aria-modal="true"
    >
      {/* Terminal Navy Header */}
      <div className="bg-[#0a1628] text-white px-4 py-3 border-b border-slate-700/90 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono-code font-bold uppercase tracking-wider text-cyan-300">
                NETRA COPILOT
              </span>
              <span className="text-[9px] font-mono-code font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                AI ANALYST
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono-code flex items-center gap-1.5">
              <span>Anchored:</span>
              <strong className="text-emerald-400">{activeCase?.case_id || 'CASE-0001'}</strong>
              <span>• RAG v2.4</span>
            </div>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            title="Close Copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/70 text-xs">
        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono-code text-slate-400">
              {msg.sender === 'user' ? (
                <span>Investigating Officer</span>
              ) : (
                <span className="text-teal-700 font-bold flex items-center gap-1">
                  <Bot className="w-3 h-3 text-cyan-600" /> NETRA AI Intelligence
                </span>
              )}
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[90%] shadow-2xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-teal-700 to-[#0a1628] text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-line text-xs">{msg.text}</div>

              {/* Action Buttons within Response if available */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  {msg.actions.map((act, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => onTriggerAction && onTriggerAction(act.label)}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-[10px] font-mono-code font-bold text-slate-700 border border-slate-200 transition-colors flex items-center gap-1"
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}

              {/* Copy action on bot responses */}
              {msg.sender === 'bot' && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleCopy(msg.text, idx)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 font-mono-code"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap max-w-full">
                {msg.suggestions.map((sug, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => handleSend(sug)}
                    className="px-2.5 py-1 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[10px] font-mono-code font-semibold transition-all hover:scale-102 flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>{sug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono-code text-slate-400">
              <Bot className="w-3 h-3 text-cyan-600" />
              <span>Querying Vector Store & Neo4j Knowledge Graph...</span>
            </div>
            <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all">
          <Terminal className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${activeCase?.case_id || 'case'} entities, money trails, or legal notice drafts...`}
            className="w-full bg-transparent text-xs text-slate-900 focus:outline-none placeholder:text-slate-400 font-mono-code"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isTyping}
            className="p-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white transition-colors shrink-0 cursor-pointer"
            title="Send Query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono-code px-1">
          <span>Project NETRA • Law Enforcement Intelligence Assistant</span>
          <span>Press Enter ↵</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Intelligent domain-grounded tactical responses generator anchored on active case
 */
function generateTacticalResponse(query, caseData) {
  const q = query.toLowerCase();
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // 1. Kingpin & Hierarchy
  if (q.includes('hierarchy') || q.includes('kingpin') || q.includes('suspect') || q.includes('who is')) {
    const suspects = caseData?.suspects || [];
    const kingpin = suspects.find(s => s.role?.toLowerCase().includes('kingpin') || s.role?.toLowerCase().includes('mastermind')) || suspects[0];
    const runners = suspects.filter(s => s.id !== kingpin?.id);

    let text = `### Syndicate Hierarchy Analysis (${caseData?.case_id})\n\n`;
    if (kingpin) {
      text += `👑 **Primary Kingpin / Architect**: **${kingpin.name}** (*${kingpin.alias || 'No Alias'}*)\n` +
              `• **Role**: ${kingpin.role}\n` +
              `• **Status**: ${kingpin.status || 'Active Surveillance'}\n` +
              `• **Known Location**: ${kingpin.location || 'Jharkhand NCR Axis'}\n\n`;
    }

    text += `👥 **Operational Subordinates (${runners.length} Tracked)**:\n`;
    runners.forEach((r, idx) => {
      text += `${idx + 1}. **${r.name}** — ${r.role} (${r.status || 'Identified'})\n`;
    });

    text += `\n**Modus Operandi Summary**: ${caseData?.modus_operandi?.summary || 'Coordinated cyber phishing with multi-tier mule account distribution.'}`;

    return {
      id: 'bot-' + Date.now(),
      sender: 'bot',
      timestamp,
      text,
      actions: [
        { label: 'Highlight Kingpin in Graph' },
        { label: 'Generate Lookout Circular (LOC)' }
      ]
    };
  }

  // 2. Bank Accounts & Financial Trail
  if (q.includes('bank') || q.includes('money') || q.includes('account') || q.includes('financial') || q.includes('fund') || q.includes('hawala')) {
    const transfers = caseData?.financial_transfers || [];
    let text = `### Financial Trail & Money Laundering Network (${caseData?.case_id})\n\n`;
    text += `• **Total Siphoned Amount**: ₹3.42 Crores\n`;
    text += `• **Layering Velocity**: Average 180 seconds between victim debit and ATM/Hawala cash-out.\n\n`;

    if (transfers.length > 0) {
      text += `**Tracked High-Risk Transactions**:\n`;
      transfers.slice(0, 4).forEach((t, i) => {
        text += `${i + 1}. **${t.source}** ➔ **${t.destination}**: ₹${(t.amount || 500000).toLocaleString('en-IN')} via *${t.channel || 'IMPS/UPI'}* (Status: ${t.status || 'Flagged'})\n`;
      });
    } else {
      text += `14 mule accounts registered across SBI, HDFC, and PNB have been mapped. Primary sink: Axis Bank #91201004829102.\n`;
    }

    text += `\n⚠️ **Action Recommended**: Requisition provisional attachment under Section 102 CrPC with respective nodal branch managers.`;

    return {
      id: 'bot-' + Date.now(),
      sender: 'bot',
      timestamp,
      text,
      actions: [
        { label: 'Initiate FIU Asset Freeze' },
        { label: 'Export Bank Transfer Matrix' }
      ]
    };
  }

  // 3. Telecom, Phone & IMEI
  if (q.includes('phone') || q.includes('imei') || q.includes('cdr') || q.includes('telecom') || q.includes('sim')) {
    const leads = (caseData?.priority_leads || []).filter(l => l.title?.toLowerCase().includes('sim') || l.description?.toLowerCase().includes('imei'));
    let text = `### Telecom Triangulation & IMEI Analysis (${caseData?.case_id})\n\n`;
    text += `• **Active VoIP / Primary Line**: +91-97231-55821\n`;
    text += `• **SIM Box Gateway**: 64-port Dinstar GSM hardware located in Batla House, Jamia Nagar.\n`;
    text += `• **Burst Frequency**: 12,000 spoofed SMS packets/hour.\n\n`;

    if (leads.length > 0) {
      text += `**Latest CDR Triangulation Intercept**:\n"${leads[0].description}"\n\n`;
    }

    text += `**Action Issued**: Telecom Nodal requisition issued under Section 5(2) Indian Telegraph Act.`;

    return {
      id: 'bot-' + Date.now(),
      sender: 'bot',
      timestamp,
      text,
      actions: [
        { label: 'Trigger Wiretap Order' },
        { label: 'Request DoT Tower Dump' }
      ]
    };
  }

  // 4. Statutory Legal Notice Draft (Section 41A / 91 CrPC)
  if (q.includes('notice') || q.includes('draft') || q.includes('41a') || q.includes('91 crpc') || q.includes('charge sheet')) {
    const suspects = caseData?.suspects || [];
    const primeSuspect = suspects[0] || { name: 'Mohammad Rizwan', alias: 'Rizwan SIM' };

    let text = `### Draft Notice Under Section 41A Cr.P.C.\n\n` +
               `**POLICE STATION**: ${caseData?.police_station || 'Cyber Crime Special Cell'}\n` +
               `**CASE FIR NO**: ${caseData?.fir_number || 'FIR-2024/0412/CYB'}\n` +
               `**TO**: ${primeSuspect.name} (${primeSuspect.alias || 'Accused'})\n\n` +
               `*WHEREAS*, in connection with the investigation of the above-mentioned FIR registered under **${(caseData?.ipc_sections || ['IPC 420', 'IT Act 66D']).join(', ')}**, there are reasonable grounds to question your involvement.\n\n` +
               `*YOU ARE HEREBY DIRECTED* to appear before the undersigned Investigating Officer (**${caseData?.investigating_officer || 'Sub-Inspector A. K. Banerjee'}**) at Cyber Crime Special Cell within **48 hours** of service of this notice along with original KYC registers, Aadhaar tokens, and transaction records.\n\n` +
               `*FAILURE TO COMPLY* shall render you liable for arrest under Section 41A(3) and Section 41A(4) Cr.P.C. without further notice.`;

    return {
      id: 'bot-' + Date.now(),
      sender: 'bot',
      timestamp,
      text,
      actions: [
        { label: 'Copy Formatted Notice' },
        { label: 'Generate PDF Subpoena' }
      ]
    };
  }

  // 5. Default General Investigation Assistant Response
  return {
    id: 'bot-' + Date.now(),
    sender: 'bot',
    timestamp,
    text: `Analysis complete for query regarding **${caseData?.case_id}**.\n\n` +
          `• **Investigation Objective**: Disruption of ${caseData?.crime_type || 'organized crime network'}.\n` +
          `• **IPC / Statutory Penal Sections**: ${(caseData?.ipc_sections || []).join(', ')}.\n` +
          `• **Current Threat Status**: Marked as **${caseData?.threat_level || 'CRITICAL'}** with **${(caseData?.priority_leads || []).length} active field leads** awaiting QRT dispatch.\n\n` +
          `You can ask for specific intelligence: *'Who is the kingpin?'*, *'List bank transfers'*, *'Check burner IMEI pings'*, or *'Draft Section 41A notice'* for any suspect.`,
    suggestions: [
      'Summarize kingpin & syndicate hierarchy',
      'List suspicious bank accounts & fund flow',
      'Draft Section 41A CrPC Notice for IO'
    ]
  };
}
