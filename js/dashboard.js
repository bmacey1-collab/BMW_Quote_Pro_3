async function loadDashboard() {
  if (!(await ensureDatabaseReady())) return;

  const today = new Date().toISOString().slice(0, 10);

  const [quotesResult, clientsResult] = await Promise.all([
    supabaseClient
      .from('quotes')
      .select('id,quote_number,quote_date,customer_name,vehicle,status,updated_at')
      .order('updated_at', { ascending: false })
      .limit(100),
    supabaseClient
      .from('customers')
      .select('id', { count: 'exact', head: true })
  ]);

  if (quotesResult.error || clientsResult.error) {
    showToast((quotesResult.error || clientsResult.error).message, 'error');
    return;
  }

  const quotes = quotesResult.data || [];

  document.getElementById('metricQuotesToday').textContent =
    quotes.filter(function(q) { return q.quote_date === today; }).length;
  document.getElementById('metricPending').textContent =
    quotes.filter(function(q) { return q.status === 'Pending'; }).length;
  document.getElementById('metricClients').textContent =
    clientsResult.count || 0;
  document.getElementById('metricSold').textContent =
    quotes.filter(function(q) { return q.status === 'Sold'; }).length;

  const recent = quotes.slice(0, 10);
  const container = document.getElementById('dashboardRecentQuotes');

  if (!recent.length) {
    container.innerHTML = '<div class="empty-state">No saved quotes yet.</div>';
    return;
  }

  container.innerHTML = recent.map(function(q) {
    return '<div class="dashboard-row">' +
      '<strong>' + escapeHtml(q.customer_name || 'Unnamed Client') + '</strong>' +
      '<span>' + escapeHtml(q.vehicle || '') + '</span>' +
      '<span class="status-pill ' + escapeHtml(q.status || '') + '">' +
        escapeHtml(q.status || '') + '</span>' +
      '<button type="button" class="btn-primary" onclick="openSavedQuote(\'' +
        q.id + '\')">Open</button>' +
    '</div>';
  }).join('');
}
