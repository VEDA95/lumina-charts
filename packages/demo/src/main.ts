import {
  ScatterChart,
  LineChart,
  BarChart,
  HistogramChart,
  BubbleChart,
  PieChart,
  CandlestickChart,
  BoxplotChart,
  HeatmapChart,
  NetworkChart,
  PanHandler,
  ZoomHandler,
  HoverHandler,
  SelectionHandler,
  VIRIDIS,
  SEQUENTIAL_BLUE,
  DIVERGING_RWB,
  // shadcn theme imports
  SHADCN_COLORS_RGBA,
  SHADCN_THEME_CONFIG,
  SHADCN_DARK_THEME_CONFIG,
  getShadcnGridColor,
  type Series,
  type DataPoint,
  type BubbleDataPoint,
  type OHLCDataPoint,
  type QuartileDataPoint,
  type HeatmapMatrixData,
  type NetworkData,
  type BaseChart,
  type ScaleType,
  type RGBAColor,
} from '@lumina-charts/core';

// DOM elements
const chartContainer = document.getElementById('chart')!;
const btnScatter = document.getElementById('btn-scatter')!;
const btnLine = document.getElementById('btn-line')!;
const btnBar = document.getElementById('btn-bar')!;
const btnHistogram = document.getElementById('btn-histogram')!;
const btnBubble = document.getElementById('btn-bubble')!;
const btnPie = document.getElementById('btn-pie')!;
const btnCandlestick = document.getElementById('btn-candlestick')!;
const btnBoxplot = document.getElementById('btn-boxplot')!;
const btnHeatmap = document.getElementById('btn-heatmap')!;
const btnNetwork = document.getElementById('btn-network')!;
const btn1k = document.getElementById('btn-1k')!;
const btn10k = document.getElementById('btn-10k')!;
const btn100k = document.getElementById('btn-100k')!;
const btn1m = document.getElementById('btn-1m')!;
const btnReset = document.getElementById('btn-reset')!;
const btnClear = document.getElementById('btn-clear')!;
const btnExport = document.getElementById('btn-export')!;
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
const histogramOptions = document.getElementById('histogram-options')!;
const densityToggle = document.getElementById('density-toggle') as HTMLInputElement;
const cumulativeToggle = document.getElementById('cumulative-toggle') as HTMLInputElement;
const lineOptions = document.getElementById('line-options')!;
const showPointsToggle = document.getElementById('show-points-toggle') as HTMLInputElement;
const smoothToggle = document.getElementById('smooth-toggle') as HTMLInputElement;
const bubbleOptions = document.getElementById('bubble-options')!;
const scaleSqrt = document.getElementById('scale-sqrt') as HTMLInputElement;
const scaleLinear = document.getElementById('scale-linear') as HTMLInputElement;
const scaleLog = document.getElementById('scale-log') as HTMLInputElement;
const pieOptions = document.getElementById('pie-options')!;
const pieFull = document.getElementById('pie-full') as HTMLInputElement;
const pieDonut = document.getElementById('pie-donut') as HTMLInputElement;
const pieExplode = document.getElementById('pie-explode') as HTMLInputElement;
const candlestickOptions = document.getElementById('candlestick-options')!;
const candlestickVertical = document.getElementById('candlestick-vertical') as HTMLInputElement;
const candlestickHorizontal = document.getElementById('candlestick-horizontal') as HTMLInputElement;
const boxplotOptions = document.getElementById('boxplot-options')!;
const boxplotVertical = document.getElementById('boxplot-vertical') as HTMLInputElement;
const boxplotHorizontal = document.getElementById('boxplot-horizontal') as HTMLInputElement;
const heatmapOptions = document.getElementById('heatmap-options')!;
const heatmapViridis = document.getElementById('heatmap-viridis') as HTMLInputElement;
const heatmapSequential = document.getElementById('heatmap-sequential') as HTMLInputElement;
const heatmapDiverging = document.getElementById('heatmap-diverging') as HTMLInputElement;
const heatmapLabels = document.getElementById('heatmap-labels') as HTMLInputElement;
const networkOptions = document.getElementById('network-options')!;
const networkForce = document.getElementById('network-force') as HTMLInputElement;
const networkRadial = document.getElementById('network-radial') as HTMLInputElement;
const networkLabels = document.getElementById('network-labels') as HTMLInputElement;
const networkLegend = document.getElementById('network-legend') as HTMLInputElement;
const xScaleSelect = document.getElementById('x-scale-select') as HTMLSelectElement;
const yScaleSelect = document.getElementById('y-scale-select') as HTMLSelectElement;
const axisScaleOptions = document.getElementById('axis-scale-options')!;
const themeToggle = document.getElementById('theme-toggle')!;
const themeToggleThumb = document.getElementById('theme-toggle-thumb')!;
const themeLabel = document.getElementById('theme-label')!;

// Theme state
let isDarkMode = false;

// Initialize theme from localStorage or system preference
function initializeTheme(): void {
  const savedTheme = localStorage.getItem('lumina-theme');
  if (savedTheme) {
    isDarkMode = savedTheme === 'dark';
  } else {
    // Check system preference
    isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  applyTheme();
}

// Apply theme to DOM
function applyTheme(): void {
  if (isDarkMode) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    themeToggleThumb.style.transform = 'translateX(28px)';
    themeToggle.style.backgroundColor = '#3f3f46'; // zinc-700
    themeLabel.textContent = 'Dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    themeToggleThumb.style.transform = 'translateX(0)';
    themeToggle.style.backgroundColor = '#e4e4e7'; // zinc-200
    themeLabel.textContent = 'Light';
  }
  localStorage.setItem('lumina-theme', isDarkMode ? 'dark' : 'light');
}

// Toggle theme
function toggleTheme(): void {
  isDarkMode = !isDarkMode;
  applyTheme();
  // Recreate chart with new theme
  createChart(currentChartType);
  loadData(currentPointCount);
}

// Theme toggle handler
themeToggle.addEventListener('click', toggleTheme);

// Initialize theme on load
initializeTheme();

// Get current theme config
function getThemeConfig() {
  return isDarkMode ? SHADCN_DARK_THEME_CONFIG : SHADCN_THEME_CONFIG;
}

// FPS tracking
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 0;

