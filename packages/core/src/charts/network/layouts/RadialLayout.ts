/**
 * Radial/circular layout algorithm
 * Places nodes evenly around a circle, optionally grouped by category
 */

import type { NetworkNode, NetworkEdge, RadialLayoutConfig } from '../../../types/network.js';

/**
 * Radial layout calculator
 */
export class RadialLayout {
  private config: Required<RadialLayoutConfig>;

  constructor(config?: RadialLayoutConfig) {
    this.config = {
      groupByCategory: config?.groupByCategory ?? true,
      radiusMultiplier: config?.radiusMultiplier ?? 0.4,
      startAngle: config?.startAngle ?? -90, // Start at top
    };
  }

  /**
   * Calculate layout positions for nodes
   * @returns Map of node id to {x, y} position in pixel space
   */
  calculate(
    nodes: NetworkNode[],
    _edges: NetworkEdge[],
    width: number,
    height: number
  ): Map<string, { x: number; y: number }> {
    if (nodes.length === 0) {
      return new Map();
    }

    const positions = new Map<string, { x: number; y: number }>();

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * this.config.radiusMultiplier;

    // Sort nodes by group if grouping is enabled
    let sortedNodes = [...nodes];
    if (this.config.groupByCategory) {
      sortedNodes = this.sortByGroup(sortedNodes);
    }

    // Place nodes evenly around the circle
    const angleStep = (2 * Math.PI) / sortedNodes.length;
    const startAngle = (this.config.startAngle * Math.PI) / 180;

    sortedNodes.forEach((node, index) => {
      const angle = startAngle + index * angleStep;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });

    return positions;
  }

  /**
   * Sort nodes by group to keep same groups together on the circle
   */
  private sortByGroup(nodes: NetworkNode[]): NetworkNode[] {
    return [...nodes].sort((a, b) => {
      const ga = String(a.group ?? '');
      const gb = String(b.group ?? '');
      if (ga < gb) return -1;
      if (ga > gb) return 1;
      return 0;
    });
  }
}
