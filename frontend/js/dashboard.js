import { dashboardApi } from './api.js';
import { el, formatDate, showToast } from './utils.js';
import { renderBarChart, renderLineChart, renderDonutChart, renderRateBars } from './charts.js';

const STAT_DEFS = [
  { key: 'total', label: 'Total' },
  { key: 'applied', label: 'Applied' },
  { key: 'inReview', label: 'In Review' },
  { key: 'interviews', label: 'Interviews' },
  { key: 'offers', label: 'Offers' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
];

function renderStats(stats) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = '';
  for (const { key, label } of STAT_DEFS) {
    grid.appendChild(el('div', { class: 'stat-card' }, [
      el('div', { class: 'stat-value' }, String(stats[key] ?? 0)),
      el('div', { class: 'stat-label' }, label),
    ]));
  }
}

function renderInterviewsList(interviews) {
  const list = document.getElementById('upcoming-interviews-list');
  list.innerHTML = '';
  if (!interviews || interviews.length === 0) {
    list.appendChild(el('li', { class: 'mini-empty' }, 'No upcoming interviews.'));
    return;
  }
  for (const iv of interviews) {
    list.appendChild(el('li', { class: 'mini-item' }, [
      el('div', { class: 'mini-item-main' }, [
        el('div', { class: 'mini-item-title' }, iv.interviewType),
        el('div', { class: 'mini-item-sub' }, `${formatDate(iv.interviewDate)}${iv.interviewTime ? ' · ' + iv.interviewTime : ''}`),
      ]),
    ]));
  }
}

function renderFollowupsAttention(overdue, upcoming) {
  const list = document.getElementById('followups-attention-list');
  list.innerHTML = '';
  const combined = [...(overdue || []).map((f) => ({ ...f, tag: 'Overdue' })), ...(upcoming || []).map((f) => ({ ...f, tag: 'Upcoming' }))];
  if (combined.length === 0) {
    list.appendChild(el('li', { class: 'mini-empty' }, 'Nothing needs attention right now.'));
    return;
  }
  for (const f of combined.slice(0, 8)) {
    list.appendChild(el('li', { class: 'mini-item' }, [
      el('div', { class: 'mini-item-main' }, [
        el('div', { class: 'mini-item-title' }, f.followupType || 'Follow-up'),
        el('div', { class: 'mini-item-sub' }, `${f.tag} · due ${formatDate(f.followupDate)}`),
      ]),
    ]));
  }
}

export async function loadDashboard() {
  try {
    const data = await dashboardApi.overview();
    renderStats(data.stats);
    renderInterviewsList(data.upcomingInterviews);
    renderFollowupsAttention(data.overdueFollowups, data.upcomingFollowups);

    const overTime = (data.analytics.applicationsOverTime || []).map((r) => ({ label: r.month, value: r.count }));
    renderLineChart(document.getElementById('chart-over-time'), overTime);

    const byStatus = (data.analytics.applicationsByStatus || []).map((r) => ({ label: r.status, value: r.count }));
    renderBarChart(document.getElementById('chart-by-status'), byStatus);

    const bySource = (data.analytics.applicationsBySource || []).map((r) => ({ label: r.source, value: r.count }));
    renderDonutChart(document.getElementById('chart-by-source'), bySource);

    renderRateBars(document.getElementById('chart-rates'), [
      { label: 'Interview rate', value: data.analytics.interviewRate },
      { label: 'Offer rate', value: data.analytics.offerRate },
      { label: 'Rejection rate', value: data.analytics.rejectionRate },
    ]);

    return data;
  } catch (err) {
    showToast('Could not load the dashboard. Please try again.', 'error');
    return null;
  }
}
