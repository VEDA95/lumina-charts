/**
 * Pie/Donut chart implementation
 */

import type { RenderPass, Series, DataPoint, RGBAColor } from '../../types/index.js';
import type { PieChartOptions, PieChartConfig, PieSlice } from '../../types/pie.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { PieRenderPass } from './PieRenderPass.js';

/**
 * Default slice colors
 */
const DEFAULT_COLORS: RGBAColor[] = [
  [0.4, 0.6, 0.9, 1.0], // Blue
  [0.9, 0.5, 0.4, 1.0], // Red
  [0.4, 0.8, 0.5, 1.0], // Green
  [0.9, 0.7, 0.3, 1.0], // Orange
  [0.7, 0.5, 0.8, 1.0], // Purple
  [0.3, 0.7, 0.7, 1.0], // Teal
  [0.9, 0.6, 0.7, 1.0], // Pink
  [0.6, 0.6, 0.6, 1.0], // Gray
];

/**
 * Pie/Donut chart for displaying proportional data
 */
export class PieChart extends BaseChart {
  private pieOptions: PieChartOptions;
  private pieRenderPass!: PieRenderPass;

  // Pie geometry
  private centerX: number = 0;
  private centerY: number = 0;
  private innerRadius: number = 0;
  private outerRadius: number = 0;

  // Slice data
  private slices: PieSlice[] = [];
  private hoveredSliceIndex: number | null = null;
  private selectedSliceIndex: number | null = null;

  // Labels overlay
  private labelsContainer: HTMLDivElement | null = null;

  constructor(config: PieChartConfig) {
    // Pie charts don't need margins for axes
    const options: PieChartOptions = {
      ...config.options,
      margins: config.options?.margins ?? { top: 20, right: 20, bottom: 20, left: 20 },
    };

    const baseConfig: BaseChartConfig = {
      container: config.container,
      options,
    };

    super(baseConfig);

    this.pieOptions = options;

    // Get render pass
    this.pieRenderPass = this.renderer.getRenderPass('pie') as PieRenderPass;

    // Create labels container
    this.createLabelsContainer();

    // Setup pie-specific event handling
    this.setupPieInteractions();
  }

