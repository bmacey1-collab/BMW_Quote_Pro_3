const V3_CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

let v3Scenarios = [];
let v3NextScenarioId = 1;

function v3Number(id) {
  const element = document.getElementById(id);
  if (!element || element.value === '') return 0;
  const value = Number(element.value);
  return Number.isFinite(value) ? value : 0;
}

function v3Raw(id) {
  const element = document.getElementById(id);
  return element ? element.value : '';
}

function v3Money(value) {
  return V3_CURRENCY.format(Number.isFinite(value) ? value : 0);
}

function v3MonthlyPayment(principal, apr, months) {
  if (months <= 0) return NaN;
  const monthlyRate = apr / 100 / 12;
  if (monthlyRate === 0) return principal / months;
  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}

function getV3Deal(overrides) {
  overrides = overrides || {};
  const allowance = overrides.tradeAllowance ?? v3Number('v3TradeAllowance');
  const payoff = v3Number('v3TradePayoff');
  const equity = allowance - payoff;
  const equityMethod = v3Raw('v3EquityMethod');
  let cashBack = 0;
  let capEquity = Math.max(0, equity);

  if (equityMethod === 'cashback') {
    cashBack = Math.max(0, equity);
    capEquity = 0;
  } else if (equityMethod === 'split') {
    cashBack = Math.min(Math.max(0, v3Number('v3EquityCashBack')), Math.max(0, equity));
    capEquity = Math.max(0, equity - cashBack);
  }

  return {
    msrp: v3Number('v3Msrp'),
    sellingPrice: overrides.sellingPrice ?? v3Number('v3SellingPrice'),
    taxRate: v3Raw('v3TaxRate') === '' ? null : v3Number('v3TaxRate'),
    fees: v3Number('v3Fees'),
    cashDown: overrides.cashDown ?? v3Number('v3CashDown'),
    tradeAllowance: allowance,
    tradePayoff: payoff,
    tradeEquity: equity,
    capEquity,
    cashBack,
    vehicleCost: v3Number('v3VehicleCost'),
    pack: v3Number('v3Pack'),
    tradeAcv: v3Number('v3TradeAcv')
  };
}

function validateScenario(scenario, deal) {
  const missing = [];
  if (!deal.msrp) missing.push('MSRP');
  if (!deal.sellingPrice) missing.push('selling price');
  if (deal.taxRate === null) missing.push('sales tax (enter 0 if applicable)');

  if (scenario.type === 'lease') {
    if (!scenario.term) missing.push('lease term');
    if (!scenario.miles) missing.push('annual mileage');
    if (scenario.residual === '' || scenario.residual === null) missing.push('residual');
    if (scenario.moneyFactor === '' || scenario.moneyFactor === null) missing.push('money factor');
  }

  if (scenario.type === 'finance') {
    if (!scenario.term) missing.push('finance term');
    if (scenario.apr === '' || scenario.apr === null) missing.push('APR');
  }

  if (scenario.type === 'select') {
    if (!scenario.term) missing.push('Select term');
    if (scenario.apr === '' || scenario.apr === null) missing.push('APR');
    if (scenario.balloon === '' || scenario.balloon === null) missing.push('balloon percentage');
  }

  return missing;
}

