import type {
  ZoomHandlerConfig,
  PanHandlerConfig,
  HoverHandlerConfig,
  SelectionHandlerConfig,
} from '@lumina-charts/core';

/**
 * Common props for all interaction components
 */
interface BaseInteractionProps {
  /** Whether the interaction is enabled */
  enabled?: boolean;
}

/**
 * Props for ZoomInteraction component
 */
export interface ZoomInteractionProps
  extends Partial<ZoomHandlerConfig>,
    BaseInteractionProps {}

/**
 * Props for PanInteraction component
 */
export interface PanInteractionProps
  extends Partial<PanHandlerConfig>,
    BaseInteractionProps {}

/**
 * Props for HoverInteraction component
 */
export interface HoverInteractionProps
  extends Partial<HoverHandlerConfig>,
    BaseInteractionProps {}

/**
 * Props for SelectionInteraction component
 */
export interface SelectionInteractionProps
  extends Partial<SelectionHandlerConfig>,
    BaseInteractionProps {}
