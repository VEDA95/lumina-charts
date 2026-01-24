/**
 * Legend component for chart series
 */

import type { RGBAColor } from '../types/index.js';

/**
 * Legend item data
 */
export interface LegendItem {
  /** Unique identifier for this item */
  id: string;
  /** Display label */
  label: string;
  /** Color for the indicator */
  color: string | RGBAColor;
  /** Whether the item is currently visible */
  visible?: boolean;
}

/**
 * Legend configuration options
 */
export interface LegendOptions {
  /** Position of the legend relative to the chart */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Layout direction of legend items */
  layout?: 'horizontal' | 'vertical';
  /** Shape of the color indicator */
  indicatorShape?: 'circle' | 'square';
  /** Style preset */
  style?: 'default' | 'shadcn';
  /** Whether clicking items toggles visibility */
  interactive?: boolean;
  /** Gap between items in pixels */
  itemGap?: number;
  /** Maximum width for the legend container (useful for left/right position) */
  maxWidth?: number;
  /** Maximum height for the legend container (useful for top/bottom position) */
  maxHeight?: number;
}

/**
 * Callback for visibility changes
 */
export type LegendVisibilityCallback = (id: string, visible: boolean) => void;

/**
 * Legend component that displays chart series with color indicators
 * Supports both default and shadcn styling
 */
export class Legend {
  private _container: HTMLElement;
  private element: HTMLDivElement;
  private options: Required<LegendOptions>;
  private items: LegendItem[] = [];
  private visibilityCallbacks: LegendVisibilityCallback[] = [];
  private itemElements: Map<string, HTMLDivElement> = new Map();

  constructor(container: HTMLElement, options: LegendOptions = {}) {
    this._container = container;
    this.options = {
      position: options.position ?? 'top',
      layout: options.layout ?? 'horizontal',
      indicatorShape: options.indicatorShape ?? 'square',
      style: options.style ?? 'default',
      interactive: options.interactive ?? true,
      itemGap: options.itemGap ?? 16,
      maxWidth: options.maxWidth ?? 300,
      maxHeight: options.maxHeight ?? 100,
    };

    // Create legend element
    this.element = document.createElement('div');
    this.element.className = 'lumina-legend';
    this.applyContainerStyles();

    this._container.appendChild(this.element);
  }

  /**
   * Apply styles to the legend container
   */
  private applyContainerStyles(): void {
    const { position, layout, maxWidth, maxHeight, itemGap } = this.options;
    const isShadcn = this.options.style === 'shadcn';

    // Base styles
    let styles = `
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      font-family: ${isShadcn ? 'Inter, system-ui, -apple-system, sans-serif' : 'system-ui, sans-serif'};
      font-size: ${isShadcn ? '12px' : '11px'};
      gap: ${itemGap}px;
    `;

    // Position-specific styles
    if (position === 'top' || position === 'bottom') {
      styles += `
        flex-direction: ${layout === 'vertical' ? 'column' : 'row'};
        justify-content: center;
        max-height: ${maxHeight}px;
        overflow-y: auto;
        padding: 8px 0;
      `;
    } else {
      styles += `
        flex-direction: column;
        max-width: ${maxWidth}px;
        overflow-y: auto;
        padding: 0 8px;
      `;
    }

    this.element.style.cssText = styles;
  }

  /**
   * Set legend items
   */
  setItems(items: LegendItem[]): void {
    this.items = items;
    this.render();
  }

  /**
   * Get current items
   */
  getItems(): LegendItem[] {
    return this.items;
  }

  /**
   * Register a callback for visibility changes
   */
  onVisibilityChange(callback: LegendVisibilityCallback): void {
    this.visibilityCallbacks.push(callback);
  }

  /**
   * Remove a visibility callback
   */
  offVisibilityChange(callback: LegendVisibilityCallback): void {
    const index = this.visibilityCallbacks.indexOf(callback);
    if (index !== -1) {
      this.visibilityCallbacks.splice(index, 1);
    }
  }

