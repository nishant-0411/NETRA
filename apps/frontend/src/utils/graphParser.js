/**
 * graphParser.js
 * Ingestion and transformation engine for Law Enforcement Multi-Case Criminal Intelligence Data.
 * Formats entities and relations into vis-network compatible datasets with custom colors,
 * directional arrows, weighted edges, and noise/unverified lead filtering.
 */

export const ENTITY_TYPES = {
  CASE: 'Case / Incident',
  SUSPECT: 'Suspect',
  VICTIM: 'Victim',
  WITNESS: 'Witness',
  VEHICLE: 'Vehicle',
  PHONE: 'Phone',
  WEAPON: 'Weapon',
  DOCUMENT: 'Document',
  INVESTIGATION: 'Investigation Entity',
};

export const ENTITY_COLORS = {
  CASE: '#8C532B',    // Warm Saddle Brown (Accent)
  SUSPECT: '#A83A32', // Warm Terracotta Red (Danger)
  VICTIM: '#C27D26',  // Warm Ochre Amber (Warning)
  WITNESS: '#7A6D63', // Warm Umber Slate
  VEHICLE: '#4A6B53', // Earthy Sage Green (Success)
  PHONE: '#9E6738',   // Amber Leather Brown
  WEAPON: '#84392F',  // Deep Rust Terracotta
  DOCUMENT: '#475569', // Slate
  INVESTIGATION: '#0891B2', // Cyan
};

export const RELATION_LABELS = {
  CO_SUSPECT: 'CO_SUSPECT',
  ASSAULTED: 'ASSAULTED',
  OWNS_VEHICLE: 'OWNS_VEHICLE',
  OWNS_PHONE: 'OWNS_PHONE',
  FINANCIAL_TRANSFER: 'FINANCIAL_TRANSFER',
  POSSESSED_WEAPON: 'POSSESSED_WEAPON',
  WITNESSED: 'WITNESSED',
};

const LIVE_EDGE_COLORS = {
  HAS_DOCUMENT: '#0F766E',
  MENTIONS: '#0891B2',
  OWNS: '#DB2777',
  USES: '#CA8A04',
  CALLED: '#7C3AED',
  HAS_LICENSE: '#16A34A',
};

function liveEntityType(node) {
  const labels = node.labels || [];
  const entityType = String(node.data?.entity_type || '').toUpperCase();
  if (labels.includes('Case')) return 'CASE';
  if (labels.includes('Document')) return 'DOCUMENT';
  if (labels.includes('Vehicle') || entityType === 'VEHICLE') return 'VEHICLE';
  if (labels.includes('Phone') || entityType === 'PHONE') return 'PHONE';
  if (labels.includes('Weapon') || entityType === 'WEAPON') return 'WEAPON';
  if (labels.includes('Person') || entityType === 'PERSON') return 'SUSPECT';
  return 'INVESTIGATION';
}

function liveLabel(node) {
  const data = node.data || {};
  const value = data.name || data.value || data.entity_value || data.phone_number
    || data.registration_number || data.account_number || data.filename || data.case_id || node.id;
  const type = data.entity_type || node.labels?.[0] || 'Entity';
  return `${value}\n[${type}]`;
}

