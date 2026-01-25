/**
 * Candlestick chart implementation for OHLC financial data
 */

import type {
  RenderPass,
  Series,
  RGBAColor,
  DataDomain,
} from '../../types/index.js';
import type {
  CandlestickChartOptions,
  CandlestickChartConfig,
  Candle,
  OHLCDataPoint,
  CandlestickOrientation,
} from '../../types/candlestick.js';
import { BaseChart, type BaseChartConfig } from '../BaseChart.js';
import { CandlestickRenderPass } from './CandlestickRenderPass.js';
import { GridRenderPass } from '../GridRenderPass.js';
import { AxisRenderer } from '../../axes/AxisRenderer.js';

/**
 * Default colors for candlesticks
 */
const DEFAULT_UP_COLOR: RGBAColor = [0.2, 0.7, 0.3, 1.0]; // Green
const DEFAULT_DOWN_COLOR: RGBAColor = [0.8, 0.2, 0.2, 1.0]; // Red

/**
 * Candlestick chart for visualizing OHLC financial data
 */
export class CandlestickChart extends BaseChart {
  private candlestickOptions: CandlestickChartOptions = {};
  private axisRenderer: AxisRenderer | null = null;
  private gridRenderPass: GridRenderPass | null = null;
  private candlestickRenderPass!: CandlestickRenderPass;

  // Processed candle data for hit testing
  private candles: Candle[] = [];

  // Hover state
  private hoveredCandle: Candle | null = null;

  constructor(config: CandlestickChartConfig) {
    // Store options BEFORE super() because createRenderPasses is called during BaseChart constructor
    const options = config.options ?? {};

    super(config as BaseChartConfig);

    this.candlestickOptions = options;

    // Initialize axis renderer
    this.axisRenderer = new AxisRenderer({
      container: this.getOverlayElement(),
      margins: this.getMargins(),
      xAxis: this.createXAxisConfig(),
      yAxis: this.candlestickOptions.yAxis,
    });

    // Get render passes
    this.gridRenderPass = this.renderer.getRenderPass('grid') as GridRenderPass | null;
    this.candlestickRenderPass = this.renderer.getRenderPass('candlestick') as CandlestickRenderPass;

    // Initialize axis renderer
    this.initializeAxisRenderer();

    // Setup hover interaction
    this.setupHoverInteraction();
  }

  /**
   * Get the chart orientation
   */
  getOrientation(): CandlestickOrientation {
    return this.candlestickOptions.orientation ?? 'vertical';
  }

