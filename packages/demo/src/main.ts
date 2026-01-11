import {
  ScatterChart,
  LineChart,
  PanHandler,
  ZoomHandler,
  HoverHandler,
  SelectionHandler,
  type Series,
  type DataPoint,
  type BaseChart,
} from '@lumina-charts/core';

// DOM elements
const chartContainer = document.getElementById('chart')!;
const btnScatter = document.getElementById('btn-scatter')!;
const btnLine = document.getElementById('btn-line')!;
const btn1k = document.getElementById('btn-1k')!;
const btn10k = document.getElementById('btn-10k')!;
const btn100k = document.getElementById('btn-100k')!;
const btn1m = document.getElementById('btn-1m')!;
const btnReset = document.getElementById('btn-reset')!;
const btnClear = document.getElementById('btn-clear')!;
const statPoints = document.getElementById('stat-points')!;
const statRender = document.getElementById('stat-render')!;
const statHovered = document.getElementById('stat-hovered')!;
const statSelected = document.getElementById('stat-selected')!;
const statZoom = document.getElementById('stat-zoom')!;
const statFps = document.getElementById('stat-fps')!;
const statMemory = document.getElementById('stat-memory')!;
const statLod = document.getElementById('stat-lod')!;
const statVisible = document.getElementById('stat-visible')!;
const lodToggle = document.getElementById('lod-toggle') as HTMLInputElement;

// FPS tracking
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 0;

function updateFps(): void {
  frameCount++;
  const now = performance.now();
  const delta = now - lastFpsUpdate;

  if (delta >= 500) { // Update every 500ms
    currentFps = Math.round((frameCount * 1000) / delta);
    statFps.textContent = `${currentFps}`;
    statFps.style.color = currentFps >= 55 ? '#22c55e' : currentFps >= 30 ? '#eab308' : '#ef4444';
    frameCount = 0;
    lastFpsUpdate = now;
  }

  requestAnimationFrame(updateFps);
}

// Memory tracking (Chrome only)
function updateMemory(): void {
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const totalMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
    statMemory.textContent = `${usedMB} MB`;
  } else {
    statMemory.textContent = 'N/A';
  }
}

// Start FPS monitoring
requestAnimationFrame(updateFps);
setInterval(updateMemory, 1000);

// Current chart type and instance
let currentChartType: 'scatter' | 'line' = 'scatter';
let chart: BaseChart | null = null;
let zoomHandler: ZoomHandler | null = null;
let selectionHandler: SelectionHandler | null = null;
let currentPointCount = 1000;

// Chart options
const chartOptions = {
  margins: { top: 20, right: 20, bottom: 50, left: 60 },
  xAxis: {
    label: 'X Value',
    ticks: { count: 10 },
  },
  yAxis: {
    label: 'Y Value',
    ticks: { count: 8 },
  },
  gridColor: [0.93, 0.93, 0.93, 1.0] as [number, number, number, number],
};

// Create chart based on type
function createChart(type: 'scatter' | 'line'): void {
  // Dispose existing chart
  if (chart) {
    chart.dispose();
    chart = null;
  }

  // Clear container
  chartContainer.innerHTML = '';

  if (type === 'scatter') {
    chart = new ScatterChart({
      container: chartContainer,
      options: {
        ...chartOptions,
        pointSize: 6,
      },
    });
  } else {
    chart = new LineChart({
      container: chartContainer,
      options: {
        ...chartOptions,
        lineWidth: 2,
      },
    });
  }

  // Add interactions
  const panHandler = new PanHandler({ momentum: true });
  zoomHandler = new ZoomHandler({ speed: 1.5 });
  const hoverHandler = new HoverHandler({ showTooltip: true });
  selectionHandler = new SelectionHandler({ mode: 'single' });

  chart.addInteraction(panHandler);
  chart.addInteraction(zoomHandler);
  chart.addInteraction(hoverHandler);
  chart.addInteraction(selectionHandler);

  // Event listeners
  chart.on('hover', (e) => {
    if (e.detail.point) {
      statHovered.textContent = `(${e.detail.point.x.toFixed(2)}, ${e.detail.point.y.toFixed(2)})`;
    }
  });

  chart.on('hoverEnd', () => {
    statHovered.textContent = '-';
  });

  chart.on('selectionChange', (e) => {
    statSelected.textContent = e.detail.selected.size.toString();
  });

  chart.on('zoom', () => {
    if (zoomHandler) {
      const zoom = zoomHandler.getZoomLevel();
      statZoom.textContent = `${Math.max(zoom.x, zoom.y).toFixed(1)}x`;
    }
    updateLODStats();
  });

  chart.on('pan', () => {
    updateLODStats();
  });

  // Update LOD stats after every render (catches all changes)
  chart.on('render', () => {
    updateLODStats();
  });

  // Update button styles
  if (type === 'scatter') {
    btnScatter.className = 'cursor-pointer rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover';
    btnLine.className = 'cursor-pointer rounded-md bg-gray-400 px-4 py-2 text-sm text-white hover:bg-gray-500';
  } else {
    btnLine.className = 'cursor-pointer rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover';
    btnScatter.className = 'cursor-pointer rounded-md bg-gray-400 px-4 py-2 text-sm text-white hover:bg-gray-500';
  }

  currentChartType = type;
}