function calculateV3Scenario(scenario, dealOverrides) {
  const deal = getV3Deal(dealOverrides);
  const missing = validateScenario(scenario, deal);
  if (missing.length) {
    return { ready: false, missing, payment: NaN, deal };
  }

  const price = deal.sellingPrice + scenario.priceAdjustment - scenario.incentives;
  const cash = Math.max(0, deal.cashDown + scenario.cashAdjustment);
  const tradeAllowance = deal.tradeAllowance + scenario.tradeAdjustment;
  const adjustedDeal = getV3Deal({
    sellingPrice: deal.sellingPrice,
    cashDown: cash,
    tradeAllowance
  });
  const taxRate = adjustedDeal.taxRate / 100;

  if (scenario.type === 'lease') {
    const residualValue = deal.msrp * (scenario.residual / 100);
    const capReduction = Math.max(0, adjustedDeal.capEquity) + cash;
    const adjustedCap = price + deal.fees + Math.max(0, -adjustedDeal.tradeEquity) - capReduction;
    const depreciation = (adjustedCap - residualValue) / scenario.term;
    const rent = (adjustedCap + residualValue) * scenario.moneyFactor;
    const payment = (depreciation + rent) * (1 + taxRate);
    const upfrontTax = cash * taxRate; // Trade equity is intentionally not taxed.
    const dueUpfront = payment + cash + upfrontTax;
    return {
      ready: true,
      payment,
      dueUpfront,
      residualValue,
      amountFinanced: adjustedCap,
      finalPayment: residualValue,
      deal: adjustedDeal
    };
  }

  const taxablePrice = Math.max(0, price - Math.max(0, tradeAllowance));
  const salesTax = taxablePrice * taxRate;
  const principal = price + salesTax + deal.fees + deal.tradePayoff - tradeAllowance - cash;

  if (scenario.type === 'cash') {
    return {
      ready: true,
      payment: Math.max(0, principal),
      dueUpfront: Math.max(0, principal),
      amountFinanced: 0,
      deal: adjustedDeal
    };
  }

  if (scenario.type === 'finance') {
    return {
      ready: true,
      payment: v3MonthlyPayment(principal, scenario.apr, scenario.term),
      dueUpfront: cash,
      amountFinanced: principal,
      deal: adjustedDeal
    };
  }

  const balloonValue = deal.msrp * (scenario.balloon / 100);
  const rate = scenario.apr / 100 / 12;
  let payment;
  if (rate === 0) {
    payment = (principal - balloonValue) / scenario.term;
  } else {
    payment = (principal - balloonValue / Math.pow(1 + rate, scenario.term)) *
      rate / (1 - Math.pow(1 + rate, -scenario.term));
  }
  return {
    ready: true,
    payment,
    dueUpfront: cash,
    amountFinanced: principal,
    finalPayment: balloonValue,
    deal: adjustedDeal
  };
}

function defaultScenario(type) {
  const defaults = {
    lease: {
      name: 'Lease 10K', type: 'lease', term: 36, miles: 10000,
      residual: '', moneyFactor: '', apr: '', balloon: ''
    },
    finance: {
      name: 'Finance 60', type: 'finance', term: 60, miles: '',
      residual: '', moneyFactor: '', apr: '', balloon: ''
    },
    cash: {
      name: 'Cash Purchase', type: 'cash', term: 1, miles: '',
      residual: '', moneyFactor: '', apr: 0, balloon: ''
    },
    select: {
      name: 'BMW Select 60', type: 'select', term: 60, miles: '',
      residual: '', moneyFactor: '', apr: '', balloon: ''
    }
  };
  return Object.assign({
    id: v3NextScenarioId++,
    selected: false,
    priceAdjustment: 0,
    cashAdjustment: 0,
    tradeAdjustment: 0,
    incentives: 0
  }, defaults[type]);
}

function initializeV3Scenarios() {
  v3Scenarios = [
    defaultScenario('lease'),
    defaultScenario('finance'),
    defaultScenario('select')
  ];
  v3Scenarios[0].selected = true;
  v3Scenarios[1].selected = true;
  v3Scenarios[2].selected = true;
  renderV3Scenarios();
  updateV3DealReadouts();
}

