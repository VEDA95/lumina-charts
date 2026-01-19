/**
 * Axis renderer using D3 for scales and SVG rendering
 */

import { axisBottom, axisLeft, type Axis } from 'd3-axis';
import { select, type Selection } from 'd3-selection';
import type { Margins, DataDomain, AxisConfig, ScaleType } from '../types/index.js';
import { ScaleFactory, LinearScale, LogScale, PowScale, SymlogScale, TimeScale, BandScale } from '../scales/index.js';
import type { Scale, ContinuousScale } from '../types/scale.js';

/**
 * Configuration for the axis renderer
 */
export interface AxisRendererConfig {
  /** Container element to render into */
  container: HTMLElement;
  /** Chart margins */
  margins: Margins;
  /** X-axis configuration */
  xAxis?: AxisConfig;
  /** Y-axis configuration */
  yAxis?: AxisConfig;
  /** Pixel ratio for high-DPI displays */
  pixelRatio?: number;
}

/**
 * Renders chart axes using D3 and SVG
 */
export class AxisRenderer {
  private container: HTMLElement;
  private svg: SVGSVGElement;
  private margins: Margins;
  private pixelRatio: number;

  // D3 selections
  private svgSelection: Selection<SVGSVGElement, unknown, null, undefined>;
  private xAxisGroup: Selection<SVGGElement, unknown, null, undefined>;
  private yAxisGroup: Selection<SVGGElement, unknown, null, undefined>;
  private xLabelGroup: Selection<SVGTextElement, unknown, null, undefined> | null = null;
  private yLabelGroup: Selection<SVGTextElement, unknown, null, undefined> | null = null;

  // Scales (wrapped D3 scales)
  private xScale: Scale<number | string | Date, number>;
  private yScale: Scale<number | string | Date, number>;

  // D3 axis generators
  private xAxisGenerator: Axis<number | string | Date>;
  private yAxisGenerator: Axis<number | string | Date>;

  // Configuration
  private xAxisConfig: AxisConfig;
  private yAxisConfig: AxisConfig;

  // Dimensions
  private width: number = 0;
  private height: number = 0;

