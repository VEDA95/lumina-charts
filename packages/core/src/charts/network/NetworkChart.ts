/**
 * Network chart implementation for node-link graph visualization
 */

import type {
  RenderPass,
  RGBAColor,
  DataDomain,
} from '../../types/index.js';
import type {
  NetworkChartOptions,
  NetworkChartConfig,
  NetworkData,
  NetworkNode,
  NetworkEdge,
  ProcessedNode,
  ProcessedEdge,
  NetworkLayoutType,
} from '../../types/network.js';
import { DEFAULT_GROUP_COLORS } from '../../types/network.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { EdgeRenderPass } from './EdgeRenderPass.js';
import { NodeRenderPass } from './NodeRenderPass.js';
import { ForceLayout } from './layouts/ForceLayout.js';
import { RadialLayout } from './layouts/RadialLayout.js';

/**
 * Default options for network charts
 */
const DEFAULT_OPTIONS: Required<
  Pick<
    NetworkChartOptions,
    | 'layout'
    | 'nodeSizeRange'
    | 'edgeWidthRange'
    | 'edgeCurve'
    | 'edgeOpacity'
    | 'showLabels'
    | 'labelThreshold'
    | 'labelFontSize'
    | 'dimOpacity'
    | 'hoverBrighten'
    | 'showLegend'
    | 'legendPosition'
  >
> = {
  layout: 'force',
  nodeSizeRange: [8, 32],
  edgeWidthRange: [1, 3],
  edgeCurve: 0.2,
  edgeOpacity: 0.6,
  showLabels: true,
  labelThreshold: 12,
  labelFontSize: 11,
  dimOpacity: 0.15,
  hoverBrighten: 1.2,
  showLegend: true,
  legendPosition: 'top-right',
};

/**
 * Network chart for visualizing node-link diagrams
 */
export class NetworkChart extends BaseChart {
  private networkOptions: NetworkChartOptions;
  private edgeRenderPass!: EdgeRenderPass;
  private nodeRenderPass!: NodeRenderPass;

  // Layout calculators
  private forceLayout: ForceLayout;
  private radialLayout: RadialLayout;
  private currentLayout: NetworkLayoutType;

  // Raw data
  private networkData: NetworkData = { nodes: [], edges: [] };

  // Processed data for rendering
  private processedNodes: ProcessedNode[] = [];
  private processedEdges: ProcessedEdge[] = [];

  // Group color mapping
  private groupColorMap: Map<string | number, RGBAColor> = new Map();

  // Hover state
  private hoveredNode: ProcessedNode | null = null;

  // Adjacency map for quick connected node lookup
  private adjacencyMap: Map<string, Set<string>> = new Map();

  // HTML overlays
  private labelContainer: HTMLDivElement | null = null;
  private labelElements: Map<string, HTMLDivElement> = new Map();
  private legendContainer: HTMLDivElement | null = null;

  constructor(config: NetworkChartConfig) {
    const options = config.options ?? {};

    // Network charts typically don't need axes
    const baseConfig: BaseChartConfig = {
      container: config.container,
      options: {
        ...options,
        margins: options.margins ?? { top: 20, right: 20, bottom: 20, left: 20 },
      },
    };

    super(baseConfig);

    this.networkOptions = { ...DEFAULT_OPTIONS, ...options };
    this.currentLayout = this.networkOptions.layout ?? 'force';

    // Initialize layout calculators
    this.forceLayout = new ForceLayout(this.networkOptions.forceLayout);
    this.radialLayout = new RadialLayout(this.networkOptions.radialLayout);

    // Get render passes
    this.edgeRenderPass = this.renderer.getRenderPass('network-edges') as EdgeRenderPass;
    this.nodeRenderPass = this.renderer.getRenderPass('network-nodes') as NodeRenderPass;

    // Setup interactions
    this.setupInteractions();

    // Create label container if labels are enabled
    if (this.networkOptions.showLabels) {
      this.createLabelContainer();
    }

    // Create legend container if legend is enabled
    if (this.networkOptions.showLegend) {
      this.createLegendContainer();
    }
  }

