/**
 * Axis renderer using D3 for scales and SVG rendering
 */

import { scaleLinear, type ScaleLinear } from 'd3-scale';
import { axisBottom, axisLeft, type Axis } from 'd3-axis';
import { select, type Selection } from 'd3-selection';
import type { Margins, DataDomain, AxisConfig } from '../types/index.js';

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

  // D3 scales
  private xScale: ScaleLinear<number, number>;
  private yScale: ScaleLinear<number, number>;

  // D3 axis generators
  private xAxisGenerator: Axis<number>;
  private yAxisGenerator: Axis<number>;

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

    // Initialize scales with default domain
    this.xScale = scaleLinear().domain([0, 1]).range([0, 100]);
    this.yScale = scaleLinear().domain([0, 1]).range([100, 0]);

    // Initialize axis generators
    this.xAxisGenerator = axisBottom<number>(this.xScale);
    this.yAxisGenerator = axisLeft<number>(this.yScale);

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
    if (this.xAxisConfig.formatter) {
      this.xAxisGenerator.tickFormat((d) => this.xAxisConfig.formatter!(d as number));
    }

    // Y-axis configuration
    if (this.yAxisConfig.ticks?.count) {
      this.yAxisGenerator.ticks(this.yAxisConfig.ticks.count);
    }
    if (this.yAxisConfig.ticks?.size) {
      this.yAxisGenerator.tickSize(this.yAxisConfig.ticks.size);
    }
    if (this.yAxisConfig.formatter) {
      this.yAxisGenerator.tickFormat((d) => this.yAxisConfig.formatter!(d as number));
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
    this.xScale.domain(domain.x);
    this.yScale.domain(domain.y);
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
  getXTicks(): number[] {
    return this.xScale.ticks(this.xAxisConfig.ticks?.count);
  }

  /**
   * Get tick values for grid lines
   */
  getYTicks(): number[] {
    return this.yScale.ticks(this.yAxisConfig.ticks?.count);
  }

  /**
   * Convert pixel X to data X
   */
  pixelToDataX(pixelX: number): number {
    return this.xScale.invert(pixelX);
  }

  /**
   * Convert pixel Y to data Y
   */
  pixelToDataY(pixelY: number): number {
    return this.yScale.invert(pixelY);
  }

  /**
   * Convert data X to pixel X
   */
  dataToPixelX(dataX: number): number {
    return this.xScale(dataX);
  }

  /**
   * Convert data Y to pixel Y
   */
  dataToPixelY(dataY: number): number {
    return this.yScale(dataY);
  }

  /**
   * Convert pixel coordinates to data coordinates
   */
  pixelToData(pixelX: number, pixelY: number): { x: number; y: number } {
    return {
      x: this.pixelToDataX(pixelX),
      y: this.pixelToDataY(pixelY),
    };
  }

  /**
   * Convert data coordinates to pixel coordinates
   */
  dataToPixel(dataX: number, dataY: number): { x: number; y: number } {
    return {
      x: this.dataToPixelX(dataX),
      y: this.dataToPixelY(dataY),
    };
  }

  /**
   * Get the X scale
   */
  getXScale(): ScaleLinear<number, number> {
    return this.xScale;
  }

  /**
   * Get the Y scale
   */
  getYScale(): ScaleLinear<number, number> {
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
   * Update axis configuration
   */
  updateConfig(xAxis?: AxisConfig, yAxis?: AxisConfig): void {
    if (xAxis) {
      this.xAxisConfig = xAxis;
    }
    if (yAxis) {
      this.yAxisConfig = yAxis;
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