  constructor(config: AxisRendererConfig) {
    this.container = config.container;
    this.margins = config.margins;
    this.pixelRatio = config.pixelRatio ?? 1;
    this.xAxisConfig = config.xAxis ?? {};
    this.yAxisConfig = config.yAxis ?? {};

    // Create SVG element
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'lumina-chart-axes');
    this.svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    `;
    this.container.appendChild(this.svg);

    // Create D3 selection
    this.svgSelection = select(this.svg);

    // Initialize scales based on axis config
    this.xScale = this.createScale(this.xAxisConfig);
    this.yScale = this.createScale(this.yAxisConfig);

    // Set default domains
    this.xScale.domain([0, 1]).range([0, 100]);
    this.yScale.domain([0, 1]).range([100, 0]);

    // Initialize axis generators with underlying D3 scales
    this.xAxisGenerator = axisBottom(this.getD3Scale(this.xScale) as any);
    this.yAxisGenerator = axisLeft(this.getD3Scale(this.yScale) as any);

    // Create axis groups
    this.xAxisGroup = this.svgSelection
      .append('g')
      .attr('class', 'lumina-x-axis')
      .style('font-size', '11px')
      .style('font-family', 'var(--lumina-font-family, system-ui, sans-serif)')
      .style('color', 'var(--lumina-axis-color, #666)');

    this.yAxisGroup = this.svgSelection
      .append('g')
      .attr('class', 'lumina-y-axis')
      .style('font-size', '11px')
      .style('font-family', 'var(--lumina-font-family, system-ui, sans-serif)')
      .style('color', 'var(--lumina-axis-color, #666)');

    // Apply axis configuration
    this.applyAxisConfig();
  }

  /**
   * Create a scale based on axis configuration
   */
  private createScale(axisConfig: AxisConfig): Scale<number | string | Date, number> {
    // Use detailed scale config if provided
    if (axisConfig.scale) {
      return ScaleFactory.create(axisConfig.scale) as Scale<number | string | Date, number>;
    }

    // Otherwise use type shorthand or default to linear
    const type: ScaleType = axisConfig.type ?? 'linear';
    return ScaleFactory.fromType(type) as Scale<number | string | Date, number>;
  }

  /**
   * Get the underlying D3 scale from a wrapped scale
   */
  private getD3Scale(scale: Scale<number | string | Date, number>): unknown {
    if (scale instanceof LinearScale) {
      return scale.getD3Scale();
    }
    if (scale instanceof LogScale) {
      return scale.getD3Scale();
    }
    if (scale instanceof PowScale) {
      return scale.getD3Scale();
    }
    if (scale instanceof SymlogScale) {
      return scale.getD3Scale();
    }
    if (scale instanceof TimeScale) {
      return scale.getD3Scale();
    }
    if (scale instanceof BandScale) {
      return scale.getD3Scale();
    }
    // Fallback - try to access getD3Scale if it exists
    if ('getD3Scale' in scale && typeof scale.getD3Scale === 'function') {
      return (scale as any).getD3Scale();
    }
    return scale;
  }

  /**
   * Apply axis configuration options
   */
  private applyAxisConfig(): void {
    // X-axis configuration
    if (this.xAxisConfig.ticks?.count) {
      this.xAxisGenerator.ticks(this.xAxisConfig.ticks.count);
    }
    if (this.xAxisConfig.ticks?.size) {
      this.xAxisGenerator.tickSize(this.xAxisConfig.ticks.size);
    }
    // Always set tickFormat - use custom formatter or reset to default (null)
    if (this.xAxisConfig.formatter && typeof this.xAxisConfig.formatter === 'function') {
      const xFormatter = this.xAxisConfig.formatter;
      this.xAxisGenerator.tickFormat((d) => xFormatter(d as number));
    } else {
      this.xAxisGenerator.tickFormat(null);
    }

    // Y-axis configuration
    if (this.yAxisConfig.ticks?.count) {
      this.yAxisGenerator.ticks(this.yAxisConfig.ticks.count);
    }
    if (this.yAxisConfig.ticks?.size) {
      this.yAxisGenerator.tickSize(this.yAxisConfig.ticks.size);
    }
    // Always set tickFormat - use custom formatter or reset to default (null)
    if (this.yAxisConfig.formatter && typeof this.yAxisConfig.formatter === 'function') {
      const yFormatter = this.yAxisConfig.formatter;
      this.yAxisGenerator.tickFormat((d) => yFormatter(d as number));
    } else {
      this.yAxisGenerator.tickFormat(null);
    }
  }

  /**
   * Update axis labels
   */
  private updateLabels(): void {
    // X-axis label
    if (this.xAxisConfig.label) {
      if (!this.xLabelGroup) {
        this.xLabelGroup = this.svgSelection
          .append('text')
          .attr('class', 'lumina-x-axis-label')
          .style('font-size', '12px')
          .style('fill', 'var(--lumina-axis-label-color, #333)')
          .style('text-anchor', 'middle');
      }
      this.xLabelGroup
        .attr('x', this.margins.left + (this.width - this.margins.left - this.margins.right) / 2)
        .attr('y', this.height - 5)
        .text(this.xAxisConfig.label);
    }

    // Y-axis label
    if (this.yAxisConfig.label) {
      if (!this.yLabelGroup) {
        this.yLabelGroup = this.svgSelection
          .append('text')
          .attr('class', 'lumina-y-axis-label')
          .style('font-size', '12px')
          .style('fill', 'var(--lumina-axis-label-color, #333)')
          .style('text-anchor', 'middle');
      }
      this.yLabelGroup
        .attr('transform', `rotate(-90)`)
        .attr('x', -(this.margins.top + (this.height - this.margins.top - this.margins.bottom) / 2))
        .attr('y', 15)
        .text(this.yAxisConfig.label);
    }
  }

  /**
   * Set the data domain for both axes
   */
  setDomain(domain: DataDomain): void {
    const xType = this.xAxisConfig.type ?? 'linear';
    const yType = this.yAxisConfig.type ?? 'linear';

    // Set domain for continuous and time scales (not band scales)
    if (xType !== 'band') {
      if (this.xScale instanceof TimeScale) {
        // TimeScale expects Date or number (timestamps)
        this.xScale.domain([domain.x[0], domain.x[1]]);
      } else {
        this.xScale.domain(domain.x as [number, number]);
      }
    }

    if (yType !== 'band') {
      if (this.yScale instanceof TimeScale) {
        this.yScale.domain([domain.y[0], domain.y[1]]);
      } else {
        this.yScale.domain(domain.y as [number, number]);
      }
    }

    // Update axis generators with new scales
    this.xAxisGenerator.scale(this.getD3Scale(this.xScale) as any);
    this.yAxisGenerator.scale(this.getD3Scale(this.yScale) as any);
  }

  /**
   * Set categories for band/category scales
   */
  setCategories(axis: 'x' | 'y', categories: string[]): void {
    const scale = axis === 'x' ? this.xScale : this.yScale;
    if (scale instanceof BandScale) {
      scale.domain(categories);
      const generator = axis === 'x' ? this.xAxisGenerator : this.yAxisGenerator;
      generator.scale(scale.getD3Scale() as any);
    }
  }

  /**
   * Set the pixel dimensions
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // Update SVG viewBox
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Update scale ranges
    const plotLeft = this.margins.left;
    const plotRight = width - this.margins.right;
    const plotTop = this.margins.top;
    const plotBottom = height - this.margins.bottom;

    this.xScale.range([plotLeft, plotRight]);
    this.yScale.range([plotBottom, plotTop]); // Y is inverted in SVG

    // Update axis generators with new scales
    this.xAxisGenerator.scale(this.getD3Scale(this.xScale) as any);
    this.yAxisGenerator.scale(this.getD3Scale(this.yScale) as any);

    // Update axis positions
    this.xAxisGroup.attr('transform', `translate(0, ${plotBottom})`);
    this.yAxisGroup.attr('transform', `translate(${plotLeft}, 0)`);

    // Update labels
    this.updateLabels();
  }

  /**
   * Render the axes
   */
  render(): void {
    // Check if axes should be shown
    if (this.xAxisConfig.show !== false) {
      this.xAxisGroup.call(this.xAxisGenerator as any);
      this.styleAxisLines(this.xAxisGroup);
    }

    if (this.yAxisConfig.show !== false) {
      this.yAxisGroup.call(this.yAxisGenerator as any);
      this.styleAxisLines(this.yAxisGroup);
    }
  }

  /**
   * Apply consistent styling to axis lines
   */
  private styleAxisLines(axisGroup: Selection<SVGGElement, unknown, null, undefined>): void {
    axisGroup
      .selectAll('line')
      .style('stroke', 'var(--lumina-axis-line-color, #ccc)');

    axisGroup
      .selectAll('path')
      .style('stroke', 'var(--lumina-axis-line-color, #ccc)');

    axisGroup
      .selectAll('text')
      .style('fill', 'var(--lumina-axis-text-color, #666)');
  }

  /**
   * Get tick values for grid lines
   */
  getXTicks(): (number | string | Date)[] {
    return this.xScale.ticks(this.xAxisConfig.ticks?.count);
  }

  /**
   * Get tick values for grid lines
   */
  getYTicks(): (number | string | Date)[] {
    return this.yScale.ticks(this.yAxisConfig.ticks?.count);
  }

  /**
   * Get the X scale type
   */
  getXScaleType(): ScaleType {
    return this.xAxisConfig.type ?? 'linear';
  }

  /**
   * Get the Y scale type
   */
  getYScaleType(): ScaleType {
    return this.yAxisConfig.type ?? 'linear';
  }

  /**
   * Convert pixel X to data X
   */
  pixelToDataX(pixelX: number): number | string | Date {
    return this.xScale.invert(pixelX);
  }

  /**
   * Convert pixel Y to data Y
   */
  pixelToDataY(pixelY: number): number | string | Date {
    return this.yScale.invert(pixelY);
  }

  /**
   * Convert data X to pixel X
   */
  dataToPixelX(dataX: number | string | Date): number {
    return this.xScale.scale(dataX);
  }

  /**
   * Convert data Y to pixel Y
   */
  dataToPixelY(dataY: number | string | Date): number {
    return this.yScale.scale(dataY);
  }

  /**
   * Convert pixel coordinates to data coordinates
   */
  pixelToData(pixelX: number, pixelY: number): { x: number | string | Date; y: number | string | Date } {
    return {
      x: this.pixelToDataX(pixelX),
      y: this.pixelToDataY(pixelY),
    };
  }

  /**
   * Convert data coordinates to pixel coordinates
   */
  dataToPixel(dataX: number | string | Date, dataY: number | string | Date): { x: number; y: number } {
    return {
      x: this.dataToPixelX(dataX),
      y: this.dataToPixelY(dataY),
    };
  }

  /**
   * Get the X scale
   */
  getXScale(): Scale<number | string | Date, number> {
    return this.xScale;
  }

  /**
   * Get the Y scale
   */
  getYScale(): Scale<number | string | Date, number> {
    return this.yScale;
  }

  /**
   * Update margins
   */
  setMargins(margins: Margins): void {
    this.margins = margins;
    this.setSize(this.width, this.height);
  }

  /**
   * Convert domain value to number (handles Date -> timestamp conversion)
   */
  private domainValueToNumber(value: number | string | Date): number {
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === 'number') {
      return value;
    }
    return 0;
  }

  /**
   * Update axis configuration
   */
  updateConfig(xAxis?: AxisConfig, yAxis?: AxisConfig): void {
    const xScaleTypeChanged = xAxis && (xAxis.type !== this.xAxisConfig.type || xAxis.scale !== this.xAxisConfig.scale);
    const yScaleTypeChanged = yAxis && (yAxis.type !== this.yAxisConfig.type || yAxis.scale !== this.yAxisConfig.scale);

    if (xAxis) {
      this.xAxisConfig = xAxis;
    }
    if (yAxis) {
      this.yAxisConfig = yAxis;
    }

    // Recreate scales if type changed
    if (xScaleTypeChanged) {
      const oldDomain = this.xScale.domain();
      const oldRange = this.xScale.range();
      this.xScale = this.createScale(this.xAxisConfig);

      // Convert domain values to appropriate type for new scale
      const newType = this.xAxisConfig.type ?? 'linear';
      if (newType === 'time') {
        // TimeScale accepts numbers (timestamps) or Date
        const d0 = this.domainValueToNumber(oldDomain[0]);
        const d1 = this.domainValueToNumber(oldDomain[1]);
        this.xScale.domain([d0, d1] as [number, number]);
      } else if (newType !== 'band') {
        // Continuous scales need numbers
        const d0 = this.domainValueToNumber(oldDomain[0]);
        const d1 = this.domainValueToNumber(oldDomain[1]);
        this.xScale.domain([d0, d1] as [number, number]);
      }
      this.xScale.range(oldRange);
      this.xAxisGenerator = axisBottom(this.getD3Scale(this.xScale) as any);
    }

    if (yScaleTypeChanged) {
      const oldDomain = this.yScale.domain();
      const oldRange = this.yScale.range();
      this.yScale = this.createScale(this.yAxisConfig);

      // Convert domain values to appropriate type for new scale
      const newType = this.yAxisConfig.type ?? 'linear';
      if (newType === 'time') {
        const d0 = this.domainValueToNumber(oldDomain[0]);
        const d1 = this.domainValueToNumber(oldDomain[1]);
        this.yScale.domain([d0, d1] as [number, number]);
      } else if (newType !== 'band') {
        const d0 = this.domainValueToNumber(oldDomain[0]);
        const d1 = this.domainValueToNumber(oldDomain[1]);
        this.yScale.domain([d0, d1] as [number, number]);
      }
      this.yScale.range(oldRange);
      this.yAxisGenerator = axisLeft(this.getD3Scale(this.yScale) as any);
    }

    this.applyAxisConfig();
  }

  /**
   * Export the SVG axes as an Image element
   * This is used for chart export to combine WebGL canvas with SVG axes
   * @returns Promise that resolves to an Image containing the axes
   */
  async toImage(): Promise<HTMLImageElement> {
    // Clone SVG to avoid modifying the live DOM
    const svgClone = this.svg.cloneNode(true) as SVGSVGElement;

    // Set explicit dimensions on the clone
    svgClone.setAttribute('width', String(this.width));
    svgClone.setAttribute('height', String(this.height));

    // Inline all computed styles (required for serialization since CSS variables won't work)
    this.inlineStyles(svgClone);

    // Serialize SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgClone);

    // Create blob and object URL
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Load as image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG axes as image'));
      };
      img.src = url;
    });
  }

  /**
   * Inline computed styles into SVG elements (required for export)
   * CSS variables and external styles won't work in serialized SVG
   */
  private inlineStyles(svg: SVGSVGElement): void {
    // Get all elements that need styling
    const elements = svg.querySelectorAll('text, line, path, g');

    elements.forEach((el) => {
      const element = el as SVGElement;
      const computed = window.getComputedStyle(element);
      const style = element.style;

      // Copy essential styles based on element type
      if (el.tagName === 'text') {
        style.fill = computed.fill;
        style.fontSize = computed.fontSize;
        style.fontFamily = computed.fontFamily;
        style.fontWeight = computed.fontWeight;
        style.textAnchor = computed.textAnchor;
      } else if (el.tagName === 'line' || el.tagName === 'path') {
        style.stroke = computed.stroke;
        style.strokeWidth = computed.strokeWidth;
        style.fill = computed.fill;
      } else if (el.tagName === 'g') {
        // Groups may have font styling
        style.fontSize = computed.fontSize;
        style.fontFamily = computed.fontFamily;
      }
    });
  }

  /**
   * Get the SVG element (for direct access if needed)
   */
  getSVGElement(): SVGSVGElement {
    return this.svg;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.svg.remove();
  }
}
