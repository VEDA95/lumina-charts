/**
 * Network animator for smooth node/edge transitions
 */

import type { ProcessedNode, ProcessedEdge } from '../types/network.js';
import { lerp } from '../utils/math.js';
import { easeOut, type EasingFunction } from './easing.js';

/**
 * Configuration for network animations
 */
export interface NetworkAnimationConfig {
  /** Animation duration in milliseconds (default: 300) */
  duration?: number;
  /** Easing function (default: easeOut) */
  easing?: EasingFunction;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Stored node state for animation
 */
interface NodeState {
  id: string;
  pixelX: number;
  pixelY: number;
  radius: number;
}

/**
 * Animator for smooth network node position transitions
 *
 * Handles:
 * - Node position changes (smooth transitions when layout changes or data updates)
 * - Node size changes (smooth radius transitions)
 * - New nodes appearing (scale up from 0)
 * - Nodes disappearing (scale down to 0)
 */
export class NetworkAnimator {
  private animationFrame: number | null = null;
  private startTime: number = 0;
  private fromState: Map<string, NodeState> = new Map();
  private toState: Map<string, NodeState> = new Map();
  private duration: number = 300;
  private easingFn: EasingFunction = easeOut;
  private onUpdate: ((nodes: ProcessedNode[], edges: ProcessedEdge[]) => void) | null = null;
  private onComplete: (() => void) | null = null;

  // Store reference to full node/edge data for interpolation
  private targetNodes: ProcessedNode[] = [];
  private targetEdges: ProcessedEdge[] = [];

  /**
   * Store current node state for animation starting point
   */
  captureState(nodes: ProcessedNode[]): void {
    this.fromState.clear();
    for (const node of nodes) {
      this.fromState.set(node.id, {
        id: node.id,
        pixelX: node.pixelX,
        pixelY: node.pixelY,
        radius: node.radius,
      });
    }
  }

  /**
   * Animate from current state to new node positions
   *
   * @param targetNodes - Target node state
   * @param targetEdges - Target edge state (will be recalculated during animation)
   * @param onUpdate - Callback called each frame with interpolated nodes/edges
   * @param config - Animation configuration
   */
  animateTo(
    targetNodes: ProcessedNode[],
    targetEdges: ProcessedEdge[],
    onUpdate: (nodes: ProcessedNode[], edges: ProcessedEdge[]) => void,
    config?: NetworkAnimationConfig
  ): void {
    // Cancel any existing animation
    this.cancel();

    // Build target state map
    this.toState.clear();
    for (const node of targetNodes) {
      this.toState.set(node.id, {
        id: node.id,
        pixelX: node.pixelX,
        pixelY: node.pixelY,
        radius: node.radius,
      });
    }

    // Handle new nodes (not in from state) - start from center or small
    for (const [id, state] of this.toState) {
      if (!this.fromState.has(id)) {
        // New node - start from its target position but with zero radius
        this.fromState.set(id, {
          id,
          pixelX: state.pixelX,
          pixelY: state.pixelY,
          radius: 0,
        });
      }
    }

    // Handle removed nodes (in from state but not in to state)
    // Animate them to zero radius
    for (const [id, state] of this.fromState) {
      if (!this.toState.has(id)) {
        this.toState.set(id, {
          id,
          pixelX: state.pixelX,
          pixelY: state.pixelY,
          radius: 0,
        });
      }
    }

    // Store target data for building interpolated results
    this.targetNodes = targetNodes;
    this.targetEdges = targetEdges;

    // Store animation parameters
    this.onUpdate = onUpdate;
    this.duration = config?.duration ?? 300;
    this.easingFn = config?.easing ?? easeOut;
    this.onComplete = config?.onComplete ?? null;

    // Start animation
    this.startTime = performance.now();
    this.animate();
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.onUpdate) return;

    const elapsed = performance.now() - this.startTime;
    const rawProgress = Math.min(elapsed / this.duration, 1);
    const easedProgress = this.easingFn(rawProgress);

    // Interpolate node positions
    const interpolatedNodes: ProcessedNode[] = this.targetNodes.map((node) => {
      const fromState = this.fromState.get(node.id);
      const toState = this.toState.get(node.id);

      if (!fromState || !toState) {
        return node;
      }

      return {
        ...node,
        pixelX: lerp(fromState.pixelX, toState.pixelX, easedProgress),
        pixelY: lerp(fromState.pixelY, toState.pixelY, easedProgress),
        radius: lerp(fromState.radius, toState.radius, easedProgress),
      };
    });

    // Build a map for quick node lookup
    const nodeMap = new Map<string, ProcessedNode>();
    for (const node of interpolatedNodes) {
      nodeMap.set(node.id, node);
    }

    // Recalculate edge positions based on interpolated node positions
    const interpolatedEdges: ProcessedEdge[] = this.targetEdges.map((edge) => {
      const sourceNode = nodeMap.get(edge.sourceId);
      const targetNode = nodeMap.get(edge.targetId);

      if (!sourceNode || !targetNode) {
        return edge;
      }

      // Recalculate edge positions
      const midX = (sourceNode.pixelX + targetNode.pixelX) / 2;
      const midY = (sourceNode.pixelY + targetNode.pixelY) / 2;
      const dx = targetNode.pixelX - sourceNode.pixelX;
      const dy = targetNode.pixelY - sourceNode.pixelY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Use the same curve offset calculation as NetworkChart
      // Approximate since we don't have access to options here
      const curveOffset = 0.2;

      return {
        ...edge,
        sourceX: sourceNode.pixelX,
        sourceY: sourceNode.pixelY,
        targetX: targetNode.pixelX,
        targetY: targetNode.pixelY,
        controlX: midX + (-dy / (dist || 1)) * dist * curveOffset,
        controlY: midY + (dx / (dist || 1)) * dist * curveOffset,
      };
    });

    // Call update
    this.onUpdate(interpolatedNodes, interpolatedEdges);

    // Continue or complete
    if (rawProgress < 1) {
      this.animationFrame = requestAnimationFrame(this.animate);
    } else {
      this.animationFrame = null;
      const callback = this.onComplete;
      this.onUpdate = null;
      this.onComplete = null;
      callback?.();
    }
  };

  /**
   * Cancel the current animation
   */
  cancel(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.onUpdate = null;
    this.onComplete = null;
  }

  /**
   * Check if an animation is currently running
   */
  isAnimating(): boolean {
    return this.animationFrame !== null;
  }
}