function renderV3Scenarios() {
  const grid = document.getElementById('scenarioPreviewGrid');
  if (!grid) return;

  grid.innerHTML = v3Scenarios.map(function(scenario) {
    const result = calculateV3Scenario(scenario);
    const typeLabel = {
      lease: 'Lease',
      finance: 'Finance',
      cash: 'Cash Purchase',
      select: 'BMW Select'
    }[scenario.type];

    const paymentLabel = scenario.type === 'cash' ? 'TOTAL CASH DUE' : 'PER MONTH';
    const resultText = result.ready ? v3Money(result.payment) : 'Incomplete';
    const status = result.ready
      ? '<span class="scenario-status ready">Ready</span>'
      : '<span class="scenario-status missing">Missing: ' +
        result.missing.join(', ') + '</span>';

    const currentPayment = v3Number('v3CurrentPayment');
    let comparison = '';
    if (result.ready && currentPayment > 0 && scenario.type !== 'cash' &&
        document.getElementById('v3ShowPaymentComparison').checked) {
      const difference = result.payment - currentPayment;
      comparison = '<div class="payment-comparison-text">' +
        (difference <= 0 ? 'Payment reduction ' : 'Payment increase ') +
        v3Money(Math.abs(difference)) + '</div>';
    }

    return '<article class="scenario-preview-card ' + scenario.type +
      (scenario.selected ? ' selected' : '') + '">' +
      '<div class="scenario-type">' + typeLabel + '</div>' +
      '<div class="scenario-card-body">' +
        '<label class="present-checkbox"><input type="checkbox" ' +
          (scenario.selected ? 'checked ' : '') +
          'onchange="toggleScenarioSelection(' + scenario.id + ', this.checked)" /> Present</label>' +
        '<h3>' + escapeHtml(scenario.name) + '</h3>' +
        '<div class="scenario-payment">' + resultText + '</div>' +
        '<div class="scenario-payment-label">' + paymentLabel + '</div>' +
        comparison +
        '<p>' + scenarioSummary(scenario, result) + '</p>' +
        status +
        '<div class="scenario-card-actions">' +
          '<button type="button" onclick="editScenario(' + scenario.id + ')">Edit</button>' +
          '<button type="button" onclick="duplicateScenario(' + scenario.id + ')">Duplicate</button>' +
          '<button type="button" onclick="renameScenario(' + scenario.id + ')">Rename</button>' +
          '<button type="button" class="danger-button" onclick="deleteScenario(' + scenario.id + ')">Delete</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }).join('');

  const selectedCount = v3Scenarios.filter(function(s) { return s.selected; }).length;
  document.getElementById('scenarioSelectionCount').textContent =
    selectedCount + ' of 3 selected';

  const roller = document.getElementById('rollerScenario');
  const currentValue = roller.value;
  roller.innerHTML = v3Scenarios
    .filter(function(s) { return s.type !== 'cash'; })
    .map(function(s) {
      return '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
    }).join('');
  if (v3Scenarios.some(function(s) { return String(s.id) === currentValue; })) {
    roller.value = currentValue;
  }

  updateManagerWorksheet();
}

function scenarioSummary(scenario, result) {
  if (scenario.type === 'lease') {
    return scenario.term + ' months · ' +
      Number(scenario.miles || 0).toLocaleString('en-US') + ' miles · Residual ' +
      (scenario.residual === '' ? '—' : scenario.residual + '%') +
      ' · MF ' + (scenario.moneyFactor === '' ? '—' : scenario.moneyFactor);
  }
  if (scenario.type === 'finance') {
    return scenario.term + ' months · APR ' +
      (scenario.apr === '' ? '—' : scenario.apr + '%');
  }
  if (scenario.type === 'select') {
    return scenario.term + ' months · APR ' +
      (scenario.apr === '' ? '—' : scenario.apr + '%') +
      ' · Balloon ' + (scenario.balloon === '' ? '—' : scenario.balloon + '%');
  }
  return 'Cash purchase · Tax ' +
    (v3Raw('v3TaxRate') === '' ? '—' : v3Raw('v3TaxRate') + '%');
}

function openScenarioEditor(type) {
  if (v3Scenarios.length >= 6) {
    showToast('A deal can contain up to six scenarios.', 'error');
    return;
  }
  const scenario = defaultScenario(type || 'lease');
  scenario.id = '';
  fillScenarioEditor(scenario);
  document.getElementById('scenarioEditorHeading').textContent = 'Add Scenario';
  document.getElementById('scenarioEditor').showModal();
}

function editScenario(id) {
  const scenario = v3Scenarios.find(function(s) { return s.id === id; });
  if (!scenario) return;
  fillScenarioEditor(scenario);
  document.getElementById('scenarioEditorHeading').textContent = 'Edit Scenario';
  document.getElementById('scenarioEditor').showModal();
}

function fillScenarioEditor(scenario) {
  document.getElementById('scenarioEditId').value = scenario.id || '';
  document.getElementById('scenarioName').value = scenario.name || '';
  document.getElementById('scenarioType').value = scenario.type || 'lease';
  document.getElementById('scenarioTerm').value = scenario.term || '';
  document.getElementById('scenarioMiles').value = scenario.miles || '';
  document.getElementById('scenarioResidual').value = scenario.residual;
  document.getElementById('scenarioMoneyFactor').value = scenario.moneyFactor;
  document.getElementById('scenarioApr').value = scenario.apr;
  document.getElementById('scenarioBalloon').value = scenario.balloon;
  document.getElementById('scenarioPriceAdjustment').value = scenario.priceAdjustment || 0;
  document.getElementById('scenarioCashAdjustment').value = scenario.cashAdjustment || 0;
  document.getElementById('scenarioTradeAdjustment').value = scenario.tradeAdjustment || 0;
  document.getElementById('scenarioIncentives').value = scenario.incentives || 0;
  document.getElementById('scenarioValidationMessage').textContent = '';
  updateScenarioEditorFields();
}

function closeScenarioEditor() {
  document.getElementById('scenarioEditor').close();
}

function updateScenarioEditorFields() {
  const type = document.getElementById('scenarioType').value;
  document.querySelectorAll('.lease-only').forEach(function(el) {
    el.classList.toggle('hidden', type !== 'lease');
  });
  document.querySelectorAll('.finance-rate').forEach(function(el) {
    el.classList.toggle('hidden', !['finance', 'select'].includes(type));
  });
  document.querySelectorAll('.select-only').forEach(function(el) {
    el.classList.toggle('hidden', type !== 'select');
  });
  document.querySelectorAll('.scenario-term-field').forEach(function(el) {
    el.classList.toggle('hidden', type === 'cash');
  });
}

function saveScenarioFromEditor() {
  const idValue = document.getElementById('scenarioEditId').value;
  const type = document.getElementById('scenarioType').value;
  const scenario = {
    id: idValue ? Number(idValue) : v3NextScenarioId++,
    name: document.getElementById('scenarioName').value.trim() || 'Scenario',
    type,
    term: type === 'cash' ? 1 : Number(document.getElementById('scenarioTerm').value || 0),
    miles: document.getElementById('scenarioMiles').value === '' ? '' :
      Number(document.getElementById('scenarioMiles').value),
    residual: document.getElementById('scenarioResidual').value === '' ? '' :
      Number(document.getElementById('scenarioResidual').value),
    moneyFactor: document.getElementById('scenarioMoneyFactor').value === '' ? '' :
      Number(document.getElementById('scenarioMoneyFactor').value),
    apr: document.getElementById('scenarioApr').value === '' ? '' :
      Number(document.getElementById('scenarioApr').value),
    balloon: document.getElementById('scenarioBalloon').value === '' ? '' :
      Number(document.getElementById('scenarioBalloon').value),
    priceAdjustment: Number(document.getElementById('scenarioPriceAdjustment').value || 0),
    cashAdjustment: Number(document.getElementById('scenarioCashAdjustment').value || 0),
    tradeAdjustment: Number(document.getElementById('scenarioTradeAdjustment').value || 0),
    incentives: Number(document.getElementById('scenarioIncentives').value || 0),
    selected: false
  };

  const validation = validateScenario(scenario, getV3Deal());
  if (validation.length) {
    document.getElementById('scenarioValidationMessage').textContent =
      'Scenario saved, but it is not ready: ' + validation.join(', ') + '.';
  }

  const existingIndex = v3Scenarios.findIndex(function(s) { return s.id === scenario.id; });
  if (existingIndex >= 0) {
    scenario.selected = v3Scenarios[existingIndex].selected;
    v3Scenarios[existingIndex] = scenario;
  } else {
    v3Scenarios.push(scenario);
  }

  closeScenarioEditor();
  renderV3Scenarios();
}

function duplicateScenario(id) {
  if (v3Scenarios.length >= 6) {
    showToast('A deal can contain up to six scenarios.', 'error');
    return;
  }
  const source = v3Scenarios.find(function(s) { return s.id === id; });
  if (!source) return;
  const duplicate = Object.assign({}, source, {
    id: v3NextScenarioId++,
    name: source.name + ' Copy',
    selected: false
  });
  v3Scenarios.push(duplicate);
  renderV3Scenarios();
}

function renameScenario(id) {
  const scenario = v3Scenarios.find(function(s) { return s.id === id; });
  if (!scenario) return;
  const nextName = window.prompt('Scenario name:', scenario.name);
  if (nextName && nextName.trim()) {
    scenario.name = nextName.trim();
    renderV3Scenarios();
  }
}

function deleteScenario(id) {
  if (v3Scenarios.length <= 1) {
    showToast('A deal must keep at least one scenario.', 'error');
    return;
  }
  const scenario = v3Scenarios.find(function(s) { return s.id === id; });
  if (!scenario) return;
  if (!window.confirm('Delete "' + scenario.name + '"?')) return;
  v3Scenarios = v3Scenarios.filter(function(s) { return s.id !== id; });
  renderV3Scenarios();
}

function toggleScenarioSelection(id, checked) {
  const scenario = v3Scenarios.find(function(s) { return s.id === id; });
  if (!scenario) return;
  const selectedCount = v3Scenarios.filter(function(s) { return s.selected; }).length;
  if (checked && selectedCount >= 3) {
    showToast('Only three scenarios can be selected for presentation.', 'error');
    renderV3Scenarios();
    return;
  }
  scenario.selected = checked;
  renderV3Scenarios();
}

function rollScenarioPayment() {
  const scenarioId = Number(document.getElementById('rollerScenario').value);
  const scenario = v3Scenarios.find(function(s) { return s.id === scenarioId; });
  const target = Number(document.getElementById('rollerTarget').value);
  const variable = document.getElementById('rollerVariable').value;
  const output = document.getElementById('rollerResult');

  if (!scenario || !target || target <= 0) {
    output.textContent = 'Choose a valid scenario and enter a target payment.';
    output.className = 'roller-result error';
    return;
  }

  const current = calculateV3Scenario(scenario);
  if (!current.ready) {
    output.textContent = 'Complete the scenario first: ' + current.missing.join(', ') + '.';
    output.className = 'roller-result error';
    return;
  }

  const baseDeal = getV3Deal();
  let low, high, direction;
  if (variable === 'sellingPrice') {
    low = 0;
    high = Math.max(baseDeal.sellingPrice * 2, 100000);
    direction = 'lower';
  } else if (variable === 'cashDown') {
    low = 0;
    high = Math.max(baseDeal.sellingPrice, 100000);
    direction = 'higher';
  } else {
    low = 0;
    high = Math.max(baseDeal.sellingPrice, 100000);
    direction = 'higher';
  }

  let best = null;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const overrides = {};
    overrides[variable] = mid;
    const result = calculateV3Scenario(scenario, overrides);
    if (!result.ready || !Number.isFinite(result.payment)) break;

    best = { value: mid, payment: result.payment };
    if (Math.abs(result.payment - target) < 0.01) break;

    if (variable === 'sellingPrice') {
      if (result.payment > target) high = mid;
      else low = mid;
    } else {
      if (result.payment > target) low = mid;
      else high = mid;
    }
  }

  if (!best) {
    output.textContent = 'A solution could not be calculated with the selected variable.';
    output.className = 'roller-result error';
    return;
  }

  const currentValue = {
    sellingPrice: baseDeal.sellingPrice,
    cashDown: baseDeal.cashDown,
    tradeAllowance: baseDeal.tradeAllowance
  }[variable];
  const difference = best.value - currentValue;
  const label = {
    sellingPrice: 'Required selling price',
    cashDown: 'Required cash up front',
    tradeAllowance: 'Required trade allowance'
  }[variable];

  output.innerHTML =
    '<strong>' + label + ': ' + v3Money(best.value) + '</strong>' +
    '<span>Change from current: ' +
      (difference >= 0 ? '+' : '−') + v3Money(Math.abs(difference)) +
      ' · Estimated payment ' + v3Money(best.payment) + '</span>';
  output.className = 'roller-result success';
}

function updateEquityControls() {
  const method = v3Raw('v3EquityMethod');
  document.getElementById('v3CashBackField').classList.toggle('hidden', method !== 'split');
  if (method === 'cashback') {
    document.getElementById('v3EquityCashBack').value =
      Math.max(0, v3Number('v3TradeAllowance') - v3Number('v3TradePayoff'));
  }
  if (method === 'cap') {
    document.getElementById('v3EquityCashBack').value = 0;
  }
  updateV3DealReadouts();
}

function updateV3DealReadouts() {
  const deal = getV3Deal();
  document.getElementById('v3TradeEquityDisplay').textContent = v3Money(deal.tradeEquity);
  document.getElementById('v3TradeGrossDisplay').textContent =
    v3Money(deal.tradeAllowance - deal.tradeAcv);
  renderV3Scenarios();
}

function toggleLegacyCalculator() {
  const legacy = document.getElementById('legacyCalculator');
  legacy.classList.toggle('hidden');
  if (!legacy.classList.contains('hidden')) {
    legacy.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function decodeV3Vin(target) {
  const vinId = target === 'trade' ? 'v3TradeVin' : 'v3Vin';
  const vin = document.getElementById(vinId).value.trim().toUpperCase();
  if (vin.length !== 17) {
    showToast('Enter a complete 17-character VIN.', 'error');
    return;
  }

  try {
    const response = await fetch(
      'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/' +
      encodeURIComponent(vin) + '?format=json'
    );
    if (!response.ok) throw new Error('VIN service did not respond.');
    const data = await response.json();
    const result = data.Results && data.Results[0];
    if (!result) throw new Error('VIN could not be decoded.');

    const year = result.ModelYear || '';
    const make = result.Make || '';
    const model = [result.Model, result.Trim].filter(Boolean).join(' ');

    if (target === 'trade') {
      document.getElementById('v3TradeVehicle').value =
        [year, make, model].filter(Boolean).join(' ');
    } else {
      document.getElementById('v3Year').value = year;
      document.getElementById('v3Make').value = make || 'BMW';
      document.getElementById('v3Model').value = model;
    }
    showToast('VIN decoded. Review the populated information.', 'success');
  } catch (error) {
    showToast(error.message || 'VIN decoding failed.', 'error');
  }
}

function updateManagerWorksheet() {
  const client = [v3Raw('v3FirstName'), v3Raw('v3LastName')].filter(Boolean).join(' ');
  const coBuyer = [v3Raw('v3CoFirstName'), v3Raw('v3CoLastName')].filter(Boolean).join(' ');
  const vehicle = [
    v3Raw('v3StockNumber') ? 'Stock ' + v3Raw('v3StockNumber') : '',
    v3Raw('v3Year'), v3Raw('v3Make'), v3Raw('v3Model'),
    v3Raw('v3Vin') ? 'VIN ' + v3Raw('v3Vin') : ''
  ].filter(Boolean).join(' · ');
  const deal = getV3Deal();
  const frontGross = deal.sellingPrice - deal.vehicleCost - deal.pack;
  const tradeGross = deal.tradeAllowance - deal.tradeAcv;

  const lease = v3Scenarios.find(function(s) { return s.type === 'lease'; });
  const finance = v3Scenarios.find(function(s) { return s.type === 'finance'; });
  const select = v3Scenarios.find(function(s) { return s.type === 'select'; });

  const wsClient = document.getElementById('wsClient');
  if (!wsClient) return;

  wsClient.textContent = 'Client: ' + (client || '—') +
    (coBuyer ? ' / Co-Buyer: ' + coBuyer : '');
  document.getElementById('wsSalesperson').textContent =
    'Salesperson: ' + (v3Raw('v3Salesperson') || '—');
  document.getElementById('wsVehicle').textContent = vehicle || '—';
  document.getElementById('wsPricing').textContent =
    'MSRP ' + v3Money(deal.msrp) + ' · Cost ' + v3Money(deal.vehicleCost) +
    ' · Selling ' + v3Money(deal.sellingPrice);
  document.getElementById('wsTrade').textContent =
    'Allowance ' + v3Money(deal.tradeAllowance) + ' · ACV ' +
    v3Money(deal.tradeAcv) + ' · Payoff ' + v3Money(deal.tradePayoff) +
    ' · Equity ' + v3Money(deal.tradeEquity) + ' · Gross ' + v3Money(tradeGross);
  document.getElementById('wsLease').textContent = lease
    ? 'Used MF ' + (lease.moneyFactor === '' ? '—' : lease.moneyFactor) +
      ' · Residual ' + (lease.residual === '' ? '—' : lease.residual + '%') +
      ' · Payment ' + (calculateV3Scenario(lease).ready ?
        v3Money(calculateV3Scenario(lease).payment) : 'Incomplete')
    : 'No lease scenario';
  document.getElementById('wsFinance').textContent = finance
    ? 'Used APR ' + (finance.apr === '' ? '—' : finance.apr + '%') +
      ' · Term ' + finance.term +
      ' · Payment ' + (calculateV3Scenario(finance).ready ?
        v3Money(calculateV3Scenario(finance).payment) : 'Incomplete')
    : 'No finance scenario';
  document.getElementById('wsSelect').textContent = select
    ? 'Used APR ' + (select.apr === '' ? '—' : select.apr + '%') +
      ' · Balloon ' + (select.balloon === '' ? '—' : select.balloon + '%') +
      ' · Payment ' + (calculateV3Scenario(select).ready ?
        v3Money(calculateV3Scenario(select).payment) : 'Incomplete')
    : 'No BMW Select scenario';
  document.getElementById('wsProfit').textContent =
    'Front ' + v3Money(frontGross) + ' · Trade ' + v3Money(tradeGross) +
    ' · Reserve share setting 70%';
  document.getElementById('wsNotes').textContent = v3Raw('v3Notes') || '—';
}

document.addEventListener('DOMContentLoaded', function() {
  initializeV3Scenarios();
  updateEquityControls();

  document.querySelectorAll(
    '#setupTab input, #setupTab select, #setupTab textarea'
  ).forEach(function(element) {
    if (element.closest('#legacyCalculator') || element.closest('#scenarioEditor')) return;
    element.addEventListener('input', updateV3DealReadouts);
    element.addEventListener('change', updateV3DealReadouts);
  });
});
