import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Filter, 
  Search, 
  EyeOff, 
  Eye, 
  Sparkles, 
  Sliders, 
  Camera, 
  Info,
  Shield,
  Layers,
  Network as NetworkIcon,
  Activity,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-react';
import { parseCaseToGraph, parseNeo4jGraph, ENTITY_COLORS, ENTITY_TYPES } from '../utils/graphParser';
import { getCaseGraph, runCaseGraphAnalytics } from '../services/graphService';
import CaseSimilarityDrawer from './CaseSimilarityDrawer';

export default function NetworkGraph({ 
  caseData, 
  onSelectEntity, 
  selectedEntityId,
  isMini = false,
  onExpand,
  onSelectCase,
  height = 'calc(100vh - 120px)'
}) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const dataRef = useRef({ nodesDataSet: null, edgesDataSet: null });

  // Filter & Control States
  const [showNoise, setShowNoise] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [activeLegendFilter, setActiveLegendFilter] = useState(null);
  const [backendGraphData, setBackendGraphData] = useState(null);
  const [graphAccessState, setGraphAccessState] = useState('loading');
  const [graphAccessError, setGraphAccessError] = useState(null);
  const [analyticsResult, setAnalyticsResult] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(null);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [isSimilarityOpen, setIsSimilarityOpen] = useState(false);

  // Fetch backend graph data on active case change
  useEffect(() => {
    if (!caseData?.case_id) return;
    let isMounted = true;
    setGraphAccessState('loading');
    setGraphAccessError(null);
    setBackendGraphData(null);
    getCaseGraph(caseData.case_id).then((graphResult) => {
      if (!isMounted) return;
      if (graphResult?.error || graphResult?.status === 'error') {
        setGraphAccessState('denied');
        setGraphAccessError(graphResult.error || 'Graph data is unavailable.');
        return;
      }
      setBackendGraphData(graphResult);
      setGraphAccessState('authorized');
    });
    return () => {
      isMounted = false;
    };
  }, [caseData?.case_id]);

  useEffect(() => {
    setAnalyticsResult(null);
    setAnalyticsLoading(null);
    setAnalyticsError(null);
    setActiveLegendFilter(null);
    setFilterType('ALL');
  }, [caseData?.case_id]);

  const handleRunAnalytics = async (analysis) => {
    if (!caseData?.case_id || analyticsLoading) return;
    setAnalyticsLoading(analysis);
    setAnalyticsError(null);
    try {
      const result = await runCaseGraphAnalytics(caseData.case_id, analysis);
      setAnalyticsResult({ analysis, result });
    } catch (error) {
      setAnalyticsResult(null);
      setAnalyticsError(error.message || 'Unable to run graph analysis.');
    } finally {
      setAnalyticsLoading(null);
    }
  };

  const analyticsItems = useMemo(() => {
    if (!analyticsResult) return [];
    if (analyticsResult.analysis === 'communities') return analyticsResult.result.communities || [];
    if (analyticsResult.analysis === 'centrality') return analyticsResult.result.central_nodes || [];
    return analyticsResult.result.anomalies || [];
  }, [analyticsResult]);

  // Parse nodes & edges whenever caseData, showNoise, filterType, or searchQuery changes
  const { nodes, edges, rawEntitiesMap, summaryStats } = useMemo(() => {
    const options = {
      showNoise,
      filterType: activeLegendFilter || filterType,
      searchQuery,
    };
    if (backendGraphData?.nodes) {
      return parseNeo4jGraph(backendGraphData, options);
    }
    return parseCaseToGraph(caseData, {
      ...options,
    });
  }, [caseData, backendGraphData, showNoise, filterType, activeLegendFilter, searchQuery]);
  console.log("GRAPH NODES:", nodes)
  console.log("GRAPH EDGES:", edges)
  console.log("GRAPH STATS:", summaryStats)
  console.log("BACKEND GRAPH:", backendGraphData)
  // Initialize or update vis-network
  useEffect(() => {
    if (!containerRef.current || graphAccessState !== 'authorized') return;

    const nodesDataSet = new DataSet(nodes);
    const edgesDataSet = new DataSet(edges);
    dataRef.current = { nodesDataSet, edgesDataSet };

    const data = {
      nodes: nodesDataSet,
      edges: edgesDataSet,
    };

    const options = {
      autoResize: true,
      height: '100%',
      width: '100%',
      nodes: {
        shape: 'box',
        shapeProperties: {
          borderRadius: 6,
        },
        font: {
          face: 'Inter, system-ui, sans-serif',
          color: '#0F172A',
          size: 12,
        },
      },
      edges: {
        font: {
          size: 10,
          face: 'JetBrains Mono, monospace',
          strokeWidth: 3,
          strokeColor: '#FFFFFF',
          align: 'middle',
        },
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.2,
        },
      },
      physics: {
        enabled: physicsEnabled,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -70,
          centralGravity: 0.015,
          springLength: 130,
          springConstant: 0.08,
          damping: 0.85,
          avoidOverlap: 0.7,
        },
        stabilization: {
          enabled: true,
          iterations: 150,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        selectable: true,
        selectConnectedEdges: true,
        multiselect: false,
        navigationButtons: false,
        keyboard: false,
        zoomView: true,
        dragView: true,
      },
    };

    // Instantiate Network
    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;
    network.once('stabilizationIterationsDone', () => {
      network.fit({ animation: { duration: 350, easingFunction: 'easeInOutQuad' } });
    });

    // Node click handler: open entity drawer
    network.on('click', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0];
        const entityData = rawEntitiesMap[clickedNodeId];
        if (entityData && onSelectEntity) {
          onSelectEntity(entityData);
        }
      }
    });

    // Hover cursor styling
    network.on('hoverNode', () => {
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';
    });
    network.on('blurNode', () => {
      if (containerRef.current) containerRef.current.style.cursor = 'default';
    });

    // Cleanup
    return () => {
      if (network) {
        network.destroy();
      }
    };
  }, [caseData?.case_id, backendGraphData, graphAccessState, showNoise, filterType, activeLegendFilter, searchQuery]);

  // Select node programmatically if selectedEntityId changes
  useEffect(() => {
    if (networkRef.current && selectedEntityId) {
      try {
        networkRef.current.selectNodes([selectedEntityId]);
        networkRef.current.focus(selectedEntityId, {
          scale: 1.1,
          animation: { duration: 600, easingFunction: 'easeInOutQuad' },
        });
      } catch (err) {
        // Node may not be visible in filtered state
      }
    }
  }, [selectedEntityId]);

  // Canvas Control Handlers
  const handleZoomIn = () => {
    if (!networkRef.current) return;
    const scale = networkRef.current.getScale() * 1.3;
    networkRef.current.moveTo({ scale, animation: { duration: 250 } });
  };

  const handleZoomOut = () => {
    if (!networkRef.current) return;
    const scale = networkRef.current.getScale() * 0.75;
    networkRef.current.moveTo({ scale, animation: { duration: 250 } });
  };

  const handleResetFit = () => {
    if (!networkRef.current) return;
    networkRef.current.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  };

  const handleTogglePhysics = () => {
    if (!networkRef.current) return;
    const nextState = !physicsEnabled;
    setPhysicsEnabled(nextState);
    networkRef.current.setOptions({ physics: { enabled: nextState } });
  };

  const handleExportSnapshot = () => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (canvas) {
      const imageURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `NETRA_GRAPH_${caseData?.case_id || 'EXPORT'}_${Date.now()}.png`;
      link.href = imageURL;
      link.click();
    }
  };

  return (
    <div className={`relative bg-white rounded-xl border border-[#DDD4C7] shadow-xs flex flex-col overflow-hidden ${isMini ? 'h-[440px]' : ''}`} style={!isMini ? { height } : {}}>
      {/* Top Controls Toolbar */}
      <div className="px-4 py-2.5 bg-[#F5EFEB] border-b border-[#DDD4C7] flex flex-wrap items-center justify-between gap-3 text-xs z-10 select-none">
        {/* Left: Search & Filter Type */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A6D63]" />
            <input
              type="text"
              id="graph-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, PAN, phone, plate..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-[#DDD4C7] bg-white text-[#2B211C] placeholder-[#7A6D63] focus:outline-hidden focus:ring-2 focus:ring-[#8C532B]/30 focus:border-[#8C532B] text-xs w-52 sm:w-64"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A6D63] hover:text-[#2B211C] text-[11px] font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Noise / Unverified Leads Toggle Switch */}
          <button
            id="toggle-noise-leads-btn"
            onClick={() => setShowNoise(!showNoise)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border transition-all ${
              showNoise 
                ? 'bg-[#C27D26]/15 text-[#C27D26] border-[#C27D26]/40 hover:bg-[#C27D26]/25' 
                : 'bg-white text-[#7A6D63] border-[#DDD4C7] hover:bg-[#F5EFEB]'
            }`}
            title="Dashed lines denote unverified leads / CDR overlaps"
          >
            {showNoise ? <Eye className="w-3.5 h-3.5 text-[#C27D26]" /> : <EyeOff className="w-3.5 h-3.5 text-[#7A6D63]" />}
            <span>Noise / Unverified Leads</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono-code font-bold ${
              showNoise ? 'bg-[#C27D26] text-white' : 'bg-[#EDE4D8] text-[#7A6D63]'
            }`}>
              {showNoise ? 'SHOWN' : 'HIDDEN'}
            </span>
          </button>
        </div>

        {/* Right: Canvas Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleRunAnalytics('communities')}
            disabled={Boolean(analyticsLoading) || graphAccessState !== 'authorized'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DDD4C7] bg-white text-[#2B211C] hover:bg-[#F5EFEB] disabled:cursor-wait disabled:opacity-60 transition-colors text-xs font-medium shadow-2xs cursor-pointer"
            title="Detect closely connected entity groups"
          >
            {analyticsLoading === 'communities' ? <LoaderCircle className="w-3.5 h-3.5 animate-spin text-[#8C532B]" /> : <NetworkIcon className="w-3.5 h-3.5 text-[#8C532B]" />}
            <span className="hidden lg:inline">Communities</span>
          </button>
          <button
            onClick={() => handleRunAnalytics('centrality')}
            disabled={Boolean(analyticsLoading) || graphAccessState !== 'authorized'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DDD4C7] bg-white text-[#2B211C] hover:bg-[#F5EFEB] disabled:cursor-wait disabled:opacity-60 transition-colors text-xs font-medium shadow-2xs cursor-pointer"
            title="Rank influential entities using PageRank"
          >
            {analyticsLoading === 'centrality' ? <LoaderCircle className="w-3.5 h-3.5 animate-spin text-[#4A6B53]" /> : <Activity className="w-3.5 h-3.5 text-[#4A6B53]" />}
            <span className="hidden lg:inline">Centrality</span>
          </button>
          <button
            onClick={() => handleRunAnalytics('anomalies')}
            disabled={Boolean(analyticsLoading) || graphAccessState !== 'authorized'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DDD4C7] bg-white text-[#2B211C] hover:bg-[#F5EFEB] disabled:cursor-wait disabled:opacity-60 transition-colors text-xs font-medium shadow-2xs cursor-pointer"
            title="Find unusually well-connected entities"
          >
            {analyticsLoading === 'anomalies' ? <LoaderCircle className="w-3.5 h-3.5 animate-spin text-[#C27D26]" /> : <AlertTriangle className="w-3.5 h-3.5 text-[#C27D26]" />}
            <span className="hidden lg:inline">Anomalies</span>
          </button>
          <button
            onClick={handleZoomIn}
            id="btn-graph-zoom-in"
            className="p-1.5 rounded-lg border border-[#DDD4C7] bg-white text-[#2B211C] hover:bg-[#F5EFEB] transition-colors shadow-2xs cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            id="btn-graph-zoom-out"
            className="p-1.5 rounded-lg border border-[#DDD4C7] bg-white text-[#2B211C] hover:bg-[#F5EFEB] transition-colors shadow-2xs cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetFit}
            id="btn-graph-fit-view"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DDD4C7] bg-white text-[#2B211C] hover:bg-[#F5EFEB] transition-colors text-xs font-medium shadow-2xs cursor-pointer"
            title="Reset & Fit View"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#8C532B]" />
            <span className="hidden sm:inline">Fit Graph</span>
          </button>

          <button
            onClick={handleTogglePhysics}
            id="btn-graph-toggle-physics"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors shadow-2xs cursor-pointer ${
              physicsEnabled 
                ? 'bg-[#8C532B]/15 border-[#8C532B]/40 text-[#8C532B]' 
                : 'bg-white border-[#DDD4C7] text-[#7A6D63]'
            }`}
            title="Toggle physics simulation / fix node positions"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{physicsEnabled ? 'Physics ON' : 'Physics Free'}</span>
          </button>

          <button
            onClick={handleExportSnapshot}
            id="btn-graph-export-png"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DDD4C7] bg-white text-[#2B211C] hover:bg-[#F5EFEB] transition-colors text-xs font-medium shadow-2xs cursor-pointer"
            title="Export Graph as PNG Image"
          >
            <Camera className="w-3.5 h-3.5 text-[#8C532B]" />
            <span className="hidden sm:inline">Export PNG</span>
          </button>

          {/* AI Case Similarity Button near Full Screen */}
          <button
            onClick={() => setIsSimilarityOpen(true)}
            id="btn-graph-ai-similarity"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#261B16] hover:bg-[#382822] text-white transition-all text-xs font-semibold shadow-xs cursor-pointer active:scale-95 border border-[#8C532B]/40"
            title="AI Cross-Case Similarity & Pattern Engine"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C27D26] animate-pulse" />
            <span>AI Similarity</span>
          </button>

          {isMini && onExpand && (
            <button
              onClick={onExpand}
              id="btn-graph-expand-fullscreen"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#8C532B] text-white hover:bg-[#703F1E] transition-colors text-xs font-semibold shadow-xs cursor-pointer"
              title="Expand to Full View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
          )}
        </div>
      </div>

      {/* Network Canvas Container */}
      <div className="relative flex-1 w-full bg-[#FAF7F2] overflow-hidden">
        {graphAccessState !== 'authorized' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            {graphAccessState === 'loading' ? (
              <LoaderCircle className="w-7 h-7 animate-spin text-[#8C532B]" />
            ) : (
              <Shield className="w-8 h-8 text-[#C27D26]" />
            )}
            <div className="text-sm font-semibold text-[#2B211C]">
              {graphAccessState === 'loading' ? 'Checking case access…' : 'Case graph access required'}
            </div>
            <div className="max-w-md text-xs text-[#7A6D63]">
              {graphAccessState === 'loading'
                ? 'Verifying your investigator permissions.'
                : graphAccessError || 'Ask the case lead investigator to grant access.'}
            </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 select-none">
              <Shield className="w-96 h-96 text-[#261B16]" />
            </div>
            <div
              ref={containerRef}
              className="w-full h-full vis-network-container"
              style={{ minHeight: isMini ? '340px' : '480px' }}
            />
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg border border-[#DDD4C7] shadow-md pointer-events-none select-none text-[11px] font-mono-code space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4A6B53] animate-ping"></span>
                <span className="font-bold text-[#2B211C]">NETRA LINK ANALYZER</span>
              </div>
              <div className="text-[#7A6D63]">
                Entities: <strong className="text-[#8C532B]">{summaryStats.visibleNodes}</strong> / {summaryStats.totalNodes}
                <span className="mx-1 text-[#DDD4C7]">•</span>
                Edges: <strong className="text-[#8C532B]">{summaryStats.visibleEdges}</strong>
              </div>
              <div className="text-[10px] text-[#7A6D63]/80">Click any node for forensic dossier</div>
            </div>
            {(analyticsResult || analyticsError) && (
              <div className="absolute top-3 right-3 max-w-xs bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg border border-[#DDD4C7] shadow-md text-[11px]">
                {analyticsError ? (
                  <div className="text-[#A83A32]">Analytics unavailable: {analyticsError}</div>
                ) : (
                  <>
                    <div className="font-bold uppercase tracking-wide text-[#2B211C]">
                      {analyticsResult.analysis} · {analyticsItems.length} results
                    </div>
                    <div className="mt-1 space-y-0.5 text-[#7A6D63]">
                      {analyticsItems.slice(0, 3).map((item) => (
                        <div key={item.node_id} className="truncate">
                          {item.name}
                          {item.score != null && ` · ${item.score.toFixed(3)}`}
                          {item.degree != null && ` · degree ${item.degree}`}
                          {item.community_id != null && ` · group ${item.community_id}`}
                        </div>
                      ))}
                      {analyticsItems.length === 0 && <div>No notable entities found.</div>}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Node Legend Bar with Click-to-Filter */}
      <div className="px-4 py-2 bg-white border-t border-[#DDD4C7] flex items-center justify-between flex-wrap gap-2 text-xs select-none">
        <div className="flex items-center gap-1.5 text-[#7A6D63] font-semibold text-[11px]">
          <Layers className="w-3.5 h-3.5 text-[#8C532B]" />
          <span>Entities:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {Object.entries(ENTITY_COLORS).map(([typeKey, color]) => {
            const isSelected = activeLegendFilter === typeKey;
            return (
              <button
                key={typeKey}
                onClick={() => setActiveLegendFilter(isSelected ? null : typeKey)}
                className={`flex items-center gap-1.5 px-2 py-0.8 rounded-md transition-all border ${
                  isSelected 
                    ? 'ring-2 ring-[#261B16] shadow-xs font-bold' 
                    : 'hover:bg-[#F5EFEB] border-[#DDD4C7] font-medium'
                }`}
                title={`Filter to show only ${ENTITY_TYPES[typeKey]}`}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-xs shrink-0 shadow-2xs" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] text-[#2B211C]">
                  {ENTITY_TYPES[typeKey]}
                </span>
              </button>
            );
          })}
          {activeLegendFilter && (
            <button
              onClick={() => setActiveLegendFilter(null)}
              className="text-[10px] font-mono-code font-bold text-[#8C532B] hover:underline px-1 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Edge relations hint */}
        <div className="hidden xl:flex items-center gap-2 text-[11px] text-[#7A6D63] font-mono-code">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-[#261B16]"></span> Solid: Verified
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 border-t border-dashed border-[#7A6D63]"></span> Dashed: Noise/Lead
          </span>
        </div>
      </div>

      {/* AI Cross-Case Similarity Drawer - Slides in from right */}
      <CaseSimilarityDrawer
        isOpen={isSimilarityOpen}
        onClose={() => setIsSimilarityOpen(false)}
        activeCase={caseData}
        onSelectCase={onSelectCase}
      />
    </div>
  );
}