// Generate random scatter data
function generateScatterData(count: number): Series[] {
  const data: DataPoint[] = [];

  // Generate clustered data for visual interest
  const clusters = Math.min(5, Math.ceil(count / 1000));
  const pointsPerCluster = Math.floor(count / clusters);

  for (let c = 0; c < clusters; c++) {
    const centerX = Math.random() * 80 + 10;
    const centerY = Math.random() * 80 + 10;
    const spread = 5 + Math.random() * 10;

    for (let i = 0; i < pointsPerCluster; i++) {
      data.push({
        x: centerX + (Math.random() - 0.5) * spread * 2,
        y: centerY + (Math.random() - 0.5) * spread * 2,
      });
    }
  }

  // Add remaining points
  const remaining = count - clusters * pointsPerCluster;
  for (let i = 0; i < remaining; i++) {
    data.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
    });
  }

  return [
    {
      id: 'main',
      name: 'Random Data',
      data,
    },
  ];
}

// Generate line chart data (time series style)
function generateLineData(count: number): Series[] {
  // Generate multiple series with different patterns
  const series1: DataPoint[] = [];
  const series2: DataPoint[] = [];
  const series3: DataPoint[] = [];

  // Divide points among 3 series
  const pointsPerSeries = Math.floor(count / 3);

  // Series 1: Sine wave with noise
  let y1 = 50;
  for (let i = 0; i < pointsPerSeries; i++) {
    const x = (i / pointsPerSeries) * 100;
    y1 = 50 + Math.sin(x * 0.1) * 20 + (Math.random() - 0.5) * 10;
    series1.push({ x, y: y1 });
  }

  // Series 2: Random walk
  let y2 = 30;
  for (let i = 0; i < pointsPerSeries; i++) {
    const x = (i / pointsPerSeries) * 100;
    y2 += (Math.random() - 0.5) * 2;
    y2 = Math.max(10, Math.min(90, y2)); // Clamp
    series2.push({ x, y: y2 });
  }

  // Series 3: Exponential growth with oscillation
  for (let i = 0; i < pointsPerSeries; i++) {
    const x = (i / pointsPerSeries) * 100;
    const y3 = 20 + (x / 100) * 50 + Math.sin(x * 0.3) * 10;
    series3.push({ x, y: y3 });
  }

  return [
    {
      id: 'series-1',
      name: 'Sine Wave',
      data: series1,
      style: { color: [0.4, 0.4, 0.8, 1.0] as [number, number, number, number] },
    },
    {
      id: 'series-2',
      name: 'Random Walk',
      data: series2,
      style: { color: [0.8, 0.4, 0.4, 1.0] as [number, number, number, number] },
    },
    {
      id: 'series-3',
      name: 'Growth Trend',
      data: series3,
      style: { color: [0.4, 0.8, 0.4, 1.0] as [number, number, number, number] },
    },
  ];
}

