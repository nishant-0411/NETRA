import { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

const LABEL_COLORS = {
  Person: '#4a7fd4',
  Phone: '#e67e22',
  Vehicle: '#27ae60',
  Account: '#9b59b6',
  Document: '#7f8c8d',
  Location: '#e74c3c',
  Organization: '#2c3e50',
  License: '#16a085',
}

function getColor(labels) {
  if (!labels || !labels.length) return '#95a5a6'
  for (const l of labels) {
    if (LABEL_COLORS[l]) return LABEL_COLORS[l]
  }
  return '#95a5a6'
}

export default function NetworkGraph({ graphData, onNodeClick, onEdgeClick, onExplore }) {
  const fgRef = useRef()
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const containerRef = useRef()

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight || 500,
        })
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Transform backend data to force-graph format
  const data = {
    nodes: (graphData?.nodes || []).map(n => ({
      id: n.id,
      name: n.properties?.name || n.properties?.phone_number || n.properties?.registration_number || n.labels?.[0] || 'Unknown',
      labels: n.labels || [],
      properties: n.properties || {},
      color: getColor(n.labels),
      val: n.labels?.includes('Person') ? 8 : 5,
    })),
    links: (graphData?.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      properties: e.properties || {},
    })),
  }

  const handleNodeClick = useCallback((node) => {
    if (onNodeClick) onNodeClick(node)
  }, [onNodeClick])

  const handleLinkClick = useCallback((link) => {
    if (onEdgeClick) onEdgeClick(link)
  }, [onEdgeClick])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const label = node.name || ''
    const fontSize = Math.max(10 / globalScale, 3)
    const r = Math.sqrt(node.val || 5) * 3

    // Circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
    ctx.fillStyle = node.color
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5 / globalScale
    ctx.stroke()

    // Label
    if (globalScale > 0.6) {
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#333'
      ctx.fillText(label.substring(0, 16), node.x, node.y + r + 2)
    }
  }, [])

  const linkLabel = useCallback((link) => {
    return link.type || ''
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 400 }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        width={dimensions.width}
        height={dimensions.height}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node, color, ctx) => {
          const r = Math.sqrt(node.val || 5) * 3
          ctx.beginPath()
          ctx.arc(node.x, node.y, r + 2, 0, 2 * Math.PI)
          ctx.fillStyle = color
          ctx.fill()
        }}
        onNodeClick={handleNodeClick}
        onLinkClick={handleLinkClick}
        linkLabel={linkLabel}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkColor={() => '#bcc7d6'}
        linkWidth={1.5}
        cooldownTicks={80}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.3}
      />
    </div>
  )
}