/** Transform the case-scoped Neo4j API payload into a vis-network dataset. */
export function parseNeo4jGraph(graphData, options = {}) {
  const { filterType = 'ALL', searchQuery = '' } = options;
  const rawEntitiesMap = {};
  const allNodes = (graphData?.nodes || []).map((node) => {
    const entityType = liveEntityType(node);
    const color = ENTITY_COLORS[entityType] || ENTITY_COLORS.INVESTIGATION;
    const data = { ...(node.data || {}), id: node.id, labels: node.labels || [], entityCategory: entityType };
    rawEntitiesMap[node.id] = data;
    return {
      id: node.id,
      label: liveLabel(node),
      title: `<b>${data.name || data.value || data.filename || node.id}</b><br/>${(node.labels || []).join(', ')}<br/>${data.description || ''}`,
      shape: entityType === 'PHONE' || entityType === 'VEHICLE' ? 'ellipse' : 'box',
      margin: 10,
      borderWidth: entityType === 'CASE' ? 3 : 2,
      color: { background: color, border: color, highlight: { background: color, border: '#0F172A' } },
      font: { color: entityType === 'PHONE' ? '#0F172A' : '#FFFFFF', face: 'Inter, sans-serif', size: 11, bold: true, multi: true },
      shadow: { enabled: true, color: `${color}66`, size: 6, x: 0, y: 2 },
      entityType,
      entityData: data,
    };
  });

  const allNodeIds = new Set(allNodes.map((node) => node.id));
  const allEdges = (graphData?.edges || [])
    .filter((edge) => allNodeIds.has(edge.source) && allNodeIds.has(edge.target))
    .map((edge, index) => ({
      id: `${edge.source}-${edge.target}-${edge.type}-${index}`,
      from: edge.source,
      to: edge.target,
      label: edge.type,
      title: `<b>${edge.type}</b>`,
      arrows: { to: { enabled: true, scaleFactor: 0.7 } },
      color: { color: LIVE_EDGE_COLORS[edge.type] || RELATION_COLORS.DEFAULT, highlight: '#0F172A' },
      width: edge.type === 'MENTIONS' ? 1.5 : 2.2,
      font: { size: 9, face: 'JetBrains Mono, monospace', strokeWidth: 3, strokeColor: '#FFFFFF' },
      edgeData: edge.data || edge,
    }));

  const query = searchQuery.trim().toLowerCase();
  const filteredNodes = allNodes.filter((node) => {
    // Documents are the evidence bridge between a case and its entities; keep
    // them visible while filtering so the selected entities retain their edges.
    if (filterType !== 'ALL' && node.entityType !== filterType && node.entityType !== 'CASE' && node.entityType !== 'DOCUMENT') return false;
    if (!query) return true;
    return `${node.id} ${node.label} ${JSON.stringify(node.entityData)}`.toLowerCase().includes(query);
  });
  const visibleIds = new Set(filteredNodes.map((node) => node.id));
  const visibleEdges = allEdges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to));

  return {
    nodes: filteredNodes,
    edges: visibleEdges,
    rawEntitiesMap,
    summaryStats: {
      totalNodes: allNodes.length,
      visibleNodes: filteredNodes.length,
      totalEdges: allEdges.length,
      visibleEdges: visibleEdges.length,
    },
  };
}

const RELATION_COLORS = {
  CO_SUSPECT: '#A83A32',
  ASSAULTED: '#A83A32',
  OWNS_VEHICLE: '#4A6B53',
  OWNS_PHONE: '#9E6738',
  FINANCIAL_TRANSFER: '#C27D26',
  POSSESSED_WEAPON: '#84392F',
  WITNESSED: '#7A6D63',
  DEFAULT: '#B8ADA2',
};

/**
 * Parses raw case data into vis-network compatible nodes and edges.
 * @param {Object} caseData - Active case JSON object
 * @param {Object} options - { showNoise: boolean, filterType: string, searchQuery: string }
 */
