import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network';
import {
  AlertTriangle,
  ArrowLeft,
  GitMerge,
  LoaderCircle,
  Network as NetworkIcon,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { getCrossCaseGraph, getCrossCaseGroups } from '../services/graphService';

const ENTITY_TYPES = ['Person', 'Vehicle', 'Phone', 'Account', 'License', 'Weapon', 'Transaction'];
const CASE_COLORS = ['#0f766e', '#2563eb', '#7c3aed', '#be185d', '#b45309', '#047857'];
const ENTITY_COLORS = {
  Person: '#dc2626',
  Vehicle: '#db2777',
  Phone: '#a16207',
  Account: '#15803d',
  License: '#2563eb',
  Weapon: '#7c3aed',
  Transaction: '#0f766e',
};

function entityLabel(node) {
  const data = node.data || {};
  return data.name || data.phone_number || data.registration_number || data.account_number ||
    data.license_number || data.entity_value || data.value || data.person_id || node.id;
}

export default function CrossCaseIntelligence({ cases = [], onSelectEntity }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodeDataRef = useRef({});
  const [groupsData, setGroupsData] = useState(null);
  const [availableCaseIds, setAvailableCaseIds] = useState([]);
  const [selectedCaseIds, setSelectedCaseIds] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState(ENTITY_TYPES);
  const [view, setView] = useState('groups');
  const [graph, setGraph] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGroups = useCallback(async (caseIds = selectedCaseIds, entityTypes = selectedTypes) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCrossCaseGroups({ caseIds, entityTypes });
      setGroupsData(data);
      setAvailableCaseIds(data.available_case_ids || data.case_ids || []);
      if (!selectedCaseIds.length && (data.available_case_ids || data.case_ids)) {
        setSelectedCaseIds(data.available_case_ids || data.case_ids);
      }
    } catch (requestError) {
      setGroupsData(null);
      setError(requestError.message || 'Unable to load authorised cross-case connections.');
    } finally {
      setLoading(false);
    }
  }, [selectedCaseIds, selectedTypes]);

  useEffect(() => {
    loadGroups([], ENTITY_TYPES);
  }, []); // The server resolves the user's authorised cases for the initial view.

  useEffect(() => {
    if (!containerRef.current || !graph || view !== 'graph') return undefined;
    const caseLookup = new Map(cases.map((caseData) => [caseData.case_id, caseData]));
    const nodeMap = {};
    const nodes = graph.nodes.map((node) => {
      if (node.kind === 'case') {
        const caseId = node.data.case_id;
        const caseData = caseLookup.get(caseId);
        const index = graph.case_ids.indexOf(caseId);
        const color = CASE_COLORS[index % CASE_COLORS.length];
        const entityData = { ...node.data, name: caseData?.case_title || caseId, entityCategory: 'Case' };
        nodeMap[node.id] = entityData;
        return {
          id: node.id,
          label: `${caseId}\n${caseData?.case_title || 'Authorised case'}`,
          shape: 'box',
          margin: 12,
          borderWidth: 3,
          color: { background: color, border: '#0f172a' },
          font: { color: '#ffffff', size: 13, bold: true, multi: true },
          entityData,
        };
      }

      const type = node.labels?.[0] || 'Entity';
      const entityData = { ...node.data, name: entityLabel(node), entityCategory: type };
      nodeMap[node.id] = entityData;
      return {
        id: node.id,
        label: `${entityLabel(node)}\n[${type}]`,
        shape: 'ellipse',
        borderWidth: 3,
        color: { background: ENTITY_COLORS[type] || '#475569', border: '#0f172a' },
        font: { color: '#ffffff', size: 11, bold: true, multi: true },
        title: `${type} shared by ${node.data?.cross_case_link_count || 0} cases`,
        entityData,
      };
    });
    nodeDataRef.current = nodeMap;
    const edges = graph.edges.map((edge, index) => ({
      id: `${edge.source}-${edge.target}-${index}`,
      from: edge.source,
      to: edge.target,
      label: edge.type,
      color: { color: '#64748b', highlight: '#0f766e' },
      width: 2,
      arrows: { to: { enabled: false } },
      title: `Evidence documents: ${(edge.data?.document_ids || []).join(', ') || 'not available'}`,
    }));

    const network = new Network(containerRef.current, {
      nodes: new DataSet(nodes),
      edges: new DataSet(edges),
    }, {
      autoResize: true,
      height: '100%',
      nodes: { shadow: { enabled: true, color: 'rgba(15, 23, 42, 0.2)', size: 7 } },
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: { gravitationalConstant: -80, springLength: 150, avoidOverlap: 0.8 },
        stabilization: { iterations: 180 },
      },
      interaction: { hover: true, zoomView: true, dragView: true },
      edges: { font: { size: 10, align: 'middle', strokeWidth: 3, strokeColor: '#ffffff' } },
    });
    networkRef.current = network;
    network.on('click', (params) => {
      const nodeId = params.nodes?.[0];
      if (nodeId && nodeDataRef.current[nodeId]) onSelectEntity?.(nodeDataRef.current[nodeId]);
    });
    return () => network.destroy();
  }, [cases, graph, onSelectEntity, view]);

  const toggleCase = (caseId) => {
    setSelectedCaseIds((current) => current.includes(caseId)
      ? current.filter((id) => id !== caseId)
      : [...current, caseId]);
  };

  const toggleType = (entityType) => {
    setSelectedTypes((current) => current.includes(entityType)
      ? current.filter((type) => type !== entityType)
      : [...current, entityType]);
  };

  const openGroupGraph = async (group) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCrossCaseGraph({ caseIds: group.case_ids, entityTypes: selectedTypes });
      setGraph(result);
      setActiveGroup(group);
      setView('graph');
    } catch (requestError) {
      setError(requestError.message || 'Unable to render this investigation group.');
    } finally {
      setLoading(false);
    }
  };

  const caseName = (caseId) => cases.find((caseData) => caseData.case_id === caseId)?.case_title || caseId;
  const canSearch = selectedCaseIds.length >= 2 && selectedTypes.length > 0;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GitMerge className="h-5 w-5 text-violet-700" />
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Cross-Case Intelligence</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Live authorised investigation groups derived from shared canonical entities in Neo4j.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadGroups()}
            disabled={!canSearch || loading}
            className="flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh groups
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-1.5 text-[10px] font-mono-code font-bold uppercase tracking-wide text-slate-500">Authorised cases</div>
            <div className="flex flex-wrap gap-1.5">
              {availableCaseIds.map((caseId) => (
                <button
                  key={caseId}
                  type="button"
                  onClick={() => toggleCase(caseId)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-mono-code font-bold transition-colors ${selectedCaseIds.includes(caseId)
                    ? 'border-teal-300 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  {selectedCaseIds.includes(caseId) ? '✓ ' : ''}{caseId}
                </button>
              ))}
              {availableCaseIds.length === 0 && <span className="text-xs text-slate-500">Loading case access…</span>}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[10px] font-mono-code font-bold uppercase tracking-wide text-slate-500">Connection evidence</div>
            <div className="flex flex-wrap gap-1.5">
              {ENTITY_TYPES.map((entityType) => (
                <button
                  key={entityType}
                  type="button"
                  onClick={() => toggleType(entityType)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${selectedTypes.includes(entityType)
                    ? 'border-violet-300 bg-violet-50 text-violet-800'
                    : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  {selectedTypes.includes(entityType) ? '✓ ' : ''}{entityType}
                </button>
              ))}
            </div>
          </div>
        </div>
        {!canSearch && <p className="mt-3 text-xs text-amber-700">Select at least two authorised cases and one entity type.</p>}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {view === 'graph' ? (
        <div className="flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <NetworkIcon className="h-4 w-4 text-violet-700" />
                Group graph · {activeGroup?.case_count || 0} connected cases
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">Only shared entities and their authorised evidence links are shown.</div>
            </div>
            <button type="button" onClick={() => setView('groups')} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <ArrowLeft className="h-3.5 w-3.5" /> Investigation groups
            </button>
          </div>
          <div className="relative flex-1 bg-slate-900/5">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-600"><LoaderCircle className="h-5 w-5 animate-spin text-violet-700" /> Loading shared evidence…</div>
            ) : graph?.nodes?.length ? <div ref={containerRef} className="h-full w-full" /> : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-slate-500"><Shield className="h-7 w-7 text-slate-400" />No shared authorised evidence was returned for this group.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin text-violet-700" /> Mapping authorised investigation groups…</div>
          ) : groupsData?.groups?.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {groupsData.groups.map((group, index) => (
                <article key={group.group_id} className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-violet-700">Investigation group {index + 1}</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">{group.case_count} connected cases</div>
                    </div>
                    <span className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[10px] font-mono-code font-bold text-violet-700">{group.shared_entity_count} links</span>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {group.case_ids.map((caseId) => <div key={caseId} className="rounded bg-white/90 px-2 py-1 text-xs text-slate-700"><span className="font-mono-code font-bold text-teal-800">{caseId}</span> · {caseName(caseId)}</div>)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{group.entity_types.map((entityType) => <span key={entityType} className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">{entityType}</span>)}</div>
                  <button type="button" onClick={() => openGroupGraph(group)} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800"><NetworkIcon className="h-3.5 w-3.5" /> Open group graph</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 text-center text-slate-500">
              <GitMerge className="h-8 w-8 text-slate-400" />
              <div className="font-semibold text-slate-700">No connected investigation groups yet</div>
              <p className="max-w-md text-xs">When authorised cases share a canonical person, vehicle, phone, account, licence, or other selected entity, they will appear here and merge automatically.</p>
            </div>
          )}
          {groupsData?.isolated_case_ids?.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="text-[10px] font-mono-code font-bold uppercase tracking-wide text-slate-500">Isolated authorised cases</div>
              <div className="mt-2 flex flex-wrap gap-2">{groupsData.isolated_case_ids.map((caseId) => <span key={caseId} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">{caseId}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