  /**
   * Create X-axis config with time scale support
   */
  private createXAxisConfig() {
    const baseConfig = this.candlestickOptions.xAxis ?? {};
    const orientation = this.getOrientation();

    if (orientation === 'vertical') {
      // X axis is time for vertical charts
      return {
        ...baseConfig,
        type: baseConfig.type ?? ('time' as const),
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? 6,
        },
      };
    } else {
      // X axis is price for horizontal charts
      return {
        ...baseConfig,
        type: baseConfig.type ?? ('linear' as const),
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? 6,
        },
      };
    }
  }

  /**
   * Create Y-axis config
   */
  private createYAxisConfig() {
    const baseConfig = this.candlestickOptions.yAxis ?? {};
    const orientation = this.getOrientation();

    if (orientation === 'vertical') {
      // Y axis is price for vertical charts
      return {
        ...baseConfig,
        type: baseConfig.type ?? ('linear' as const),
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? 6,
        },
      };
    } else {
      // Y axis is time for horizontal charts
      return {
        ...baseConfig,
        type: baseConfig.type ?? ('time' as const),
        ticks: {
          ...baseConfig.ticks,
          count: baseConfig.ticks?.count ?? 6,
        },
      };
    }
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
      this.syncGridTicks();
    }
  }

  /**
   * Setup hover interaction for tooltips
   */
  private setupHoverInteraction(): void {
    this.addInteraction({
      id: 'candlestick-hover',
      enabled: true,
      attach: () => {},
      detach: () => {},
      onPointerMove: (event) => {
        const candle = this.candlestickRenderPass.hitTest(event.x, event.y);

        if (candle !== this.hoveredCandle) {
          // Clear previous hover
          if (this.hoveredCandle) {
            this.hoveredCandle.hovered = false;
          }

          // Set new hover
          this.hoveredCandle = candle;

          if (candle) {
            candle.hovered = true;
            this.showTooltip(candle, event.originalEvent);
          } else {
            this.hideTooltip();
          }

          // Re-upload candle data with updated hover state
          this.candlestickRenderPass.updateData(this.candles);
          this.render();
        } else if (candle) {
          // Update tooltip position
          this.showTooltip(candle, event.originalEvent);
        }
      },
    });
  }

  /**
   * Show tooltip for a candle
   */
  private showTooltip(candle: Candle, event: PointerEvent | WheelEvent): void {
    const tooltip = this.getTooltipElement();

    // Format the date
    const date = new Date(candle.timestamp);
    const dateStr = date.toLocaleDateString();

    // Format OHLC values
    const formatPrice = (price: number) => price.toFixed(2);

    // Indicator color for bullish/bearish
    const indicatorColor = candle.bullish ? '#4ade80' : '#f87171';

    tooltip.innerHTML = `
      <div style="font-weight: 500; margin-bottom: 8px; color: ${indicatorColor};">${dateStr}</div>
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
        <span style="opacity: 0.7;">Open</span>
        <span style="font-family: 'Geist Mono', monospace;">${formatPrice(candle.open)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
        <span style="opacity: 0.7;">High</span>
        <span style="font-family: 'Geist Mono', monospace;">${formatPrice(candle.high)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 2px;">
        <span style="opacity: 0.7;">Low</span>
        <span style="font-family: 'Geist Mono', monospace;">${formatPrice(candle.low)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px;">
        <span style="opacity: 0.7;">Close</span>
        <span style="font-family: 'Geist Mono', monospace; color: ${indicatorColor};">${formatPrice(candle.close)}</span>
      </div>
      <div style="padding-top: 4px; border-top: 1px solid currentColor; opacity: 0.3;">
        <span style="opacity: 1;">${candle.bullish ? '▲' : '▼'} <span style="font-family: 'Geist Mono', monospace;">${((candle.close - candle.open) / candle.open * 100).toFixed(2)}%</span></span>
      </div>
    `;

    tooltip.className = 'lumina-tooltip';
    tooltip.style.cssText = `
      position: absolute;
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
    `;

    // Position tooltip
    const rect = this.canvas.getBoundingClientRect();
    const offsetX = 15;
    const offsetY = 15;

    let left = event.clientX - rect.left + offsetX;
    let top = event.clientY - rect.top + offsetY;

    // Prevent tooltip from going off-screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left + tooltipRect.width > rect.width) {
      left = event.clientX - rect.left - tooltipRect.width - offsetX;
    }
    if (top + tooltipRect.height > rect.height) {
      top = event.clientY - rect.top - tooltipRect.height - offsetY;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    const tooltip = this.getTooltipElement();
    tooltip.style.display = 'none';
  }

  /**
   * Create render passes for candlestick chart
   */
  protected createRenderPasses(): RenderPass[] {
    const passes: RenderPass[] = [];

    // Add grid render pass if enabled
    const gridEnabled = this.candlestickOptions?.grid !== false;
    if (gridEnabled) {
      const gridPass = new GridRenderPass({
        gl: this.renderer.gl,
        getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
        margins: this.getMargins(),
        pixelRatio: this.pixelRatio,
        color: this.candlestickOptions?.gridColor,
        showHorizontal: true,
        showVertical: true,
      });
      passes.push(gridPass);
    }

    // Add candlestick render pass
    const candlestickPass = new CandlestickRenderPass({
      gl: this.renderer.gl,
      getShaderProgram: (id, source) => this.renderer.getShaderProgram(id, source),
      margins: this.getMargins(),
      pixelRatio: this.pixelRatio,
      orientation: this.candlestickOptions?.orientation,
      hoverBrighten: this.candlestickOptions?.hoverBrighten,
      wickWidth: this.candlestickOptions?.wickWidth,
    });
    passes.push(candlestickPass);

    return passes;
  }

  /**
   * Extract OHLC data from a data point
   */
  private extractOHLC(point: unknown): OHLCDataPoint | null {
    const p = point as { x?: number; y?: number; open?: number; high?: number; low?: number; close?: number };

    if (
      typeof p.x !== 'number' ||
      typeof p.open !== 'number' ||
      typeof p.high !== 'number' ||
      typeof p.low !== 'number'
    ) {
      return null;
    }

    // close defaults to y if not provided
    const close = typeof p.close === 'number' ? p.close : p.y;
    if (typeof close !== 'number') return null;

    return {
      x: p.x,
      y: close,
      open: p.open,
      high: p.high,
      low: p.low,
    };
  }

  /**
   * Called when data is updated
   */
  protected onDataUpdate(series: Series[]): void {
    const orientation = this.getOrientation();

    // Collect all OHLC data
    const ohlcData: OHLCDataPoint[] = [];
    for (const s of series) {
      if (s.visible === false) continue;
      for (const point of s.data) {
        const ohlc = this.extractOHLC(point);
        if (ohlc) {
          ohlcData.push(ohlc);
        }
      }
    }

    // Sort by x (timestamp)
    ohlcData.sort((a, b) => a.x - b.x);

    if (ohlcData.length === 0) {
      this.candles = [];
      this.candlestickRenderPass.updateData([]);
      return;
    }

    // Calculate domains
    let minTime = Infinity;
    let maxTime = -Infinity;
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const point of ohlcData) {
      minTime = Math.min(minTime, point.x);
      maxTime = Math.max(maxTime, point.x);
      minPrice = Math.min(minPrice, point.low);
      maxPrice = Math.max(maxPrice, point.high);
    }

    // Add padding
    const timeRange = maxTime - minTime || 1;
    const timePadding = timeRange * 0.02;
    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.05;

    let xDomain: [number, number];
    let yDomain: [number, number];

    if (orientation === 'vertical') {
      xDomain = [minTime - timePadding, maxTime + timePadding];
      yDomain = [minPrice - pricePadding, maxPrice + pricePadding];
    } else {
      // Horizontal: swap time and price axes
      xDomain = [minPrice - pricePadding, maxPrice + pricePadding];
      yDomain = [minTime - timePadding, maxTime + timePadding];
    }

    // Update state domain and initial domain
    this.state.domain = { x: xDomain, y: yDomain };
    this.initialDomain = { x: [...xDomain], y: [...yDomain] };

    // Calculate candle layout and upload to GPU
    this.updateCandleLayout(ohlcData, series[0]?.id);

    // Update axis renderer
    if (this.axisRenderer) {
      this.axisRenderer.updateConfig(this.createXAxisConfig(), this.createYAxisConfig());
      this.axisRenderer.setDomain(this.state.domain);
      this.axisRenderer.render();
      this.syncGridTicks();
    }
  }

  /**
   * Calculate candle layout and generate candle data
   */
  private updateCandleLayout(ohlcData: OHLCDataPoint[], seriesId?: string): void {
    const { width, height } = this.state.viewport;
    if (width === 0 || height === 0 || ohlcData.length === 0) {
      this.candles = [];
      this.candlestickRenderPass.updateData([]);
      return;
    }

    const orientation = this.getOrientation();
    const margins = this.getMargins();
    const plotLeft = margins.left * this.pixelRatio;
    const plotTop = margins.top * this.pixelRatio;
    const plotRight = width - margins.right * this.pixelRatio;
    const plotBottom = height - margins.bottom * this.pixelRatio;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    const domain = this.state.domain;

    const upColor = this.candlestickOptions.upColor ?? DEFAULT_UP_COLOR;
    const downColor = this.candlestickOptions.downColor ?? DEFAULT_DOWN_COLOR;
    const wickColor = this.candlestickOptions.wickColor;
    const candleWidthRatio = this.candlestickOptions.candleWidth ?? 0.8;

    // Calculate candle width based on data density
    const timeAxisLength = orientation === 'vertical' ? plotWidth : plotHeight;
    const candleSpacing = timeAxisLength / ohlcData.length;
    const candleWidth = candleSpacing * candleWidthRatio;

    const candles: Candle[] = [];

    for (let i = 0; i < ohlcData.length; i++) {
      const point = ohlcData[i];
      const bullish = point.y >= point.open; // close >= open

      // Calculate position on time axis
      let timeNormalized: number;
      let timePos: number;

      if (orientation === 'vertical') {
        timeNormalized = (point.x - domain.x[0]) / (domain.x[1] - domain.x[0]);
        timePos = plotLeft + timeNormalized * plotWidth;
      } else {
        timeNormalized = (point.x - domain.y[0]) / (domain.y[1] - domain.y[0]);
        timePos = plotTop + timeNormalized * plotHeight;
      }

      const color: RGBAColor = bullish ? [...upColor] : [...downColor];
      const wColor: RGBAColor = wickColor ? [...wickColor] : [...color];

      candles.push({
        index: i,
        position: timePos,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.y,
        width: candleWidth,
        bullish,
        color,
        wickColor: wColor,
        dataIndex: i,
        seriesId,
        timestamp: point.x,
      });
    }

    this.candles = candles;

    // Update render pass with domain and plot area
    const plotArea = {
      x: plotLeft,
      y: plotTop,
      width: plotWidth,
      height: plotHeight,
    };

    this.candlestickRenderPass.setOrientation(orientation);
    this.candlestickRenderPass.setDomain(domain);
    this.candlestickRenderPass.setPlotArea(plotArea);
    this.candlestickRenderPass.updateData(candles);
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

    if (this.candlestickRenderPass) {
      this.candlestickRenderPass.setPixelRatio(this.pixelRatio);
    }

    if (this.gridRenderPass) {
      this.gridRenderPass.setPixelRatio(this.pixelRatio);
      this.syncGridTicks();
    }

    // Re-layout candles
    if (this.series.length > 0) {
      this.onDataUpdate(this.series);
    }
  }

  /**
   * Called when domain changes (zoom/pan)
   */
  protected onDomainChange(domain: DataDomain): void {
    if (this.axisRenderer) {
      this.axisRenderer.setDomain(domain);
      this.axisRenderer.render();
    }
    this.syncGridTicks();

    // Re-layout candles with new domain
    if (this.series.length > 0) {
      // Re-extract OHLC data and recalculate layout
      const ohlcData: OHLCDataPoint[] = [];
      for (const s of this.series) {
        if (s.visible === false) continue;
        for (const point of s.data) {
          const ohlc = this.extractOHLC(point);
          if (ohlc) {
            ohlcData.push(ohlc);
          }
        }
      }
      ohlcData.sort((a, b) => a.x - b.x);
      this.updateCandleLayout(ohlcData, this.series[0]?.id);
    }
  }

  /**
   * Sync grid tick positions with axis renderer
   */
  private syncGridTicks(): void {
    if (!this.gridRenderPass || !this.axisRenderer) return;

    const xTicks = this.axisRenderer.getXTicks();
    const yTicks = this.axisRenderer.getYTicks();
    this.gridRenderPass.setTicks(xTicks, yTicks);
  }

  /**
   * Called when options are updated
   */
  protected onOptionsUpdate(options: Partial<CandlestickChartOptions>): void {
    if (this.axisRenderer && (options.xAxis || options.yAxis)) {
      const xConfig = options.xAxis ? { ...options.xAxis, ...this.createXAxisConfig() } : undefined;
      const yConfig = options.yAxis ? { ...options.yAxis, ...this.createYAxisConfig() } : undefined;
      this.axisRenderer.updateConfig(xConfig, yConfig);
    }

    // Update candlestick-specific options
    Object.assign(this.candlestickOptions, options);

    // Update orientation if changed
    if (options.orientation) {
      this.candlestickRenderPass.setOrientation(options.orientation);
    }

    // Re-layout if needed
    if (
      options.upColor !== undefined ||
      options.downColor !== undefined ||
      options.wickColor !== undefined ||
      options.candleWidth !== undefined ||
      options.orientation !== undefined
    ) {
      if (this.series.length > 0) {
        this.onDataUpdate(this.series);
      }
    }

    // Update margins if changed
    if (options.margins) {
      if (this.candlestickRenderPass) {
        this.candlestickRenderPass.setMargins(this.margins);
      }
      if (this.axisRenderer) {
        this.axisRenderer.setMargins(this.margins);
      }
      if (this.gridRenderPass) {
        this.gridRenderPass.setMargins(this.margins);
      }
    }

    // Update grid color if changed
    if (options.gridColor && this.gridRenderPass) {
      this.gridRenderPass.setColor(options.gridColor);
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
   * Get the axis renderer
   */
  getAxisRenderer(): AxisRenderer | null {
    return this.axisRenderer;
  }

  /**
   * Hit test to find candle at pixel coordinates
   */
  hitTestCandle(pixelX: number, pixelY: number): Candle | null {
    return this.candlestickRenderPass.hitTest(pixelX, pixelY);
  }

  /**
   * Get all candles
   */
  getCandles(): Candle[] {
    return this.candles;
  }

  /**
   * Convert pixel to data coordinates
   */
  override pixelToData(pixelX: number, pixelY: number): { x: number; y: number } {
    if (!this.axisRenderer) {
      return super.pixelToData(pixelX, pixelY);
    }
    const cssX = pixelX / this.pixelRatio;
    const cssY = pixelY / this.pixelRatio;
    return this.axisRenderer.pixelToData(cssX, cssY);
  }

  /**
   * Convert data to pixel coordinates
   */
  override dataToPixel(dataX: number, dataY: number): { x: number; y: number } {
    if (!this.axisRenderer) {
      return super.dataToPixel(dataX, dataY);
    }
    const { x, y } = this.axisRenderer.dataToPixel(dataX, dataY);
    return {
      x: x * this.pixelRatio,
      y: y * this.pixelRatio,
    };
  }

  /**
   * Get the axes as an image for export compositing
   */
  protected override async getAxesImage(): Promise<HTMLImageElement | null> {
    if (!this.axisRenderer) return null;
    return this.axisRenderer.toImage();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.axisRenderer) {
      this.axisRenderer.dispose();
    }
    this.hideTooltip();
    super.dispose();
  }
}
