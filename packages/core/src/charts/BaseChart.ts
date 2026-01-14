/**
 * Base chart class providing core functionality for all chart types
 */

import type {
  ChartOptions,
  ChartState,
  RenderPass,
  Margins,
  DataDomain,
  Series,
  InteractionEvent,
  HoverEvent,
  ResizeEvent,
  DataUpdateEvent,
} from '../types/index.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { WebGLRenderer } from '../renderer/WebGLRenderer.js';
import { DataProcessor } from '../data/DataProcessor.js';
import { SpatialIndex } from '../data/SpatialIndex.js';
import { LODManager } from '../data/LODManager.js';

/**
 * Configuration for creating a chart
 */
export interface BaseChartConfig {
  /** Container element to render the chart into */
  container: HTMLElement;
  /** Chart options */
  options?: ChartOptions;
}

/**
 * Internal event map for chart events
 */
interface ChartEventMap {
  click: PointerEvent;
  hover: HoverEvent;
  hoverEnd: undefined;
  selectionChange: { selected: Set<string>; added: string[]; removed: string[] };
  zoom: { domain: DataDomain; factor: number };
  pan: { domain: DataDomain; delta: { x: number; y: number } };
  dataUpdate: DataUpdateEvent;
  resize: ResizeEvent;
  render: undefined;
  ready: undefined;
  destroy: undefined;
}

/**
 * Default chart margins
 */
const DEFAULT_MARGINS: Margins = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 50,
};

/**
 * Interaction handler interface
 */
export interface InteractionHandler {
  /** Unique identifier */
  id: string;
  /** Whether the handler is enabled */
  enabled: boolean;
  /** Attach the handler to a chart */
  attach(chart: BaseChart): void;
  /** Detach the handler from a chart */
  detach(): void;
  /** Handle pointer down event */
  onPointerDown?(event: InteractionEvent): void;
  /** Handle pointer move event */
  onPointerMove?(event: InteractionEvent): void;
  /** Handle pointer up event */
  onPointerUp?(event: InteractionEvent): void;
  /** Handle wheel event */
  onWheel?(event: InteractionEvent): void;
}

/**
 * Options for chart image export
 */
export interface ExportImageOptions {
  /** Image format (default: 'png') */
  format?: 'png' | 'jpeg';
  /** JPEG quality 0-1 (default: 0.92) */
  quality?: number;
  /** Background color (default: '#ffffff') */
  backgroundColor?: string;
}

/**
 * Base chart class that all chart types extend
 */
export abstract class BaseChart extends EventEmitter<ChartEventMap> {
  // Container structure
  protected readonly containerElement: HTMLElement;
  protected readonly wrapperElement: HTMLDivElement;
  protected readonly canvas: HTMLCanvasElement;
  protected readonly overlayElement: HTMLDivElement;
  protected readonly tooltipElement: HTMLDivElement;

  // Core components
  protected readonly renderer: WebGLRenderer;
  protected readonly dataProcessor: DataProcessor;
  protected readonly spatialIndex: SpatialIndex;
  protected readonly lodManager: LODManager;

  // Configuration
  protected options: ChartOptions;
  protected margins: Margins;

  // State
  protected state: ChartState;
  protected series: Series[] = [];
  protected pixelRatio: number;
  protected initialDomain: DataDomain | null = null;

  // Interactions
  protected interactions: Map<string, InteractionHandler> = new Map();

  // Lifecycle
  private resizeObserver: ResizeObserver;
  private abortController: AbortController;
  private isDisposed: boolean = false;

