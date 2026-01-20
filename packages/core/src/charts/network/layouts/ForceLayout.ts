/**
 * Force-directed layout algorithm
 * Uses velocity Verlet integration with:
 * - Repulsion between all nodes (Coulomb's law)
 * - Attraction along edges (Hooke's law)
 * - Centering force to keep graph centered
 */

import type { NetworkNode, NetworkEdge, ForceLayoutConfig } from '../../../types/network.js';

/**
 * Internal node state for simulation
 */
interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Force-directed layout calculator
 */
export class ForceLayout {
  private config: Required<ForceLayoutConfig>;

  constructor(config?: ForceLayoutConfig) {
    this.config = {
      repulsion: config?.repulsion ?? 500,
      attraction: config?.attraction ?? 0.06,
      damping: config?.damping ?? 0.85,
      maxIterations: config?.maxIterations ?? 300,
      convergenceThreshold: config?.convergenceThreshold ?? 0.5,
    };
  }

  /**
   * Calculate layout positions for nodes
   * @returns Map of node id to {x, y} position in pixel space
   */
  calculate(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    width: number,
    height: number
  ): Map<string, { x: number; y: number }> {
    if (nodes.length === 0) {
      return new Map();
    }

    // Initialize simulation nodes
    const simNodes = this.initializeNodes(nodes, width, height);
    const nodeMap = new Map<string, SimNode>();
    for (const node of simNodes) {
      nodeMap.set(node.id, node);
    }

    // Build adjacency map for edge lookup
    const adjacency = this.buildAdjacencyMap(edges);

    // Run simulation
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      const maxDisplacement = this.simulationStep(simNodes, adjacency, width, height);

      // Check for convergence
      if (maxDisplacement < this.config.convergenceThreshold) {
        break;
      }
    }

    // Convert to output format
    const positions = new Map<string, { x: number; y: number }>();
    for (const node of simNodes) {
      positions.set(node.id, { x: node.x, y: node.y });
    }

    return positions;
  }

  /**
   * Initialize node positions
   */
  private initializeNodes(
    nodes: NetworkNode[],
    width: number,
    height: number
  ): SimNode[] {
    const padding = Math.min(width, height) * 0.1;
    const simNodes: SimNode[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Use provided positions or initialize in a circle
      let x: number, y: number;
      if (node.x !== undefined && node.y !== undefined) {
        x = node.x;
        y = node.y;
      } else {
        // Initialize in a circle to avoid initial overlap
        const angle = (2 * Math.PI * i) / nodes.length;
        const radius = Math.min(width, height) * 0.3;
        x = width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 20;
        y = height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 20;
      }

      simNodes.push({
        id: node.id,
        x: Math.max(padding, Math.min(width - padding, x)),
        y: Math.max(padding, Math.min(height - padding, y)),
        vx: 0,
        vy: 0,
      });
    }

    return simNodes;
  }

  /**
   * Build adjacency map for quick edge lookup
   */
  private buildAdjacencyMap(edges: NetworkEdge[]): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();

    for (const edge of edges) {
      if (!adjacency.has(edge.source)) {
        adjacency.set(edge.source, new Set());
      }
      if (!adjacency.has(edge.target)) {
        adjacency.set(edge.target, new Set());
      }
      adjacency.get(edge.source)!.add(edge.target);
      adjacency.get(edge.target)!.add(edge.source);
    }

    return adjacency;
  }

  /**
   * Run one simulation step
   * @returns Maximum displacement for convergence check
   */
  private simulationStep(
    nodes: SimNode[],
    adjacency: Map<string, Set<string>>,
    width: number,
    height: number
  ): number {
    const padding = Math.min(width, height) * 0.1;

    // Calculate forces
    const forces = new Map<string, { fx: number; fy: number }>();
    for (const node of nodes) {
      forces.set(node.id, { fx: 0, fy: 0 });
    }

    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 1; // Avoid division by zero
        const dist = Math.sqrt(distSq);

        // Coulomb repulsion: F = k / d^2
        const force = this.config.repulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        forces.get(n1.id)!.fx -= fx;
        forces.get(n1.id)!.fy -= fy;
        forces.get(n2.id)!.fx += fx;
        forces.get(n2.id)!.fy += fy;
      }
    }

    // Attraction along edges
    for (const [sourceId, targets] of adjacency) {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (!sourceNode) continue;

      for (const targetId of targets) {
        const targetNode = nodes.find(n => n.id === targetId);
        if (!targetNode) continue;

        // Only process each edge once
        if (sourceId >= targetId) continue;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;

        // Hooke's law: F = k * d
        const force = this.config.attraction * dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        forces.get(sourceId)!.fx += fx;
        forces.get(sourceId)!.fy += fy;
        forces.get(targetId)!.fx -= fx;
        forces.get(targetId)!.fy -= fy;
      }
    }

    // Centering force
    const centerX = width / 2;
    const centerY = height / 2;
    for (const node of nodes) {
      const f = forces.get(node.id)!;
      f.fx += (centerX - node.x) * 0.005;
      f.fy += (centerY - node.y) * 0.005;
    }

    // Update velocities and positions
    let maxDisplacement = 0;
    for (const node of nodes) {
      const f = forces.get(node.id)!;

      // Update velocity with damping
      node.vx = (node.vx + f.fx) * this.config.damping;
      node.vy = (node.vy + f.fy) * this.config.damping;

      // Limit velocity
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      const maxSpeed = 50;
      if (speed > maxSpeed) {
        node.vx = (node.vx / speed) * maxSpeed;
        node.vy = (node.vy / speed) * maxSpeed;
      }

      // Update position
      node.x += node.vx;
      node.y += node.vy;

      // Constrain to bounds
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));

      // Track max displacement
      maxDisplacement = Math.max(maxDisplacement, Math.abs(node.vx), Math.abs(node.vy));
    }

    return maxDisplacement;
  }
}
