let currentCustomerId = null;

function normalizeCustomerText(value) {
  return String(value || '').trim();
}

async function findOrCreateCustomer() {
  if (!currentUser || !supabaseClient) return null;

  const name = normalizeCustomerText(document.getElementById('customerName').value);
  const email = normalizeCustomerText(document.getElementById('customerEmail').value).toLowerCase();
  const phone = normalizeCustomerText(document.getElementById('customerPhone').value);

  if (!name && !email && !phone) return null;

  let query = supabaseClient.from('customers').select('*');

  if (email) {
    query = query.eq('email', email);
  } else if (phone) {
    query = query.eq('phone', phone);
  } else {
    query = query.eq('name', name);
  }

  const existing = await query.limit(1).maybeSingle();
  if (existing.error) throw existing.error;

  const payload = {
    user_id: currentUser.id,
    name: name,
    email: email || null,
    phone: phone || null,
    updated_at: new Date().toISOString()
  };

  let result;
  if (existing.data) {
    result = await supabaseClient
      .from('customers')
      .update(payload)
      .eq('id', existing.data.id)
      .select()
      .single();
  } else {
    result = await supabaseClient
      .from('customers')
      .insert(payload)
      .select()
      .single();
  }

  if (result.error) throw result.error;

  currentCustomerId = result.data.id;
  document.getElementById('customerIdDisplay').value = result.data.id;
  return result.data;
}

async function loadClients() {
  if (!(await ensureDatabaseReady())) return;

  const result = await supabaseClient
    .from('customers')
    .select('id,name,email,phone,updated_at')
    .order('updated_at', { ascending: false });

  if (result.error) {
    document.getElementById('clientList').innerHTML =
      '<div class="empty-state">' + escapeHtml(result.error.message) + '</div>';
    return;
  }

  renderClientList(result.data || []);
}

async function searchClients() {
  if (!(await ensureDatabaseReady())) return;

  const term = cleanSearchTerm(document.getElementById('clientSearch').value);
  if (!term) {
    loadClients();
    return;
  }

  const result = await supabaseClient
    .from('customers')
    .select('id,name,email,phone,updated_at')
    .or(
      'name.ilike.%' + term +
      '%,email.ilike.%' + term +
      '%,phone.ilike.%' + term + '%'
    )
    .order('updated_at', { ascending: false });

  if (result.error) {
    document.getElementById('clientList').innerHTML =
      '<div class="empty-state">' + escapeHtml(result.error.message) + '</div>';
    return;
  }

  renderClientList(result.data || []);
}

function renderClientList(clients) {
  const list = document.getElementById('clientList');

  if (!clients.length) {
    list.innerHTML = '<div class="empty-state">No clients found.</div>';
    return;
  }

  list.innerHTML = clients.map(function(client) {
    return '<button type="button" class="client-list-item" onclick="openClient(\'' +
      client.id + '\')">' +
      '<strong>' + escapeHtml(client.name || 'Unnamed Client') + '</strong>' +
      '<span>' + escapeHtml(client.email || client.phone || '') + '</span>' +
      '</button>';
  }).join('');
}

async function openClient(customerId) {
  if (!(await ensureDatabaseReady())) return;

  const customerResult = await supabaseClient
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  const quotesResult = await supabaseClient
    .from('quotes')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (customerResult.error || quotesResult.error) {
    document.getElementById('clientDetail').innerHTML =
      '<div class="empty-state">' +
      escapeHtml((customerResult.error || quotesResult.error).message) +
      '</div>';
    return;
  }

  currentCustomerId = customerId;
  renderClientDetail(customerResult.data, quotesResult.data || []);
  prepareEmailForCustomer(customerResult.data, null);
  loadEmailHistory();
}