// Load data and update stats
function loadData(count: number): void {
  if (!chart) return;

  console.log(`\n========== Loading ${count.toLocaleString()} points (${currentChartType}) ==========`);

  // Data generation
  const startGen = performance.now();
  const series = currentChartType === 'scatter' ? generateScatterData(count) : generateLineData(count);
  const genTime = performance.now() - startGen;
  console.log(`Data generation: ${genTime.toFixed(1)}ms`);

  // Calculate data size
  let totalPoints = 0;
  for (const s of series) {
    totalPoints += s.data.length;
  }
  const dataSizeBytes = totalPoints * 2 * 8; // x,y as float64
  console.log(`Data size: ~${(dataSizeBytes / 1024 / 1024).toFixed(2)} MB (${totalPoints.toLocaleString()} points)`);

  // Render
  const startRender = performance.now();
  chart.setData(series);
  const renderTime = performance.now() - startRender;

  // Update stats
  currentPointCount = count;
  statPoints.textContent = count.toLocaleString();
  statRender.textContent = `${renderTime.toFixed(1)} ms`;
  statSelected.textContent = '0';
  statZoom.textContent = '1.0x';

  // Log results
  console.log(`Initial render: ${renderTime.toFixed(1)}ms`);
  console.log(`Points per ms: ${Math.round(totalPoints / renderTime).toLocaleString()}`);

  // Memory after load
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    console.log(`Memory usage: ${usedMB} MB`);
  }

  console.log(`==========================================================\n`);

  // Update LOD stats after data load
  updateLODStats();
}

// Chart type toggle handlers
btnScatter.addEventListener('click', () => {
  if (currentChartType !== 'scatter') {
    createChart('scatter');
    loadData(currentPointCount);
  }
});

btnLine.addEventListener('click', () => {
  if (currentChartType !== 'line') {
    createChart('line');
    loadData(currentPointCount);
  }
});

// Button handlers
btn1k.addEventListener('click', () => loadData(1_000));
btn10k.addEventListener('click', () => loadData(10_000));
btn100k.addEventListener('click', () => loadData(100_000));
btn1m.addEventListener('click', () => loadData(1_000_000));

btnReset.addEventListener('click', () => {
  if (zoomHandler) {
    zoomHandler.zoomToFit();
    statZoom.textContent = '1.0x';
  }
});

btnClear.addEventListener('click', () => {
  if (selectionHandler) {
    selectionHandler.clearSelection();
  }
});

// Update LOD statistics display
function updateLODStats(): void {
  if (!chart) {
    statLod.textContent = '-';
    statVisible.textContent = '0';
    return;
  }

  const chartWithLOD = chart as ScatterChart | LineChart;
  const lodManager = chart.getLODManager();
  let visiblePoints = currentPointCount;
  let displayLodLevel = 0;

  if (currentChartType === 'scatter') {
    const levels = lodManager.getLevels('main');
    if (levels && levels.length > 0) {
      const lodLevel = chartWithLOD.getLODLevel('main');
      displayLodLevel = lodLevel;
      if (levels[lodLevel]) {
        visiblePoints = levels[lodLevel].pointCount;
      }
    }
  } else {
    // Line chart has multiple series - sum up visible points
    let total = 0;
    let maxLevel = 0;
    for (const seriesId of ['series-1', 'series-2', 'series-3']) {
      const levels = lodManager.getLevels(seriesId);
      const level = chartWithLOD.getLODLevel(seriesId);
      if (levels && levels.length > 0 && levels[level]) {
        total += levels[level].pointCount;
        maxLevel = Math.max(maxLevel, level);
      }
    }
    if (total > 0) {
      visiblePoints = total;
      displayLodLevel = maxLevel;
    }
  }

  statLod.textContent = displayLodLevel.toString();
  statVisible.textContent = visiblePoints.toLocaleString();

  // Update LOD stat color based on level
  if (displayLodLevel === 0) {
    statLod.style.color = '#22c55e'; // Green - full resolution
  } else if (displayLodLevel <= 2) {
    statLod.style.color = '#eab308'; // Yellow - light decimation
  } else {
    statLod.style.color = '#ef4444'; // Red - heavy decimation
  }
}

// LOD toggle handler
lodToggle.addEventListener('change', () => {
  if (!chart) return;

  const chartWithLOD = chart as ScatterChart | LineChart;
  chartWithLOD.setLODEnabled(lodToggle.checked);
  updateLODStats();

  console.log(`LOD ${lodToggle.checked ? 'enabled' : 'disabled'}`);
});

// Initialize
createChart('scatter');
loadData(1_000);

console.log('Lumina Charts demo initialized');