  /**
   * Create render passes for pie chart
   */
  protected createRenderPasses(): RenderPass[] {
    // Note: this.pieOptions is not yet set when this is called from base constructor
    // Access options through this.options instead
    const pieOpts = this.options as PieChartOptions;
    return [
      new PieRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        pixelRatio: this.pixelRatio,
        hoverBrighten: pieOpts.hoverBrighten ?? 1.2,
      }),
    ];
  }

  /**
   * Create the labels container overlay
   */
  private createLabelsContainer(): void {
    this.labelsContainer = document.createElement('div');
    this.labelsContainer.className = 'lumina-pie-labels';
    this.labelsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
      z-index: 10;
    `;
    this.getOverlayElement().appendChild(this.labelsContainer);
  }

  /**
   * Setup pie-specific interaction handling
   */
  private setupPieInteractions(): void {
    const canvas = this.canvas;

    // Pointer move for hover
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * this.pixelRatio;
      const y = (e.clientY - rect.top) * this.pixelRatio;

      const slice = this.pieRenderPass.hitTest(x, y);
      const newHoveredIndex = slice ? slice.index : null;

      if (newHoveredIndex !== this.hoveredSliceIndex) {
        this.hoveredSliceIndex = newHoveredIndex;
        this.pieRenderPass.setHoveredSlice(newHoveredIndex, this.pieOptions.explodeOffset ?? 0);
        this.render();

        // Show/update tooltip
        if (slice) {
          this.showSliceTooltip(slice, e.clientX, e.clientY);
          this.emit('hover', {
            hit: {
              seriesId: slice.seriesId ?? 'pie',
              pointIndex: slice.index,
              point: { x: slice.index, y: slice.value },
              distance: 0,
            },
            series: this.series[0],
            point: { x: slice.index, y: slice.value },
            pixel: { x, y },
            data: { x: slice.index, y: slice.value },
            timestamp: Date.now(),
            originalEvent: e,
          });
        } else {
          this.hideTooltip();
          this.emit('hoverEnd', undefined);
        }
      }
    });

    // Pointer leave
    canvas.addEventListener('pointerleave', () => {
      if (this.hoveredSliceIndex !== null) {
        this.hoveredSliceIndex = null;
        this.pieRenderPass.setHoveredSlice(null, this.pieOptions.explodeOffset ?? 0);
        this.render();
        this.hideTooltip();
        this.emit('hoverEnd', undefined);
      }
    });

    // Click for selection
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * this.pixelRatio;
      const y = (e.clientY - rect.top) * this.pixelRatio;

      const slice = this.pieRenderPass.hitTest(x, y);

      if (slice) {
        // Toggle selection
        if (this.selectedSliceIndex === slice.index) {
          this.selectedSliceIndex = null;
        } else {
          this.selectedSliceIndex = slice.index;
        }

        this.pieRenderPass.setSelectedSlice(this.selectedSliceIndex, this.pieOptions.explodeOffset ?? 0);
        this.render();

        // Emit selection event
        const selected = new Set<string>();
        if (this.selectedSliceIndex !== null) {
          selected.add(`slice-${this.selectedSliceIndex}`);
        }
        this.emit('selectionChange', {
          selected,
          added: this.selectedSliceIndex !== null ? [`slice-${this.selectedSliceIndex}`] : [],
          removed: [],
        });
      }
    });
  }

  /**
   * Show tooltip for a slice
   */
  private showSliceTooltip(slice: PieSlice, clientX: number, clientY: number): void {
    const tooltip = this.getTooltipElement();
    const percentStr = (slice.percentage * 100).toFixed(1);

    // Get the slice color as a CSS color string
    const color = slice.color;
    const colorStr = `rgba(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)}, ${color[3]})`;

    tooltip.innerHTML = `
      <div style="font-weight: 500; margin-bottom: 8px;">${slice.label}</div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="width: 3px; height: 16px; border-radius: 1px; background: ${colorStr}; flex-shrink: 0;"></span>
        <span style="opacity: 0.7;">Value</span>
        <span style="font-family: 'Geist Mono', monospace; margin-left: auto;">${slice.value.toLocaleString()}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 3px; height: 16px; border-radius: 1px; background: transparent; flex-shrink: 0;"></span>
        <span style="opacity: 0.7;">Percent</span>
        <span style="font-family: 'Geist Mono', monospace; margin-left: auto;">${percentStr}%</span>
      </div>
    `;

    tooltip.className = 'lumina-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      display: block;
      pointer-events: none;
      z-index: 100;
      background: #ffffff;
      color: #09090b;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #e4e4e7;
      font-size: 12px;
      line-height: 1.5;
      font-family: Geist, Inter, ui-sans-serif, system-ui, sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      white-space: nowrap;
      left: ${clientX + 10}px;
      top: ${clientY + 10}px;
    `;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const tooltip = this.getTooltipElement();
    tooltip.style.display = 'none';
  }

  /**
   * Called when data is updated
   */
  protected onDataUpdate(series: Series[]): void {
    if (series.length === 0 || series[0].data.length === 0) {
      this.slices = [];
      this.pieRenderPass.clear();
      return;
    }

    // Calculate geometry
    this.calculateGeometry();

    // Calculate slices from data
    this.slices = this.calculateSlices(series[0].data);

    // Upload to render pass
    this.pieRenderPass.updateData(
      this.slices,
      this.centerX,
      this.centerY,
      this.innerRadius,
      this.outerRadius,
      this.pieOptions.explodeOffset ?? 0
    );

    // Update labels
    this.updateLabels();
  }

  /**
   * Calculate pie geometry based on viewport
   */
  private calculateGeometry(): void {
    const { width, height } = this.state.viewport;
    const margins = this.getMargins();

    // Center of the chart
    this.centerX = width / 2;
    this.centerY = height / 2;

    // Calculate available space
    const availableWidth = width - (margins.left + margins.right) * this.pixelRatio;
    const availableHeight = height - (margins.top + margins.bottom) * this.pixelRatio;
    const maxRadius = Math.min(availableWidth, availableHeight) / 2;

    // Apply radius ratios
    const outerRatio = this.pieOptions.outerRadius ?? 0.8;
    const innerRatio = this.pieOptions.innerRadius ?? 0;

    this.outerRadius = maxRadius * outerRatio;
    this.innerRadius = this.outerRadius * innerRatio;
  }

  /**
   * Calculate slices from data points
   */
  private calculateSlices(data: DataPoint[]): PieSlice[] {
    // Filter out zero/negative values
    const validData = data.filter((d) => d.y > 0);
    if (validData.length === 0) return [];

    // Calculate total
    const total = validData.reduce((sum, d) => sum + d.y, 0);

    // Sort if configured
    let sortedData = [...validData];
    if (this.pieOptions.sortSlices === 'ascending') {
      sortedData.sort((a, b) => a.y - b.y);
    } else if (this.pieOptions.sortSlices === 'descending') {
      sortedData.sort((a, b) => b.y - a.y);
    }

    // Calculate angles
    const startAngleDeg = this.pieOptions.startAngle ?? -90;
    const padAngleDeg = this.pieOptions.padAngle ?? 0;
    const startAngleRad = (startAngleDeg * Math.PI) / 180;
    const padAngleRad = (padAngleDeg * Math.PI) / 180;

    const colors = this.pieOptions.colors ?? DEFAULT_COLORS;
    const slices: PieSlice[] = [];
    let currentAngle = startAngleRad;

    for (let i = 0; i < sortedData.length; i++) {
      const d = sortedData[i];
      const percentage = d.y / total;
      const sliceAngle = percentage * Math.PI * 2 - padAngleRad;

      // Get label from data point or generate default
      const label = (d as any).label ?? `Slice ${i + 1}`;

      slices.push({
        index: i,
        label,
        value: d.y,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + sliceAngle,
        color: colors[i % colors.length],
        selected: i === this.selectedSliceIndex,
        hovered: i === this.hoveredSliceIndex,
        seriesId: this.series[0]?.id,
        dataIndex: data.indexOf(d),
      });

      currentAngle += sliceAngle + padAngleRad;
    }

    return slices;
  }

  /**
   * Update slice labels
   */
  private updateLabels(): void {
    if (!this.labelsContainer) return;

    // Clear existing labels
    this.labelsContainer.innerHTML = '';

    const labelConfig = this.pieOptions.labels;
    if (labelConfig?.position === 'none') return;

    const position = labelConfig?.position ?? 'outside';
    const showPercentage = labelConfig?.showPercentage ?? true;
    const showValue = labelConfig?.showValue ?? false;
    const minAngle = ((labelConfig?.minAngleForLabel ?? 10) * Math.PI) / 180;
    const fontSize = labelConfig?.fontSize ?? 12;
    const fontColor = labelConfig?.fontColor ?? '#333';

    for (const slice of this.slices) {
      // Skip small slices
      const sliceAngle = slice.endAngle - slice.startAngle;
      if (sliceAngle < minAngle) continue;

      // Calculate label position
      const midAngle = (slice.startAngle + slice.endAngle) / 2;

      let labelRadius: number;
      if (position === 'inside') {
        labelRadius = (this.innerRadius + this.outerRadius) / 2;
      } else {
        const outsideDistance = labelConfig?.outsideDistance ?? 1.15;
        labelRadius = this.outerRadius * outsideDistance;
      }

      const labelX = this.centerX + Math.cos(midAngle) * labelRadius;
      const labelY = this.centerY + Math.sin(midAngle) * labelRadius;

      // Create label element
      const label = document.createElement('div');
      label.className = 'lumina-pie-label';

      // Format label text
      let text = '';
      if (labelConfig?.formatter) {
        text = labelConfig.formatter(slice);
      } else {
        text = slice.label;
        if (showPercentage) {
          text += ` (${(slice.percentage * 100).toFixed(1)}%)`;
        }
        if (showValue) {
          text += ` - ${slice.value.toLocaleString()}`;
        }
      }

      label.textContent = text;

      // Position label
      const cssX = labelX / this.pixelRatio;
      const cssY = labelY / this.pixelRatio;

      // Determine text alignment based on angle
      let textAlign = 'center';
      let translateX = '-50%';
      if (position === 'outside') {
        if (midAngle > -Math.PI / 2 && midAngle < Math.PI / 2) {
          textAlign = 'left';
          translateX = '0%';
        } else {
          textAlign = 'right';
          translateX = '-100%';
        }
      }

      label.style.cssText = `
        position: absolute;
        left: ${cssX}px;
        top: ${cssY}px;
        transform: translate(${translateX}, -50%);
        font-size: ${fontSize}px;
        color: ${fontColor};
        font-family: var(--lumina-font-family, system-ui, sans-serif);
        white-space: nowrap;
        text-align: ${textAlign};
        pointer-events: none;
        z-index: 10;
      `;

      this.labelsContainer.appendChild(label);
    }
  }

  /**
   * Called when chart is resized
   */
  protected onResize(_width: number, _height: number): void {
    // Recalculate geometry and re-render
    if (this.series.length > 0) {
      this.onDataUpdate(this.series);
    }
  }

  /**
   * Called when options are updated
   */
  protected onOptionsUpdate(options: Partial<PieChartOptions>): void {
    this.pieOptions = { ...this.pieOptions, ...options };

    // Update render pass settings
    if (options.hoverBrighten !== undefined) {
      this.pieRenderPass.setHoverBrighten(options.hoverBrighten);
    }

    // Re-process data if relevant options changed
    if (
      options.innerRadius !== undefined ||
      options.outerRadius !== undefined ||
      options.startAngle !== undefined ||
      options.padAngle !== undefined ||
      options.sortSlices !== undefined ||
      options.colors !== undefined ||
      options.labels !== undefined
    ) {
      if (this.series.length > 0) {
        this.onDataUpdate(this.series);
      }
    }
  }

  /**
   * Get current slices
   */
  getSlices(): PieSlice[] {
    return this.slices;
  }

  /**
   * Get hovered slice index
   */
  getHoveredSliceIndex(): number | null {
    return this.hoveredSliceIndex;
  }

  /**
   * Get selected slice index
   */
  getSelectedSliceIndex(): number | null {
    return this.selectedSliceIndex;
  }

  /**
   * Programmatically select a slice
   */
  selectSlice(index: number | null): void {
    this.selectedSliceIndex = index;
    this.pieRenderPass.setSelectedSlice(index, this.pieOptions.explodeOffset ?? 0);
    this.render();
  }

  /**
   * Get pie geometry
   */
  getGeometry(): { centerX: number; centerY: number; innerRadius: number; outerRadius: number } {
    return {
      centerX: this.centerX,
      centerY: this.centerY,
      innerRadius: this.innerRadius,
      outerRadius: this.outerRadius,
    };
  }

  /**
   * Get labels as an image for export
   */
  protected async getAxesImage(): Promise<HTMLImageElement | null> {
    if (!this.labelsContainer || this.slices.length === 0) {
      return null;
    }

    const { width, height } = this.state.viewport;
    const cssWidth = width / this.pixelRatio;
    const cssHeight = height / this.pixelRatio;

    // Create SVG with labels
    const labelConfig = this.pieOptions.labels;
    if (labelConfig?.position === 'none') {
      return null;
    }

    const position = labelConfig?.position ?? 'outside';
    const showPercentage = labelConfig?.showPercentage ?? true;
    const showValue = labelConfig?.showValue ?? false;
    const minAngle = ((labelConfig?.minAngleForLabel ?? 10) * Math.PI) / 180;
    const fontSize = labelConfig?.fontSize ?? 12;
    const fontColor = labelConfig?.fontColor ?? '#333';

    // Build SVG content
    let svgContent = '';

    for (const slice of this.slices) {
      // Skip small slices
      const sliceAngle = slice.endAngle - slice.startAngle;
      if (sliceAngle < minAngle) continue;

      // Calculate label position
      const midAngle = (slice.startAngle + slice.endAngle) / 2;

      let labelRadius: number;
      if (position === 'inside') {
        labelRadius = (this.innerRadius + this.outerRadius) / 2;
      } else {
        const outsideDistance = labelConfig?.outsideDistance ?? 1.15;
        labelRadius = this.outerRadius * outsideDistance;
      }

      const labelX = this.centerX + Math.cos(midAngle) * labelRadius;
      const labelY = this.centerY + Math.sin(midAngle) * labelRadius;

      // Format label text
      let text = '';
      if (labelConfig?.formatter) {
        text = labelConfig.formatter(slice);
      } else {
        text = slice.label;
        if (showPercentage) {
          text += ` (${(slice.percentage * 100).toFixed(1)}%)`;
        }
        if (showValue) {
          text += ` - ${slice.value.toLocaleString()}`;
        }
      }

      // Convert to CSS pixels
      const cssX = labelX / this.pixelRatio;
      const cssY = labelY / this.pixelRatio;

      // Determine text anchor based on angle
      let textAnchor = 'middle';
      if (position === 'outside') {
        if (midAngle > -Math.PI / 2 && midAngle < Math.PI / 2) {
          textAnchor = 'start';
        } else {
          textAnchor = 'end';
        }
      }

      // Escape text for SVG
      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      svgContent += `<text x="${cssX}" y="${cssY}" text-anchor="${textAnchor}" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="${fontSize}" fill="${fontColor}">${escapedText}</text>\n`;
    }

    if (!svgContent) {
      return null;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cssWidth}" height="${cssHeight}">${svgContent}</svg>`;

    // Convert SVG to image
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.labelsContainer) {
      this.labelsContainer.remove();
    }
    super.dispose();
  }
}