function renderClientDetail(customer, quotes) {
  const detail = document.getElementById('clientDetail');

  const grouped = {};
  quotes.forEach(function(quote) {
    const key = quote.revision_root_id || quote.id;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(quote);
  });

  let groupsHtml = '';
  Object.keys(grouped).forEach(function(key) {
    const revisions = grouped[key].sort(function(a, b) {
      return (b.revision_number || 1) - (a.revision_number || 1);
    });
    const latest = revisions[0];

    groupsHtml += '<div class="client-quote-group">' +
      '<strong>' + escapeHtml(latest.vehicle || 'Vehicle Quote') + '</strong>' +
      '<div class="small-help">Quote family: ' +
      escapeHtml(latest.quote_number || '') + '</div>';

    revisions.forEach(function(quote) {
      groupsHtml += '<div class="client-quote-row">' +
        '<span>' + escapeHtml(quote.quote_date || '') + '</span>' +
        '<span>' + escapeHtml(quote.quote_number || '') + '</span>' +
        '<span class="revision-badge">Revision ' +
          escapeHtml(quote.revision_number || 1) + '</span>' +
        '<span class="status-pill ' + escapeHtml(quote.status || '') + '">' +
          escapeHtml(quote.status || '') + '</span>' +
        '<span class="table-actions">' +
          '<button type="button" class="btn-primary" onclick="openSavedQuote(\'' +
            quote.id + '\')">Open</button>' +
          '<button type="button" class="btn-secondary" onclick="emailSavedQuote(\'' +
            quote.id + '\')">Email</button>' +
        '</span>' +
      '</div>';
    });

    groupsHtml += '</div>';
  });

  detail.innerHTML =
    '<div class="client-header">' +
      '<h3>' + escapeHtml(customer.name || 'Unnamed Client') + '</h3>' +
      '<div>' + escapeHtml(customer.email || '') + '</div>' +
      '<div>' + escapeHtml(customer.phone || '') + '</div>' +
      '<div class="email-actions">' +
        '<button type="button" class="btn-primary" onclick="startNewQuoteForClient(\'' +
          customer.id + '\')">New Quote</button>' +
        '<button type="button" class="btn-secondary" onclick="showTab(\'emailTab\')">Email Client</button>' +
      '</div>' +
    '</div>' +
    (groupsHtml || '<div class="empty-state">No quotes saved for this client.</div>');
}

async function startNewQuoteForClient(customerId) {
  const result = await supabaseClient
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (result.error) {
    showToast(result.error.message, 'error');
    return;
  }

  clearForm();
  currentCustomerId = result.data.id;
  document.getElementById('customerIdDisplay').value = result.data.id;
  document.getElementById('customerName').value = result.data.name || '';
  document.getElementById('customerEmail').value = result.data.email || '';
  document.getElementById('customerPhone').value = result.data.phone || '';
  showTab('setupTab');
}

async function saveQuoteRevision() {
  if (!(await ensureDatabaseReady())) return;

  if (!currentQuoteId) {
    showToast('Save the original quote before creating a revision.', 'error');
    return;
  }

  const original = await fetchFullQuote(currentQuoteId);
  const rootId = original.revision_root_id || original.id;

  const maxResult = await supabaseClient
    .from('quotes')
    .select('revision_number')
    .eq('revision_root_id', rootId)
    .order('revision_number', { ascending: false })
    .limit(1);

  if (maxResult.error) {
    showToast(maxResult.error.message, 'error');
    return;
  }

  const nextRevision = Math.max(
    original.revision_number || 1,
    maxResult.data && maxResult.data[0] ? maxResult.data[0].revision_number : 1
  ) + 1;

  const oldId = currentQuoteId;
  currentQuoteId = null;
  document.getElementById('quoteNumber').value =
    (original.quote_number || generateQuoteNumber()).replace(/-R\d+$/, '') +
    '-R' + nextRevision;

  await saveQuoteToDatabase({
    revisionRootId: rootId,
    revisionNumber: nextRevision,
    revisedFromId: oldId
  });
}

async function emailSavedQuote(quoteId) {
  await openSavedQuote(quoteId);
  prepareEmailFromCurrentQuote();
  showTab('emailTab');
}