  /**
   * Toggle visibility of an item
   */
  toggleVisibility(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.visible = item.visible === false ? true : false;
      this.updateItemVisualState(id);
      this.notifyVisibilityChange(id, item.visible);
    }
  }

  /**
   * Set visibility of an item
   */
  setVisibility(id: string, visible: boolean): void {
    const item = this.items.find((i) => i.id === id);
    if (item && item.visible !== visible) {
      item.visible = visible;
      this.updateItemVisualState(id);
      this.notifyVisibilityChange(id, visible);
    }
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<LegendOptions>): void {
    Object.assign(this.options, options);
    this.applyContainerStyles();
    this.render();
  }

  /**
   * Render the legend
   */
  render(): void {
    // Clear existing items
    this.element.innerHTML = '';
    this.itemElements.clear();

    // Render each item
    for (const item of this.items) {
      const itemEl = this.createItemElement(item);
      this.element.appendChild(itemEl);
      this.itemElements.set(item.id, itemEl);
    }
  }

  /**
   * Create a legend item element
   */
  private createItemElement(item: LegendItem): HTMLDivElement {
    const { indicatorShape, style, interactive } = this.options;
    const isShadcn = style === 'shadcn';
    const isVisible = item.visible !== false;

    const itemEl = document.createElement('div');
    itemEl.className = 'lumina-legend-item';
    itemEl.dataset.id = item.id;

    // Get color as CSS string
    const colorStr = this.getColorString(item.color);

    // Container styles
    itemEl.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: ${interactive ? 'pointer' : 'default'};
      opacity: ${isVisible ? '1' : '0.4'};
      transition: opacity 0.2s ease;
      user-select: none;
    `;

    // Create indicator
    const indicator = document.createElement('span');
    indicator.className = 'lumina-legend-indicator';

    if (isShadcn) {
      // shadcn style: square with slight border radius
      indicator.style.cssText = `
        width: 10px;
        height: 10px;
        border-radius: ${indicatorShape === 'circle' ? '50%' : '2px'};
        background: ${colorStr};
        flex-shrink: 0;
      `;
    } else {
      // Default style
      indicator.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: ${indicatorShape === 'circle' ? '50%' : '2px'};
        background: ${colorStr};
        flex-shrink: 0;
      `;
    }

    // Create label
    const label = document.createElement('span');
    label.className = 'lumina-legend-label';
    label.textContent = item.label;

    if (isShadcn) {
      label.style.cssText = `
        color: #71717a;
        white-space: nowrap;
      `;
    } else {
      label.style.cssText = `
        color: #666;
        white-space: nowrap;
      `;
    }

    itemEl.appendChild(indicator);
    itemEl.appendChild(label);

    // Add click handler for interactive mode
    if (interactive) {
      itemEl.addEventListener('click', () => {
        this.toggleVisibility(item.id);
      });

      // Hover effect
      itemEl.addEventListener('mouseenter', () => {
        if (item.visible !== false) {
          itemEl.style.opacity = '0.7';
        }
      });
      itemEl.addEventListener('mouseleave', () => {
        itemEl.style.opacity = item.visible !== false ? '1' : '0.4';
      });
    }

    return itemEl;
  }

  /**
   * Update visual state of an item
   */
  private updateItemVisualState(id: string): void {
    const item = this.items.find((i) => i.id === id);
    const itemEl = this.itemElements.get(id);

    if (item && itemEl) {
      const isVisible = item.visible !== false;
      itemEl.style.opacity = isVisible ? '1' : '0.4';
    }
  }

  /**
   * Notify callbacks of visibility change
   */
  private notifyVisibilityChange(id: string, visible: boolean): void {
    for (const callback of this.visibilityCallbacks) {
      callback(id, visible);
    }
  }

  /**
   * Convert color to CSS string
   */
  private getColorString(color: string | RGBAColor): string {
    if (typeof color === 'string') {
      return color;
    }
    // Convert RGBA array to CSS
    const [r, g, b, a] = color;
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
  }

  /**
   * Get the legend element
   */
  getElement(): HTMLDivElement {
    return this.element;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.element.remove();
    this.items = [];
    this.visibilityCallbacks = [];
    this.itemElements.clear();
  }
}
