
function emailCurrentQuote() {
  try {
    calculateAll();
    prepareEmailFromCurrentQuote();

    const email = document.getElementById('customerEmail').value.trim();
    const quoteNumber = document.getElementById('quoteNumber').value.trim();

    if (!email) {
      setEmailStatus(
        'Enter the customer email address in Deal Setup before emailing the quote.',
        'error'
      );
      showToast('Customer email address is missing.', 'error');
    }

    document.getElementById('emailQuoteReference').textContent =
      quoteNumber || 'Unsaved quote';

    showTab('emailTab');
  } catch (error) {
    console.error('Unable to prepare email quote:', error);
    if (typeof showToast === 'function') {
      showToast(error.message || 'Unable to prepare the email quote.', 'error');
    }
  }
}

const EMAIL_TEMPLATES = {
  initial:
`Hi {firstName},

Thank you for taking the time to speak with me. I have included the BMW quote we discussed.

Please let me know if you have any questions or would like me to review another option with you.

Thank you,

{salesperson}`,
  revised:
`Hi {firstName},

Per our conversation, I updated the numbers and included the revised quote below.

Please let me know what you think or if you would like me to make any additional changes.

Thank you,

{salesperson}`,
  lease:
`Hi {firstName},

Here is the lease proposal we discussed. Please review the payment, term, mileage, and amount due up front.

I am happy to answer any questions or review another structure with you.

Thank you,

{salesperson}`,
  finance:
`Hi {firstName},

Here is the finance proposal we discussed. I included the payment, term, rate, and total due up front.

Please let me know if you would like to review another term or payment option.

Thank you,

{salesperson}`,
  cash:
`Hi {firstName},

Here is the cash purchase proposal we discussed.

Please let me know if you have any questions or would like me to reserve the vehicle.

Thank you,

{salesperson}`,
  followup:
`Hi {firstName},

I wanted to follow up regarding the BMW quote we discussed. Please let me know if you have any questions or if there is anything I can adjust for you.

Thank you,

{salesperson}`
};

function emailMergeData() {
  const name = document.getElementById('customerName').value.trim();
  return {
    firstName: name ? name.split(/\s+/)[0] : '',
    customerName: name,
    salesperson: document.getElementById('salesperson').value.trim() || 'Brian Macey',
    vehicle: document.getElementById('vehicle').value.trim(),
    quoteNumber: document.getElementById('quoteNumber').value.trim()
  };
}

function mergeEmailTemplate(text) {
  const data = emailMergeData();
  return text.replace(/\{(\w+)\}/g, function(match, key) {
    return data[key] || '';
  });
}

function applyEmailTemplate() {
  const key = document.getElementById('emailTemplate').value;
  if (!key || !EMAIL_TEMPLATES[key]) return;
  document.getElementById('emailMessage').value =
    mergeEmailTemplate(EMAIL_TEMPLATES[key]);
}

function prepareEmailFromCurrentQuote() {
  document.getElementById('emailTo').value =
    document.getElementById('customerEmail').value.trim();

  const vehicle = document.getElementById('vehicle').value.trim();
  document.getElementById('emailSubject').value =
    vehicle ? 'Your BMW Quote — ' + vehicle : 'Your BMW Quote';

  document.getElementById('emailQuoteReference').textContent =
    document.getElementById('quoteNumber').value.trim() || 'Unsaved quote';

  if (!document.getElementById('emailMessage').value.trim()) {
    document.getElementById('emailTemplate').value = 'initial';
    applyEmailTemplate();
  }
}

function prepareEmailForCustomer(customer, quote) {
  if (customer) {
    document.getElementById('emailTo').value = customer.email || '';
  }
  if (quote) {
    document.getElementById('emailQuoteReference').textContent =
      quote.quote_number || quote.id;
  }
}

function buildQuoteEmailSummary() {
  calculateAll();

  const lines = [
    '',
    'QUOTE SUMMARY',
    'Customer: ' + document.getElementById('customerName').value.trim(),
    'Vehicle: ' + document.getElementById('vehicle').value.trim(),
    'Quote Number: ' + document.getElementById('quoteNumber').value.trim()
  ];

  if (document.getElementById('displayLease').checked) {
    lines.push('Lease Payment: ' +
      document.getElementById('quoteLeasePayment').textContent);
    lines.push('Lease Total Due Up Front: ' +
      document.getElementById('quoteLeaseDue').textContent);
  }

  if (document.getElementById('displayRetail').checked) {
    lines.push(
      (document.getElementById('cashPurchase').checked
        ? 'Total Cash Due: '
        : 'Finance Payment: ') +
      document.getElementById('quoteRetailPayment').textContent
    );
  }

  if (document.getElementById('displaySelect').checked) {
    lines.push('BMW Select Payment: ' +
      document.getElementById('quoteSelectPayment').textContent);
  }

  lines.push('', 'This quote is an estimate and is subject to final approval and program availability.');
  return lines.join('\n');
}

