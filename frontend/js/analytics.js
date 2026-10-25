import { dashboardApi } from './api.js';
import { showToast } from './utils.js';
import { renderLineChart, renderBarChart, renderDonutChart, renderRateBars } from './charts.js';

export async function loadAnalytics() {
  try {
    const data = await dashboardApi.analytics();

    const overTime = (data.applicationsOverTime || []).map((r) => ({ label: r.month, value: r.count }));
    renderLineChart(document.getElementById('analytics-chart-over-time'), overTime);

    const byStatus = (data.applicationsByStatus || []).map((r) => ({ label: r.status, value: r.count }));
    renderBarChart(document.getElementById('analytics-chart-status'), byStatus);

    const bySource = (data.applicationsBySource || []).map((r) => ({ label: r.source, value: r.count }));
    renderDonutChart(document.getElementById('analytics-chart-source'), bySource);

    renderRateBars(document.getElementById('analytics-chart-rates'), [
      { label: 'Interview rate', value: data.interviewRate },
      { label: 'Offer rate', value: data.offerRate },
      { label: 'Rejection rate', value: data.rejectionRate },
    ]);
  } catch (err) {
    showToast('Could not load analytics. Please try again.', 'error');
  }
}