export function parseCaseToGraph(caseData, options = {}) {
  const {
    showNoise = true,
    filterType = 'ALL',
    searchQuery = '',
  } = options;

  if (!caseData) {
    return { nodes: [], edges: [], rawEntitiesMap: {}, summaryStats: {} };
  }

  const nodes = [];
  const edges = [];
  const rawEntitiesMap = {};

  // 1. Parse Case Node (Incident)
  const caseNodeId = caseData.case_id;
  const caseNode = {
    id: caseNodeId,
    label: `${caseData.case_id}\n${caseData.crime_type}`,
    title: `<b>${caseData.case_title}</b><br/>FIR: ${caseData.fir_number}<br/>PS: ${caseData.police_station}`,
    shape: 'box',
    margin: 12,
    borderWidth: 3,
    color: {
      background: ENTITY_COLORS.CASE,
      border: '#059669',
      highlight: { background: '#059669', border: '#022c22' },
      hover: { background: '#34D399', border: '#059669' },
    },
    font: {
      color: '#FFFFFF',
      face: 'Inter, sans-serif',
      size: 14,
      bold: true,
      multi: true,
    },
    shadow: { enabled: true, color: 'rgba(16, 185, 129, 0.4)', size: 10, x: 0, y: 3 },
    entityType: 'CASE',
    entityData: {
      id: caseData.case_id,
      name: caseData.case_title,
      fir_number: caseData.fir_number,
      police_station: caseData.police_station,
      investigating_officer: caseData.investigating_officer,
      crime_type: caseData.crime_type,
      ipc_sections: caseData.ipc_sections,
      threat_level: caseData.threat_level,
      sync_status: caseData.sync_status,
      master_plot: caseData.master_plot,
      modus_operandi: caseData.modus_operandi,
    },
  };
  nodes.push(caseNode);
  rawEntitiesMap[caseNodeId] = caseNode.entityData;

  // 2. Parse Suspects
  (caseData.suspects || []).forEach((suspect) => {
    const node = {
      id: suspect.id,
      label: `${suspect.name}\n[${suspect.alias || suspect.role}]`,
      title: `<b>Suspect:</b> ${suspect.name}<br/><b>Role:</b> ${suspect.role}<br/><b>Status:</b> ${suspect.status}`,
      shape: 'box',
      margin: 10,
      borderWidth: 2,
      color: {
        background: ENTITY_COLORS.SUSPECT,
        border: '#B91C1C',
        highlight: { background: '#B91C1C', border: '#450A0A' },
        hover: { background: '#F87171', border: '#B91C1C' },
      },
      font: {
        color: '#FFFFFF',
        face: 'Inter, sans-serif',
        size: 12,
        bold: true,
        multi: true,
      },
      shadow: { enabled: true, color: 'rgba(239, 68, 68, 0.35)', size: 8, x: 0, y: 2 },
      entityType: 'SUSPECT',
      entityData: { ...suspect, entityCategory: 'Suspect' },
    };
    nodes.push(node);
    rawEntitiesMap[suspect.id] = node.entityData;
  });

  // 3. Parse Victims
  (caseData.victims || []).forEach((victim) => {
    const node = {
      id: victim.id,
      label: `${victim.name}\n(Victim)`,
      title: `<b>Victim:</b> ${victim.name}<br/><b>Loss:</b> ${victim.loss_amount}`,
      shape: 'box',
      margin: 8,
      borderWidth: 2,
      color: {
        background: ENTITY_COLORS.VICTIM,
        border: '#D97706',
        highlight: { background: '#D97706', border: '#78350F' },
        hover: { background: '#FBBF24', border: '#D97706' },
      },
      font: {
        color: '#0F172A',
        face: 'Inter, sans-serif',
        size: 12,
        bold: true,
        multi: true,
      },
      shadow: { enabled: true, color: 'rgba(245, 158, 11, 0.35)', size: 6, x: 0, y: 2 },
      entityType: 'VICTIM',
      entityData: { ...victim, entityCategory: 'Victim' },
    };
    nodes.push(node);
    rawEntitiesMap[victim.id] = node.entityData;
  });

  // 4. Parse Witnesses
  (caseData.witnesses || []).forEach((witness) => {
    const node = {
      id: witness.id,
      label: `${witness.name}\n(Witness)`,
      title: `<b>Witness:</b> ${witness.name}<br/><b>Designation:</b> ${witness.designation}`,
      shape: 'box',
      margin: 8,
      borderWidth: 2,
      color: {
        background: ENTITY_COLORS.WITNESS,
        border: '#1D4ED8',
        highlight: { background: '#1D4ED8', border: '#172554' },
        hover: { background: '#60A5FA', border: '#1D4ED8' },
      },
      font: {
        color: '#FFFFFF',
        face: 'Inter, sans-serif',
        size: 12,
        bold: true,
        multi: true,
      },
      shadow: { enabled: true, color: 'rgba(59, 130, 246, 0.35)', size: 6, x: 0, y: 2 },
      entityType: 'WITNESS',
      entityData: { ...witness, entityCategory: 'Witness' },
    };
    nodes.push(node);
    rawEntitiesMap[witness.id] = node.entityData;
  });

  // 5. Parse Vehicles
  (caseData.vehicles || []).forEach((vehicle) => {
    const node = {
      id: vehicle.id,
      label: `${vehicle.reg_number}\n${vehicle.model.split(' ')[0]}`,
      title: `<b>Vehicle:</b> ${vehicle.reg_number}<br/><b>Model:</b> ${vehicle.model}<br/><b>Status:</b> ${vehicle.status}`,
      shape: 'ellipse',
      borderWidth: 2,
      color: {
        background: ENTITY_COLORS.VEHICLE,
        border: '#BE185D',
        highlight: { background: '#BE185D', border: '#500724' },
        hover: { background: '#F472B6', border: '#BE185D' },
      },
      font: {
        color: '#FFFFFF',
        face: 'Inter, sans-serif',
        size: 11,
        bold: true,
        multi: true,
      },
      shadow: { enabled: true, color: 'rgba(236, 72, 153, 0.35)', size: 6, x: 0, y: 2 },
      entityType: 'VEHICLE',
      entityData: { ...vehicle, name: `${vehicle.reg_number} (${vehicle.model})`, entityCategory: 'Vehicle' },
    };
    nodes.push(node);
    rawEntitiesMap[vehicle.id] = node.entityData;
  });

  // 6. Parse Phones
  (caseData.phones || []).forEach((phone) => {
    const node = {
      id: phone.id,
      label: `${phone.number}\n(${phone.user?.split(' ')[0] || 'Phone'})`,
      title: `<b>Phone:</b> ${phone.number}<br/><b>IMEI:</b> ${phone.imei}<br/><b>Carrier:</b> ${phone.carrier}`,
      shape: 'ellipse',
      borderWidth: 2,
      color: {
        background: ENTITY_COLORS.PHONE,
        border: '#A16207',
        highlight: { background: '#A16207', border: '#422006' },
        hover: { background: '#FACC15', border: '#A16207' },
      },
      font: {
        color: '#0F172A',
        face: 'JetBrains Mono, monospace',
        size: 11,
        bold: true,
        multi: true,
      },
      shadow: { enabled: true, color: 'rgba(234, 179, 8, 0.35)', size: 6, x: 0, y: 2 },
      entityType: 'PHONE',
      entityData: { ...phone, name: phone.number, entityCategory: 'Phone' },
    };
    nodes.push(node);
    rawEntitiesMap[phone.id] = node.entityData;
  });

  // 7. Parse Weapons
  (caseData.weapons || []).forEach((weapon) => {
    const node = {
      id: weapon.id,
      label: `${weapon.type.split('(')[0].trim()}`,
      title: `<b>Weapon:</b> ${weapon.type}<br/><b>Status:</b> ${weapon.status}<br/><b>Possessed:</b> ${weapon.possessed_by}`,
      shape: 'diamond',
      size: 26,
      borderWidth: 2,
      color: {
        background: ENTITY_COLORS.WEAPON,
        border: '#6D28D9',
        highlight: { background: '#6D28D9', border: '#2E1065' },
        hover: { background: '#A78BFA', border: '#6D28D9' },
      },
      font: {
        color: '#FFFFFF',
        face: 'Inter, sans-serif',
        size: 11,
        bold: true,
      },
      shadow: { enabled: true, color: 'rgba(139, 92, 246, 0.35)', size: 6, x: 0, y: 2 },
      entityType: 'WEAPON',
      entityData: { ...weapon, name: weapon.type, entityCategory: 'Weapon' },
    };
    nodes.push(node);
    rawEntitiesMap[weapon.id] = node.entityData;
  });

  // Calculate cumulative financial transfers and add to entities
  const financialTotals = {};
  (caseData.financial_transfers || []).forEach((txn) => {
    if (!financialTotals[txn.from_entity]) financialTotals[txn.from_entity] = { sent: 0, received: 0, list: [] };
    if (!financialTotals[txn.to_entity]) financialTotals[txn.to_entity] = { sent: 0, received: 0, list: [] };
    
    financialTotals[txn.from_entity].list.push(txn);
    financialTotals[txn.to_entity].list.push(txn);
  });

  // Attach financial & relational references into rawEntitiesMap
  Object.keys(rawEntitiesMap).forEach((id) => {
    rawEntitiesMap[id].financials = financialTotals[id] || { sent: 0, received: 0, list: [] };
  });

  // 8. Parse Edges
  (caseData.edges || []).forEach((edge) => {
    // If edge is marked as noise and showNoise is false, skip it
    if (edge.is_noise && !showNoise) {
      return;
    }

    const baseColor = RELATION_COLORS[edge.relation] || RELATION_COLORS.DEFAULT;
    const isNoise = !!edge.is_noise;

    // Edge thickness scales with weight (requested: 1 to 5)
    const edgeWidth = Math.max(1.8, (edge.weight || 1) * 1.4);

    const edgeObj = {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.relation,
      title: `<b>${edge.relation}</b> (Weight: ${edge.weight})<br/>${edge.notes || ''}${isNoise ? '<br/><span style="color:#F87171">[Unverified / Noise Lead]</span>' : ''}`,
      arrows: {
        to: {
          enabled: true,
          scaleFactor: 0.85,
        },
      },
      color: isNoise
        ? { color: '#94A3B8', highlight: '#64748B', hover: '#475569', opacity: 0.7 }
        : { color: baseColor, highlight: '#0F172A', hover: baseColor, opacity: 0.95 },
      dashes: isNoise ? [6, 6] : false, // Dashed lines for noise/unverified
      width: edgeWidth,
      font: {
        color: isNoise ? '#64748B' : '#0F172A',
        size: 10,
        face: 'JetBrains Mono, monospace',
        strokeWidth: 3,
        strokeColor: '#FFFFFF',
        align: 'middle',
      },
      smooth: {
        enabled: true,
        type: 'continuous',
        roundness: 0.25,
      },
      edgeData: edge,
    };

    edges.push(edgeObj);
  });

  // 9. Filter Nodes by Type or Search Query if specified
  let filteredNodes = nodes;
  if (filterType !== 'ALL') {
    filteredNodes = filteredNodes.filter(n => n.entityType === filterType || n.entityType === 'CASE');
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    filteredNodes = filteredNodes.filter((node) => {
      const data = node.entityData || {};
      return (
        node.id.toLowerCase().includes(q) ||
        (data.name && data.name.toLowerCase().includes(q)) ||
        (data.alias && data.alias.toLowerCase().includes(q)) ||
        (data.pan_number && data.pan_number.toLowerCase().includes(q)) ||
        (data.phone && data.phone.toLowerCase().includes(q)) ||
        (data.number && data.number.toLowerCase().includes(q)) ||
        (data.reg_number && data.reg_number.toLowerCase().includes(q)) ||
        (data.role && data.role.toLowerCase().includes(q)) ||
        (data.status && data.status.toLowerCase().includes(q))
      );
    });
  }

  // Keep only edges connecting valid visible nodes
  const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
  const validEdges = edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));

  const summaryStats = {
    totalNodes: nodes.length,
    visibleNodes: filteredNodes.length,
    totalEdges: edges.length,
    visibleEdges: validEdges.length,
    suspectsCount: (caseData.suspects || []).length,
    victimsCount: (caseData.victims || []).length,
    witnessesCount: (caseData.witnesses || []).length,
    vehiclesCount: (caseData.vehicles || []).length,
    phonesCount: (caseData.phones || []).length,
    weaponsCount: (caseData.weapons || []).length,
    financialTransfersCount: (caseData.financial_transfers || []).length,
    noiseEdgesCount: (caseData.edges || []).filter(e => e.is_noise).length,
  };

  return {
    nodes: filteredNodes,
    edges: validEdges,
    rawEntitiesMap,
    summaryStats,
  };
}