function updateFps(): void {
  frameCount++;
  const now = performance.now();
  const delta = now - lastFpsUpdate;

  if (delta >= 500) {
    // Update every 500ms
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
let currentChartType: 'scatter' | 'line' | 'bar' | 'histogram' | 'bubble' | 'pie' | 'candlestick' | 'boxplot' | 'heatmap' | 'network' = 'scatter';
let chart: BaseChart | null = null;
let barChart: BarChart | null = null; // Keep reference for setCategories
let histogramChart: HistogramChart | null = null; // Keep reference for setValues
let lineChart: LineChart | null = null; // Keep reference for line options
let bubbleChart: BubbleChart | null = null; // Keep reference for bubble options
let pieChart: PieChart | null = null; // Keep reference for pie options
let candlestickChart: CandlestickChart | null = null; // Keep reference for candlestick options
let boxplotChart: BoxplotChart | null = null; // Keep reference for boxplot options
let heatmapChart: HeatmapChart | null = null; // Keep reference for heatmap options
let networkChart: NetworkChart | null = null; // Keep reference for network options
let zoomHandler: ZoomHandler | null = null;
let selectionHandler: SelectionHandler | null = null;
let currentPointCount = 1000;

// Get current axis scale types from selectors
function getXScaleType(): ScaleType {
  return xScaleSelect.value as ScaleType;
}

function getYScaleType(): ScaleType {
  return yScaleSelect.value as ScaleType;
}

// Chart options (generated dynamically to include current scale types)
// Using shadcn theme for modern, minimal aesthetics
function getChartOptions() {
  const themeConfig = getThemeConfig();
  return {
    margins: { top: 20, right: 20, bottom: 50, left: 60 },
    xAxis: {
      label: 'X Value',
      ticks: { count: 10 },
      type: getXScaleType(),
      showLine: themeConfig.showAxisLines,
      showTicks: themeConfig.showAxisTicks,
      labelStyle: 'minimal' as const,
      labelColor: themeConfig.axisLabel,
    },
    yAxis: {
      label: 'Y Value',
      ticks: { count: 8 },
      type: getYScaleType(),
      showLine: themeConfig.showAxisLines,
      showTicks: themeConfig.showAxisTicks,
      labelStyle: 'minimal' as const,
      labelColor: themeConfig.axisLabel,
    },
    gridColor: getShadcnGridColor(isDarkMode),
    backgroundColor: isDarkMode ? [0.035, 0.035, 0.043, 1.0] as RGBAColor : [1, 1, 1, 1] as RGBAColor,
  };
}

// Create chart based on type
function createChart(type: 'scatter' | 'line' | 'bar' | 'histogram' | 'bubble' | 'pie' | 'candlestick' | 'boxplot' | 'heatmap' | 'network'): void {
  // Dispose existing chart
  if (chart) {
    chart.dispose();
    chart = null;
    barChart = null;
    histogramChart = null;
    lineChart = null;
    bubbleChart = null;
    pieChart = null;
    candlestickChart = null;
    boxplotChart = null;
    heatmapChart = null;
    networkChart = null;
  }

  // Clear container
  chartContainer.innerHTML = '';

  const chartOptions = getChartOptions();

  if (type === 'scatter') {
    chart = new ScatterChart({
      container: chartContainer,
      options: {
        ...chartOptions,
        pointSize: 6,
      },
    });
  } else if (type === 'line') {
    const xScale = getXScaleType();
    const xAxisLabel = xScale === 'time' ? 'Date' : 'X Value';

    lineChart = new LineChart({
      container: chartContainer,
      options: {
        ...chartOptions,
        xAxis: {
          label: xAxisLabel,
          ticks: { count: 10 },
          type: xScale,
        },
        lineWidth: 2,
        showPoints: showPointsToggle.checked,
        smooth: smoothToggle.checked,
      },
    });
    chart = lineChart;
  } else if (type === 'bar') {
    const xScale = getXScaleType();
    const xAxisLabel = xScale === 'time' ? 'Month' : 'Category';
    const themeConfig = getThemeConfig();

    barChart = new BarChart({
      container: chartContainer,
      options: {
        ...chartOptions,
        xAxis: {
          label: xAxisLabel,
          ticks: { count: 6 },
          type: xScale === 'band' ? 'linear' : xScale, // band scale handled via setCategories
          showLine: themeConfig.showAxisLines,
          showTicks: themeConfig.showAxisTicks,
          labelStyle: 'minimal' as const,
          labelColor: themeConfig.axisLabel,
        },
        yAxis: {
          label: 'Value',
          ticks: { count: 8 },
          type: getYScaleType(),
          showLine: themeConfig.showAxisLines,
          showTicks: themeConfig.showAxisTicks,
          labelStyle: 'minimal' as const,
          labelColor: themeConfig.axisLabel,
        },
        barGap: 4,
        groupGap: 20,
        cornerRadius: themeConfig.barCornerRadius,
      },
    });
    chart = barChart;
  } else if (type === 'histogram') {
    const themeConfig = getThemeConfig();
    histogramChart = new HistogramChart({
      container: chartContainer,
      options: {
        ...chartOptions,
        xAxis: {
          label: 'Value',
          ticks: { count: 10 },
          type: getXScaleType(),
        },
        yAxis: {
          label: 'Frequency',
          ticks: { count: 8 },
          type: getYScaleType(),
        },
        binning: { method: 'count', value: 20 },
        barGap: 1,
        showDensityCurve: true,
        densityCurveColor: [0.9, 0.3, 0.3, 1.0],
        showCumulative: true,
        cumulativeColor: [0.3, 0.7, 0.3, 1.0],
        cornerRadius: themeConfig.barCornerRadius,
      },
    });
    chart = histogramChart;
  } else if (type === 'bubble') {
    // Get current scale setting
    const scale = scaleLinear.checked ? 'linear' : scaleLog.checked ? 'log' : 'sqrt';

    bubbleChart = new BubbleChart({
      container: chartContainer,
      options: {
        ...chartOptions,
        xAxis: {
          label: 'X Value',
          ticks: { count: 10 },
          type: getXScaleType(),
        },
        yAxis: {
          label: 'Y Value',
          ticks: { count: 8 },
          type: getYScaleType(),
        },
        bubbleSize: {
          minSize: 5,
          maxSize: 50,
          scale,
        },
      },
    });
    chart = bubbleChart;
  } else if (type === 'pie') {
    // Get current pie style settings
    const innerRadius = pieDonut.checked ? 0.5 : 0;
    const explodeOffset = pieExplode.checked ? 15 : 0;

    pieChart = new PieChart({
      container: chartContainer,
      options: {
        innerRadius,
        outerRadius: 0.8,
        startAngle: -90,
        padAngle: 0,
        explodeOffset,
        labels: {
          position: 'outside',
          showPercentage: true,
          minAngleForLabel: 15,
          fontColor: isDarkMode ? '#fafafa' : '#18181b',
        },
        hoverBrighten: 1.15,
        backgroundColor: isDarkMode ? [0.035, 0.035, 0.043, 1.0] as RGBAColor : [1, 1, 1, 1] as RGBAColor,
      },
    });
    chart = pieChart;
  } else if (type === 'candlestick') {
    // Get current orientation setting
    const orientation = candlestickHorizontal.checked ? 'horizontal' : 'vertical';
    const themeConfig = getThemeConfig();

    candlestickChart = new CandlestickChart({
      container: chartContainer,
      options: {
        orientation,
        margins: { top: 20, right: 20, bottom: 50, left: 60 },
        xAxis: {
          label: orientation === 'vertical' ? 'Date' : 'Price',
          ticks: { count: 8 },
          labelColor: themeConfig.axisLabel,
        },
        yAxis: {
          label: orientation === 'vertical' ? 'Price' : 'Date',
          ticks: { count: 8 },
          labelColor: themeConfig.axisLabel,
        },
        gridColor: getShadcnGridColor(isDarkMode),
        backgroundColor: isDarkMode ? [0.035, 0.035, 0.043, 1.0] as RGBAColor : [1, 1, 1, 1] as RGBAColor,
        upColor: [0.34, 0.76, 0.45, 1.0], // green-500
        downColor: [0.94, 0.33, 0.33, 1.0], // red-500
        candleWidth: 0.8,
        wickWidth: 1,
        hoverBrighten: 1.2,
      },
    });
    chart = candlestickChart;
  } else if (type === 'boxplot') {
    // Get current orientation setting
    const orientation = boxplotHorizontal.checked ? 'horizontal' : 'vertical';
    const themeConfig = getThemeConfig();

    boxplotChart = new BoxplotChart({
      container: chartContainer,
      options: {
        orientation,
        margins: { top: 20, right: 20, bottom: 50, left: 60 },
        xAxis: {
          label: orientation === 'vertical' ? 'Category' : 'Value',
          ticks: { count: 8 },
          labelColor: themeConfig.axisLabel,
        },
        yAxis: {
          label: orientation === 'vertical' ? 'Value' : 'Category',
          ticks: { count: 8 },
          labelColor: themeConfig.axisLabel,
        },
        gridColor: getShadcnGridColor(isDarkMode),
        backgroundColor: isDarkMode ? [0.035, 0.035, 0.043, 1.0] as RGBAColor : [1, 1, 1, 1] as RGBAColor,
        boxColor: [0.37, 0.51, 0.96, 1.0], // blue-500
        medianColor: [0.98, 0.45, 0.09, 1.0], // orange-500
        whiskerColor: isDarkMode ? [0.92, 0.92, 0.94, 1.0] : [0.23, 0.23, 0.26, 1.0], // zinc-200 / zinc-800 for better contrast
        outlierColor: [0.94, 0.33, 0.33, 1.0], // red-500
        boxWidth: 0.6,
        whiskerWidth: 2,
        outlierSize: 4,
        hoverBrighten: 1.2,
      },
    });
    chart = boxplotChart;
  } else if (type === 'heatmap') {
    // Get current color scale setting
    let colors: RGBAColor[];
    let scaleType: 'sequential' | 'diverging' = 'sequential';
    if (heatmapDiverging.checked) {
      colors = [...DIVERGING_RWB];
      scaleType = 'diverging';
    } else if (heatmapSequential.checked) {
      colors = [...SEQUENTIAL_BLUE];
    } else {
      colors = [...VIRIDIS];
    }
    const themeConfig = getThemeConfig();

    heatmapChart = new HeatmapChart({
      container: chartContainer,
      options: {
        margins: { top: 20, right: 20, bottom: 60, left: 80 },
        xAxis: {
          label: 'Column',
          ticks: { count: 10 },
          labelColor: themeConfig.axisLabel,
        },
        yAxis: {
          label: 'Row',
          ticks: { count: 10 },
          labelColor: themeConfig.axisLabel,
        },
        gridColor: getShadcnGridColor(isDarkMode),
        backgroundColor: isDarkMode ? [0.035, 0.035, 0.043, 1.0] as RGBAColor : [1, 1, 1, 1] as RGBAColor,
        colorScale: {
          type: scaleType,
          colors,
        },
        cellGap: 1,
        showLabels: heatmapLabels.checked,
        labelThreshold: 25,
        labelColor: isDarkMode ? '#fafafa' : '#18181b',
        hoverBrighten: 1.2,
      },
    });
    chart = heatmapChart;
  } else if (type === 'network') {
    // Get current layout setting
    const layout = networkRadial.checked ? 'radial' : 'force';

    networkChart = new NetworkChart({
      container: chartContainer,
      options: {
        layout,
        showLabels: networkLabels.checked,
        showLegend: networkLegend.checked,
        nodeSizeRange: [8, 28],
        edgeWidthRange: [2, 5],
        edgeCurve: 0.15,
        edgeOpacity: isDarkMode ? 0.5 : 0.7,
        dimOpacity: 0.1,
        hoverBrighten: 1.2,
        legendPosition: 'top-right',
        backgroundColor: isDarkMode ? [0.035, 0.035, 0.043, 1.0] as RGBAColor : [1, 1, 1, 1] as RGBAColor,
        labelColor: isDarkMode ? '#fafafa' : '#18181b',
      },
    });
    chart = networkChart;
  }

  // Add interactions (except for pie charts which handle their own)
  if (type !== 'pie') {
    const panHandler = new PanHandler({ momentum: true });
    zoomHandler = new ZoomHandler({ speed: 1.5 });

    chart?.addInteraction(panHandler);
    chart?.addInteraction(zoomHandler);

    // Candlestick, boxplot, heatmap, and network have their own hover handling, other charts use HoverHandler
    if (type !== 'candlestick' && type !== 'boxplot' && type !== 'heatmap' && type !== 'network') {
      const hoverHandler = new HoverHandler({ showTooltip: true, tooltipStyle: 'shadcn' });
      selectionHandler = new SelectionHandler({ mode: 'single' });
      chart?.addInteraction(hoverHandler);
      chart?.addInteraction(selectionHandler);
    } else {
      selectionHandler = null;
    }
  } else {
    zoomHandler = null;
    selectionHandler = null;
  }

  // Event listeners
  chart?.on('hover', (e) => {
    if (e.detail.point) {
      // Format x value based on scale type
      let xStr: string;
      const xScale = getXScaleType();
      if (xScale === 'time') {
        // Format timestamp as date
        const date = new Date(e.detail.point.x);
        xStr = date.toLocaleDateString();
      } else {
        xStr = e.detail.point.x.toFixed(2);
      }

      // Format y value
      const yStr = e.detail.point.y.toFixed(2);
      statHovered.textContent = `(${xStr}, ${yStr})`;
    }
  });

  chart?.on('hoverEnd', () => {
    statHovered.textContent = '-';
  });

  chart?.on('selectionChange', (e) => {
    statSelected.textContent = e.detail.selected.size.toString();
  });

  chart?.on('zoom', () => {
    if (zoomHandler) {
      const zoom = zoomHandler.getZoomLevel();
      statZoom.textContent = `${Math.max(zoom.x, zoom.y).toFixed(1)}x`;
    }
    updateLODStats();
  });

  chart?.on('pan', () => {
    updateLODStats();
  });

  // Update LOD stats after every render (catches all changes)
  chart?.on('render', () => {
    updateLODStats();
  });

  // Update button styles
  const activeClass = 'cursor-pointer rounded-md bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover';
  const inactiveClass = 'cursor-pointer rounded-md bg-gray-400 px-4 py-2 text-sm text-white hover:bg-gray-500';

  btnScatter.className = type === 'scatter' ? activeClass : inactiveClass;
  btnLine.className = type === 'line' ? activeClass : inactiveClass;
  btnBar.className = type === 'bar' ? activeClass : inactiveClass;
  btnHistogram.className = type === 'histogram' ? activeClass : inactiveClass;
  btnBubble.className = type === 'bubble' ? activeClass : inactiveClass;
  btnPie.className = type === 'pie' ? activeClass : inactiveClass;
  btnCandlestick.className = type === 'candlestick' ? activeClass : inactiveClass;
  btnBoxplot.className = type === 'boxplot' ? activeClass : inactiveClass;
  btnHeatmap.className = type === 'heatmap' ? activeClass : inactiveClass;
  btnNetwork.className = type === 'network' ? activeClass : inactiveClass;

  // Show/hide histogram options
  if (type === 'histogram') {
    histogramOptions.classList.remove('hidden');
  } else {
    histogramOptions.classList.add('hidden');
  }

  // Show/hide line options
  if (type === 'line') {
    lineOptions.classList.remove('hidden');
  } else {
    lineOptions.classList.add('hidden');
  }

  // Show/hide bubble options
  if (type === 'bubble') {
    bubbleOptions.classList.remove('hidden');
  } else {
    bubbleOptions.classList.add('hidden');
  }

  // Show/hide pie options
  if (type === 'pie') {
    pieOptions.classList.remove('hidden');
  } else {
    pieOptions.classList.add('hidden');
  }

  // Show/hide candlestick options
  if (type === 'candlestick') {
    candlestickOptions.classList.remove('hidden');
  } else {
    candlestickOptions.classList.add('hidden');
  }

  // Show/hide boxplot options
  if (type === 'boxplot') {
    boxplotOptions.classList.remove('hidden');
  } else {
    boxplotOptions.classList.add('hidden');
  }

  // Show/hide heatmap options
  if (type === 'heatmap') {
    heatmapOptions.classList.remove('hidden');
  } else {
    heatmapOptions.classList.add('hidden');
  }

  // Show/hide network options
  if (type === 'network') {
    networkOptions.classList.remove('hidden');
  } else {
    networkOptions.classList.add('hidden');
  }

  currentChartType = type;

  // Update axis scale selector visibility
  updateAxisScaleVisibility();
}

// Generate random scatter data
function generateScatterData(count: number): Series[] {
  const data: DataPoint[] = [];
  const xScaleType = getXScaleType();
  const yScaleType = getYScaleType();

  // For log scales, use a different range (1-1000) to show orders of magnitude
  const useLogX = xScaleType === 'log';
  const useLogY = yScaleType === 'log';

  // Generate clustered data for visual interest
  const clusters = Math.min(5, Math.ceil(count / 1000));
  const pointsPerCluster = Math.floor(count / clusters);

  for (let c = 0; c < clusters; c++) {
    let centerX: number;
    let centerY: number;
    let spreadX: number;
    let spreadY: number;

    if (useLogX) {
      // For log scale: cluster centers at powers of 10
      centerX = Math.pow(10, 1 + Math.random() * 2); // 10 to 1000
      spreadX = centerX * 0.3; // 30% spread relative to center
    } else {
      centerX = Math.random() * 80 + 10;
      spreadX = 5 + Math.random() * 10;
    }

    if (useLogY) {
      centerY = Math.pow(10, 1 + Math.random() * 2);
      spreadY = centerY * 0.3;
    } else {
      centerY = Math.random() * 80 + 10;
      spreadY = 5 + Math.random() * 10;
    }

    for (let i = 0; i < pointsPerCluster; i++) {
      let x = centerX + (Math.random() - 0.5) * spreadX * 2;
      let y = centerY + (Math.random() - 0.5) * spreadY * 2;

      // Ensure positive values for log scales
      if (useLogX) x = Math.max(1, x);
      if (useLogY) y = Math.max(1, y);

      data.push({ x, y });
    }
  }

  // Add remaining points
  const remaining = count - clusters * pointsPerCluster;
  for (let i = 0; i < remaining; i++) {
    let x = useLogX ? Math.pow(10, Math.random() * 3) : Math.random() * 100; // 1-1000 for log
    let y = useLogY ? Math.pow(10, Math.random() * 3) : Math.random() * 100;

    // Ensure positive values for log scales
    if (useLogX) x = Math.max(1, x);
    if (useLogY) y = Math.max(1, y);

    data.push({ x, y });
  }

  return [
    {
      id: 'main',
      name: 'Random Data',
      data,
    },
  ];
}

// Bar chart categories
const BAR_CATEGORIES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Get timestamps for monthly data (for time scale bar charts)
function getMonthTimestamps(monthCount: number): number[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const timestamps: number[] = [];

  for (let i = 0; i < monthCount; i++) {
    // Start from January of current year
    const date = new Date(currentYear, i, 1);
    timestamps.push(date.getTime());
  }

  return timestamps;
}

// Generate bar chart data
function generateBarData(categoryCount: number): { series: Series[]; categories: string[]; timestamps: number[] } {
  const xScaleType = getXScaleType();
  const useTimeScale = xScaleType === 'time';
  const categories = BAR_CATEGORIES.slice(0, categoryCount);
  const timestamps = getMonthTimestamps(categoryCount);

  // Generate 2-3 series with random values
  const seriesCount = Math.min(3, Math.max(1, Math.floor(categoryCount / 4)));

  const seriesNames = ['Product A', 'Product B', 'Product C'];
  // Use shadcn color palette for series
  const seriesColors: [number, number, number, number][] = [
    SHADCN_COLORS_RGBA[0] as [number, number, number, number], // primary blue
    SHADCN_COLORS_RGBA[2] as [number, number, number, number], // indigo
    SHADCN_COLORS_RGBA[4] as [number, number, number, number], // purple
  ];

  const result: Series[] = [];

  for (let s = 0; s < seriesCount; s++) {
    const data: DataPoint[] = [];
    for (let i = 0; i < categoryCount; i++) {
      data.push({
        // Use timestamp for time scale, index for band scale
        x: useTimeScale ? timestamps[i] : i,
        y: Math.random() * 200 + 50, // Random value between 50-250
      });
    }
    result.push({
      id: `series-${s}`,
      name: seriesNames[s],
      data,
      style: { color: seriesColors[s] },
    });
  }

  return { series: result, categories, timestamps };
}

// Generate line chart data (time series style)
function generateLineData(count: number): Series[] {
  const xScaleType = getXScaleType();
  const yScaleType = getYScaleType();
  const useLogX = xScaleType === 'log';
  const useLogY = yScaleType === 'log';
  const useTimeX = xScaleType === 'time';

  // Generate multiple series with different patterns
  const series1: DataPoint[] = [];
  const series2: DataPoint[] = [];
  const series3: DataPoint[] = [];

  // Divide points among 3 series
  const pointsPerSeries = Math.floor(count / 3);

  // Time range: last 30 days
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const startTime = now - thirtyDaysMs;

  // For log/linear scales
  const yCenter = useLogY ? 100 : 50;
  const yRange = useLogY ? 50 : 20;

  // Series 1: Sine wave with noise (or daily pattern for time)
  for (let i = 0; i < pointsPerSeries; i++) {
    const t = i / pointsPerSeries;
    let x: number;

    if (useTimeX) {
      x = startTime + t * thirtyDaysMs;
    } else if (useLogX) {
      x = Math.pow(10, t * 3); // 1-1000
    } else {
      x = t * 100; // 0-100
    }

    let y = yCenter + Math.sin(t * Math.PI * 4) * yRange + (Math.random() - 0.5) * (yRange / 2);
    if (useLogY) y = Math.max(1, y);
    series1.push({ x, y });
  }

  // Series 2: Random walk
  let y2 = useLogY ? 50 : 30;
  for (let i = 0; i < pointsPerSeries; i++) {
    const t = i / pointsPerSeries;
    let x: number;

    if (useTimeX) {
      x = startTime + t * thirtyDaysMs;
    } else if (useLogX) {
      x = Math.pow(10, t * 3);
    } else {
      x = t * 100;
    }

    y2 += (Math.random() - 0.5) * (useLogY ? 10 : 2);
    y2 = Math.max(useLogY ? 10 : 10, Math.min(useLogY ? 500 : 90, y2));
    series2.push({ x, y: y2 });
  }

  // Series 3: Exponential growth with oscillation
  for (let i = 0; i < pointsPerSeries; i++) {
    const t = i / pointsPerSeries;
    let x: number;

    if (useTimeX) {
      x = startTime + t * thirtyDaysMs;
    } else if (useLogX) {
      x = Math.pow(10, t * 3);
    } else {
      x = t * 100;
    }

    let y3 = useLogY
      ? 10 * Math.pow(10, t * 1.5) + Math.sin(t * Math.PI * 6) * 20
      : 20 + t * 50 + Math.sin(t * Math.PI * 6) * 10;
    if (useLogY) y3 = Math.max(1, y3);
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

// Generate bubble chart data (x, y, z values)
function generateBubbleData(count: number): Series[] {
  const data: BubbleDataPoint[] = [];
  const xScaleType = getXScaleType();
  const yScaleType = getYScaleType();

  // For log scales, use a different range
  const useLogX = xScaleType === 'log';
  const useLogY = yScaleType === 'log';

  // Generate clustered data with varying z values
  const clusters = Math.min(5, Math.ceil(count / 200));
  const pointsPerCluster = Math.floor(count / clusters);

  for (let c = 0; c < clusters; c++) {
    let centerX: number;
    let centerY: number;
    let spreadX: number;
    let spreadY: number;

    if (useLogX) {
      centerX = Math.pow(10, 1 + Math.random() * 2);
      spreadX = centerX * 0.3;
    } else {
      centerX = Math.random() * 80 + 10;
      spreadX = 5 + Math.random() * 10;
    }

    if (useLogY) {
      centerY = Math.pow(10, 1 + Math.random() * 2);
      spreadY = centerY * 0.3;
    } else {
      centerY = Math.random() * 80 + 10;
      spreadY = 5 + Math.random() * 10;
    }

    // Each cluster has a base z-value with variation
    const baseZ = Math.random() * 900 + 100; // 100 - 1000

    for (let i = 0; i < pointsPerCluster; i++) {
      let x = centerX + (Math.random() - 0.5) * spreadX * 2;
      let y = centerY + (Math.random() - 0.5) * spreadY * 2;

      if (useLogX) x = Math.max(1, x);
      if (useLogY) y = Math.max(1, y);

      data.push({
        x,
        y,
        z: baseZ * (0.5 + Math.random()), // 50% to 150% of base
      });
    }
  }

  // Add remaining points as outliers
  const remaining = count - clusters * pointsPerCluster;
  for (let i = 0; i < remaining; i++) {
    let x = useLogX ? Math.pow(10, Math.random() * 3) : Math.random() * 100;
    let y = useLogY ? Math.pow(10, Math.random() * 3) : Math.random() * 100;

    if (useLogX) x = Math.max(1, x);
    if (useLogY) y = Math.max(1, y);

    data.push({
      x,
      y,
      z: Math.random() * 1000 + 50,
    });
  }

  return [
    {
      id: 'bubbles',
      name: 'Bubble Data',
      data,
    },
  ];
}

// Pie chart data labels
const PIE_CATEGORIES = [
  'Electronics',
  'Clothing',
  'Food & Beverage',
  'Home & Garden',
  'Sports',
  'Automotive',
  'Books',
  'Health & Beauty',
];

// Generate pie chart data
function generatePieData(sliceCount: number): Series[] {
  const data: (DataPoint & { label: string })[] = [];

  // Generate random values for each slice
  for (let i = 0; i < sliceCount; i++) {
    const value = Math.random() * 900 + 100; // 100-1000
    data.push({
      x: i,
      y: value,
      label: PIE_CATEGORIES[i % PIE_CATEGORIES.length],
    });
  }

  return [
    {
      id: 'pie',
      name: 'Sales by Category',
      data,
    },
  ];
}

// Generate candlestick (OHLC) data
function generateCandlestickData(count: number): Series[] {
  const data: (OHLCDataPoint & DataPoint)[] = [];
  let price = 100; // Starting price
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * dayMs;
    const volatility = 2 + Math.random() * 3;

    const open = price;
    const change = (Math.random() - 0.5) * volatility * 2;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;

    data.push({
      x: timestamp,
      y: close,
      open,
      high,
      low,
    });

    price = close; // Next candle opens at previous close
  }

  return [
    {
      id: 'ohlc',
      name: 'Price',
      data,
    },
  ];
}

// Boxplot category labels
const BOXPLOT_CATEGORIES = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];

// Generate boxplot (quartile) data
function generateBoxplotData(categoryCount: number): Series[] {
  const data: (QuartileDataPoint & DataPoint)[] = [];

  for (let i = 0; i < categoryCount; i++) {
    // Generate random distribution statistics
    const center = 50 + Math.random() * 30;
    const spread = 10 + Math.random() * 20;

    const min = Math.max(0, center - spread - Math.random() * 10);
    const q1 = center - spread * 0.5;
    const median = center;
    const q3 = center + spread * 0.5;
    const max = center + spread + Math.random() * 10;

    // Generate some outliers
    const outliers: number[] = [];
    if (Math.random() > 0.5) {
      outliers.push(Math.max(0, min - Math.random() * 15));
    }
    if (Math.random() > 0.5) {
      outliers.push(max + Math.random() * 15);
    }
    if (Math.random() > 0.7) {
      outliers.push(max + Math.random() * 20 + 10);
    }

    data.push({
      x: i,
      y: median,
      min,
      q1,
      median,
      q3,
      max,
      outliers,
    });
  }

  return [{
    id: 'boxplot',
    name: 'Distribution',
    data,
  }];
}

// Generate heatmap data (matrix with pattern)
function generateHeatmapData(rows: number, cols: number): HeatmapMatrixData {
  const matrix: number[][] = [];
  const rowLabels: string[] = [];
  const colLabels: string[] = [];

  for (let r = 0; r < rows; r++) {
    rowLabels.push(`Row ${r + 1}`);
    matrix[r] = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0) colLabels.push(`Col ${c + 1}`);
      // Generate value with some pattern + noise
      const pattern = Math.sin(r * 0.5) * Math.cos(c * 0.3) * 50 + 50;
      const noise = Math.random() * 10;
      matrix[r][c] = pattern + noise;
    }
  }

  return { matrix, rowLabels, colLabels };
}

