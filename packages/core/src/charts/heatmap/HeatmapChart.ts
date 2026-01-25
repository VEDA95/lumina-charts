/**
 * Heatmap chart implementation for matrix/grid data visualization
 */

import type {
  RenderPass,
  Series,
  RGBAColor,
  DataDomain,
} from '../../types/index.js';
import type {
  HeatmapChartOptions,
  HeatmapChartConfig,
  HeatmapCell,
  HeatmapDataPoint,
  HeatmapMatrixData,
  ColorScaleConfig,
  ColorScaleType,
} from '../../types/heatmap.js';
import { SEQUENTIAL_BLUE, VIRIDIS } from '../../types/heatmap.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { HeatmapRenderPass } from './HeatmapRenderPass.js';
import { GridRenderPass } from '../GridRenderPass.js';
import { AxisRenderer } from '../../axes/AxisRenderer.js';

/**
 * Default null/missing value color
 */
const DEFAULT_NULL_COLOR: RGBAColor = [0.9, 0.9, 0.9, 1.0];

/**
 * Heatmap chart for visualizing matrix/grid data with color-coded cells
 */
export class HeatmapChart extends BaseChart {
  private heatmapOptions: HeatmapChartOptions = {};
  private axisRenderer: AxisRenderer | null = null;
  private gridRenderPass: GridRenderPass | null = null;
  private heatmapRenderPass!: HeatmapRenderPass;

  // Processed cell data for hit testing and rendering
  private cells: HeatmapCell[] = [];

  // Grid dimensions
  private numRows: number = 0;
  private numCols: number = 0;

  // Labels
  private rowLabels: string[] = [];
  private colLabels: string[] = [];

  // Value domain for color mapping
  private valueDomain: [number, number] = [0, 1];

  // Hover state
  private hoveredCell: HeatmapCell | null = null;

  // Cell label elements (for HTML overlay)
  private labelContainer: HTMLDivElement | null = null;
  private labelElements: Map<string, HTMLDivElement> = new Map();

  constructor(config: HeatmapChartConfig) {
    const options = config.options ?? {};

    super(config as BaseChartConfig);

    this.heatmapOptions = options;

    // Initialize axis renderer
    this.axisRenderer = new AxisRenderer({
      container: this.getOverlayElement(),
      margins: this.getMargins(),
      xAxis: this.createXAxisConfig(),
      yAxis: this.createYAxisConfig(),
    });

    // Get render passes
    this.gridRenderPass = this.renderer.getRenderPass('grid') as GridRenderPass | null;
    this.heatmapRenderPass = this.renderer.getRenderPass('heatmap') as HeatmapRenderPass;

    // Initialize axis renderer
    this.initializeAxisRenderer();

    // Setup hover interaction
    this.setupHoverInteraction();

    // Create label container if labels are enabled
    if (options.showLabels) {
      this.createLabelContainer();
    }
  }

  /**
   * Create X-axis config (columns)
   */
  private createXAxisConfig() {
    const baseConfig = this.heatmapOptions?.xAxis ?? {};

    return {
      ...baseConfig,
      type: baseConfig.type ?? ('linear' as const),
      formatter: (value: number) => {
        const index = Math.round(value);
        if (index >= 0 && index < this.colLabels.length) {
          return this.colLabels[index];
        }
        return index >= 0 ? `${index + 1}` : '';
      },
      ticks: {
        ...baseConfig.ticks,
        count: baseConfig.ticks?.count ?? (this.numCols || 6),
      },
    };
  }

  /**
   * Create Y-axis config (rows)
   */
  private createYAxisConfig() {
    const baseConfig = this.heatmapOptions?.yAxis ?? {};

    return {
      ...baseConfig,
      type: baseConfig.type ?? ('linear' as const),
      formatter: (value: number) => {
        const index = Math.round(value);
        if (index >= 0 && index < this.rowLabels.length) {
          return this.rowLabels[index];
        }
        return index >= 0 ? `${index + 1}` : '';
      },
      ticks: {
        ...baseConfig.ticks,
        count: baseConfig.ticks?.count ?? (this.numRows || 6),
      },
    };
  }