  /**
   * Create render passes
   */
  protected createRenderPasses(): RenderPass[] {
    const passes: RenderPass[] = [];

    // Use defaults since this may be called before networkOptions is initialized
    const dimOpacity = this.networkOptions?.dimOpacity ?? DEFAULT_OPTIONS.dimOpacity;
    const hoverBrighten = this.networkOptions?.hoverBrighten ?? DEFAULT_OPTIONS.hoverBrighten;

    // Add edge render pass (renders first, below nodes)
    passes.push(
      new EdgeRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        dimOpacity,
      })
    );

    // Add node render pass (renders on top)
    passes.push(
      new NodeRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        dimOpacity,
        hoverBrighten,
      })
    );

    return passes;
  }

  /**
   * Setup hover and click interactions
   */
  private setupInteractions(): void {
    const onPointerMove = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const pixelX = (event.clientX - rect.left) * this.pixelRatio;
      const pixelY = (event.clientY - rect.top) * this.pixelRatio;

      const node = this.nodeRenderPass.hitTest(pixelX, pixelY);

      if (node !== this.hoveredNode) {
        // Clear previous hover
        this.clearHighlightState();

        // Set new hover
        this.hoveredNode = node;
        if (node) {
          this.setHighlightState(node);
          this.showTooltip(node, event.clientX, event.clientY);

          // Emit hover event
          this.emit('hover', {
            node,
            connectedNodes: this.getConnectedNodes(node.id),
            position: { x: event.clientX, y: event.clientY },
            originalEvent: event,
          });
        } else {
          this.hideTooltip();
          this.emit('hoverEnd', {});
        }

        this.updateRenderData();
        this.render();
      } else if (node) {
        // Update tooltip position
        this.showTooltip(node, event.clientX, event.clientY);
      }
    };

    const onPointerLeave = () => {
      if (this.hoveredNode) {
        this.clearHighlightState();
        this.hoveredNode = null;
        this.hideTooltip();
        this.emit('hoverEnd', {});
        this.updateRenderData();
        this.render();
      }
    };

    const onClick = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const pixelX = (event.clientX - rect.left) * this.pixelRatio;
      const pixelY = (event.clientY - rect.top) * this.pixelRatio;

      const node = this.nodeRenderPass.hitTest(pixelX, pixelY);

      if (node) {
        // Toggle selection
        node.selected = !node.selected;

        // Emit selection event
        const selectedNodes = this.processedNodes.filter(n => n.selected);
        this.emit('selectionChange', {
          selected: new Set(selectedNodes.map(n => n.id)),
          nodes: selectedNodes,
        });

        this.updateRenderData();
        this.render();
      }
    };

    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerleave', onPointerLeave);
    this.canvas.addEventListener('click', onClick);
  }

  /**
   * Set highlight state for hovered node and its connections
   */
  private setHighlightState(hoveredNode: ProcessedNode): void {
    hoveredNode.hovered = true;
    hoveredNode.highlighted = true;

    // Highlight connected nodes
    const connectedIds = this.adjacencyMap.get(hoveredNode.id) ?? new Set();
    for (const node of this.processedNodes) {
      if (connectedIds.has(node.id)) {
        node.highlighted = true;
      }
    }

    // Highlight connected edges
    for (const edge of this.processedEdges) {
      if (edge.sourceId === hoveredNode.id || edge.targetId === hoveredNode.id) {
        edge.highlighted = true;
      }
    }
  }

  /**
   * Clear highlight state from all nodes and edges
   */
  private clearHighlightState(): void {
    for (const node of this.processedNodes) {
      node.hovered = false;
      node.highlighted = false;
    }
    for (const edge of this.processedEdges) {
      edge.highlighted = false;
    }
  }

  /**
   * Get nodes connected to the given node id
   */
  private getConnectedNodes(nodeId: string): ProcessedNode[] {
    const connectedIds = this.adjacencyMap.get(nodeId) ?? new Set();
    return this.processedNodes.filter(n => connectedIds.has(n.id));
  }

  /**
   * Show tooltip for a node
   */
  private showTooltip(node: ProcessedNode, clientX: number, clientY: number): void {
    const label = node.label ?? node.id;
    const group = node.group !== undefined ? `Group: ${node.group}` : '';
    const connections = this.adjacencyMap.get(node.id)?.size ?? 0;

    const content = `
      <div style="font-weight: bold; margin-bottom: 4px;">${label}</div>
      ${group ? `<div>${group}</div>` : ''}
      <div>Connections: ${connections}</div>
    `;

    this.showTooltipElement(content, clientX, clientY);
  }

  /**
   * Show tooltip element
   */
  private showTooltipElement(content: string, clientX: number, clientY: number): void {
    let tooltip = document.getElementById('lumina-network-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'lumina-network-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        border-radius: 4px;
        font-size: 12px;
        font-family: system-ui, sans-serif;
        pointer-events: none;
        z-index: 10000;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = content;
    tooltip.style.display = 'block';

    // Position tooltip
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = clientX + 12;
    let top = clientY + 12;

    // Keep tooltip on screen
    if (left + tooltipRect.width > window.innerWidth) {
      left = clientX - tooltipRect.width - 12;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = clientY - tooltipRect.height - 12;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const tooltip = document.getElementById('lumina-network-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Create label container for node labels
   */
  private createLabelContainer(): void {
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    `;
    this.getOverlayElement().appendChild(this.labelContainer);
  }

  /**
   * Create legend container
   */
  private createLegendContainer(): void {
    this.legendContainer = document.createElement('div');

    const pos = this.networkOptions.legendPosition ?? 'top-right';
    const positionStyles: Record<string, string> = {
      'top-left': 'top: 10px; left: 10px;',
      'top-right': 'top: 10px; right: 10px;',
      'bottom-left': 'bottom: 10px; left: 10px;',
      'bottom-right': 'bottom: 10px; right: 10px;',
    };

    this.legendContainer.style.cssText = `
      position: absolute;
      ${positionStyles[pos]}
      background: rgba(255, 255, 255, 0.95);
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 11px;
      font-family: system-ui, sans-serif;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      max-height: 200px;
      overflow-y: auto;
    `;
    this.getOverlayElement().appendChild(this.legendContainer);
  }

  /**
   * Update legend content
   */
  private updateLegend(): void {
    if (!this.legendContainer) return;

    const groups = Array.from(this.groupColorMap.entries());
    if (groups.length === 0) {
      this.legendContainer.style.display = 'none';
      return;
    }

    this.legendContainer.style.display = 'block';
    this.legendContainer.innerHTML = groups
      .map(([group, color]) => {
        const [r, g, b, a] = color;
        const colorStr = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
        return `
          <div style="display: flex; align-items: center; margin: 4px 0;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${colorStr}; margin-right: 8px;"></div>
            <span>${group}</span>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Update node labels
   */
  private updateLabels(): void {
    if (!this.labelContainer) return;

    const threshold = (this.networkOptions.labelThreshold ?? DEFAULT_OPTIONS.labelThreshold) * this.pixelRatio;
    const fontSize = this.networkOptions.labelFontSize ?? DEFAULT_OPTIONS.labelFontSize;
    const labelColor = this.networkOptions.labelColor ?? [0.2, 0.2, 0.2, 1];
    const [r, g, b, a] = labelColor;
    const colorStr = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;

    // Track which labels are still needed
    const neededLabels = new Set<string>();

    for (const node of this.processedNodes) {
      // Skip if node is too small or has no label
      if (node.radius < threshold || !node.label) {
        continue;
      }

      const key = node.id;
      neededLabels.add(key);

      let label = this.labelElements.get(key);
      if (!label) {
        label = document.createElement('div');
        label.style.cssText = `
          position: absolute;
          transform: translate(-50%, -50%);
          font-family: system-ui, sans-serif;
          pointer-events: none;
          white-space: nowrap;
          text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;
        `;
        this.labelContainer.appendChild(label);
        this.labelElements.set(key, label);
      }

      label.textContent = node.label;
      label.style.color = colorStr;
      label.style.fontSize = `${fontSize}px`;
      // Position below the node
      label.style.left = `${node.pixelX / this.pixelRatio}px`;
      label.style.top = `${(node.pixelY + node.radius + 8) / this.pixelRatio}px`;
    }

    // Remove labels that are no longer needed
    for (const [key, label] of this.labelElements) {
      if (!neededLabels.has(key)) {
        label.remove();
        this.labelElements.delete(key);
      }
    }
  }

  /**
   * Set network data
   */
  setNetworkData(data: NetworkData): void {
    this.networkData = data;

    // Build adjacency map
    this.adjacencyMap.clear();
    for (const edge of data.edges) {
      if (!this.adjacencyMap.has(edge.source)) {
        this.adjacencyMap.set(edge.source, new Set());
      }
      if (!this.adjacencyMap.has(edge.target)) {
        this.adjacencyMap.set(edge.target, new Set());
      }
      this.adjacencyMap.get(edge.source)!.add(edge.target);
      this.adjacencyMap.get(edge.target)!.add(edge.source);
    }

    // Build group color map
    this.buildGroupColorMap(data.nodes);

    // Process data
    this.processData();

    // Render
    this.render();
  }

  /**
   * Build group color mapping
   */
  private buildGroupColorMap(nodes: NetworkNode[]): void {
    this.groupColorMap.clear();
    const customColors = this.networkOptions.groupColors ?? DEFAULT_GROUP_COLORS;

    const uniqueGroups = new Set<string | number>();
    for (const node of nodes) {
      if (node.group !== undefined) {
        uniqueGroups.add(node.group);
      }
    }

    const sortedGroups = Array.from(uniqueGroups).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });

    sortedGroups.forEach((group, index) => {
      this.groupColorMap.set(group, customColors[index % customColors.length]);
    });

    // Update legend
    this.updateLegend();
  }

  /**
   * Get node color from group
   */
  private getNodeColor(node: NetworkNode): RGBAColor {
    if (node.group !== undefined && this.groupColorMap.has(node.group)) {
      return this.groupColorMap.get(node.group)!;
    }
    return this.networkOptions.nodeColor ?? [0.27, 0.53, 0.79, 1.0]; // Default blue
  }

  /**
   * Process network data for rendering
   */
  private processData(): void {
    const { width, height } = this.state.viewport;
    if (width === 0 || height === 0 || this.networkData.nodes.length === 0) {
      this.processedNodes = [];
      this.processedEdges = [];
      this.updateRenderData();
      return;
    }

    const margins = this.getMargins();
    const plotLeft = margins.left * this.pixelRatio;
    const plotTop = margins.top * this.pixelRatio;
    const plotWidth = width - (margins.left + margins.right) * this.pixelRatio;
    const plotHeight = height - (margins.top + margins.bottom) * this.pixelRatio;

    // Calculate layout positions
    const layout = this.currentLayout === 'force' ? this.forceLayout : this.radialLayout;
    const positions = layout.calculate(
      this.networkData.nodes,
      this.networkData.edges,
      plotWidth,
      plotHeight
    );

    // Calculate size scale
    const sizes = this.networkData.nodes.map(n => n.size ?? 1);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const [minRadius, maxRadius] = this.networkOptions.nodeSizeRange ?? DEFAULT_OPTIONS.nodeSizeRange;

    // Process nodes
    const nodeMap = new Map<string, ProcessedNode>();
    this.processedNodes = this.networkData.nodes.map(node => {
      const pos = positions.get(node.id) ?? { x: plotWidth / 2, y: plotHeight / 2 };
      const size = node.size ?? 1;
      const normalizedSize = maxSize > minSize ? (size - minSize) / (maxSize - minSize) : 0.5;
      const radius = (minRadius + normalizedSize * (maxRadius - minRadius)) * this.pixelRatio;

      const processed: ProcessedNode = {
        id: node.id,
        x: pos.x,
        y: pos.y,
        pixelX: plotLeft + pos.x,
        pixelY: plotTop + pos.y,
        radius,
        color: this.getNodeColor(node),
        label: node.label,
        group: node.group,
        size,
        hovered: false,
        selected: false,
        highlighted: false,
      };

      nodeMap.set(node.id, processed);
      return processed;
    });

    // Process edges
    const edgeOpacity = this.networkOptions.edgeOpacity ?? DEFAULT_OPTIONS.edgeOpacity;
    const weights = this.networkData.edges.map(e => e.weight ?? 1);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const [minWidth, maxWidth] = this.networkOptions.edgeWidthRange ?? DEFAULT_OPTIONS.edgeWidthRange;
    const curveOffset = this.networkOptions.edgeCurve ?? DEFAULT_OPTIONS.edgeCurve;

    this.processedEdges = this.networkData.edges.map(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) {
        return null;
      }

      const weight = edge.weight ?? 1;
      const normalizedWeight = maxWeight > minWeight ? (weight - minWeight) / (maxWeight - minWeight) : 0.5;
      const edgeWidth = (minWidth + normalizedWeight * (maxWidth - minWidth)) * this.pixelRatio;

      // Calculate bezier control point
      const midX = (sourceNode.pixelX + targetNode.pixelX) / 2;
      const midY = (sourceNode.pixelY + targetNode.pixelY) / 2;
      const dx = targetNode.pixelX - sourceNode.pixelX;
      const dy = targetNode.pixelY - sourceNode.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Perpendicular offset for curve
      const perpX = -dy / (dist || 1) * dist * curveOffset;
      const perpY = dx / (dist || 1) * dist * curveOffset;

      // Edge color matches source node with reduced opacity
      const sourceColor = sourceNode.color;
      const edgeColor: RGBAColor = [sourceColor[0], sourceColor[1], sourceColor[2], edgeOpacity];

      return {
        sourceId: edge.source,
        targetId: edge.target,
        sourceX: sourceNode.pixelX,
        sourceY: sourceNode.pixelY,
        targetX: targetNode.pixelX,
        targetY: targetNode.pixelY,
        controlX: midX + perpX,
        controlY: midY + perpY,
        color: edgeColor,
        width: edgeWidth,
        weight,
        highlighted: false,
      } as ProcessedEdge;
    }).filter((e): e is ProcessedEdge => e !== null);

    // Update render passes
    this.updateRenderData();

    // Update labels
    if (this.networkOptions.showLabels) {
      this.updateLabels();
    }

    // Set domain for pan/zoom
    this.state.domain = {
      x: [0, plotWidth],
      y: [0, plotHeight],
    };
    this.initialDomain = {
      x: [0, plotWidth],
      y: [0, plotHeight],
    };
  }

  /**
   * Update render pass data
   */
  private updateRenderData(): void {
    this.edgeRenderPass?.updateData(this.processedEdges);
    this.nodeRenderPass?.updateData(this.processedNodes);
  }

  /**
   * Switch layout algorithm
   */
  setLayout(layout: NetworkLayoutType): void {
    if (layout !== this.currentLayout) {
      this.currentLayout = layout;
      this.processData();
      this.render();
    }
  }

  /**
   * Get current layout type
   */
  getLayout(): NetworkLayoutType {
    return this.currentLayout;
  }

  /**
   * Get processed nodes
   */
  getNodes(): ProcessedNode[] {
    return this.processedNodes;
  }

  /**
   * Get processed edges
   */
  getEdges(): ProcessedEdge[] {
    return this.processedEdges;
  }

  /**
   * Clear all selected nodes
   */
  clearSelection(): void {
    let hadSelection = false;
    for (const node of this.processedNodes) {
      if (node.selected) {
        node.selected = false;
        hadSelection = true;
      }
    }

    if (hadSelection) {
      this.updateRenderData();
      this.emit('selectionChange', {
        selected: new Set<string>(),
        nodes: [],
      });
      this.render();
    }
  }

  /**
   * Called when data is updated (for compatibility with BaseChart)
   */
  protected onDataUpdate(): void {
    // Network chart uses setNetworkData instead
  }

  /**
   * Called when chart is resized
   */
  protected onResize(_width: number, _height: number): void {
    if (this.edgeRenderPass) {
      this.edgeRenderPass.setPixelRatio(this.pixelRatio);
    }
    if (this.nodeRenderPass) {
      this.nodeRenderPass.setPixelRatio(this.pixelRatio);
    }

    // Re-process data with new dimensions (guard for initialization)
    if (this.networkData && this.networkData.nodes.length > 0) {
      this.processData();
    }
  }

  /**
   * Called when domain changes (pan/zoom)
   */
  protected onDomainChange(_domain: DataDomain): void {
    // Re-process positions based on new domain (viewport transform)
    if (this.networkData && this.networkData.nodes.length > 0) {
      this.applyViewportTransform();
      this.render();
    }
  }

  /**
   * Apply viewport transform based on current domain vs initial domain
   */
  private applyViewportTransform(): void {
    if (!this.initialDomain || this.processedNodes.length === 0) return;

    const domain = this.state.domain;
    const initial = this.initialDomain;

    const margins = this.getMargins();
    const plotLeft = margins.left * this.pixelRatio;
    const plotTop = margins.top * this.pixelRatio;
    const { width, height } = this.state.viewport;
    const plotWidth = width - (margins.left + margins.right) * this.pixelRatio;
    const plotHeight = height - (margins.top + margins.bottom) * this.pixelRatio;

    // For X: standard transform
    // pixelX = plotLeft + (node.x - domain.x[0]) / domainWidth * plotWidth
    const domainWidth = domain.x[1] - domain.x[0];

    // For Y: invert the domain to flip the coordinate system
    // The pan/zoom handlers use Y-up coords, but layout uses Y-down (screen coords)
    // So we flip: when domain.y increases, we want to show lower layout Y (which is up on screen)
    const flippedDomainY0 = initial.y[0] + initial.y[1] - domain.y[1];
    const flippedDomainY1 = initial.y[0] + initial.y[1] - domain.y[0];
    const domainHeight = flippedDomainY1 - flippedDomainY0;

    // Transform node positions
    for (const node of this.processedNodes) {
      node.pixelX = plotLeft + (node.x - domain.x[0]) / domainWidth * plotWidth;
      node.pixelY = plotTop + (node.y - flippedDomainY0) / domainHeight * plotHeight;
    }

    // Transform edge positions
    for (const edge of this.processedEdges) {
      const sourceNode = this.processedNodes.find(n => n.id === edge.sourceId);
      const targetNode = this.processedNodes.find(n => n.id === edge.targetId);

      if (sourceNode && targetNode) {
        edge.sourceX = sourceNode.pixelX;
        edge.sourceY = sourceNode.pixelY;
        edge.targetX = targetNode.pixelX;
        edge.targetY = targetNode.pixelY;

        // Recalculate control point
        const midX = (edge.sourceX + edge.targetX) / 2;
        const midY = (edge.sourceY + edge.targetY) / 2;
        const dx = edge.targetX - edge.sourceX;
        const dy = edge.targetY - edge.sourceY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curveOffset = this.networkOptions.edgeCurve ?? 0.2;

        edge.controlX = midX + (-dy / (dist || 1)) * dist * curveOffset;
        edge.controlY = midY + (dx / (dist || 1)) * dist * curveOffset;
      }
    }

    // Update render passes
    this.updateRenderData();

    // Update labels
    if (this.networkOptions.showLabels) {
      this.updateLabels();
    }
  }

  /**
   * Called when options are updated
   */
  protected onOptionsUpdate(options: Partial<NetworkChartOptions>): void {
    Object.assign(this.networkOptions, options);

    // Update layout calculators if config changed
    if (options.forceLayout) {
      this.forceLayout = new ForceLayout(this.networkOptions.forceLayout);
    }
    if (options.radialLayout) {
      this.radialLayout = new RadialLayout(this.networkOptions.radialLayout);
    }

    // Update dim opacity on render passes
    if (options.dimOpacity !== undefined) {
      this.edgeRenderPass?.setDimOpacity(options.dimOpacity);
      this.nodeRenderPass?.setDimOpacity(options.dimOpacity);
    }

    // Handle label toggle
    if (options.showLabels !== undefined) {
      if (options.showLabels && !this.labelContainer) {
        this.createLabelContainer();
        this.updateLabels();
      } else if (!options.showLabels && this.labelContainer) {
        this.labelContainer.remove();
        this.labelContainer = null;
        this.labelElements.clear();
      }
    }

    // Handle legend toggle
    if (options.showLegend !== undefined) {
      if (options.showLegend && !this.legendContainer) {
        this.createLegendContainer();
        this.updateLegend();
      } else if (!options.showLegend && this.legendContainer) {
        this.legendContainer.remove();
        this.legendContainer = null;
      }
    }

    // Re-process data if visual options changed
    if (
      options.layout !== undefined ||
      options.nodeSizeRange !== undefined ||
      options.edgeWidthRange !== undefined ||
      options.edgeCurve !== undefined ||
      options.groupColors !== undefined
    ) {
      if (options.layout !== undefined) {
        this.currentLayout = options.layout;
      }
      this.processData();
    }

    this.render();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.hideTooltip();

    if (this.labelContainer) {
      this.labelContainer.remove();
      this.labelContainer = null;
    }
    this.labelElements.clear();

    if (this.legendContainer) {
      this.legendContainer.remove();
      this.legendContainer = null;
    }

    super.dispose();
  }
}