  constructor(config: BaseChartConfig) {
    super();

    this.containerElement = config.container;
    this.options = config.options ?? {};
    this.margins = { ...DEFAULT_MARGINS, ...this.options.margins };
    this.pixelRatio = window.devicePixelRatio;
    this.abortController = new AbortController();

    // Create container structure
    const { wrapper, canvas, overlay, tooltip } = this.createContainerStructure();
    this.wrapperElement = wrapper;
    this.canvas = canvas;
    this.overlayElement = overlay;
    this.tooltipElement = tooltip;

    // Initialize renderer
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      pixelRatio: this.pixelRatio,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    // Initialize data components
    this.dataProcessor = new DataProcessor();
    this.spatialIndex = new SpatialIndex();
    this.lodManager = new LODManager();

    // Initialize state
    this.state = this.createInitialState();

    // Setup event listeners
    this.setupEventListeners();

    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.containerElement);

    // Initial resize
    this.handleResize();

    // Add render passes from subclass
    const passes = this.createRenderPasses();
    for (const pass of passes) {
      this.renderer.addRenderPass(pass);
    }

    // Emit ready event
    queueMicrotask(() => this.emit('ready', undefined));
  }

  /**
   * Create the DOM structure for the chart
   */
  private createContainerStructure(): {
    wrapper: HTMLDivElement;
    canvas: HTMLCanvasElement;
    overlay: HTMLDivElement;
    tooltip: HTMLDivElement;
  } {
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'lumina-chart-container';
    wrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    `;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'lumina-chart-canvas';
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;

    // Create overlay for axes and other DOM elements
    const overlay = document.createElement('div');
    overlay.className = 'lumina-chart-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;

    // Create tooltip container
    const tooltip = document.createElement('div');
    tooltip.className = 'lumina-chart-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      display: none;
      pointer-events: none;
      z-index: 100;
    `;

    // Assemble structure
    wrapper.appendChild(canvas);
    wrapper.appendChild(overlay);
    wrapper.appendChild(tooltip);
    this.containerElement.appendChild(wrapper);

    return { wrapper, canvas, overlay, tooltip };
  }

  /**
   * Create initial chart state
   */
  private createInitialState(): ChartState {
    return {
      domain: { x: [0, 1], y: [0, 1] },
      viewport: { width: 0, height: 0 },
      transform: { scale: 1, translateX: 0, translateY: 0 },
      selectedPoints: new Set(),
      hoveredPoint: null,
      visibleSeries: new Set(),
    };
  }

  /**
   * Setup pointer and wheel event listeners
   */
  private setupEventListeners(): void {
    const signal = this.abortController.signal;

    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerEvent('pointerdown', e), {
      signal,
    });

    this.canvas.addEventListener('pointermove', (e) => this.handlePointerEvent('pointermove', e), {
      signal,
    });

    this.canvas.addEventListener('pointerup', (e) => this.handlePointerEvent('pointerup', e), {
      signal,
    });

    this.canvas.addEventListener('pointerleave', (e) => this.handlePointerEvent('pointerup', e), {
      signal,
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.handleWheelEvent(e);
      },
      { signal, passive: false }
    );

    // Prevent context menu on right-click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
  }

  /**
   * Convert a DOM event to an InteractionEvent
   */
  protected createInteractionEvent(
    type: InteractionEvent['type'],
    originalEvent: PointerEvent | WheelEvent
  ): InteractionEvent {
    const rect = this.canvas.getBoundingClientRect();
    const x = (originalEvent.clientX - rect.left) * this.pixelRatio;
    const y = (originalEvent.clientY - rect.top) * this.pixelRatio;

    // Convert pixel to data coordinates
    const dataCoords = this.pixelToData(x, y);

    let defaultPrevented = false;

    return {
      type,
      x,
      y,
      dataX: dataCoords.x,
      dataY: dataCoords.y,
      originalEvent,
      defaultPrevented,
      preventDefault() {
        defaultPrevented = true;
        this.defaultPrevented = true;
      },
    };
  }

  /**
   * Handle pointer events
   */
  private handlePointerEvent(
    type: 'pointerdown' | 'pointermove' | 'pointerup',
    e: PointerEvent
  ): void {
    const event = this.createInteractionEvent(type, e);

    // Dispatch to interaction handlers
    for (const handler of this.interactions.values()) {
      if (!handler.enabled) continue;
      if (type === 'pointerdown' && handler.onPointerDown) handler.onPointerDown(event);
      if (type === 'pointermove' && handler.onPointerMove) handler.onPointerMove(event);
      if (type === 'pointerup' && handler.onPointerUp) handler.onPointerUp(event);
      if (event.defaultPrevented) break;
    }
  }

  /**
   * Handle wheel events
   */
  private handleWheelEvent(e: WheelEvent): void {
    const event = this.createInteractionEvent('wheel', e);

    for (const handler of this.interactions.values()) {
      if (!handler.enabled) continue;

      if (handler.onWheel) {
        handler.onWheel(event);
      }

      if (event.defaultPrevented) break;
    }
  }

  /**
   * Handle container resize
   */
  private handleResize(): void {
    const rect = this.containerElement.getBoundingClientRect();
    const width = rect.width * this.pixelRatio;
    const height = rect.height * this.pixelRatio;

    const previousWidth = this.state.viewport.width;
    const previousHeight = this.state.viewport.height;

    if (width === previousWidth && height === previousHeight) {
      return;
    }

    // Update canvas size
    this.canvas.width = width;
    this.canvas.height = height;

    // Update renderer
    this.renderer.resize();

    // Update state
    this.state.viewport = { width, height };

    // Notify subclass
    this.onResize(width, height);

    // Emit resize event
    this.emit('resize', {
      width,
      height,
      previousWidth,
      previousHeight,
      timestamp: Date.now(),
    });

    // Re-render
    this.render();
  }

  /**
   * Add an interaction handler
   */
  addInteraction(handler: InteractionHandler): void {
    if (this.interactions.has(handler.id)) this.removeInteraction(handler.id);
    handler.attach(this);
    this.interactions.set(handler.id, handler);
  }

  /**
   * Remove an interaction handler
   */
  removeInteraction(id: string): void {
    const handler = this.interactions.get(id);
    if (handler == null) return;
    handler.detach();
    this.interactions.delete(id);
  }

  /**
   * Get an interaction handler by ID
   */
  getInteraction(id: string): InteractionHandler | undefined {
    return this.interactions.get(id);
  }

  /**
   * Set chart data
   */
  setData(series: Series[]): void {
    const previousData = this.series;
    this.series = series;

    // Update visible series set
    this.state.visibleSeries = new Set(series.filter((s) => s.visible !== false).map((s) => s.id));

    // Calculate bounds
    const bounds = this.dataProcessor.calculateBounds(series);
    this.state.domain = bounds;
    this.initialDomain = { x: [...bounds.x], y: [...bounds.y] };

    // Build spatial index
    this.spatialIndex.build(
      series.map((s) => ({
        id: s.id,
        data: s.data,
      }))
    );

    // Process data for GPU (subclass handles this)
    this.onDataUpdate(series);

    // Emit data update event
    this.emit('dataUpdate', {
      data: series,
      previousData,
      timestamp: Date.now(),
    });

    // Re-render
    this.render();
  }

  /**
   * Get current series data
   */
  getData(): Series[] {
    return this.series;
  }

  /**
   * Update chart options
   */
  updateOptions(options: Partial<ChartOptions>): void {
    this.options = { ...this.options, ...options };

    if (options.margins) {
      this.margins = { ...DEFAULT_MARGINS, ...options.margins };
    }

    this.onOptionsUpdate(options);
    this.render();
  }

  /**
   * Get current chart state
   */
  getState(): Readonly<ChartState> {
    return this.state;
  }

  /**
   * Update chart domain (visible area)
   */
  setDomain(domain: DataDomain): void {
    this.state.domain = domain;
    this.onDomainChange(domain);
    this.render();
  }

  /**
   * Check if the chart is at the default (initial) zoom level
   */
  isAtDefaultZoom(): boolean {
    if (!this.initialDomain) return true;

    const { domain } = this.state;
    const epsilon = 1e-10;

    return (
      Math.abs(domain.x[0] - this.initialDomain.x[0]) < epsilon &&
      Math.abs(domain.x[1] - this.initialDomain.x[1]) < epsilon &&
      Math.abs(domain.y[0] - this.initialDomain.y[0]) < epsilon &&
      Math.abs(domain.y[1] - this.initialDomain.y[1]) < epsilon
    );
  }

  /**
   * Reset zoom to the initial/default level
   */
  resetZoom(): void {
    if (this.initialDomain) {
      this.setDomain({ x: [...this.initialDomain.x], y: [...this.initialDomain.y] });
    }
  }

  /**
   * Get the initial/default domain (data bounds)
   */
  getInitialDomain(): DataDomain | null {
    return this.initialDomain;
  }

  /**
   * Get the plot area dimensions (excluding margins)
   */
  getPlotArea(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.margins.left * this.pixelRatio,
      y: this.margins.top * this.pixelRatio,
      width: this.state.viewport.width - (this.margins.left + this.margins.right) * this.pixelRatio,
      height:
        this.state.viewport.height - (this.margins.top + this.margins.bottom) * this.pixelRatio,
    };
  }

  /**
   * Convert pixel coordinates to data coordinates
   */
  pixelToData(pixelX: number, pixelY: number): { x: number; y: number } {
    const plot = this.getPlotArea();
    const { domain } = this.state;
    const x = domain.x[0] + ((pixelX - plot.x) / plot.width) * (domain.x[1] - domain.x[0]);
    const y = domain.y[1] - ((pixelY - plot.y) / plot.height) * (domain.y[1] - domain.y[0]);

    return { x, y };
  }

  /**
   * Convert data coordinates to pixel coordinates
   */
  dataToPixel(dataX: number, dataY: number): { x: number; y: number } {
    const plot = this.getPlotArea();
    const { domain } = this.state;
    const x = plot.x + ((dataX - domain.x[0]) / (domain.x[1] - domain.x[0])) * plot.width;
    const y = plot.y + ((domain.y[1] - dataY) / (domain.y[1] - domain.y[0])) * plot.height;

    return { x, y };
  }

  /**
   * Render the chart
   */
  render(): void {
    if (this.isDisposed) return;

    this.renderer.render(this.state);
    this.emit('render', undefined);
  }

  /**
   * Get the WebGL renderer
   */
  getRenderer(): WebGLRenderer {
    return this.renderer;
  }

  /**
   * Get the spatial index
   */
  getSpatialIndex(): SpatialIndex {
    return this.spatialIndex;
  }

  /**
   * Get the LOD manager
   */
  getLODManager(): LODManager {
    return this.lodManager;
  }

  /**
   * Get the data processor
   */
  getDataProcessor(): DataProcessor {
    return this.dataProcessor;
  }

  /**
   * Get the overlay element (for axes, etc.)
   */
  getOverlayElement(): HTMLDivElement {
    return this.overlayElement;
  }

  /**
   * Get the tooltip element
   */
  getTooltipElement(): HTMLDivElement {
    return this.tooltipElement;
  }

  /**
   * Get the margins
   */
  getMargins(): Margins {
    return this.margins;
  }

  /**
   * Export chart as PNG data URL (WebGL canvas only, no axes)
   * @deprecated Use exportImage() for complete chart export with axes
   */
  toDataURL(type: string = 'image/png', quality?: number): string {
    return this.renderer.toDataURL(type, quality);
  }

  /**
   * Export chart as Blob (WebGL canvas only, no axes)
   * @deprecated Use exportImageBlob() for complete chart export with axes
   */
  toBlob(type: string = 'image/png', quality?: number): Promise<Blob> {
    return this.renderer.toBlob(type, quality);
  }

  /**
   * Export the complete chart (data + axes) as a PNG/JPEG data URL
   * @param options Export options
   * @returns Promise resolving to data URL
   */
  async exportImage(options?: ExportImageOptions): Promise<string> {
    const { format = 'png', quality, backgroundColor = '#ffffff' } = options ?? {};

    // Get dimensions (CSS pixels)
    const rect = this.containerElement.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Create compositing canvas at device pixel ratio for crisp output
    const canvas = document.createElement('canvas');
    canvas.width = width * this.pixelRatio;
    canvas.height = height * this.pixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context for export');
    }

    // Scale context to handle device pixel ratio
    ctx.scale(this.pixelRatio, this.pixelRatio);

    // 1. Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Force a synchronous render to ensure WebGL content is present
    // (WebGL's preserveDrawingBuffer is false by default, so buffer may be cleared)
    this.renderer.render(this.state);
    this.renderer.gl.finish();

    // 3. Draw WebGL canvas (already rendered at device pixel ratio)
    ctx.drawImage(
      this.canvas,
      0,
      0,
      this.canvas.width,
      this.canvas.height, // source (device pixels)
      0,
      0,
      width,
      height // destination (CSS pixels, will be scaled by ctx.scale)
    );

    // 4. Draw SVG axes on top (if available)
    const axesImage = await this.getAxesImage();
    if (axesImage) {
      ctx.drawImage(axesImage, 0, 0, width, height);
    }

    // 5. Export as data URL
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return canvas.toDataURL(mimeType, quality);
  }

  /**
   * Export the complete chart (data + axes) as a Blob
   * @param options Export options
   * @returns Promise resolving to Blob
   */
  async exportImageBlob(options?: ExportImageOptions): Promise<Blob> {
    const { format = 'png', quality, backgroundColor = '#ffffff' } = options ?? {};

    // Get dimensions (CSS pixels)
    const rect = this.containerElement.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Create compositing canvas at device pixel ratio for crisp output
    const canvas = document.createElement('canvas');
    canvas.width = width * this.pixelRatio;
    canvas.height = height * this.pixelRatio;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D canvas context for export');

    // Scale context to handle device pixel ratio
    ctx.scale(this.pixelRatio, this.pixelRatio);

    // 1. Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // 2. Force a synchronous render to ensure WebGL content is present
    // (WebGL's preserveDrawingBuffer is false by default, so buffer may be cleared)
    this.renderer.render(this.state);
    this.renderer.gl.finish();

    // 3. Draw WebGL canvas
    ctx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, width, height);

    // 4. Draw SVG axes on top (if available)
    const axesImage = await this.getAxesImage();
    if (axesImage) ctx.drawImage(axesImage, 0, 0, width, height);

    // 5. Export as Blob
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  /**
   * Get the axes as an image for export compositing
   * Override in subclasses that have axes (ScatterChart, LineChart)
   */
  protected async getAxesImage(): Promise<HTMLImageElement | null> {
    return null;
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    // Abort all event listeners
    this.abortController.abort();

    // Disconnect resize observer
    this.resizeObserver.disconnect();

    // Detach interaction handlers
    for (const handler of this.interactions.values()) {
      handler.detach();
    }
    this.interactions.clear();

    // Dispose renderer
    this.renderer.dispose();

    // Clear spatial index
    this.spatialIndex.clear();

    // Clear LOD data
    this.lodManager.clear();

    // Remove DOM elements
    this.wrapperElement.remove();

    // Emit destroy event
    this.emit('destroy', undefined);
  }

  // Abstract methods for subclasses to implement

  /**
   * Create render passes for this chart type
   */
  protected abstract createRenderPasses(): RenderPass[];

  /**
   * Called when data is updated
   */
  protected abstract onDataUpdate(series: Series[]): void;

  // Optional hooks for subclasses

  /**
   * Called when chart is resized
   */
  protected onResize(_width: number, _height: number): void {
    // Override in subclass if needed
  }

  /**
   * Called when options are updated
   */
  protected onOptionsUpdate(_options: Partial<ChartOptions>): void {
    // Override in subclass if needed
  }

  /**
   * Called when domain changes
   */
  protected onDomainChange(_domain: DataDomain): void {
    // Override in subclass if needed
  }
}