  /**
   * Initialize axis renderer with current state
   */
  private initializeAxisRenderer(): void {
    if (!this.axisRenderer) return;

    const { width, height } = this.getState().viewport;
    if (width > 0 && height > 0) {
      const cssWidth = width / this.pixelRatio;
      const cssHeight = height / this.pixelRatio;
      this.axisRenderer.setSize(cssWidth, cssHeight);
      this.axisRenderer.setDomain(this.getState().domain);
      this.axisRenderer.render();
    }
  }

  /**
   * Setup hover and click interactions
   */
  private setupHoverInteraction(): void {
    const onPointerMove = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const pixelX = (event.clientX - rect.left) * this.pixelRatio;
      const pixelY = (event.clientY - rect.top) * this.pixelRatio;

      const cell = this.heatmapRenderPass.hitTest(pixelX, pixelY);

      if (cell !== this.hoveredCell) {
        // Clear previous hover
        if (this.hoveredCell) {
          this.hoveredCell.hovered = false;
        }

        // Set new hover
        this.hoveredCell = cell;
        if (cell) {
          cell.hovered = true;
          this.showTooltip(cell, event.clientX, event.clientY);

          // Emit hover event for demo compatibility
          this.emit('hover', {
            point: { x: cell.col, y: cell.row },
            cell,
            position: { x: event.clientX, y: event.clientY },
          });
        } else {
          this.hideTooltip();
          this.emit('hoverEnd', {});
        }

        // Re-upload data with updated hover state
        this.heatmapRenderPass.updateData(this.cells);
        this.render();
      } else if (cell) {
        // Update tooltip position
        this.showTooltip(cell, event.clientX, event.clientY);
      }
    };

    const onPointerLeave = () => {
      if (this.hoveredCell) {
        this.hoveredCell.hovered = false;
        this.hoveredCell = null;
        this.hideTooltip();
        this.emit('hoverEnd', {});
        this.heatmapRenderPass.updateData(this.cells);
        this.render();
      }
    };

    const onClick = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const pixelX = (event.clientX - rect.left) * this.pixelRatio;
      const pixelY = (event.clientY - rect.top) * this.pixelRatio;

      const cell = this.heatmapRenderPass.hitTest(pixelX, pixelY);