function getComposedEmailBody() {
  let body = document.getElementById('emailMessage').value.trim();

  if (document.getElementById('includeQuoteSummary').checked) {
    body += '\n\n' + buildQuoteEmailSummary();
  }

  return body;
}

async function copyEmailText() {
  const body = getComposedEmailBody();
  await navigator.clipboard.writeText(body);
  setEmailStatus('Email message copied.', 'success');
  showToast('Email copied.', 'success');
}

function getEmailComposeValues() {
  return {
    to: document.getElementById('emailTo').value.trim(),
    subject: document.getElementById('emailSubject').value.trim(),
    body: getComposedEmailBody()
  };
}

function validateEmailComposer(values) {
  if (!values.to) {
    setEmailStatus('Enter the customer email address first.', 'error');
    showToast('Customer email address is missing.', 'error');
    return false;
  }

  return true;
}

function openEmailApplication() {
  try {
    const values = getEmailComposeValues();
    if (!validateEmailComposer(values)) return;

    const url = 'mailto:' + encodeURIComponent(values.to) +
      '?subject=' + encodeURIComponent(values.subject) +
      '&body=' + encodeURIComponent(values.body);

    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setEmailStatus(
      'The message was sent to your computer’s default email application. If nothing opened, use Open Gmail.',
      'success'
    );
  } catch (error) {
    setEmailStatus(error.message, 'error');
    showToast('Unable to open the email application.', 'error');
  }
}

function openGmailComposer() {
  try {
    const values = getEmailComposeValues();
    if (!validateEmailComposer(values)) return;

    const url =
      'https://mail.google.com/mail/?view=cm&fs=1' +
      '&to=' + encodeURIComponent(values.to) +
      '&su=' + encodeURIComponent(values.subject) +
      '&body=' + encodeURIComponent(values.body);

    const popup = window.open(url, '_blank', 'noopener,noreferrer');

    if (!popup) {
      setEmailStatus(
        'Your browser blocked the Gmail window. Allow pop-ups for this site and try again.',
        'error'
      );
      showToast('Gmail pop-up was blocked.', 'error');
      return;
    }

    setEmailStatus('Gmail opened in a new browser tab.', 'success');
  } catch (error) {
    setEmailStatus(error.message, 'error');
    showToast('Unable to open Gmail.', 'error');
  }
}

function setEmailStatus(message, type) {
  const element = document.getElementById('emailMessageStatus');
  element.textContent = message || '';
  element.className = 'database-message' + (type ? ' ' + type : '');
}

async function recordEmailAsSent() {
  if (!(await ensureDatabaseReady())) return;

  const payload = {
    user_id: currentUser.id,
    customer_id: currentCustomerId,
    quote_id: currentQuoteId,
    recipient_email: document.getElementById('emailTo').value.trim(),
    subject: document.getElementById('emailSubject').value.trim(),
    body: getComposedEmailBody(),
    communication_type: 'email',
    status: 'sent'
  };

  const result = await supabaseClient
    .from('communications')
    .insert(payload)
    .select()
    .single();

  if (result.error) {
    setEmailStatus(result.error.message, 'error');
    showToast('Email history was not saved.', 'error');
    return;
  }

  setEmailStatus('Email recorded in customer history.', 'success');
  showToast('Email recorded.', 'success');
  loadEmailHistory();
}

async function loadEmailHistory() {
  if (!(await ensureDatabaseReady())) return;

  let query = supabaseClient
    .from('communications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (currentCustomerId) query = query.eq('customer_id', currentCustomerId);
  else if (currentQuoteId) query = query.eq('quote_id', currentQuoteId);

  const result = await query;
  const container = document.getElementById('emailHistory');

  if (result.error) {
    container.innerHTML =
      '<div class="empty-state">' + escapeHtml(result.error.message) + '</div>';
    return;
  }

  if (!result.data || !result.data.length) {
    container.innerHTML =
      '<div class="empty-state">No recorded emails for this client or quote.</div>';
    return;
  }

  container.innerHTML = result.data.map(function(item) {
    return '<div class="email-history-row">' +
      '<strong>' + escapeHtml(item.subject || 'Email') + '</strong>' +
      '<span>' + escapeHtml(item.recipient_email || '') + '</span>' +
      '<span>' + escapeHtml(formatSavedDate(item.created_at)) + '</span>' +
      '<span class="status-pill Quoted">' + escapeHtml(item.status || '') + '</span>' +
    '</div>';
  }).join('');
}
