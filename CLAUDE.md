# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumina Charts is a TypeScript monorepo for a high-performance WebGL-based charting library targeting 1M+ data points. Designed with Plotly's performance, Recharts aesthetics, and ECharts extensibility in mind.

## Architecture

```
packages/
├── core/      # Core WebGL rendering engine and charts
├── react/     # React integration (stub)
├── vue/       # Vue integration (stub)
├── svelte/    # Svelte integration (stub)
├── solid/     # Solid.js integration (stub)
└── themes/    # Theme/styling package (stub)
```

### Core Package Structure

```
packages/core/src/
├── index.ts              # Public API exports
├── types/                # TypeScript interfaces
├── renderer/             # WebGL2 rendering engine
│   ├── WebGLRenderer.ts  # Main renderer with render pass architecture
│   ├── ShaderCache.ts    # Compiled shader program cache
│   └── BufferPool.ts     # GPU buffer management
├── shaders/              # GLSL shader sources
│   ├── point.ts          # Point/scatter shaders
│   ├── line.ts           # Line/area shaders
│   └── grid.ts           # Grid/crosshair shaders
├── data/                 # Data processing
│   ├── DataProcessor.ts  # Transform data to GPU format
│   ├── LODManager.ts     # LTTB decimation for 1M+ points
│   └── SpatialIndex.ts   # R-tree hit testing (rbush)
├── charts/               # Chart implementations
│   ├── BaseChart.ts      # Base chart class with lifecycle
│   ├── GridRenderPass.ts # WebGL grid lines
│   └── scatter/          # Scatter chart
├── axes/                 # D3-based axis rendering
│   └── AxisRenderer.ts   # SVG/DOM axes overlay
├── interactions/         # Composable handlers
│   ├── HoverHandler.ts   # Hit testing, tooltips
│   ├── PanHandler.ts     # Click-drag panning
│   ├── ZoomHandler.ts    # Wheel/pinch zoom
│   └── SelectionHandler.ts # Point selection
└── utils/                # Math, DOM, validation utilities
```

## Development Commands

Package manager: **pnpm**

```bash
pnpm install      # Install dependencies
pnpm build        # Build all packages
pnpm lint         # Run ESLint
pnpm format       # Format with Prettier
pnpm test         # Run tests (vitest)
pnpm typecheck    # TypeScript type checking
```

## Key Patterns

### Render Pass Architecture
Charts use composable render passes that execute in order:
```typescript
class MyRenderPass implements RenderPass {
  id = 'my-pass';
  order = 10; // Lower = earlier
  enabled = true;
  render(ctx: RenderContext, state: ChartState): void { ... }
  dispose(): void { ... }
}
```

### Data Processing Pipeline
```
Series[] → DataProcessor.processPointData() → Float32Array (GPU-ready)
        → LODManager.generateLODLevels() → Decimated versions
        → SpatialIndex.build() → R-tree for hit testing
```

### Composable Interactions
Handlers attach to charts and receive pointer/wheel events:
```typescript
chart.addInteraction(new PanHandler({ momentum: true }));
chart.addInteraction(new ZoomHandler({ min: 0.1, max: 100 }));
chart.addInteraction(new HoverHandler({ showTooltip: true }));
```

## Code Standards

- **TypeScript**: Strict mode, ES2022 target, ESNext modules
- **Linting**: ESLint with TypeScript + Prettier
- **Formatting**: 100 char width, semicolons, single quotes
- **Unused variables**: Prefix with `_`

## WebGL/GPU Globals

ESLint configured with WebGL2RenderingContext, GPUDevice, GPUAdapter, and TypedArray globals.

## Dependencies

- **d3-scale, d3-axis, d3-array, d3-selection**: Axis rendering
- **rbush**: R-tree spatial indexing
- **zod**: Runtime schema validation