      if (cell) {
        // Toggle selection
        cell.selected = !cell.selected;

        // Emit selection event
        const selectedCells = this.cells.filter(c => c.selected);
        this.emit('selectionChange', {
          selected: new Set(selectedCells.map(c => `${c.row}-${c.col}`)),
          cells: selectedCells,
        });

        this.heatmapRenderPass.updateData(this.cells);
        this.render();
      }
    };

    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerleave', onPointerLeave);
    this.canvas.addEventListener('click', onClick);
  }

  /**
   * Show tooltip for a cell
   */
  private showTooltip(cell: HeatmapCell, clientX: number, clientY: number): void {
    const rowLabel = cell.rowLabel ?? `Row ${cell.row + 1}`;
    const colLabel = cell.colLabel ?? `Col ${cell.col + 1}`;
    const value = cell.value;

    // Get the cell color as a CSS color string
    const color = cell.color;
    const colorStr = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${color[3]})`;

    const content = `
      <div style="font-weight: 500; margin-bottom: 8px;">${colLabel}, ${rowLabel}</div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 3px; height: 16px; border-radius: 1px; background: ${colorStr}; flex-shrink: 0;"></span>
        <span style="opacity: 0.7;">Value</span>
        <span style="font-family: 'Geist Mono', monospace; margin-left: auto;">${value.toFixed(2)}</span>
      </div>
    `;

    this.showTooltipElement(content, clientX, clientY);
  }

  /**
   * Show tooltip element
   */
  private showTooltipElement(content: string, clientX: number, clientY: number): void {
    let tooltip = document.getElementById('lumina-heatmap-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'lumina-heatmap-tooltip';
      tooltip.className = 'lumina-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        padding: 8px 12px;
        background: #ffffff;
        color: #09090b;
        border-radius: 6px;
        border: 1px solid #e4e4e7;
        font-size: 12px;
        line-height: 1.5;
        font-family: Geist, Inter, ui-sans-serif, system-ui, sans-serif;
        pointer-events: none;
        z-index: 10000;
        white-space: nowrap;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
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
    const tooltip = document.getElementById('lumina-heatmap-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Create label container for cell value labels
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
   * Create render passes
   */
  protected createRenderPasses(): RenderPass[] {
    const passes: RenderPass[] = [];

    // Add grid pass if enabled
    if (this.heatmapOptions?.grid !== false) {
      passes.push(
        new GridRenderPass({
          gl: this.renderer.gl,
          getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
          margins: this.getMargins(),
          pixelRatio: this.pixelRatio,
          color: this.heatmapOptions?.gridColor ?? [0.93, 0.93, 0.93, 1.0],
        })
      );
    }

    // Add heatmap render pass
    passes.push(
      new HeatmapRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        hoverBrighten: this.heatmapOptions?.hoverBrighten,
      })
    );

    return passes;
  }

  /**
   * Set matrix data (dense format)
   */
  setMatrix(matrix: number[][], rowLabels?: string[], colLabels?: string[]): void {
    this.numRows = matrix.length;
    this.numCols = matrix[0]?.length ?? 0;
    this.rowLabels = rowLabels ?? [];
    this.colLabels = colLabels ?? [];

    // Convert matrix to sparse format for Series
    const data: HeatmapDataPoint[] = [];
    for (let row = 0; row < this.numRows; row++) {
      for (let col = 0; col < this.numCols; col++) {
        const value = matrix[row][col];
        if (value !== null && value !== undefined && !isNaN(value)) {
          data.push({ x: col, y: row, value });
        }
      }
    }

    // Use standard setData
    this.setData([{
      id: 'heatmap',
      name: 'Heatmap',
      data: data as unknown as { x: number; y: number }[],
    }]);
  }

  /**
   * Called when data is updated
   */
  protected onDataUpdate(series: Series[]): void {
    if (series.length === 0) {
      this.cells = [];
      this.heatmapRenderPass.updateData([]);
      return;
    }

    // Extract heatmap data points
    const dataPoints: HeatmapDataPoint[] = [];
    for (const s of series) {
      if (s.visible === false) continue;
      for (const point of s.data) {
        const hp = point as unknown as HeatmapDataPoint;
        if (hp.value !== null && hp.value !== undefined && !isNaN(hp.value)) {
          dataPoints.push(hp);
        }
      }
    }

    if (dataPoints.length === 0) {
      this.cells = [];
      this.heatmapRenderPass.updateData([]);
      return;
    }

    // Determine grid dimensions from data
    let maxCol = 0;
    let maxRow = 0;
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (const point of dataPoints) {
      maxCol = Math.max(maxCol, point.x);
      maxRow = Math.max(maxRow, point.y);
      minValue = Math.min(minValue, point.value);
      maxValue = Math.max(maxValue, point.value);
    }

    this.numCols = Math.max(this.numCols, maxCol + 1);
    this.numRows = Math.max(this.numRows, maxRow + 1);
    this.valueDomain = [minValue, maxValue];

    // Update domain - keep standard orientation (pan/zoom handlers expect y[0] < y[1])
    const xDomain: [number, number] = [-0.5, this.numCols - 0.5];
    const yDomain: [number, number] = [-0.5, this.numRows - 0.5];
    this.state.domain = { x: xDomain, y: yDomain };
    this.initialDomain = { x: [...xDomain], y: [...yDomain] };

    // Calculate cell layout
    this.updateCellLayout(dataPoints);

    // Update axis renderer
    if (this.axisRenderer) {
      this.axisRenderer.updateConfig(this.createXAxisConfig(), this.createYAxisConfig());
      this.axisRenderer.setDomain(this.state.domain);
      this.axisRenderer.render();
    }

    // Update cell labels if enabled
    if (this.heatmapOptions?.showLabels) {
      this.updateCellLabels();
    }
  }

  /**
   * Calculate cell layout and generate cell data
   */
  private updateCellLayout(dataPoints: HeatmapDataPoint[]): void {
    const { width, height } = this.state.viewport;
    if (width === 0 || height === 0) {
      this.cells = [];
      this.heatmapRenderPass.updateData([]);
      return;
    }

    const margins = this.getMargins();
    const plotLeft = margins.left * this.pixelRatio;
    const plotTop = margins.top * this.pixelRatio;
    const plotRight = width - margins.right * this.pixelRatio;
    const plotBottom = height - margins.bottom * this.pixelRatio;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const domain = this.state.domain;
    const cellGap = (this.heatmapOptions?.cellGap ?? 1) * this.pixelRatio;

    // Calculate cell dimensions based on visible domain (cells get larger when zoomed in)
    const domainWidth = domain.x[1] - domain.x[0];
    const domainHeight = domain.y[1] - domain.y[0];
    const totalCellWidth = plotWidth / domainWidth;
    const totalCellHeight = plotHeight / domainHeight;
    const cellWidth = Math.max(1, totalCellWidth - cellGap);
    const cellHeight = Math.max(1, totalCellHeight - cellGap);

    // Get color scale config
    const colorScale = this.heatmapOptions?.colorScale ?? {
      type: 'sequential' as ColorScaleType,
      colors: SEQUENTIAL_BLUE,
    };

    const colorDomain = colorScale.domain ?? this.valueDomain;

    // Preserve selection state from existing cells
    const selectionState = new Map<string, boolean>();
    for (const cell of this.cells) {
      if (cell.selected) {
        selectionState.set(`${cell.row}-${cell.col}`, true);
      }
    }

    const cells: HeatmapCell[] = [];

    for (const point of dataPoints) {
      const { x: col, y: row, value } = point;

      // Calculate pixel position based on domain
      // Standard coordinate system: row 0 at bottom, increasing upward
      const normalizedX = (col - domain.x[0]) / domainWidth;
      const normalizedY = (row - domain.y[0]) / domainHeight;

      const pixelX = plotLeft + normalizedX * plotWidth - cellWidth / 2;
      // WebGL/Canvas has Y=0 at top, so invert for standard math coordinates
      const pixelY = plotBottom - normalizedY * plotHeight - cellHeight / 2;

      // Compute color
      const color = this.computeColor(value, colorScale, colorDomain);

      cells.push({
        row,
        col,
        value,
        color,
        pixelX,
        pixelY,
        pixelWidth: cellWidth,
        pixelHeight: cellHeight,
        rowLabel: this.rowLabels[row],
        colLabel: this.colLabels[col],
        hovered: false,
        selected: selectionState.get(`${row}-${col}`) ?? false,
      });
    }

    this.cells = cells;
    this.heatmapRenderPass.updateData(cells);
  }

  /**
   * Compute cell color based on value and color scale
   */
  private computeColor(
    value: number,
    config: ColorScaleConfig,
    domain: [number, number]
  ): RGBAColor {
    const { type, colors, midpoint, steps } = config;
    const [min, max] = domain;

    if (value === null || value === undefined || isNaN(value)) {
      return this.heatmapOptions?.nullColor ?? DEFAULT_NULL_COLOR;
    }

    // Clamp value to domain
    const clampedValue = Math.max(min, Math.min(max, value));

    if (type === 'sequential') {
      const t = max !== min ? (clampedValue - min) / (max - min) : 0.5;
      return this.interpolateColors(colors, t);
    }

    if (type === 'diverging') {
      const mid = midpoint ?? (min + max) / 2;
      let t: number;
      if (clampedValue < mid) {
        t = 0.5 - 0.5 * (mid - clampedValue) / (mid - min || 1);
      } else {
        t = 0.5 + 0.5 * (clampedValue - mid) / (max - mid || 1);
      }
      return this.interpolateColors(colors, t);
    }

    if (type === 'discrete') {
      const numSteps = steps ?? colors.length;
      const bucketSize = (max - min) / numSteps;
      const bucket = Math.min(
        Math.floor((clampedValue - min) / bucketSize),
        colors.length - 1
      );
      return [...colors[bucket]] as RGBAColor;
    }

    // Fallback to first color
    return [...colors[0]] as RGBAColor;
  }

  /**
   * Interpolate between colors in a gradient
   */
  private interpolateColors(colors: RGBAColor[], t: number): RGBAColor {
    if (colors.length === 0) return [0, 0, 0, 1];
    if (colors.length === 1) return [...colors[0]] as RGBAColor;

    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    // Find the two colors to interpolate between
    const numSegments = colors.length - 1;
    const scaledT = t * numSegments;
    const index = Math.min(Math.floor(scaledT), numSegments - 1);
    const localT = scaledT - index;

    const c1 = colors[index];
    const c2 = colors[index + 1];

    return [
      c1[0] + (c2[0] - c1[0]) * localT,
      c1[1] + (c2[1] - c1[1]) * localT,
      c1[2] + (c2[2] - c1[2]) * localT,
      c1[3] + (c2[3] - c1[3]) * localT,
    ];
  }

  /**
   * Update cell value labels
   */
  private updateCellLabels(): void {
    if (!this.labelContainer) return;

    const minSize = (this.heatmapOptions?.labelThreshold ?? 30) * this.pixelRatio;
    const labelColor = this.heatmapOptions?.labelColor ?? [0, 0, 0, 1];
    const [r, g, b, a] = labelColor;
    const colorStr = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;

    // Track which labels are still needed
    const neededLabels = new Set<string>();

    for (const cell of this.cells) {
      // Skip if cell is too small
      if (cell.pixelWidth < minSize || cell.pixelHeight < minSize) {
        continue;
      }

      const key = `${cell.row}-${cell.col}`;
      neededLabels.add(key);

      let label = this.labelElements.get(key);
      if (!label) {
        label = document.createElement('div');
        label.style.cssText = `
          position: absolute;
          transform: translate(-50%, -50%);
          font-size: 11px;
          font-family: system-ui, sans-serif;
          pointer-events: none;
          white-space: nowrap;
        `;
        this.labelContainer.appendChild(label);
        this.labelElements.set(key, label);
      }

      label.textContent = cell.value.toFixed(1);
      label.style.color = colorStr;
      label.style.left = `${(cell.pixelX + cell.pixelWidth / 2) / this.pixelRatio}px`;
      label.style.top = `${(cell.pixelY + cell.pixelHeight / 2) / this.pixelRatio}px`;
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
   * Get cells
   */
  getCells(): HeatmapCell[] {
    return this.cells;
  }

  /**
   * Clear all selected cells
   */
  clearSelection(): void {
    let hadSelection = false;
    for (const cell of this.cells) {
      if (cell.selected) {
        cell.selected = false;
        hadSelection = true;
      }
    }

    if (hadSelection) {
      this.heatmapRenderPass.updateData(this.cells);
      this.emit('selectionChange', {
        selected: new Set<string>(),
        cells: [],
      });
      this.render();
    }
  }

  /**
   * Get row labels
   */
  getRowLabels(): string[] {
    return this.rowLabels;
  }

  /**
   * Get column labels
   */
  getColLabels(): string[] {
    return this.colLabels;
  }

  /**
   * Set row labels
   */
  setRowLabels(labels: string[]): void {
    this.rowLabels = labels;
    if (this.axisRenderer) {
      this.axisRenderer.updateConfig(undefined, this.createYAxisConfig());
    }
    this.render();
  }

  /**
   * Set column labels
   */
  setColLabels(labels: string[]): void {
    this.colLabels = labels;
    if (this.axisRenderer) {
      this.axisRenderer.updateConfig(this.createXAxisConfig(), undefined);
    }
    this.render();
  }

  /**
   * Called when chart is resized
   */
  protected onResize(width: number, height: number): void {
    if (this.axisRenderer) {
      const cssWidth = width / this.pixelRatio;
      const cssHeight = height / this.pixelRatio;
      this.axisRenderer.setSize(cssWidth, cssHeight);
      this.axisRenderer.render();
    }

    if (this.heatmapRenderPass) {
      this.heatmapRenderPass.setPixelRatio(this.pixelRatio);
    }

    // Re-layout cells
    if (this.series.length > 0) {
      this.onDataUpdate(this.series);
    }
  }

  /**
   * Called when domain changes (pan/zoom)
   */
  protected onDomainChange(domain: DataDomain): void {
    if (this.axisRenderer) {
      this.axisRenderer.setDomain(domain);
      this.axisRenderer.render();
    }

    // Re-layout cells with new domain
    if (this.series.length > 0) {
      // Extract data points again
      const dataPoints: HeatmapDataPoint[] = [];
      for (const s of this.series) {
        if (s.visible === false) continue;
        for (const point of s.data) {
          const hp = point as unknown as HeatmapDataPoint;
          if (hp.value !== null && hp.value !== undefined && !isNaN(hp.value)) {
            dataPoints.push(hp);
          }
        }
      }
      this.updateCellLayout(dataPoints);
    }

    // Update cell labels
    if (this.heatmapOptions?.showLabels) {
      this.updateCellLabels();
    }
  }

  /**
   * Called when options are updated
   */
  protected onOptionsUpdate(options: Partial<HeatmapChartOptions>): void {
    Object.assign(this.heatmapOptions, options);

    if (this.axisRenderer && (options.xAxis || options.yAxis)) {
      const xConfig = options.xAxis ? { ...options.xAxis, ...this.createXAxisConfig() } : undefined;
      const yConfig = options.yAxis ? { ...options.yAxis, ...this.createYAxisConfig() } : undefined;
      this.axisRenderer.updateConfig(xConfig, yConfig);
    }

    // Update grid color if changed
    if (options.gridColor && this.gridRenderPass) {
      this.gridRenderPass.setColor(options.gridColor);
    }

    // Handle label toggle
    if (options.showLabels !== undefined) {
      if (options.showLabels && !this.labelContainer) {
        this.createLabelContainer();
        this.updateCellLabels();
      } else if (!options.showLabels && this.labelContainer) {
        this.labelContainer.remove();
        this.labelContainer = null;
        this.labelElements.clear();
      }
    }

    // Re-layout if color scale changed
    if (options.colorScale !== undefined || options.cellGap !== undefined) {
      if (this.series.length > 0) {
        this.onDataUpdate(this.series);
      }
    }
  }

  /**
   * Render the chart
   */
  render(): void {
    super.render();
    if (this.axisRenderer) {
      this.axisRenderer.render();
    }
  }

  /**
   * Get axes image for PNG export
   */
  protected override async getAxesImage(): Promise<HTMLImageElement | null> {
    if (!this.axisRenderer) return null;
    return this.axisRenderer.toImage();
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

    if (this.axisRenderer) {
      this.axisRenderer.dispose();
      this.axisRenderer = null;
    }

    super.dispose();
  }
}