// Network group names (social network style)
const NETWORK_GROUPS = ['Engineering', 'Design', 'Marketing', 'Sales', 'Finance', 'HR', 'Product', 'Operations'];

// Generate network data (social network style graph)
function generateNetworkData(nodeCount: number): NetworkData {
  const nodes: NetworkData['nodes'] = [];
  const edges: NetworkData['edges'] = [];

  // Generate nodes with group assignments
  const groupCount = Math.min(8, Math.max(3, Math.floor(nodeCount / 5)));
  const groups = NETWORK_GROUPS.slice(0, groupCount);

  for (let i = 0; i < nodeCount; i++) {
    const groupIdx = Math.floor(Math.random() * groupCount);
    const size = 1 + Math.random() * 9; // Size from 1-10

    nodes.push({
      id: `node-${i}`,
      label: `Person ${i + 1}`,
      group: groups[groupIdx],
      size,
    });
  }

  // Generate edges - create a connected graph with varying density
  // Each node connects to 2-5 other nodes preferentially within their group
  const edgeSet = new Set<string>();

  for (let i = 0; i < nodeCount; i++) {
    const node = nodes[i];
    const connectionCount = 2 + Math.floor(Math.random() * 4); // 2-5 connections

    for (let c = 0; c < connectionCount; c++) {
      let targetIdx: number;

      // 70% chance to connect within same group
      if (Math.random() < 0.7) {
        // Find nodes in same group
        const sameGroup = nodes
          .map((n, idx) => ({ n, idx }))
          .filter(({ n, idx }) => n.group === node.group && idx !== i);

        if (sameGroup.length > 0) {
          const pick = sameGroup[Math.floor(Math.random() * sameGroup.length)];
          targetIdx = pick.idx;
        } else {
          targetIdx = Math.floor(Math.random() * nodeCount);
        }
      } else {
        // Random connection
        targetIdx = Math.floor(Math.random() * nodeCount);
      }

      // Avoid self-loops and duplicate edges
      if (targetIdx !== i) {
        const edgeKey = i < targetIdx ? `${i}-${targetIdx}` : `${targetIdx}-${i}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            source: `node-${i}`,
            target: `node-${targetIdx}`,
            weight: 1 + Math.random() * 2, // Weight 1-3
          });
        }
      }
    }
  }

  return { nodes, edges };
}

// Generate histogram data (values from a normal-ish distribution)
function generateHistogramData(count: number): number[] {
  const values: number[] = [];

  // Generate values from a mixture of distributions for visual interest
  for (let i = 0; i < count; i++) {
    // Use Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Mix of distributions
    const choice = Math.random();
    let value: number;

    if (choice < 0.6) {
      // Main distribution centered at 50, std dev 15
      value = 50 + normal * 15;
    } else if (choice < 0.85) {
      // Secondary distribution centered at 75, std dev 8
      value = 75 + normal * 8;
    } else {
      // Small distribution centered at 25, std dev 5
      value = 25 + normal * 5;
    }

    // Clamp to reasonable range
    value = Math.max(0, Math.min(100, value));
    values.push(value);
  }

  return values;
}

// Load data and update stats
function loadData(count: number): void {
  if (!chart) return;

  // For bar charts, count represents category count (max 12)
  const barCategoryCount = Math.min(12, Math.max(3, Math.floor(count / 100)));

  // For pie charts, use a fixed number of slices (3-8)
  const pieSliceCount = Math.min(8, Math.max(3, Math.floor(count / 200)));

  // For candlestick charts, use 30-200 candles (days of data)
  const candleCount = Math.min(200, Math.max(30, Math.floor(count / 50)));

  // For boxplot charts, use 3-8 categories
  const boxplotCategoryCount = Math.min(8, Math.max(3, Math.floor(count / 200)));

  // For heatmap charts, use 5-20 rows/cols based on count
  const heatmapSize = Math.min(20, Math.max(5, Math.floor(Math.sqrt(count / 10))));

  // For network charts, use 20-100 nodes based on count
  const networkNodeCount = Math.min(100, Math.max(20, Math.floor(count / 20)));

  const displayCount = currentChartType === 'bar'
    ? barCategoryCount + ' categories'
    : currentChartType === 'pie'
      ? pieSliceCount + ' slices'
      : currentChartType === 'candlestick'
        ? candleCount + ' candles'
        : currentChartType === 'boxplot'
          ? boxplotCategoryCount + ' boxplots'
          : currentChartType === 'heatmap'
            ? `${heatmapSize}x${heatmapSize} cells`
            : currentChartType === 'network'
              ? `${networkNodeCount} nodes`
              : count.toLocaleString() + ' points';
  console.log(`\n========== Loading ${displayCount} (${currentChartType}) ==========`);

  // Data generation
  const startGen = performance.now();
  let series: Series[] = [];
  let histogramValues: number[] = [];
  let totalPoints = 0;

  if (currentChartType === 'scatter') {
    series = generateScatterData(count);
    for (const s of series) {
      totalPoints += s.data.length;
    }
  } else if (currentChartType === 'line') {
    series = generateLineData(count);
    for (const s of series) {
      totalPoints += s.data.length;
    }
  } else if (currentChartType === 'bar') {
    const barData = generateBarData(barCategoryCount);
    series = barData.series;
    // Set categories on bar chart (for band scale)
    if (barChart && getXScaleType() === 'band') {
      barChart.setCategories(barData.categories);
    }
    for (const s of series) {
      totalPoints += s.data.length;
    }
  } else if (currentChartType === 'histogram') {
    histogramValues = generateHistogramData(count);
    totalPoints = histogramValues.length;
  } else if (currentChartType === 'bubble') {
    series = generateBubbleData(count);
    for (const s of series) {
      totalPoints += s.data.length;
    }
  } else if (currentChartType === 'pie') {
    series = generatePieData(pieSliceCount);
    totalPoints = pieSliceCount;
  } else if (currentChartType === 'candlestick') {
    series = generateCandlestickData(candleCount);
    totalPoints = candleCount;
  } else if (currentChartType === 'boxplot') {
    series = generateBoxplotData(boxplotCategoryCount);
    // Set category labels for the boxplot chart
    if (boxplotChart) {
      boxplotChart.setCategories(BOXPLOT_CATEGORIES.slice(0, boxplotCategoryCount));
    }
    totalPoints = boxplotCategoryCount;
  } else if (currentChartType === 'heatmap') {
    const heatmapData = generateHeatmapData(heatmapSize, heatmapSize);
    // Set matrix data on heatmap chart
    if (heatmapChart) {
      heatmapChart.setMatrix(heatmapData.matrix, heatmapData.rowLabels, heatmapData.colLabels);
    }
    totalPoints = heatmapSize * heatmapSize;
  } else if (currentChartType === 'network') {
    const networkData = generateNetworkData(networkNodeCount);
    // Set network data on network chart
    if (networkChart) {
      networkChart.setNetworkData(networkData);
    }
    totalPoints = networkData.nodes.length;
  }

  const genTime = performance.now() - startGen;
  console.log(`Data generation: ${genTime.toFixed(1)}ms`);

  // Calculate data size
  const dataSizeBytes = totalPoints * (
    currentChartType === 'histogram' ? 8 :
    currentChartType === 'bubble' ? 3 * 8 : // x, y, z as float64
    2 * 8 // x, y as float64
  );
  console.log(
    `Data size: ~${(dataSizeBytes / 1024 / 1024).toFixed(2)} MB (${totalPoints.toLocaleString()} points)`
  );

  // Render
  const startRender = performance.now();
  if (currentChartType === 'histogram' && histogramChart) {
    histogramChart.setValues(histogramValues);
  } else if (currentChartType === 'heatmap') {
    // Already called setMatrix above
  } else if (currentChartType === 'network') {
    // Already called setNetworkData above
  } else {
    chart.setData(series);
  }
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

btnBar.addEventListener('click', () => {
  if (currentChartType !== 'bar') {
    createChart('bar');
    loadData(currentPointCount);
  }
});

btnHistogram.addEventListener('click', () => {
  if (currentChartType !== 'histogram') {
    createChart('histogram');
    loadData(currentPointCount);
  }
});

btnBubble.addEventListener('click', () => {
  if (currentChartType !== 'bubble') {
    createChart('bubble');
    loadData(currentPointCount);
  }
});

btnPie.addEventListener('click', () => {
  if (currentChartType !== 'pie') {
    createChart('pie');
    loadData(currentPointCount);
  }
});

btnCandlestick.addEventListener('click', () => {
  if (currentChartType !== 'candlestick') {
    createChart('candlestick');
    loadData(currentPointCount);
  }
});

btnBoxplot.addEventListener('click', () => {
  if (currentChartType !== 'boxplot') {
    createChart('boxplot');
    loadData(currentPointCount);
  }
});

btnHeatmap.addEventListener('click', () => {
  if (currentChartType !== 'heatmap') {
    createChart('heatmap');
    loadData(currentPointCount);
  }
});

btnNetwork.addEventListener('click', () => {
  if (currentChartType !== 'network') {
    createChart('network');
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
  } else if (heatmapChart && currentChartType === 'heatmap') {
    heatmapChart.clearSelection();
  } else if (networkChart && currentChartType === 'network') {
    networkChart.clearSelection();
  }
});

btnExport.addEventListener('click', async () => {
  if (!chart) return;

  try {
    // Show loading state
    btnExport.textContent = 'Exporting...';
    btnExport.setAttribute('disabled', 'true');

    // Export as blob and trigger download
    const blob = await chart.exportImageBlob({ format: 'png' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-chart-${currentChartType}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up
    URL.revokeObjectURL(url);
    console.log('Chart exported successfully');
  } catch (error) {
    console.error('Failed to export chart:', error);
    alert('Failed to export chart. See console for details.');
  } finally {
    // Reset button state
    btnExport.textContent = 'Export PNG';
    btnExport.removeAttribute('disabled');
  }
});

// Update LOD statistics display
function updateLODStats(): void {
  if (!chart) {
    statLod.textContent = '-';
    statVisible.textContent = '0';
    return;
  }

  // Bar charts don't have LOD
  if (currentChartType === 'bar') {
    statLod.textContent = 'N/A';
    statLod.style.color = '#666';
    // Count total data points in bar chart
    let total = 0;
    for (const s of chart.getData()) {
      total += s.data.length;
    }
    statVisible.textContent = total.toLocaleString();
    return;
  }

  // Pie charts don't have LOD
  if (currentChartType === 'pie') {
    statLod.textContent = 'N/A';
    statLod.style.color = '#666';
    // Display slice count for pie chart
    if (pieChart) {
      const slices = pieChart.getSlices();
      statVisible.textContent = slices.length.toString() + ' slices';
    }
    return;
  }

  // Candlestick charts don't have LOD
  if (currentChartType === 'candlestick') {
    statLod.textContent = 'N/A';
    statLod.style.color = '#666';
    // Display candle count for candlestick chart
    if (candlestickChart) {
      const candles = candlestickChart.getCandles();
      statVisible.textContent = candles.length.toString() + ' candles';
    }
    return;
  }

  // Boxplot charts don't have LOD
  if (currentChartType === 'boxplot') {
    statLod.textContent = 'N/A';
    statLod.style.color = '#666';
    // Display boxplot count for boxplot chart
    if (boxplotChart) {
      const boxplots = boxplotChart.getBoxplots();
      statVisible.textContent = boxplots.length.toString() + ' boxplots';
    }
    return;
  }

  // Heatmap charts don't have LOD
  if (currentChartType === 'heatmap') {
    statLod.textContent = 'N/A';
    statLod.style.color = '#666';
    // Display cell count for heatmap chart
    if (heatmapChart) {
      const cells = heatmapChart.getCells();
      statVisible.textContent = cells.length.toString() + ' cells';
    }
    return;
  }

  // Network charts don't have LOD
  if (currentChartType === 'network') {
    statLod.textContent = 'N/A';
    statLod.style.color = '#666';
    // Display node count for network chart
    if (networkChart) {
      const nodes = networkChart.getNodes();
      const edges = networkChart.getEdges();
      statVisible.textContent = `${nodes.length} nodes, ${edges.length} edges`;
    }
    return;
  }

  if (currentChartType === 'histogram') {
    statLod.textContent = 'N/A';
    statLod.style.color = '#666';
    // Display bin count for histogram
    if (histogramChart) {
      const bins = histogramChart.getBins();
      statVisible.textContent = bins.length.toString() + ' bins';
    }
    return;
  }

  const chartWithLOD = chart as ScatterChart | LineChart | BubbleChart;
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
  } else if (currentChartType === 'bubble') {
    const levels = lodManager.getLevels('bubbles');
    if (levels && levels.length > 0) {
      const lodLevel = chartWithLOD.getLODLevel('bubbles');
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

  // Bar, histogram, pie, candlestick, boxplot, heatmap, and network charts don't have LOD
  if (currentChartType === 'bar' || currentChartType === 'histogram' || currentChartType === 'pie' || currentChartType === 'candlestick' || currentChartType === 'boxplot' || currentChartType === 'heatmap' || currentChartType === 'network') {
    console.log(`${currentChartType} charts do not support LOD`);
    return;
  }

  const chartWithLOD = chart as ScatterChart | LineChart | BubbleChart;
  chartWithLOD.setLODEnabled(lodToggle.checked);
  updateLODStats();

  console.log(`LOD ${lodToggle.checked ? 'enabled' : 'disabled'}`);
});

// Histogram overlay toggle handlers
densityToggle.addEventListener('change', () => {
  if (!histogramChart) return;

  histogramChart.setOverlays({ showDensityCurve: densityToggle.checked });
  histogramChart.render();

  console.log(`Density curve ${densityToggle.checked ? 'enabled' : 'disabled'}`);
});

cumulativeToggle.addEventListener('change', () => {
  if (!histogramChart) return;

  histogramChart.setOverlays({ showCumulative: cumulativeToggle.checked });
  histogramChart.render();

  console.log(`Cumulative distribution ${cumulativeToggle.checked ? 'enabled' : 'disabled'}`);
});

// Line chart toggle handlers
showPointsToggle.addEventListener('change', () => {
  if (!lineChart) return;

  lineChart.setShowPoints(showPointsToggle.checked);

  console.log(`Show points ${showPointsToggle.checked ? 'enabled' : 'disabled'}`);
});

smoothToggle.addEventListener('change', () => {
  if (!lineChart) return;

  lineChart.setSmooth(smoothToggle.checked);

  console.log(`Smooth curves ${smoothToggle.checked ? 'enabled' : 'disabled'}`);
});

// Bubble scale toggle handlers
function updateBubbleScale(): void {
  if (!bubbleChart) return;

  const scale = scaleLinear.checked ? 'linear' : scaleLog.checked ? 'log' : 'sqrt';
  bubbleChart.setBubbleSize({ scale });

  console.log(`Bubble scale set to: ${scale}`);
}

scaleSqrt.addEventListener('change', updateBubbleScale);
scaleLinear.addEventListener('change', updateBubbleScale);
scaleLog.addEventListener('change', updateBubbleScale);

// Pie style toggle handlers
function updatePieStyle(): void {
  if (!pieChart) return;

  const innerRadius = pieDonut.checked ? 0.5 : 0;
  pieChart.updateOptions({ innerRadius });

  console.log(`Pie style set to: ${pieDonut.checked ? 'donut' : 'pie'}`);
}

function updatePieExplode(): void {
  if (!pieChart) return;

  const explodeOffset = pieExplode.checked ? 15 : 0;
  pieChart.updateOptions({ explodeOffset });

  console.log(`Explode effect ${pieExplode.checked ? 'enabled' : 'disabled'}`);
}

pieFull.addEventListener('change', updatePieStyle);
pieDonut.addEventListener('change', updatePieStyle);
pieExplode.addEventListener('change', updatePieExplode);

// Candlestick orientation toggle handlers
function updateCandlestickOrientation(): void {
  if (!candlestickChart) return;

  const orientation = candlestickHorizontal.checked ? 'horizontal' : 'vertical';
  candlestickChart.updateOptions({ orientation });

  console.log(`Candlestick orientation set to: ${orientation}`);
}

candlestickVertical.addEventListener('change', updateCandlestickOrientation);
candlestickHorizontal.addEventListener('change', updateCandlestickOrientation);

// Boxplot orientation toggle handlers
function updateBoxplotOrientation(): void {
  if (!boxplotChart) return;

  const orientation = boxplotHorizontal.checked ? 'horizontal' : 'vertical';
  boxplotChart.updateOptions({ orientation });

  console.log(`Boxplot orientation set to: ${orientation}`);
}

boxplotVertical.addEventListener('change', updateBoxplotOrientation);
boxplotHorizontal.addEventListener('change', updateBoxplotOrientation);

// Heatmap color scale toggle handlers
function updateHeatmapColorScale(): void {
  if (!heatmapChart) return;

  let colors: RGBAColor[];
  let scaleType: 'sequential' | 'diverging' = 'sequential';
  if (heatmapDiverging.checked) {
    colors = [...DIVERGING_RWB];
    scaleType = 'diverging';
  } else if (heatmapSequential.checked) {
    colors = [...SEQUENTIAL_BLUE];
  } else {
    colors = [...VIRIDIS];
  }

  heatmapChart.updateOptions({
    colorScale: { type: scaleType, colors },
  });

  console.log(`Heatmap color scale set to: ${heatmapDiverging.checked ? 'diverging' : heatmapSequential.checked ? 'sequential blue' : 'viridis'}`);
}

function updateHeatmapLabels(): void {
  if (!heatmapChart) return;

  heatmapChart.updateOptions({ showLabels: heatmapLabels.checked });

  console.log(`Heatmap labels ${heatmapLabels.checked ? 'enabled' : 'disabled'}`);
}

heatmapViridis.addEventListener('change', updateHeatmapColorScale);
heatmapSequential.addEventListener('change', updateHeatmapColorScale);
heatmapDiverging.addEventListener('change', updateHeatmapColorScale);
heatmapLabels.addEventListener('change', updateHeatmapLabels);

// Network layout toggle handlers
function updateNetworkLayout(): void {
  if (!networkChart) return;

  const layout = networkRadial.checked ? 'radial' : 'force';
  networkChart.setLayout(layout);

  console.log(`Network layout set to: ${layout}`);
}

function updateNetworkLabels(): void {
  if (!networkChart) return;

  networkChart.updateOptions({ showLabels: networkLabels.checked });

  console.log(`Network labels ${networkLabels.checked ? 'enabled' : 'disabled'}`);
}

function updateNetworkLegend(): void {
  if (!networkChart) return;

  networkChart.updateOptions({ showLegend: networkLegend.checked });

  console.log(`Network legend ${networkLegend.checked ? 'enabled' : 'disabled'}`);
}

networkForce.addEventListener('change', updateNetworkLayout);
networkRadial.addEventListener('change', updateNetworkLayout);
networkLabels.addEventListener('change', updateNetworkLabels);
networkLegend.addEventListener('change', updateNetworkLegend);

// Axis scale change handlers
function updateAxisScales(): void {
  // Recreate chart with new scale settings
  createChart(currentChartType);
  loadData(currentPointCount);

  console.log(`Axis scales updated: X=${getXScaleType()}, Y=${getYScaleType()}`);
}

xScaleSelect.addEventListener('change', updateAxisScales);
yScaleSelect.addEventListener('change', updateAxisScales);

// Update axis scale options based on chart type
function updateAxisScaleVisibility(): void {
  // Pie, candlestick, boxplot, heatmap, and network charts don't use the standard axis scale selectors
  if (currentChartType === 'pie' || currentChartType === 'candlestick' || currentChartType === 'boxplot' || currentChartType === 'heatmap' || currentChartType === 'network') {
    axisScaleOptions.classList.add('hidden');
    return;
  }

  axisScaleOptions.classList.remove('hidden');
  xScaleSelect.disabled = false;
  xScaleSelect.parentElement!.style.opacity = '1';

  // Set appropriate default scales and options per chart type
  if (currentChartType === 'bar') {
    // Bar charts: default to band (category) or time for X-axis
    if (xScaleSelect.value !== 'band' && xScaleSelect.value !== 'time') {
      xScaleSelect.value = 'band';
    }
  } else if (currentChartType === 'line') {
    // Line charts: support time scale, default to linear or time
    if (xScaleSelect.value === 'band') {
      xScaleSelect.value = 'linear';
    }
  } else {
    // Scatter/bubble/histogram: continuous scales only
    if (xScaleSelect.value === 'band' || xScaleSelect.value === 'time') {
      xScaleSelect.value = 'linear';
    }
  }
}

// Initialize
createChart('scatter');
loadData(1_000);

console.log('Lumina Charts demo initialized');
