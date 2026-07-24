// ============================================================
  // SUPABASE QUOTE DATABASE
  // ============================================================
  let supabaseClient = null;
  let currentQuoteId = null;
  let currentUser = null;

  let toastTimer = null;
  let databaseSettingsManuallyOpened = false;

  function showToast(message, type) {
    const toast = document.getElementById('appToast');
    if (!toast) return;

    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = 'app-toast visible' + (type ? ' ' + type : '');

    toastTimer = setTimeout(function() {
      toast.classList.remove('visible');
    }, 4200);
  }

  function updateDatabaseSetupVisibility() {
    const connectionSection = document.getElementById('connectionSetupSection');
    const accountSection = document.getElementById('accountSetupSection');
    const readyBar = document.getElementById('databaseReadyBar');
    const readyEmail = document.getElementById('databaseReadyEmail');
    const settings = getSupabaseSettings();

    if (!connectionSection || !accountSection || !readyBar || !readyEmail) return;

    const ready = Boolean(settings.url && settings.key && currentUser);

    if (ready && !databaseSettingsManuallyOpened) {
      connectionSection.hidden = true;
      accountSection.hidden = true;
      readyBar.hidden = false;
      readyEmail.textContent = currentUser.email
        ? '— signed in as ' + currentUser.email
        : '';
    } else {
      connectionSection.hidden = false;
      accountSection.hidden = false;
      readyBar.hidden = true;
      readyEmail.textContent = '';
    }
  }

  function showDatabaseSettings() {
    databaseSettingsManuallyOpened = true;
    updateDatabaseSetupVisibility();

    const section = document.getElementById('connectionSetupSection');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }


  function setDbMessage(message, type) {
    const el = document.getElementById('databaseMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'database-message' + (type ? ' ' + type : '');
  }

  function setAuthMessage(message, type) {
    const el = document.getElementById('authMessage');
    if (!el) return;
    el.textContent = message || '';
    el.className = 'database-message' + (type ? ' ' + type : '');
  }

  function setConnectionStatus(message, type) {
    const el = document.getElementById('connectionStatus');
    if (!el) return;
    el.textContent = message;
    el.className = 'connection-status' + (type ? ' ' + type : '');
  }

  function getSupabaseSettings() {
    return {
      url: localStorage.getItem(APP_CONFIG.supabaseUrlStorageKey) || '',
      key: localStorage.getItem(APP_CONFIG.supabaseKeyStorageKey) || ''
    };
  }

  function initializeSupabase() {
    const settings = getSupabaseSettings();
    document.getElementById('supabaseUrl').value = settings.url;
    document.getElementById('supabaseKey').value = settings.key;

    if (!settings.url || !settings.key) {
      supabaseClient = null;
      setConnectionStatus('Connection not configured', '');
      updateAuthUi(null);
      return false;
    }

    try {
      supabaseClient = window.supabase.createClient(
        settings.url,
        settings.key,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage,
            storageKey: APP_CONFIG.supabaseAuthStorageKey
          }
        }
      );
      setConnectionStatus('Connected automatically', 'connected');

      supabaseClient.auth.getSession().then(function(result) {
        const session = result.data ? result.data.session : null;
        currentUser = session ? session.user : null;
        updateAuthUi(currentUser);
        if (currentUser) loadSavedQuotes();
      });

      supabaseClient.auth.onAuthStateChange(function(event, session) {
        currentUser = session ? session.user : null;
        updateAuthUi(currentUser);
        if (currentUser) loadSavedQuotes();
      });

      return true;
    } catch (error) {
      supabaseClient = null;
      setConnectionStatus('Configuration error', 'error');
      setAuthMessage(error.message, 'error');
      return false;
    }
  }

  async function forgetSupabaseConnection() {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (error) {
        console.warn('Unable to sign out before clearing connection:', error);
      }
    }

    localStorage.removeItem(APP_CONFIG.supabaseUrlStorageKey);
    localStorage.removeItem(APP_CONFIG.supabaseKeyStorageKey);
    localStorage.removeItem(APP_CONFIG.supabaseAuthStorageKey);

    supabaseClient = null;
    currentUser = null;
    databaseSettingsManuallyOpened = true;

    document.getElementById('supabaseUrl').value = '';
    document.getElementById('supabaseKey').value = '';

    updateAuthUi(null);
    setConnectionStatus('Connection removed', '');
    setAuthMessage('Database connection removed from this browser.', 'success');
    showToast('Database connection removed.', 'success');
  }

  function saveSupabaseSettings() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();

    if (!url || !key) {
      setConnectionStatus('Enter both values', 'error');
      return;
    }

    localStorage.setItem(APP_CONFIG.supabaseUrlStorageKey, url);
    localStorage.setItem(APP_CONFIG.supabaseKeyStorageKey, key);
    databaseSettingsManuallyOpened = false;
    initializeSupabase();
    setConnectionStatus('Saved', 'connected');
    showToast('Database connection saved.', 'success');
  }

  async function testSupabaseConnection() {
    if (!supabaseClient && !initializeSupabase()) return;

    setConnectionStatus('Testing…', '');
    try {
      const result = await supabaseClient.auth.getSession();
      if (result.error) throw result.error;
      setConnectionStatus('Connection works', 'connected');
    } catch (error) {
      setConnectionStatus('Connection failed', 'error');
      setAuthMessage(error.message, 'error');
    }
  }

  function updateAuthUi(user) {
    const signedOut = document.getElementById('signedOutArea');
    const signedIn = document.getElementById('signedInArea');
    const email = document.getElementById('signedInEmail');

    if (user) {
      signedOut.classList.add('hidden-auth');
      signedIn.classList.remove('hidden-auth');
      email.textContent = user.email || user.id;
    } else {
      signedOut.classList.remove('hidden-auth');
      signedIn.classList.add('hidden-auth');
      email.textContent = '';
      document.getElementById('savedQuotesBody').innerHTML =
        '<tr><td colspan="8">Sign in to view saved quotes.</td></tr>';
    }

    updateDatabaseSetupVisibility();
    updateAboutDiagnostics();
  }

  async function signUpUser() {
    if (!supabaseClient && !initializeSupabase()) {
      setAuthMessage('Save your Supabase connection first.', 'error');
      return;
    }

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (!email || password.length < 6) {
      setAuthMessage('Enter an email and a password of at least 6 characters.', 'error');
      return;
    }

    setAuthMessage('Creating account…', '');
    const result = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: APP_CONFIG.siteUrl
      }
    });

    if (result.error) {
      setAuthMessage(result.error.message, 'error');
      return;
    }

    setAuthMessage(
      result.data.session
        ? 'Account created and signed in.'
        : 'Account created. Check your email if confirmation is enabled.',
      'success'
    );
  }

  async function signInUser() {
    if (!supabaseClient && !initializeSupabase()) {
      setAuthMessage('Save your Supabase connection first.', 'error');
      return;
    }

    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    setAuthMessage('Signing in…', '');
    const result = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (result.error) {
      setAuthMessage(result.error.message, 'error');
      return;
    }

    databaseSettingsManuallyOpened = false;
    setAuthMessage('Signed in.', 'success');
    showToast('Signed in successfully.', 'success');
  }

  async function signOutUser() {
    if (!supabaseClient) return;
    const result = await supabaseClient.auth.signOut();
    if (result.error) {
      setAuthMessage(result.error.message, 'error');
      return;
    }
    currentUser = null;
    databaseSettingsManuallyOpened = true;
    updateAuthUi(null);
    setAuthMessage('Signed out.', 'success');
    showToast('Signed out.', 'success');
  }

  function serializeQuoteForm() {
    const formData = {};

    document.querySelectorAll('input[id], select[id], textarea[id]').forEach(function(el) {
      if (el.type === 'button' || el.type === 'submit' || el.type === 'password') return;
      if (['supabaseUrl', 'supabaseKey', 'authEmail', 'authPassword', 'savedQuoteSearch', 'savedStatusFilter'].includes(el.id)) return;

      if (el.type === 'checkbox') {
        formData[el.id] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) formData['radio:' + el.name] = el.value;
      } else {
        formData[el.id] = el.value;
      }
    });

    document.querySelectorAll('input[type="radio"][name]').forEach(function(el) {
      if (el.checked) formData['radio:' + el.name] = el.value;
    });

    return formData;
  }

  function restoreQuoteForm(formData) {
    if (!formData || typeof formData !== 'object') return;

    Object.keys(formData).forEach(function(key) {
      if (key.indexOf('radio:') === 0) {
        const name = key.slice(6);
        const value = String(formData[key]);
        const radio = document.querySelector(
          'input[type="radio"][name="' + CSS.escape(name) + '"][value="' + CSS.escape(value) + '"]'
        );
        if (radio) radio.checked = true;
        return;
      }

      const el = document.getElementById(key);
      if (!el || el.readOnly) return;

      if (el.type === 'checkbox') {
        el.checked = Boolean(formData[key]);
      } else {
        el.value = formData[key] == null ? '' : formData[key];
      }
    });

    calculateAll();
  }

  function generateQuoteNumber() {
    const now = new Date();
    const pad = function(value) { return String(value).padStart(2, '0'); };
    return 'Q-' +
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) + '-' +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());
  }

  function buildQuoteRecord(options) {
    options = options || {};
    let quoteNumber = document.getElementById('quoteNumber').value.trim();
    if (!quoteNumber) {
      quoteNumber = generateQuoteNumber();
      document.getElementById('quoteNumber').value = quoteNumber;
    }

    return {
      user_id: currentUser.id,
      customer_id: currentCustomerId || null,
      quote_number: quoteNumber,
      revision_root_id: options.revisionRootId || null,
      revision_number: options.revisionNumber || 1,
      revised_from_id: options.revisedFromId || null,
      quote_date: document.getElementById('quoteDate').value || null,
      customer_name: document.getElementById('customerName').value.trim(),
      customer_email: document.getElementById('customerEmail').value.trim(),
      customer_phone: document.getElementById('customerPhone').value.trim(),
      salesperson: document.getElementById('salesperson').value.trim(),
      status: document.getElementById('quoteStatus').value,
      vehicle: document.getElementById('vehicle').value.trim(),
      vin: document.getElementById('vin').value.trim(),
      notes: document.getElementById('quoteNotes').value.trim(),
      form_data: serializeQuoteForm()
    };
  }

  function getConnectedProjectReference() {
    const settings = getSupabaseSettings();
    if (!settings.url) return '';
    try { return new URL(settings.url).hostname; } catch (error) { return settings.url; }
  }

  function updateAboutDiagnostics() {
    const map = { aboutVersion: APP_CONFIG.version, aboutBuildDate: APP_CONFIG.buildDate };
    Object.keys(map).forEach(function(id){ const el=document.getElementById(id); if(el) el.textContent=map[id]; });
    const dbs=document.getElementById('aboutDatabaseStatus'); if(dbs) dbs.textContent=supabaseClient ? (currentUser ? 'Connected and authenticated' : 'Connected — not signed in') : 'Not connected';
    const user=document.getElementById('aboutSignedInUser'); if(user) user.textContent=currentUser ? (currentUser.email || currentUser.id) : 'Not signed in';
    const project=document.getElementById('aboutSupabaseProject'); if(project) project.textContent=getConnectedProjectReference() || 'Not configured';
  }

  function downloadJsonFile(filename,data){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function setBackupMessage(message,type){ const el=document.getElementById('backupMessage'); if(!el)return; el.textContent=message||''; el.className='database-message'+(type?' '+type:''); }

  async function exportDatabaseQuotes(){
    if(!(await ensureDatabaseReady())){ showTab('aboutTab'); setBackupMessage('Connect and sign in before exporting quotes.','error'); return; }
    setBackupMessage('Preparing quote export…','');
    const result=await supabaseClient.from('quotes').select('*').order('updated_at',{ascending:false});
    if(result.error){ setBackupMessage(result.error.message,'error'); showToast('Database export failed.','error'); return; }
    const stamp=new Date().toISOString().slice(0,10);
    downloadJsonFile('bmw-quote-pro-quotes-'+stamp+'.json',{app:APP_CONFIG.appName,version:APP_CONFIG.version,exported_at:new Date().toISOString(),user:currentUser?currentUser.email:null,project:getConnectedProjectReference(),quotes:result.data||[]});
    setBackupMessage((result.data||[]).length+' quote(s) exported.','success'); showToast('Saved quotes exported.','success');
  }

  function backupApplicationSettings(){
    const settings=getSupabaseSettings();
    const backup={app:APP_CONFIG.appName,version:APP_CONFIG.version,backed_up_at:new Date().toISOString(),supabase:{url:settings.url,publishable_key:settings.key},presets:getPresetStorage(),display:{displayLease:document.getElementById('displayLease').checked,displayRetail:document.getElementById('displayRetail').checked,displaySelect:document.getElementById('displaySelect').checked,showLeaseDetails:document.getElementById('showLeaseDetails').checked,showRetailRate:document.getElementById('showRetailRate').checked,showSelectDetails:document.getElementById('showSelectDetails').checked}};
    const stamp=new Date().toISOString().slice(0,10); downloadJsonFile('bmw-quote-pro-settings-'+stamp+'.json',backup); setBackupMessage('Application settings backed up.','success'); showToast('Settings backup downloaded.','success');
  }

  async function ensureDatabaseReady() {
    if (!supabaseClient && !initializeSupabase()) {
      showTab('savedTab');
      setDbMessage('Enter and save your Supabase connection.', 'error');
      return false;
    }

    const sessionResult = await supabaseClient.auth.getSession();
    if (sessionResult.error) {
      setDbMessage(sessionResult.error.message, 'error');
      return false;
    }

    currentUser = sessionResult.data.session ? sessionResult.data.session.user : null;
    if (!currentUser) {
      showTab('savedTab');
      setDbMessage('Sign in before saving or opening quotes.', 'error');
      return false;
    }

    return true;
  }

  async function saveQuoteToDatabase(options) {
    if (!(await ensureDatabaseReady())) return;

    calculateAll();
    setDbMessage('Saving quote…', '');

    try {
      await findOrCreateCustomer();
    } catch (error) {
      setDbMessage(error.message, 'error');
      showToast('Client record could not be saved.', 'error');
      return;
    }

    const record = buildQuoteRecord(options);
    const wasUpdating = Boolean(currentQuoteId);
    let query;

    if (currentQuoteId) {
      query = supabaseClient
        .from('quotes')
        .update(record)
        .eq('id', currentQuoteId)
        .select()
        .single();
    } else {
      query = supabaseClient
        .from('quotes')
        .insert(record)
        .select()
        .single();
    }

    const result = await query;

    if (result.error) {
      setDbMessage(result.error.message, 'error');
      showToast('Quote was not saved: ' + result.error.message, 'error');
      showTab('savedTab');
      return;
    }

    currentQuoteId = result.data.id;
    showCurrentRecord(result.data);

    const confirmation =
      (wasUpdating ? 'Quote updated: ' : 'Quote saved: ') +
      (result.data.quote_number || record.quote_number);

    setDbMessage(confirmation, 'success');
    showToast(confirmation, 'success');
    await loadSavedQuotes();
  }

  function showCurrentRecord(record) {
    const banner = document.getElementById('currentRecordBanner');
    if (!record || !record.id) {
      banner.classList.remove('visible');
      banner.textContent = '';
      return;
    }

    banner.textContent =
      'Editing saved quote ' + (record.quote_number || '') +
      ' — changes will update this record.';
    banner.classList.add('visible');
  }

  async function loadSavedQuotes() {
    if (!(await ensureDatabaseReady())) return;

    setDbMessage('Loading quotes…', '');
    const result = await supabaseClient
      .from('quotes')
      .select('id,quote_number,quote_date,customer_name,vehicle,vin,status,updated_at,created_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (result.error) {
      setDbMessage(result.error.message, 'error');
      return;
    }

    renderSavedQuotes(result.data || []);
    setDbMessage((result.data || []).length + ' quote(s) loaded.', 'success');
  }

  function cleanSearchTerm(value) {
    return value.replace(/[%(),]/g, ' ').trim();
  }

  async function searchSavedQuotes() {
    if (!(await ensureDatabaseReady())) return;

    const term = cleanSearchTerm(document.getElementById('savedQuoteSearch').value);
    const status = document.getElementById('savedStatusFilter').value;

    let query = supabaseClient
      .from('quotes')
      .select('id,quote_number,quote_date,customer_name,vehicle,vin,status,updated_at,created_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (term) {
      query = query.or(
        'customer_name.ilike.%' + term +
        '%,vin.ilike.%' + term +
        '%,quote_number.ilike.%' + term +
        '%,vehicle.ilike.%' + term + '%'
      );
    }

    if (status) query = query.eq('status', status);

    setDbMessage('Searching…', '');
    const result = await query;

    if (result.error) {
      setDbMessage(result.error.message, 'error');
      return;
    }

    renderSavedQuotes(result.data || []);
    setDbMessage((result.data || []).length + ' matching quote(s).', 'success');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatSavedDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US');
  }

  function renderSavedQuotes(rows) {
    const body = document.getElementById('savedQuotesBody');

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="8">No saved quotes found.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function(row) {
      return '<tr>' +
        '<td>' + escapeHtml(row.quote_number) + '</td>' +
        '<td>' + escapeHtml(row.quote_date || '') + '</td>' +
        '<td>' + escapeHtml(row.customer_name) + '</td>' +
        '<td>' + escapeHtml(row.vehicle) + '</td>' +
        '<td>' + escapeHtml(row.vin) + '</td>' +
        '<td><span class="status-pill ' + escapeHtml(row.status) + '">' +
          escapeHtml(row.status) + '</span></td>' +
        '<td>' + escapeHtml(formatSavedDate(row.updated_at || row.created_at)) + '</td>' +
        '<td><div class="table-actions">' +
          '<button type="button" class="btn-primary" onclick="openSavedQuote(\'' + row.id + '\')">Open</button>' +
          '<button type="button" class="btn-secondary" onclick="duplicateSavedQuote(\'' + row.id + '\')">Copy</button>' +
          '<button type="button" class="danger-button" onclick="deleteSavedQuote(\'' + row.id + '\')">Delete</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  async function fetchFullQuote(id) {
    const result = await supabaseClient
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (result.error) throw result.error;
    return result.data;
  }

  async function openSavedQuote(id) {
    if (!(await ensureDatabaseReady())) return;

    try {
      setDbMessage('Opening quote…', '');
      const record = await fetchFullQuote(id);
      currentQuoteId = record.id;
      restoreQuoteForm(record.form_data);
      currentCustomerId = record.customer_id || null;
      document.getElementById('customerIdDisplay').value = record.customer_id || '';
      document.getElementById('customerEmail').value = record.customer_email || '';
      document.getElementById('customerPhone').value = record.customer_phone || '';
      document.getElementById('quoteNotes').value = record.notes || '';
      showCurrentRecord(record);
      prepareEmailFromCurrentQuote();
      showTab('setupTab');
      setDbMessage('Quote opened.', 'success');
    } catch (error) {
      setDbMessage(error.message, 'error');
    }
  }

  async function duplicateSavedQuote(id) {
    if (!(await ensureDatabaseReady())) return;

    try {
      setDbMessage('Duplicating quote…', '');
      const record = await fetchFullQuote(id);
      restoreQuoteForm(record.form_data);
      currentQuoteId = null;
      document.getElementById('quoteNumber').value = generateQuoteNumber();
      document.getElementById('quoteDate').value =
        new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
          .toISOString().slice(0, 10);
      document.getElementById('quoteStatus').value = 'Quoted';
      document.getElementById('quoteNotes').value =
        record.notes ? record.notes + '\n\nDuplicated from ' + record.quote_number : '';
      showCurrentRecord(null);
      showTab('setupTab');
      calculateAll();
      setDbMessage('Copy created. Adjust it, then click Save Quote.', 'success');
    } catch (error) {
      setDbMessage(error.message, 'error');
    }
  }

  function duplicateCurrentQuote() {
    currentQuoteId = null;
    document.getElementById('quoteNumber').value = generateQuoteNumber();
    document.getElementById('quoteDate').value =
      new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
    document.getElementById('quoteStatus').value = 'Quoted';
    showCurrentRecord(null);
    calculateAll();
  }

  async function deleteSavedQuote(id) {
    if (!(await ensureDatabaseReady())) return;
    if (!window.confirm('Delete this saved quote? This cannot be undone.')) return;

    const result = await supabaseClient
      .from('quotes')
      .delete()
      .eq('id', id);

    if (result.error) {
      setDbMessage(result.error.message, 'error');
      return;
    }

    if (currentQuoteId === id) {
      currentQuoteId = null;
      showCurrentRecord(null);
    }

    setDbMessage('Quote deleted.', 'success');
    await loadSavedQuotes();
  }
