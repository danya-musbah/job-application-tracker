// Minimal, dependency-free SVG chart renderers.
// Native HTML/CSS/SVG per the "offline optimization" requirement — no CDN,
// no chart library, so charts always render even with no network at all.

import { el } from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

export function renderEmptyChart(container, message = 'Not enough data yet.') {
  container.innerHTML = '';
  container.appendChild(el('p', { class: 'mini-empty' }, message));
}

/**
 * Renders a simple bar chart. data: [{ label, value }]
 */
export function renderBarChart(container, data, { width = 480, height = 220 } = {}) {
  container.innerHTML = '';
  if (!data || data.length === 0) return renderEmptyChart(container);

  const padding = { top: 16, right: 12, bottom: 36, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'svg-chart', role: 'img', 'aria-label': 'Bar chart' });
  const barSlot = chartWidth / data.length;
  const barWidth = Math.min(barSlot * 0.6, 48);

  // Axis line
  svg.appendChild(svgEl('line', {
    x1: padding.left, y1: padding.top + chartHeight, x2: width - padding.right, y2: padding.top + chartHeight, class: 'axis',
  }));

  data.forEach((d, i) => {
    const barHeight = maxValue > 0 ? (d.value / maxValue) * chartHeight : 0;
    const x = padding.left + i * barSlot + (barSlot - barWidth) / 2;
    const y = padding.top + chartHeight - barHeight;

    const rect = svgEl('rect', { x, y, width: barWidth, height: barHeight, rx: 4, class: 'bar' });
    const title = svgEl('title', {});
    title.textContent = `${d.label}: ${d.value}`;
    rect.appendChild(title);
    svg.appendChild(rect);

    const valueLabel = svgEl('text', { x: x + barWidth / 2, y: y - 6, 'text-anchor': 'middle' });
    valueLabel.textContent = d.value;
    svg.appendChild(valueLabel);

    const label = svgEl('text', { x: x + barWidth / 2, y: padding.top + chartHeight + 18, 'text-anchor': 'middle' });
    label.textContent = d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label;
    svg.appendChild(label);
  });

  container.appendChild(svg);
}

/**
 * Renders a simple line chart. data: [{ label, value }]
 */
export function renderLineChart(container, data, { width = 480, height = 220 } = {}) {
  container.innerHTML = '';
  if (!data || data.length === 0) return renderEmptyChart(container);

  const padding = { top: 16, right: 16, bottom: 36, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'svg-chart', role: 'img', 'aria-label': 'Line chart' });
  svg.appendChild(svgEl('line', {
    x1: padding.left, y1: padding.top + chartHeight, x2: width - padding.right, y2: padding.top + chartHeight, class: 'axis',
  }));

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartHeight - (maxValue > 0 ? (d.value / maxValue) * chartHeight : 0);
    return { x, y, d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  svg.appendChild(svgEl('path', { d: pathD, class: 'line' }));

  points.forEach((p, i) => {
    const dot = svgEl('circle', { cx: p.x, cy: p.y, r: 3.5, class: 'dot' });
    const title = svgEl('title', {});
    title.textContent = `${p.d.label}: ${p.d.value}`;
    dot.appendChild(title);
    svg.appendChild(dot);

    if (data.length <= 14 || i % Math.ceil(data.length / 14) === 0) {
      const label = svgEl('text', { x: p.x, y: padding.top + chartHeight + 18, 'text-anchor': 'middle' });
      label.textContent = p.d.label;
      svg.appendChild(label);
    }
  });

  container.appendChild(svg);
}

const PIE_COLORS = ['#73BA9B', '#003E1F', '#BA2D0B', '#8fa6c9', '#d8b04a', '#7a6a3f', '#1d6fa5', '#6b5b95', '#a15c00', '#4f9b7d', '#c98686'];

/**
 * Renders a simple donut/pie chart with a legend. data: [{ label, value }]
 */
export function renderDonutChart(container, data, { size = 200 } = {}) {
  container.innerHTML = '';
  const filtered = (data || []).filter((d) => d.value > 0);
  if (filtered.length === 0) return renderEmptyChart(container);

  const total = filtered.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  const innerRadius = radius * 0.6;
  const cx = radius;
  const cy = radius;

  const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, class: 'svg-chart', role: 'img', 'aria-label': 'Donut chart' });

  let angleStart = -Math.PI / 2;
  filtered.forEach((d, i) => {
    const angle = (d.value / total) * Math.PI * 2;
    const angleEnd = angleStart + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1 = cx + radius * Math.cos(angleStart);
    const y1 = cy + radius * Math.sin(angleStart);
    const x2 = cx + radius * Math.cos(angleEnd);
    const y2 = cy + radius * Math.sin(angleEnd);
    const ix1 = cx + innerRadius * Math.cos(angleEnd);
    const iy1 = cy + innerRadius * Math.sin(angleEnd);
    const ix2 = cx + innerRadius * Math.cos(angleStart);
    const iy2 = cy + innerRadius * Math.sin(angleStart);

    const path = svgEl('path', {
      d: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    });
    const title = svgEl('title', {});
    title.textContent = `${d.label}: ${d.value}`;
    path.appendChild(title);
    svg.appendChild(path);

    angleStart = angleEnd;
  });

  container.appendChild(svg);

  const legend = el('div', { class: 'legend' },
    filtered.map((d, i) => el('span', { class: 'legend-item' }, [
      el('span', { class: 'legend-swatch', style: `background:${PIE_COLORS[i % PIE_COLORS.length]}` }),
      `${d.label} (${d.value})`,
    ])));
  container.appendChild(legend);
}

/**
 * Renders horizontal rate bars. rates: [{ label, value }] (value is 0-100)
 */
export function renderRateBars(container, rates) {
  container.innerHTML = '';
  rates.forEach(({ label, value }) => {
    const row = el('div', { class: 'rate-row' }, [
      el('span', { class: 'rate-label' }, label),
      el('div', { class: 'rate-bar-track' }, el('div', { class: 'rate-bar-fill', style: `width:${Math.min(value, 100)}%` })),
      el('span', { class: 'rate-value' }, `${value}%`),
    ]);
    container.appendChild(row);
  });
}
