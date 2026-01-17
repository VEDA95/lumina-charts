import {
  ScatterChart,
  LineChart,
  BarChart,
  HistogramChart,
  BubbleChart,
  PieChart,
  PanHandler,
  ZoomHandler,
  HoverHandler,
  SelectionHandler,
  type Series,
  type DataPoint,
  type BubbleDataPoint,
  type BaseChart,
  type ScaleType,
} from '@lumina-charts/core';

// DOM elements
const chartContainer = document.getElementById('chart')!;
const btnScatter = document.getElementById('btn-scatter')!;
const btnLine = document.getElementById('btn-line')!;
const btnBar = document.getElementById('btn-bar')!;
const btnHistogram = document.getElementById('btn-histogram')!;
const btnBubble = document.getElementById('btn-bubble')!;
const btnPie = document.getElementById('btn-pie')!;
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
const xScaleSelect = document.getElementById('x-scale-select') as HTMLSelectElement;
const yScaleSelect = document.getElementById('y-scale-select') as HTMLSelectElement;
const axisScaleOptions = document.getElementById('axis-scale-options')!;

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
let currentChartType: 'scatter' | 'line' | 'bar' | 'histogram' | 'bubble' | 'pie' = 'scatter';
let chart: BaseChart | null = null;
let barChart: BarChart | null = null; // Keep reference for setCategories
let histogramChart: HistogramChart | null = null; // Keep reference for setValues
let lineChart: LineChart | null = null; // Keep reference for line options
let bubbleChart: BubbleChart | null = null; // Keep reference for bubble options
let pieChart: PieChart | null = null; // Keep reference for pie options
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
function getChartOptions() {
  return {
    margins: { top: 20, right: 20, bottom: 50, left: 60 },
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
    gridColor: [0.93, 0.93, 0.93, 1.0] as [number, number, number, number],
  };
}

// Create chart based on type
function createChart(type: 'scatter' | 'line' | 'bar' | 'histogram' | 'bubble' | 'pie'): void {
  // Dispose existing chart
  if (chart) {
    chart.dispose();
    chart = null;
    barChart = null;
    histogramChart = null;
    lineChart = null;
    bubbleChart = null;
    pieChart = null;
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

    barChart = new BarChart({
      container: chartContainer,
      options: {
        ...chartOptions,
        xAxis: {
          label: xAxisLabel,
          ticks: { count: 6 },
          type: xScale === 'band' ? 'linear' : xScale, // band scale handled via setCategories
        },
        yAxis: {
          label: 'Value',
          ticks: { count: 8 },
          type: getYScaleType(),
        },
        barGap: 4,
        groupGap: 20,
      },
    });
    chart = barChart;
  } else if (type === 'histogram') {
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
        },
        hoverBrighten: 1.15,
      },
    });
    chart = pieChart;
  }

  // Add interactions (except for pie chart which handles its own)
  if (type !== 'pie') {
    const panHandler = new PanHandler({ momentum: true });
    zoomHandler = new ZoomHandler({ speed: 1.5 });
    const hoverHandler = new HoverHandler({ showTooltip: true });
    selectionHandler = new SelectionHandler({ mode: 'single' });

    chart?.addInteraction(panHandler);
    chart?.addInteraction(zoomHandler);
    chart?.addInteraction(hoverHandler);
    chart?.addInteraction(selectionHandler);
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
  const seriesColors: [number, number, number, number][] = [
    [0.4, 0.6, 0.9, 1.0],
    [0.9, 0.5, 0.4, 1.0],
    [0.4, 0.8, 0.5, 1.0],
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

  const displayCount = currentChartType === 'bar'
    ? barCategoryCount + ' categories'
    : currentChartType === 'pie'
      ? pieSliceCount + ' slices'
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

  // Bar, histogram, and pie charts don't have LOD
  if (currentChartType === 'bar' || currentChartType === 'histogram' || currentChartType === 'pie') {
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
  // Pie charts don't use axes
  if (currentChartType === 'pie') {
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
