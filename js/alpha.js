const V3_CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

let v3Scenarios = [];
let v3NextScenarioId = 1;

function v3Element(id) {
  return document.getElementById(id);
}

function v3Number(id) {
  const element = v3Element(id);
  if (!element || element.value === '') return 0;
  const value = Number(element.value);
  return Number.isFinite(value) ? value : 0;
}

function v3Raw(id) {
  const element = v3Element(id);
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

function getDealerSettings() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.dealerSettingsStorageKey);
    if (raw) return JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to read dealer settings:', error);
  }

  return {
    dealershipName: 'BMW of Peabody',
    defaultTax: 6.25,
    reserveShare: 70,
    defaultSalesperson: 'Brian Macey',
    docFee: 595,
    docTreatment: 'upfront',
    regFee: 130,
    regTreatment: 'upfront',
    acqFee: 925,
    acqTreatment: 'capitalize',
    miscFee: 0,
    miscTreatment: 'capitalize',
    salespeople: ['Brian Macey'],
    disclaimer: 'Figures are estimates and remain subject to credit approval, vehicle availability, final appraisal, and current manufacturer programs.'
  };
}

function saveDealerSettings() {
  const settings = {
    dealershipName: v3Raw('dealerName').trim(),
    defaultTax: v3Number('dealerDefaultTax'),
    reserveShare: v3Number('dealerReserveShare'),
    defaultSalesperson: v3Raw('dealerDefaultSalesperson').trim(),
    docFee: v3Number('dealerDocFee'),
    docTreatment: v3Raw('dealerDocTreatment'),
    regFee: v3Number('dealerRegFee'),
    regTreatment: v3Raw('dealerRegTreatment'),
    acqFee: v3Number('dealerAcqFee'),
    acqTreatment: v3Raw('dealerAcqTreatment'),
    miscFee: v3Number('dealerMiscFee'),
    miscTreatment: v3Raw('dealerMiscTreatment'),
    salespeople: v3Raw('dealerSalespeople')
      .split(/\r?\n/)
      .map(function(name) { return name.trim(); })
      .filter(Boolean),
    disclaimer: v3Raw('dealerDisclaimer').trim()
  };

  localStorage.setItem(
    APP_CONFIG.dealerSettingsStorageKey,
    JSON.stringify(settings)
  );

  applyDealerSettingsToDeal(true);
  v3Element('dealerSettingsMessage').textContent =
    'Dealer settings saved and applied to new deal defaults.';
  v3Element('dealerSettingsMessage').className =
    'database-message success';

  if (typeof showToast === 'function') {
    showToast('Dealer settings saved.', 'success');
  }
}

function loadDealerSettingsForm() {
  const settings = getDealerSettings();
  const values = {
    dealerName: settings.dealershipName,
    dealerDefaultTax: settings.defaultTax,
    dealerReserveShare: settings.reserveShare,
    dealerDefaultSalesperson: settings.defaultSalesperson,
    dealerDocFee: settings.docFee,
    dealerDocTreatment: settings.docTreatment,
    dealerRegFee: settings.regFee,
    dealerRegTreatment: settings.regTreatment,
    dealerAcqFee: settings.acqFee,
    dealerAcqTreatment: settings.acqTreatment,
    dealerMiscFee: settings.miscFee,
    dealerMiscTreatment: settings.miscTreatment,
    dealerSalespeople: (settings.salespeople || []).join('\n'),
    dealerDisclaimer: settings.disclaimer
  };

  Object.keys(values).forEach(function(id) {
    const element = v3Element(id);
    if (element) element.value = values[id];
  });
}

function applyDealerSettingsToDeal(force) {
  const settings = getDealerSettings();

  function setDefault(id, value) {
    const element = v3Element(id);
    if (!element) return;
    if (force || element.value === '') element.value = value;
  }

  setDefault('v3TaxRate', settings.defaultTax);
  setDefault('v3DocFee', settings.docFee);
  setDefault('v3RegFee', settings.regFee);
  setDefault('v3AcqFee', settings.acqFee);
  setDefault('v3MiscFee', settings.miscFee);

  if (force || v3Raw('v3DocFeeTreatment') === '') {
    v3Element('v3DocFeeTreatment').value = settings.docTreatment;
  }
  if (force || v3Raw('v3RegFeeTreatment') === '') {
    v3Element('v3RegFeeTreatment').value = settings.regTreatment;
  }
  if (force || v3Raw('v3AcqFeeTreatment') === '') {
    v3Element('v3AcqFeeTreatment').value = settings.acqTreatment;
  }
  if (force || v3Raw('v3MiscFeeTreatment') === '') {
    v3Element('v3MiscFeeTreatment').value = settings.miscTreatment;
  }

  const salesperson = v3Element('v3Salesperson');
  if (salesperson) {
    const names = settings.salespeople && settings.salespeople.length
      ? settings.salespeople
      : [settings.defaultSalesperson || 'Brian Macey'];

    salesperson.innerHTML =
      '<option value="">Select salesperson</option>' +
      names.map(function(name) {
        return '<option>' + escapeHtml(name) + '</option>';
      }).join('');

    salesperson.value = settings.defaultSalesperson || '';
  }

  updateV3DealReadouts();
}

function getV3Fees(type) {
  const fees = [
    {
      key: 'doc',
      label: 'Document Fee',
      amount: v3Number('v3DocFee'),
      treatment: v3Raw('v3DocFeeTreatment'),
      applies: true
    },
    {
      key: 'reg',
      label: 'Registration / Title',
      amount: v3Number('v3RegFee'),
      treatment: v3Raw('v3RegFeeTreatment'),
      applies: true
    },
    {
      key: 'acq',
      label: 'Acquisition Fee',
      amount: v3Number('v3AcqFee'),
      treatment: v3Raw('v3AcqFeeTreatment'),
      applies: type === 'lease'
    },
    {
      key: 'misc',
      label: 'Miscellaneous Fee',
      amount: v3Number('v3MiscFee'),
      treatment: v3Raw('v3MiscFeeTreatment'),
      applies: true
    }
  ].filter(function(fee) {
    return fee.applies && fee.treatment !== 'none' && fee.amount > 0;
  });

  return {
    all: fees,
    capitalized: fees.filter(function(fee) {
      return fee.treatment === 'capitalize';
    }),
    upfront: fees.filter(function(fee) {
      return fee.treatment === 'upfront';
    }),
    capitalizedTotal: fees
      .filter(function(fee) { return fee.treatment === 'capitalize'; })
      .reduce(function(sum, fee) { return sum + fee.amount; }, 0),
    upfrontTotal: fees
      .filter(function(fee) { return fee.treatment === 'upfront'; })
      .reduce(function(sum, fee) { return sum + fee.amount; }, 0)
  };
}

function getV3Deal(overrides) {
  overrides = overrides || {};

  const msrp = v3Number('v3Msrp');
  const discount = overrides.discount ?? v3Number('v3Discount');
  const sellingPrice = Math.max(0, msrp - discount);
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
    cashBack = Math.min(
      Math.max(0, v3Number('v3EquityCashBack')),
      Math.max(0, equity)
    );
    capEquity = Math.max(0, equity - cashBack);
  }

  return {
    msrp,
    discount,
    sellingPrice,
    taxRate: v3Raw('v3TaxRate') === '' ? null : v3Number('v3TaxRate'),
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
  if (deal.taxRate === null) {
    missing.push('sales tax (enter 0 if applicable)');
  }

  if (scenario.type === 'lease') {
    if (!scenario.term) missing.push('lease term');
    if (!scenario.miles) missing.push('annual mileage');
    if (scenario.residual === '' || scenario.residual === null) {
      missing.push('residual');
    }
    if (scenario.moneyFactor === '' || scenario.moneyFactor === null) {
      missing.push('money factor');
    }
  }

  if (scenario.type === 'finance') {
    if (!scenario.term) missing.push('finance term');
    if (scenario.apr === '' || scenario.apr === null) missing.push('APR');
  }

  if (scenario.type === 'select') {
    if (!scenario.term) missing.push('Select term');
    if (scenario.apr === '' || scenario.apr === null) missing.push('APR');
    if (scenario.balloon === '' || scenario.balloon === null) {
      missing.push('balloon percentage');
    }
  }

  return missing;
}

function calculateV3Scenario(scenario, overrides) {
  overrides = overrides || {};
  const deal = getV3Deal(overrides);
  const missing = validateScenario(scenario, deal);

  if (missing.length) {
    return { ready: false, missing, payment: NaN, deal };
  }

  const price = Math.max(
    0,
    deal.sellingPrice + scenario.priceAdjustment - scenario.incentives
  );
  const cash = Math.max(0, deal.cashDown + scenario.cashAdjustment);
  const tradeAllowance = Math.max(
    0,
    deal.tradeAllowance + scenario.tradeAdjustment
  );
  const adjustedDeal = getV3Deal({
    discount: deal.msrp - price,
    cashDown: cash,
    tradeAllowance
  });
  const taxRate = adjustedDeal.taxRate / 100;
  const fees = getV3Fees(scenario.type);

  if (scenario.type === 'lease') {
    const residualValue = deal.msrp * (scenario.residual / 100);
    const capReduction = Math.max(0, adjustedDeal.capEquity) + cash;
    const negativeEquity = Math.max(0, -adjustedDeal.tradeEquity);

    // Matches 2.4 approach:
    // cap cost includes capitalized fees and negative equity;
    // trade equity is not taxed; cash reduction is taxed upfront.
    const adjustedCap =
      price +
      fees.capitalizedTotal +
      negativeEquity -
      capReduction;

    const depreciation =
      (adjustedCap - residualValue) / scenario.term;
    const rent =
      (adjustedCap + residualValue) * scenario.moneyFactor;
    const basePayment = depreciation + rent;
    const payment = basePayment * (1 + taxRate);

    const taxOnCashReduction = cash * taxRate;
    const dueUpfront =
      payment +
      fees.upfrontTotal +
      cash +
      taxOnCashReduction;

    return {
      ready: true,
      payment,
      dueUpfront,
      residualValue,
      amountFinanced: adjustedCap,
      finalPayment: residualValue,
      taxOnCashReduction,
      fees,
      deal: adjustedDeal
    };
  }

  // Retail/Select/Cash: tax on adjusted selling price after trade value.
  const taxablePrice = Math.max(0, price - tradeAllowance);
  const salesTax = taxablePrice * taxRate;
  const principal =
    price +
    salesTax +
    fees.capitalizedTotal +
    fees.upfrontTotal +
    adjustedDeal.tradePayoff -
    tradeAllowance -
    cash;

  if (scenario.type === 'cash') {
    const cashDue = Math.max(0, principal);
    return {
      ready: true,
      payment: cashDue,
      dueUpfront: cashDue,
      amountFinanced: 0,
      salesTax,
      fees,
      deal: adjustedDeal
    };
  }

  if (scenario.type === 'finance') {
    return {
      ready: true,
      payment: v3MonthlyPayment(principal, scenario.apr, scenario.term),
      dueUpfront: cash,
      amountFinanced: principal,
      salesTax,
      fees,
      deal: adjustedDeal
    };
  }

  const balloonValue = deal.msrp * (scenario.balloon / 100);
  const rate = scenario.apr / 100 / 12;
  let payment;

  if (rate === 0) {
    payment = (principal - balloonValue) / scenario.term;
  } else {
    payment =
      (principal -
        balloonValue / Math.pow(1 + rate, scenario.term)) *
      rate /
      (1 - Math.pow(1 + rate, -scenario.term));
  }

  return {
    ready: true,
    payment,
    dueUpfront: cash,
    amountFinanced: principal,
    finalPayment: balloonValue,
    salesTax,
    fees,
    deal: adjustedDeal
  };
}

function defaultScenario(type) {
  const defaults = {
    lease: {
      name: 'Lease 10K',
      type: 'lease',
      term: 36,
      miles: 10000,
      residual: '',
      moneyFactor: '',
      apr: '',
      balloon: ''
    },
    finance: {
      name: 'Finance 60',
      type: 'finance',
      term: 60,
      miles: '',
      residual: '',
      moneyFactor: '',
      apr: '',
      balloon: ''
    },
    cash: {
      name: 'Cash Purchase',
      type: 'cash',
      term: 1,
      miles: '',
      residual: '',
      moneyFactor: '',
      apr: 0,
      balloon: ''
    },
    select: {
      name: 'BMW Select 60',
      type: 'select',
      term: 60,
      miles: '',
      residual: '',
      moneyFactor: '',
      apr: '',
      balloon: ''
    }
  };

  return Object.assign(
    {
      id: v3NextScenarioId++,
      selected: false,
      priceAdjustment: 0,
      cashAdjustment: 0,
      tradeAdjustment: 0,
      incentives: 0,
      showRate: false,
      showResidual: false,
      showFeeDetails: true
    },
    defaults[type]
  );
}

function initializeV3Scenarios() {
  v3Scenarios = [
    defaultScenario('lease'),
    defaultScenario('finance'),
    defaultScenario('select')
  ];

  v3Scenarios.forEach(function(scenario) {
    scenario.selected = true;
  });

  renderV3Scenarios();
  updateV3DealReadouts();
}

function renderV3Scenarios() {
  const grid = v3Element('scenarioPreviewGrid');
  if (!grid) return;

  grid.innerHTML = v3Scenarios.map(function(scenario) {
    const result = calculateV3Scenario(scenario);
    const typeLabel = {
      lease: 'Lease',
      finance: 'Finance',
      cash: 'Cash Purchase',
      select: 'BMW Select'
    }[scenario.type];

    const paymentLabel =
      scenario.type === 'cash' ? 'TOTAL CASH DUE' : 'PER MONTH';

    const resultText =
      result.ready ? v3Money(result.payment) : 'Incomplete';

    const status = result.ready
      ? '<span class="scenario-status ready">Ready</span>'
      : '<span class="scenario-status missing">Missing: ' +
        result.missing.join(', ') +
        '</span>';

    const currentPayment = v3Number('v3CurrentPayment');
    let comparison = '';

    if (
      result.ready &&
      currentPayment > 0 &&
      scenario.type !== 'cash' &&
      v3Element('v3ShowPaymentComparison').checked
    ) {
      const difference = result.payment - currentPayment;
      comparison =
        '<div class="payment-comparison-text">' +
        (difference <= 0 ? 'Payment reduction ' : 'Payment increase ') +
        v3Money(Math.abs(difference)) +
        '</div>';
    }

    return (
      '<article class="scenario-preview-card ' +
      scenario.type +
      (scenario.selected ? ' selected' : '') +
      '">' +
      '<div class="scenario-type">' +
      typeLabel +
      '</div>' +
      '<div class="scenario-card-body">' +
      '<label class="present-checkbox"><input type="checkbox" ' +
      (scenario.selected ? 'checked ' : '') +
      'onchange="toggleScenarioSelection(' +
      scenario.id +
      ', this.checked)" /> Present</label>' +
      '<h3>' +
      escapeHtml(scenario.name) +
      '</h3>' +
      '<div class="scenario-payment">' +
      resultText +
      '</div>' +
      '<div class="scenario-payment-label">' +
      paymentLabel +
      '</div>' +
      comparison +
      '<p>' +
      scenarioSummary(scenario) +
      '</p>' +
      status +
      '<div class="scenario-card-actions">' +
      '<button type="button" onclick="editScenario(' +
      scenario.id +
      ')">Edit</button>' +
      '<button type="button" onclick="duplicateScenario(' +
      scenario.id +
      ')">Duplicate</button>' +
      '<button type="button" onclick="renameScenario(' +
      scenario.id +
      ')">Rename</button>' +
      '<button type="button" class="danger-button" onclick="deleteScenario(' +
      scenario.id +
      ')">Delete</button>' +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }).join('');

  const selectedCount = v3Scenarios.filter(function(s) {
    return s.selected;
  }).length;

  v3Element('scenarioSelectionCount').textContent =
    selectedCount + ' of 3 selected';

  const roller = v3Element('rollerScenario');
  const currentValue = roller.value;

  roller.innerHTML = v3Scenarios
    .filter(function(s) {
      return s.type !== 'cash';
    })
    .map(function(s) {
      return (
        '<option value="' +
        s.id +
        '">' +
        escapeHtml(s.name) +
        '</option>'
      );
    })
    .join('');

  if (
    v3Scenarios.some(function(s) {
      return String(s.id) === currentValue;
    })
  ) {
    roller.value = currentValue;
  }

  updateManagerWorksheet();
  renderCustomerPresentation();
}

function scenarioSummary(scenario) {
  if (scenario.type === 'lease') {
    return (
      scenario.term +
      ' months · ' +
      Number(scenario.miles || 0).toLocaleString('en-US') +
      ' miles · Residual ' +
      (scenario.residual === '' ? '—' : scenario.residual + '%') +
      ' · MF ' +
      (scenario.moneyFactor === '' ? '—' : scenario.moneyFactor)
    );
  }

  if (scenario.type === 'finance') {
    return (
      scenario.term +
      ' months · APR ' +
      (scenario.apr === '' ? '—' : scenario.apr + '%')
    );
  }

  if (scenario.type === 'select') {
    return (
      scenario.term +
      ' months · APR ' +
      (scenario.apr === '' ? '—' : scenario.apr + '%') +
      ' · Balloon ' +
      (scenario.balloon === '' ? '—' : scenario.balloon + '%')
    );
  }

  return (
    'Cash purchase · Tax ' +
    (v3Raw('v3TaxRate') === ''
      ? '—'
      : v3Raw('v3TaxRate') + '%')
  );
}

function openScenarioEditor(type) {
  if (v3Scenarios.length >= 6) {
    showToast('A deal can contain up to six scenarios.', 'error');
    return;
  }

  const scenario = defaultScenario(type || 'lease');
  scenario.id = '';
  fillScenarioEditor(scenario);
  v3Element('scenarioEditorHeading').textContent = 'Add Scenario';
  v3Element('scenarioEditor').showModal();
}

function editScenario(id) {
  const scenario = v3Scenarios.find(function(s) {
    return s.id === id;
  });
  if (!scenario) return;

  fillScenarioEditor(scenario);
  v3Element('scenarioEditorHeading').textContent = 'Edit Scenario';
  v3Element('scenarioEditor').showModal();
}

function fillScenarioEditor(scenario) {
  const fields = {
    scenarioEditId: scenario.id || '',
    scenarioName: scenario.name || '',
    scenarioType: scenario.type || 'lease',
    scenarioTerm: scenario.term || '',
    scenarioMiles: scenario.miles || '',
    scenarioResidual: scenario.residual,
    scenarioMoneyFactor: scenario.moneyFactor,
    scenarioApr: scenario.apr,
    scenarioBalloon: scenario.balloon,
    scenarioPriceAdjustment: scenario.priceAdjustment || 0,
    scenarioCashAdjustment: scenario.cashAdjustment || 0,
    scenarioTradeAdjustment: scenario.tradeAdjustment || 0,
    scenarioIncentives: scenario.incentives || 0
  };

  Object.keys(fields).forEach(function(id) {
    v3Element(id).value = fields[id];
  });

  v3Element('scenarioShowRate').checked = Boolean(scenario.showRate);
  v3Element('scenarioShowResidual').checked =
    Boolean(scenario.showResidual);
  v3Element('scenarioShowFeeDetails').checked =
    scenario.showFeeDetails !== false;
  v3Element('scenarioValidationMessage').textContent = '';
  updateScenarioEditorFields();
}

function closeScenarioEditor() {
  v3Element('scenarioEditor').close();
}

function updateScenarioEditorFields() {
  const type = v3Raw('scenarioType');

  document.querySelectorAll('.lease-only').forEach(function(el) {
    el.classList.toggle('hidden', type !== 'lease');
  });

  document.querySelectorAll('.finance-rate').forEach(function(el) {
    el.classList.toggle(
      'hidden',
      !['finance', 'select'].includes(type)
    );
  });

  document.querySelectorAll('.select-only').forEach(function(el) {
    el.classList.toggle('hidden', type !== 'select');
  });

  document.querySelectorAll('.scenario-term-field').forEach(function(el) {
    el.classList.toggle('hidden', type === 'cash');
  });
}

function saveScenarioFromEditor() {
  const idValue = v3Raw('scenarioEditId');
  const type = v3Raw('scenarioType');

  const scenario = {
    id: idValue ? Number(idValue) : v3NextScenarioId++,
    name: v3Raw('scenarioName').trim() || 'Scenario',
    type,
    term: type === 'cash' ? 1 : Number(v3Raw('scenarioTerm') || 0),
    miles:
      v3Raw('scenarioMiles') === ''
        ? ''
        : Number(v3Raw('scenarioMiles')),
    residual:
      v3Raw('scenarioResidual') === ''
        ? ''
        : Number(v3Raw('scenarioResidual')),
    moneyFactor:
      v3Raw('scenarioMoneyFactor') === ''
        ? ''
        : Number(v3Raw('scenarioMoneyFactor')),
    apr:
      v3Raw('scenarioApr') === ''
        ? ''
        : Number(v3Raw('scenarioApr')),
    balloon:
      v3Raw('scenarioBalloon') === ''
        ? ''
        : Number(v3Raw('scenarioBalloon')),
    priceAdjustment: Number(v3Raw('scenarioPriceAdjustment') || 0),
    cashAdjustment: Number(v3Raw('scenarioCashAdjustment') || 0),
    tradeAdjustment: Number(v3Raw('scenarioTradeAdjustment') || 0),
    incentives: Number(v3Raw('scenarioIncentives') || 0),
    showRate: v3Element('scenarioShowRate').checked,
    showResidual: v3Element('scenarioShowResidual').checked,
    showFeeDetails: v3Element('scenarioShowFeeDetails').checked,
    selected: false
  };

  const existingIndex = v3Scenarios.findIndex(function(s) {
    return s.id === scenario.id;
  });

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

  const source = v3Scenarios.find(function(s) {
    return s.id === id;
  });

  if (!source) return;

  v3Scenarios.push(
    Object.assign({}, source, {
      id: v3NextScenarioId++,
      name: source.name + ' Copy',
      selected: false
    })
  );

  renderV3Scenarios();
}

function renameScenario(id) {
  const scenario = v3Scenarios.find(function(s) {
    return s.id === id;
  });

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

  const scenario = v3Scenarios.find(function(s) {
    return s.id === id;
  });

  if (!scenario) return;
  if (!window.confirm('Delete "' + scenario.name + '"?')) return;

  v3Scenarios = v3Scenarios.filter(function(s) {
    return s.id !== id;
  });

  renderV3Scenarios();
}

function toggleScenarioSelection(id, checked) {
  const scenario = v3Scenarios.find(function(s) {
    return s.id === id;
  });

  if (!scenario) return;

  const selectedCount = v3Scenarios.filter(function(s) {
    return s.selected;
  }).length;

  if (checked && selectedCount >= 3) {
    showToast(
      'Only three scenarios can be selected for presentation.',
      'error'
    );
    renderV3Scenarios();
    return;
  }

  scenario.selected = checked;
  renderV3Scenarios();
}

function rollScenarioPayment() {
  const scenarioId = Number(v3Raw('rollerScenario'));
  const scenario = v3Scenarios.find(function(s) {
    return s.id === scenarioId;
  });
  const target = Number(v3Raw('rollerTarget'));
  const variable = v3Raw('rollerVariable');
  const output = v3Element('rollerResult');

  if (!scenario || !target || target <= 0) {
    output.textContent =
      'Choose a valid scenario and enter a target payment.';
    output.className = 'roller-result error';
    return;
  }

  const current = calculateV3Scenario(scenario);
  if (!current.ready) {
    output.textContent =
      'Complete the scenario first: ' +
      current.missing.join(', ') +
      '.';
    output.className = 'roller-result error';
    return;
  }

  const baseDeal = getV3Deal();
  let low = 0;
  let high = Math.max(baseDeal.msrp * 2, 100000);
  let best = null;

  for (let i = 0; i < 100; i += 1) {
    const mid = (low + high) / 2;
    const overrides = {};

    if (variable === 'discount') {
      overrides.discount = mid;
    } else if (variable === 'cashDown') {
      overrides.cashDown = mid;
    } else {
      overrides.tradeAllowance = mid;
    }

    const result = calculateV3Scenario(scenario, overrides);
    if (!result.ready || !Number.isFinite(result.payment)) break;

    best = { value: mid, payment: result.payment };

    if (Math.abs(result.payment - target) < 0.01) break;

    if (result.payment > target) {
      low = mid;
    } else {
      high = mid;
    }
  }

  if (!best) {
    output.textContent =
      'A solution could not be calculated with the selected variable.';
    output.className = 'roller-result error';
    return;
  }

  const currentValue = {
    discount: baseDeal.discount,
    cashDown: baseDeal.cashDown,
    tradeAllowance: baseDeal.tradeAllowance
  }[variable];

  const difference = best.value - currentValue;
  const label = {
    discount: 'Required dealer discount',
    cashDown: 'Required cash up front',
    tradeAllowance: 'Required trade allowance'
  }[variable];

  output.innerHTML =
    '<strong>' +
    label +
    ': ' +
    v3Money(best.value) +
    '</strong>' +
    '<span>Change from current: ' +
    (difference >= 0 ? '+' : '−') +
    v3Money(Math.abs(difference)) +
    ' · Estimated payment ' +
    v3Money(best.payment) +
    '</span>';

  output.className = 'roller-result success';
}

function updateEquityControls() {
  const method = v3Raw('v3EquityMethod');

  v3Element('v3CashBackField').classList.toggle(
    'hidden',
    method !== 'split'
  );

  if (method === 'cashback') {
    v3Element('v3EquityCashBack').value = Math.max(
      0,
      v3Number('v3TradeAllowance') - v3Number('v3TradePayoff')
    );
  }

  if (method === 'cap') {
    v3Element('v3EquityCashBack').value = 0;
  }

  updateV3DealReadouts();
}

function updateV3DealReadouts() {
  const deal = getV3Deal();

  v3Element('v3SellingPriceDisplay').textContent =
    v3Money(deal.sellingPrice);
  v3Element('v3TradeEquityDisplay').textContent =
    v3Money(deal.tradeEquity);
  v3Element('v3TradeGrossDisplay').textContent =
    v3Money(deal.tradeAllowance - deal.tradeAcv);

  renderV3Scenarios();
}

function toggleLegacyCalculator() {
  const legacy = v3Element('legacyCalculator');
  legacy.classList.toggle('hidden');

  if (!legacy.classList.contains('hidden')) {
    legacy.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

async function decodeV3Vin(target) {
  const vinId = target === 'trade' ? 'v3TradeVin' : 'v3Vin';
  const vin = v3Raw(vinId).trim().toUpperCase();

  if (vin.length !== 17) {
    showToast('Enter a complete 17-character VIN.', 'error');
    return;
  }

  try {
    const response = await fetch(
      'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/' +
      encodeURIComponent(vin) +
      '?format=json'
    );

    if (!response.ok) {
      throw new Error('VIN service did not respond.');
    }

    const data = await response.json();
    const result = data.Results && data.Results[0];

    if (!result) {
      throw new Error('VIN could not be decoded.');
    }

    const year = result.ModelYear || '';
    const make = result.Make || '';
    const model = [result.Model, result.Trim]
      .filter(Boolean)
      .join(' ');

    if (target === 'trade') {
      v3Element('v3TradeVehicle').value =
        [year, make, model].filter(Boolean).join(' ');
    } else {
      v3Element('v3Year').value = year;
      v3Element('v3Make').value = make || 'BMW';
      v3Element('v3Model').value = model;
    }

    showToast(
      'VIN decoded. Review the populated information.',
      'success'
    );
  } catch (error) {
    showToast(
      error.message || 'VIN decoding failed.',
      'error'
    );
  }
}

function buildFeeDetailHtml(result) {
  const rows = [];

  if (result.fees) {
    result.fees.upfront.forEach(function(fee) {
      rows.push(
        '<div><span>' +
        escapeHtml(fee.label) +
        '</span><strong>' +
        v3Money(fee.amount) +
        '</strong></div>'
      );
    });
  }

  if (result.taxOnCashReduction > 0) {
    rows.push(
      '<div><span>Tax on Cash Reduction</span><strong>' +
      v3Money(result.taxOnCashReduction) +
      '</strong></div>'
    );
  }

  return rows.join('');
}

function renderCustomerPresentation() {
  const container = v3Element('v3CustomerQuoteCards');
  const selected = v3Scenarios.filter(function(scenario) {
    return scenario.selected;
  });

  const client = [
    v3Raw('v3FirstName'),
    v3Raw('v3LastName')
  ].filter(Boolean).join(' ');

  const vehicle = [
    v3Raw('v3Year'),
    v3Raw('v3Make'),
    v3Raw('v3Model')
  ].filter(Boolean).join(' ');

  v3Element('v3CustomerHeader').innerHTML =
    '<div><strong>' +
    escapeHtml(client || 'Customer') +
    '</strong><span>' +
    escapeHtml(vehicle || 'Vehicle') +
    '</span></div>' +
    '<div><strong>MSRP ' +
    v3Money(v3Number('v3Msrp')) +
    '</strong><span>Dealer Discount ' +
    v3Money(v3Number('v3Discount')) +
    '</span></div>';

  const readyScenarios = selected.filter(function(scenario) {
    return calculateV3Scenario(scenario).ready;
  });

  if (!readyScenarios.length) {
    container.innerHTML =
      '<div class="empty-state">Select up to three ready scenarios in Deal Builder.</div>';
    return;
  }

  container.innerHTML = readyScenarios.map(function(scenario) {
    const result = calculateV3Scenario(scenario);
    const typeLabel = {
      lease: 'Lease',
      finance: 'Finance',
      cash: 'Cash Purchase',
      select: 'BMW Select'
    }[scenario.type];

    let detailRows =
      '<div><span>MSRP / Market Value</span><strong>' +
      v3Money(v3Number('v3Msrp')) +
      '</strong></div>' +
      '<div><span>Dealer Discount</span><strong>' +
      v3Money(v3Number('v3Discount') - scenario.priceAdjustment) +
      '</strong></div>' +
      '<div><span>Adjusted Price</span><strong>' +
      v3Money(result.deal.sellingPrice + scenario.priceAdjustment - scenario.incentives) +
      '</strong></div>' +
      '<div><span>Trade Allowance</span><strong>' +
      v3Money(result.deal.tradeAllowance) +
      '</strong></div>' +
      '<div><span>Trade Payoff</span><strong>' +
      v3Money(result.deal.tradePayoff) +
      '</strong></div>' +
      '<div><span>Cash Up Front</span><strong>' +
      v3Money(result.deal.cashDown) +
      '</strong></div>';

    if (scenario.showRate) {
      if (scenario.type === 'lease') {
        detailRows +=
          '<div><span>Money Factor</span><strong>' +
          scenario.moneyFactor +
          '</strong></div>';
      }

      if (['finance', 'select'].includes(scenario.type)) {
        detailRows +=
          '<div><span>APR</span><strong>' +
          scenario.apr.toFixed(2) +
          '%</strong></div>';
      }
    }

    if (scenario.showResidual) {
      if (scenario.type === 'lease') {
        detailRows +=
          '<div><span>Residual Value</span><strong>' +
          v3Money(result.residualValue) +
          '</strong></div>';
      }

      if (scenario.type === 'select') {
        detailRows +=
          '<div><span>Final Balloon Payment</span><strong>' +
          v3Money(result.finalPayment) +
          '</strong></div>';
      }
    }

    if (scenario.showFeeDetails && scenario.type === 'lease') {
      detailRows += buildFeeDetailHtml(result);
    }

    detailRows +=
      '<div class="due-up-front-total"><span>Total Due Up Front</span><strong>' +
      v3Money(result.dueUpfront) +
      '</strong></div>';

    const currentPayment = v3Number('v3CurrentPayment');
    let comparison = '';

    if (
      currentPayment > 0 &&
      scenario.type !== 'cash' &&
      v3Element('v3ShowPaymentComparison').checked
    ) {
      const difference = result.payment - currentPayment;
      comparison =
        '<div class="customer-payment-comparison">' +
        '<span>Current Payment ' +
        v3Money(currentPayment) +
        '</span>' +
        '<strong>' +
        (difference <= 0 ? 'Payment Reduction ' : 'Payment Increase ') +
        v3Money(Math.abs(difference)) +
        '</strong>' +
        '</div>';
    }

    return (
      '<article class="customer-scenario-card ' +
      scenario.type +
      '">' +
      '<div class="customer-card-title">' +
      escapeHtml(scenario.name) +
      '</div>' +
      '<div class="customer-card-payment">' +
      v3Money(result.payment) +
      '</div>' +
      '<div class="customer-card-payment-label">' +
      (scenario.type === 'cash'
        ? 'TOTAL CASH DUE'
        : 'PER MONTH') +
      '</div>' +
      comparison +
      '<div class="customer-card-body">' +
      detailRows +
      '</div>' +
      '</article>'
    );
  }).join('');

  v3Element('v3SignatureArea').classList.toggle(
    'hidden',
    !v3Element('v3ShowSignature').checked
  );
}

function printV3CustomerQuote() {
  renderCustomerPresentation();
  document.body.classList.add('print-v3-customer');

  const cleanup = function() {
    document.body.classList.remove('print-v3-customer');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
}

function printV3ManagerWorksheet() {
  updateManagerWorksheet();
  document.body.classList.add('print-v3-manager');

  const cleanup = function() {
    document.body.classList.remove('print-v3-manager');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
}

function updateManagerWorksheet() {
  const client = [
    v3Raw('v3FirstName'),
    v3Raw('v3LastName')
  ].filter(Boolean).join(' ');

  const coBuyer = [
    v3Raw('v3CoFirstName'),
    v3Raw('v3CoLastName')
  ].filter(Boolean).join(' ');

  const vehicle = [
    v3Raw('v3StockNumber')
      ? 'Stock ' + v3Raw('v3StockNumber')
      : '',
    v3Raw('v3Year'),
    v3Raw('v3Make'),
    v3Raw('v3Model'),
    v3Raw('v3Vin')
      ? 'VIN ' + v3Raw('v3Vin')
      : ''
  ].filter(Boolean).join(' · ');

  const deal = getV3Deal();
  const frontGross =
    deal.sellingPrice - deal.vehicleCost - deal.pack;
  const tradeGross =
    deal.tradeAllowance - deal.tradeAcv;
  const reserveShare = getDealerSettings().reserveShare;

  const lease = v3Scenarios.find(function(s) {
    return s.type === 'lease';
  });
  const finance = v3Scenarios.find(function(s) {
    return s.type === 'finance';
  });
  const select = v3Scenarios.find(function(s) {
    return s.type === 'select';
  });

  const wsClient = v3Element('wsClient');
  if (!wsClient) return;

  wsClient.textContent =
    'Client: ' +
    (client || '—') +
    (coBuyer ? ' / Co-Buyer: ' + coBuyer : '');

  v3Element('wsSalesperson').textContent =
    'Salesperson: ' +
    (v3Raw('v3Salesperson') || '—');

  v3Element('wsVehicle').textContent =
    vehicle || '—';

  v3Element('wsPricing').textContent =
    'MSRP ' +
    v3Money(deal.msrp) +
    ' · Discount ' +
    v3Money(deal.discount) +
    ' · Selling ' +
    v3Money(deal.sellingPrice) +
    ' · Cost ' +
    v3Money(deal.vehicleCost);

  v3Element('wsTrade').textContent =
    'Allowance ' +
    v3Money(deal.tradeAllowance) +
    ' · ACV ' +
    v3Money(deal.tradeAcv) +
    ' · Payoff ' +
    v3Money(deal.tradePayoff) +
    ' · Equity ' +
    v3Money(deal.tradeEquity) +
    ' · Gross ' +
    v3Money(tradeGross);

  v3Element('wsLease').textContent = lease
    ? 'Used MF ' +
      (lease.moneyFactor === '' ? '—' : lease.moneyFactor) +
      ' · Residual ' +
      (lease.residual === '' ? '—' : lease.residual + '%') +
      ' · Payment ' +
      (calculateV3Scenario(lease).ready
        ? v3Money(calculateV3Scenario(lease).payment)
        : 'Incomplete')
    : 'No lease scenario';

  v3Element('wsFinance').textContent = finance
    ? 'Used APR ' +
      (finance.apr === '' ? '—' : finance.apr + '%') +
      ' · Term ' +
      finance.term +
      ' · Payment ' +
      (calculateV3Scenario(finance).ready
        ? v3Money(calculateV3Scenario(finance).payment)
        : 'Incomplete')
    : 'No finance scenario';

  v3Element('wsSelect').textContent = select
    ? 'Used APR ' +
      (select.apr === '' ? '—' : select.apr + '%') +
      ' · Balloon ' +
      (select.balloon === '' ? '—' : select.balloon + '%') +
      ' · Payment ' +
      (calculateV3Scenario(select).ready
        ? v3Money(calculateV3Scenario(select).payment)
        : 'Incomplete')
    : 'No BMW Select scenario';

  v3Element('wsProfit').textContent =
    'Front ' +
    v3Money(frontGross) +
    ' · Trade ' +
    v3Money(tradeGross) +
    ' · Reserve share ' +
    reserveShare.toFixed(0) +
    '%';

  v3Element('wsNotes').textContent =
    v3Raw('v3Notes') || '—';
}

document.addEventListener('DOMContentLoaded', function() {
  loadDealerSettingsForm();
  applyDealerSettingsToDeal(false);
  initializeV3Scenarios();
  updateEquityControls();

  document.querySelectorAll(
    '#setupTab input, #setupTab select, #setupTab textarea'
  ).forEach(function(element) {
    if (
      element.closest('#legacyCalculator') ||
      element.closest('#scenarioEditor')
    ) {
      return;
    }

    element.addEventListener('input', updateV3DealReadouts);
    element.addEventListener('change', updateV3DealReadouts);
  });
});


/* ============================================================
   BMW Quote Pro 3.0 Alpha 4
   Program Center, incentives, residual adjustments, One-Pay
   ============================================================ */

let v3DealIncentives = [];
let v3Programs = [];

function mileageResidualAdjustment(miles) {
  const adjustments = {
    7500: 4,
    10000: 3,
    12000: 2,
    15000: 0
  };
  return adjustments[Number(miles)] || 0;
}

function applicableDealIncentives(type) {
  return v3DealIncentives
    .filter(function(item) {
      return item.amount > 0 &&
        (item.appliesTo === 'all' || item.appliesTo === type);
    })
    .reduce(function(sum, item) {
      return sum + Number(item.amount || 0);
    }, 0);
}

function calculateAdjustedResidual(scenario, msrp) {
  const basePercent = Number(scenario.residual || 0);
  const includedAdjustment = mileageResidualAdjustment(scenario.miles);
  const adjustedPercent = basePercent + includedAdjustment;

  const inceptionMileage = Math.max(0, Number(scenario.inceptionMileage || 0));
  const chargeableInceptionMiles = Math.max(0, inceptionMileage - 500);
  const inceptionDeduction =
    chargeableInceptionMiles * Number(scenario.inceptionCharge || 0);

  const customDeduction =
    Math.max(0, Number(scenario.customMiles || 0)) *
    Number(scenario.customMileageCharge || 0);

  const residualBeforeMileageDeductions =
    Number(msrp || 0) * adjustedPercent / 100;
  const residualValue = Math.max(
    0,
    residualBeforeMileageDeductions -
      inceptionDeduction -
      customDeduction
  );

  return {
    basePercent,
    includedAdjustment,
    adjustedPercent,
    inceptionDeduction,
    customDeduction,
    residualValue
  };
}

function getProgramRecords() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.programStorageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Unable to read program records:', error);
    return [];
  }
}

function saveProgramRecords(records) {
  localStorage.setItem(
    APP_CONFIG.programStorageKey,
    JSON.stringify(records)
  );
}

function getDealIncentives() {
  try {
    const raw = sessionStorage.getItem(APP_CONFIG.dealIncentiveStorageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function saveDealIncentives() {
  sessionStorage.setItem(
    APP_CONFIG.dealIncentiveStorageKey,
    JSON.stringify(v3DealIncentives)
  );
}

function newIncentiveRecord(overrides) {
  return Object.assign({
    id: Date.now() + Math.floor(Math.random() * 10000),
    name: '',
    amount: 0,
    appliesTo: 'all',
    category: 'customer',
    programCode: ''
  }, overrides || {});
}

function addDealIncentiveRow(incentive) {
  v3DealIncentives.push(incentive || newIncentiveRecord());
  saveDealIncentives();
  renderDealIncentiveRows();
  renderV3Scenarios();
}

function updateDealIncentive(id, field, value) {
  const item = v3DealIncentives.find(function(row) {
    return row.id === id;
  });
  if (!item) return;
  item[field] = field === 'amount' ? Number(value || 0) : value;
  saveDealIncentives();
  renderDealIncentiveRows();
  renderV3Scenarios();
}

function removeDealIncentive(id) {
  v3DealIncentives = v3DealIncentives.filter(function(row) {
    return row.id !== id;
  });
  saveDealIncentives();
  renderDealIncentiveRows();
  renderV3Scenarios();
}

function incentiveRowHtml(item, prefix, updateFunction, removeFunction) {
  return '<div class="incentive-row">' +
    '<input type="text" placeholder="Incentive name" value="' +
      escapeHtml(item.name || '') + '" onchange="' +
      updateFunction + '(' + item.id + ', \'name\', this.value)" />' +
    '<input type="number" min="0" step=".01" placeholder="Amount" value="' +
      Number(item.amount || 0) + '" onchange="' +
      updateFunction + '(' + item.id + ', \'amount\', this.value)" />' +
    '<select onchange="' + updateFunction +
      '(' + item.id + ', \'appliesTo\', this.value)">' +
      ['all','lease','finance','cash','select'].map(function(value) {
        const labels = {
          all:'All Types', lease:'Lease', finance:'Finance',
          cash:'Cash', select:'BMW Select'
        };
        return '<option value="' + value + '"' +
          (item.appliesTo === value ? ' selected' : '') + '>' +
          labels[value] + '</option>';
      }).join('') +
    '</select>' +
    '<select onchange="' + updateFunction +
      '(' + item.id + ', \'category\', this.value)">' +
      ['customer','dealer','rate'].map(function(value) {
        const labels = {
          customer:'Customer Incentive',
          dealer:'Dealer Contribution',
          rate:'Rate / APR Credit'
        };
        return '<option value="' + value + '"' +
          (item.category === value ? ' selected' : '') + '>' +
          labels[value] + '</option>';
      }).join('') +
    '</select>' +
    '<input type="text" placeholder="Program code" value="' +
      escapeHtml(item.programCode || '') + '" onchange="' +
      updateFunction + '(' + item.id + ', \'programCode\', this.value)" />' +
    '<button type="button" class="danger-button" onclick="' +
      removeFunction + '(' + item.id + ')">Remove</button>' +
  '</div>';
}

function renderDealIncentiveRows() {
  const container = v3Element('dealIncentiveRows');
  if (!container) return;
  if (!v3DealIncentives.length) {
    container.innerHTML =
      '<div class="empty-state compact">No deal incentives entered.</div>';
  } else {
    container.innerHTML = v3DealIncentives.map(function(item) {
      return incentiveRowHtml(
        item,
        'deal',
        'updateDealIncentive',
        'removeDealIncentive'
      );
    }).join('');
  }
  const total = v3DealIncentives.reduce(function(sum, item) {
    return sum + Number(item.amount || 0);
  }, 0);
  v3Element('dealIncentiveTotal').textContent = v3Money(total);
}

let programEditorIncentives = [];

function addProgramIncentiveRow(item) {
  programEditorIncentives.push(item || newIncentiveRecord());
  renderProgramIncentiveRows();
}

function updateProgramIncentive(id, field, value) {
  const item = programEditorIncentives.find(function(row) {
    return row.id === id;
  });
  if (!item) return;
  item[field] = field === 'amount' ? Number(value || 0) : value;
  renderProgramIncentiveRows();
}

function removeProgramIncentive(id) {
  programEditorIncentives = programEditorIncentives.filter(function(row) {
    return row.id !== id;
  });
  renderProgramIncentiveRows();
}

function renderProgramIncentiveRows() {
  const container = v3Element('programIncentiveRows');
  if (!container) return;
  container.innerHTML = programEditorIncentives.length
    ? programEditorIncentives.map(function(item) {
        return incentiveRowHtml(
          item,
          'program',
          'updateProgramIncentive',
          'removeProgramIncentive'
        );
      }).join('')
    : '<div class="empty-state compact">No program incentives entered.</div>';
}

function readProgramForm() {
  return {
    id: v3Raw('programRecordId') ||
      ('program-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
    month: v3Raw('programMonth'),
    manufacturer: v3Raw('programManufacturer').trim(),
    year: v3Number('programYear'),
    model: v3Raw('programModel').trim(),
    status: v3Raw('programStatus'),
    notes: v3Raw('programNotes').trim(),
    leaseTerm: v3Number('programLeaseTerm'),
    baseResidual: v3Raw('programBaseResidual') === ''
      ? '' : v3Number('programBaseResidual'),
    moneyFactor: v3Raw('programMoneyFactor') === ''
      ? '' : v3Number('programMoneyFactor'),
    onePayMfReduction: v3Number('programOnePayMfReduction'),
    financeTerm: v3Number('programFinanceTerm'),
    financeApr: v3Raw('programFinanceApr') === ''
      ? '' : v3Number('programFinanceApr'),
    selectTerm: v3Number('programSelectTerm'),
    selectApr: v3Raw('programSelectApr') === ''
      ? '' : v3Number('programSelectApr'),
    balloon: v3Raw('programBalloon') === ''
      ? '' : v3Number('programBalloon'),
    programCode: v3Raw('programCode').trim(),
    incentives: programEditorIncentives.map(function(item) {
      return Object.assign({}, item);
    }),
    updatedAt: new Date().toISOString()
  };
}

function saveProgramRecord() {
  const record = readProgramForm();
  if (!record.month || !record.model) {
    v3Element('programMessage').textContent =
      'Program month and model are required.';
    v3Element('programMessage').className = 'database-message error';
    return;
  }

  const records = getProgramRecords();
  const existingIndex = records.findIndex(function(item) {
    return item.id === record.id;
  });

  if (existingIndex >= 0) records[existingIndex] = record;
  else records.push(record);

  saveProgramRecords(records);
  v3Programs = records;
  v3Element('programMessage').textContent =
    'Program saved. Prior months remain in history.';
  v3Element('programMessage').className = 'database-message success';
  clearProgramForm(false);
  renderProgramHistory();
  refreshScenarioProgramOptions();
}

function clearProgramForm(resetMonth) {
  if (resetMonth !== false) v3Element('programMonth').value = '';
  [
    'programYear','programModel','programNotes','programBaseResidual',
    'programMoneyFactor','programFinanceApr','programSelectApr',
    'programBalloon','programCode'
  ].forEach(function(id) {
    v3Element(id).value = '';
  });
  v3Element('programManufacturer').value = 'BMW';
  v3Element('programStatus').value = 'confirmed';
  v3Element('programLeaseTerm').value = 36;
  v3Element('programOnePayMfReduction').value = .00080;
  v3Element('programFinanceTerm').value = 60;
  v3Element('programSelectTerm').value = 60;
  programEditorIncentives = [];
  renderProgramIncentiveRows();
}

function editProgramRecord(id) {
  const record = getProgramRecords().find(function(item) {
    return item.id === id;
  });
  if (!record) return;

  let hidden = v3Element('programRecordId');
  if (!hidden) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = 'programRecordId';
    v3Element('programsTab').appendChild(hidden);
  }
  hidden.value = record.id;

  const values = {
    programMonth: record.month,
    programManufacturer: record.manufacturer,
    programYear: record.year,
    programModel: record.model,
    programStatus: record.status,
    programNotes: record.notes,
    programLeaseTerm: record.leaseTerm,
    programBaseResidual: record.baseResidual,
    programMoneyFactor: record.moneyFactor,
    programOnePayMfReduction: record.onePayMfReduction,
    programFinanceTerm: record.financeTerm,
    programFinanceApr: record.financeApr,
    programSelectTerm: record.selectTerm,
    programSelectApr: record.selectApr,
    programBalloon: record.balloon,
    programCode: record.programCode
  };
  Object.keys(values).forEach(function(id) {
    v3Element(id).value = values[id] ?? '';
  });
  programEditorIncentives = (record.incentives || []).map(function(item) {
    return Object.assign({}, item, {
      id: Date.now() + Math.floor(Math.random() * 100000)
    });
  });
  renderProgramIncentiveRows();
  showTab('programsTab');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function archiveProgramRecord(id) {
  const records = getProgramRecords();
  const record = records.find(function(item) {
    return item.id === id;
  });
  if (!record) return;
  record.status = record.status === 'expired' ? 'confirmed' : 'expired';
  record.updatedAt = new Date().toISOString();
  saveProgramRecords(records);
  v3Programs = records;
  renderProgramHistory();
  refreshScenarioProgramOptions();
}

function copyPriorProgram() {
  const records = getProgramRecords()
    .slice()
    .sort(function(a, b) {
      return String(b.month).localeCompare(String(a.month));
    });
  if (!records.length) {
    v3Element('programMessage').textContent =
      'There is no prior program to copy.';
    v3Element('programMessage').className = 'database-message error';
    return;
  }
  const source = records[0];
  editProgramRecord(source.id);
  const hidden = v3Element('programRecordId');
  if (hidden) hidden.value = '';
  v3Element('programStatus').value = 'carried';
  v3Element('programMessage').textContent =
    'Prior program copied. Change the month and confirm updated values.';
  v3Element('programMessage').className = 'database-message success';
}

function renderProgramHistory() {
  const container = v3Element('programHistory');
  if (!container) return;

  const query = v3Raw('programSearch').trim().toLowerCase();
  const records = getProgramRecords()
    .filter(function(item) {
      const haystack = [
        item.month, item.manufacturer, item.year, item.model,
        item.status, item.programCode
      ].join(' ').toLowerCase();
      return !query || haystack.includes(query);
    })
    .sort(function(a, b) {
      return String(b.month).localeCompare(String(a.month)) ||
        String(a.model).localeCompare(String(b.model));
    });

  if (!records.length) {
    container.innerHTML =
      '<div class="empty-state">No matching programs saved.</div>';
    return;
  }

  container.innerHTML = records.map(function(item) {
    const statusLabels = {
      confirmed: 'Confirmed',
      carried: 'Carried Forward',
      management: 'Management',
      expired: 'Expired'
    };
    return '<article class="program-history-card ' + item.status + '">' +
      '<div><strong>' + escapeHtml(item.month || '') + ' · ' +
        escapeHtml(String(item.year || '')) + ' ' +
        escapeHtml(item.model || '') + '</strong>' +
      '<span>' + escapeHtml(statusLabels[item.status] || item.status) +
        (item.programCode ? ' · ' + escapeHtml(item.programCode) : '') +
      '</span></div>' +
      '<div class="program-values">' +
        '<span>Lease ' + (item.leaseTerm || '—') +
          ' · Residual ' + (item.baseResidual === '' ? '—' : item.baseResidual + '%') +
          ' · MF ' + (item.moneyFactor === '' ? '—' : item.moneyFactor) + '</span>' +
        '<span>Finance ' + (item.financeTerm || '—') +
          ' · APR ' + (item.financeApr === '' ? '—' : item.financeApr + '%') + '</span>' +
        '<span>Select ' + (item.selectTerm || '—') +
          ' · APR ' + (item.selectApr === '' ? '—' : item.selectApr + '%') +
          ' · Balloon ' + (item.balloon === '' ? '—' : item.balloon + '%') + '</span>' +
      '</div>' +
      '<div class="program-actions">' +
        '<button type="button" onclick="editProgramRecord(\'' + item.id + '\')">Edit</button>' +
        '<button type="button" onclick="loadProgramIncentivesToDeal(\'' + item.id + '\')">Load Incentives</button>' +
        '<button type="button" onclick="archiveProgramRecord(\'' + item.id + '\')">' +
          (item.status === 'expired' ? 'Restore' : 'Archive') + '</button>' +
      '</div>' +
    '</article>';
  }).join('');
}

function refreshScenarioProgramOptions() {
  const select = v3Element('scenarioProgram');
  if (!select) return;
  const records = getProgramRecords()
    .filter(function(item) { return item.status !== 'expired'; })
    .sort(function(a, b) {
      return String(b.month).localeCompare(String(a.month));
    });
  select.innerHTML =
    '<option value="">Choose saved program</option>' +
    records.map(function(item) {
      return '<option value="' + item.id + '">' +
        escapeHtml(item.month + ' · ' + item.year + ' ' + item.model +
          (item.status === 'carried' ? ' ⚠ carried forward' : '')) +
      '</option>';
    }).join('');
}

function applySelectedProgramToEditor() {
  const id = v3Raw('scenarioProgram');
  const record = getProgramRecords().find(function(item) {
    return item.id === id;
  });
  if (!record) {
    showToast('Choose a saved program first.', 'error');
    return;
  }

  const type = v3Raw('scenarioType');
  if (type === 'lease') {
    v3Element('scenarioTerm').value = record.leaseTerm || 36;
    v3Element('scenarioResidual').value = record.baseResidual ?? '';
    v3Element('scenarioMoneyFactor').value = record.moneyFactor ?? '';
    v3Element('scenarioOnePayMfReduction').value =
      record.onePayMfReduction ?? .00080;
  } else if (type === 'finance') {
    v3Element('scenarioTerm').value = record.financeTerm || 60;
    v3Element('scenarioApr').value = record.financeApr ?? '';
  } else if (type === 'select') {
    v3Element('scenarioTerm').value = record.selectTerm || 60;
    v3Element('scenarioApr').value = record.selectApr ?? '';
    v3Element('scenarioBalloon').value = record.balloon ?? '';
  }

  v3Element('scenarioProgramId').value = record.id;
  updateScenarioResidualPreview();
  showToast('Program loaded into scenario.', 'success');
}

function loadProgramIncentivesToDeal(id) {
  const record = getProgramRecords().find(function(item) {
    return item.id === id;
  });
  if (!record) return;
  (record.incentives || []).forEach(function(item) {
    v3DealIncentives.push(Object.assign({}, item, {
      id: Date.now() + Math.floor(Math.random() * 100000)
    }));
  });
  saveDealIncentives();
  renderDealIncentiveRows();
  renderV3Scenarios();
  showTab('setupTab');
  showToast('Program incentives loaded into the deal.', 'success');
}

function addScenarioTemplate() {
  const template = v3Raw('quickScenarioType');
  if (template === 'onepay') {
    const scenario = defaultScenario('lease');
    scenario.name = 'One-Pay Lease 10K';
    scenario.onePay = true;
    scenario.onePayMfReduction = .00080;
    scenario.selected = false;
    if (v3Scenarios.length >= 6) {
      showToast('A deal can contain up to six scenarios.', 'error');
      return;
    }
    v3Scenarios.push(scenario);
    renderV3Scenarios();
    editScenario(scenario.id);
    return;
  }
  openScenarioEditor(template);
}

function updateScenarioResidualPreview() {
  const previewScenario = {
    residual: v3Raw('scenarioResidual') === ''
      ? 0 : v3Number('scenarioResidual'),
    miles: v3Number('scenarioMiles'),
    inceptionMileage: v3Number('scenarioInceptionMileage'),
    inceptionCharge: v3Number('scenarioInceptionCharge'),
    customMiles: v3Number('scenarioCustomMiles'),
    customMileageCharge: v3Number('scenarioCustomMileageCharge')
  };
  const residual = calculateAdjustedResidual(
    previewScenario,
    v3Number('v3Msrp')
  );
  if (v3Element('scenarioMileageAdjustmentDisplay')) {
    v3Element('scenarioMileageAdjustmentDisplay').textContent =
      (residual.includedAdjustment >= 0 ? '+' : '') +
      residual.includedAdjustment.toFixed(2) + '%';
  }
  if (v3Element('scenarioAdjustedResidualDisplay')) {
    v3Element('scenarioAdjustedResidualDisplay').textContent =
      residual.adjustedPercent.toFixed(2) + '% · ' +
      v3Money(residual.residualValue);
  }
}

/* Override Alpha 3 calculation to include deal incentives,
   mileage residual adjustments, and One-Pay. */
function calculateV3Scenario(scenario, overrides) {
  overrides = overrides || {};
  const deal = getV3Deal(overrides);
  const missing = validateScenario(scenario, deal);

  if (missing.length) {
    return { ready: false, missing, payment: NaN, deal };
  }

  const programIncentives = applicableDealIncentives(scenario.type);
  const totalIncentives =
    programIncentives + Number(scenario.incentives || 0);

  const price = Math.max(
    0,
    deal.sellingPrice +
      Number(scenario.priceAdjustment || 0) -
      totalIncentives
  );
  const cash = Math.max(
    0,
    deal.cashDown + Number(scenario.cashAdjustment || 0)
  );
  const tradeAllowance = Math.max(
    0,
    deal.tradeAllowance + Number(scenario.tradeAdjustment || 0)
  );

  const adjustedDeal = getV3Deal({
    discount: deal.msrp - price,
    cashDown: cash,
    tradeAllowance
  });
  const taxRate = adjustedDeal.taxRate / 100;
  const fees = getV3Fees(scenario.type);

  if (scenario.type === 'lease') {
    const residual = calculateAdjustedResidual(scenario, deal.msrp);
    const residualValue = residual.residualValue;
    const capReduction = Math.max(0, adjustedDeal.capEquity) + cash;
    const negativeEquity = Math.max(0, -adjustedDeal.tradeEquity);
    const adjustedCap =
      price + fees.capitalizedTotal + negativeEquity - capReduction;

    const usedMoneyFactor = Math.max(
      0,
      Number(scenario.moneyFactor || 0) -
        (scenario.onePay
          ? Number(scenario.onePayMfReduction || 0)
          : 0)
    );

    const depreciation =
      (adjustedCap - residualValue) / scenario.term;
    const rent =
      (adjustedCap + residualValue) * usedMoneyFactor;
    const basePayment = depreciation + rent;
    const payment = basePayment * (1 + taxRate);
    const taxOnCashReduction = cash * taxRate;
    const standardDueUpfront =
      payment + fees.upfrontTotal + cash + taxOnCashReduction;

    const onePayTotal = scenario.onePay
      ? payment * scenario.term + fees.upfrontTotal +
        cash + taxOnCashReduction
      : null;

    return {
      ready: true,
      payment,
      dueUpfront: scenario.onePay ? onePayTotal : standardDueUpfront,
      onePayTotal,
      equivalentMonthly: payment,
      residualValue,
      baseResidualPercent: residual.basePercent,
      mileageResidualAdjustment: residual.includedAdjustment,
      adjustedResidualPercent: residual.adjustedPercent,
      inceptionResidualDeduction: residual.inceptionDeduction,
      customResidualDeduction: residual.customDeduction,
      baseMoneyFactor: Number(scenario.moneyFactor || 0),
      usedMoneyFactor,
      amountFinanced: adjustedCap,
      finalPayment: residualValue,
      taxOnCashReduction,
      incentives: totalIncentives,
      fees,
      deal: adjustedDeal
    };
  }

  const taxablePrice = Math.max(0, price - tradeAllowance);
  const salesTax = taxablePrice * taxRate;
  const principal =
    price + salesTax + fees.capitalizedTotal + fees.upfrontTotal +
    adjustedDeal.tradePayoff - tradeAllowance - cash;

  if (scenario.type === 'cash') {
    const cashDue = Math.max(0, principal);
    return {
      ready: true,
      payment: cashDue,
      dueUpfront: cashDue,
      amountFinanced: 0,
      salesTax,
      incentives: totalIncentives,
      fees,
      deal: adjustedDeal
    };
  }

  if (scenario.type === 'finance') {
    return {
      ready: true,
      payment: v3MonthlyPayment(principal, scenario.apr, scenario.term),
      dueUpfront: cash,
      amountFinanced: principal,
      salesTax,
      incentives: totalIncentives,
      fees,
      deal: adjustedDeal
    };
  }

  const balloonValue = deal.msrp * (scenario.balloon / 100);
  const rate = scenario.apr / 100 / 12;
  const payment = rate === 0
    ? (principal - balloonValue) / scenario.term
    : (principal - balloonValue / Math.pow(1 + rate, scenario.term)) *
      rate / (1 - Math.pow(1 + rate, -scenario.term));

  return {
    ready: true,
    payment,
    dueUpfront: cash,
    amountFinanced: principal,
    finalPayment: balloonValue,
    salesTax,
    incentives: totalIncentives,
    fees,
    deal: adjustedDeal
  };
}

/* Override scenario defaults for new fields. */
const alpha3DefaultScenario = defaultScenario;
function defaultScenario(type) {
  const scenario = alpha3DefaultScenario(type);
  scenario.onePay = false;
  scenario.onePayMfReduction = .00080;
  scenario.inceptionMileage = 0;
  scenario.inceptionCharge = .20;
  scenario.customMiles = 0;
  scenario.customMileageCharge = .20;
  scenario.programId = '';
  return scenario;
}

/* Override editor fill/save for Alpha 4 fields. */
const alpha3FillScenarioEditor = fillScenarioEditor;
function fillScenarioEditor(scenario) {
  alpha3FillScenarioEditor(scenario);
  v3Element('scenarioOnePay').checked = Boolean(scenario.onePay);
  let reduction = v3Element('scenarioOnePayMfReduction');
  if (!reduction) {
    reduction = document.createElement('input');
    reduction.type = 'hidden';
    reduction.id = 'scenarioOnePayMfReduction';
    v3Element('scenarioEditor').appendChild(reduction);
  }
  reduction.value = scenario.onePayMfReduction ?? .00080;

  let programId = v3Element('scenarioProgramId');
  if (!programId) {
    programId = document.createElement('input');
    programId.type = 'hidden';
    programId.id = 'scenarioProgramId';
    v3Element('scenarioEditor').appendChild(programId);
  }
  programId.value = scenario.programId || '';

  v3Element('scenarioInceptionMileage').value =
    scenario.inceptionMileage || 0;
  v3Element('scenarioInceptionCharge').value =
    scenario.inceptionCharge ?? .20;
  v3Element('scenarioCustomMiles').value =
    scenario.customMiles || 0;
  v3Element('scenarioCustomMileageCharge').value =
    scenario.customMileageCharge ?? .20;

  refreshScenarioProgramOptions();
  v3Element('scenarioProgram').value = scenario.programId || '';
  updateScenarioResidualPreview();
}

function saveScenarioFromEditor() {
  const idValue = v3Raw('scenarioEditId');
  const type = v3Raw('scenarioType');
  const scenario = {
    id: idValue ? Number(idValue) : v3NextScenarioId++,
    name: v3Raw('scenarioName').trim() || 'Scenario',
    type,
    term: type === 'cash' ? 1 : Number(v3Raw('scenarioTerm') || 0),
    miles: v3Raw('scenarioMiles') === ''
      ? '' : Number(v3Raw('scenarioMiles')),
    residual: v3Raw('scenarioResidual') === ''
      ? '' : Number(v3Raw('scenarioResidual')),
    moneyFactor: v3Raw('scenarioMoneyFactor') === ''
      ? '' : Number(v3Raw('scenarioMoneyFactor')),
    apr: v3Raw('scenarioApr') === ''
      ? '' : Number(v3Raw('scenarioApr')),
    balloon: v3Raw('scenarioBalloon') === ''
      ? '' : Number(v3Raw('scenarioBalloon')),
    priceAdjustment: Number(v3Raw('scenarioPriceAdjustment') || 0),
    cashAdjustment: Number(v3Raw('scenarioCashAdjustment') || 0),
    tradeAdjustment: Number(v3Raw('scenarioTradeAdjustment') || 0),
    incentives: Number(v3Raw('scenarioIncentives') || 0),
    showRate: v3Element('scenarioShowRate').checked,
    showResidual: v3Element('scenarioShowResidual').checked,
    showFeeDetails: v3Element('scenarioShowFeeDetails').checked,
    selected: false,
    onePay: v3Element('scenarioOnePay').checked,
    onePayMfReduction: Number(v3Raw('scenarioOnePayMfReduction') || .00080),
    inceptionMileage: v3Number('scenarioInceptionMileage'),
    inceptionCharge: v3Number('scenarioInceptionCharge'),
    customMiles: v3Number('scenarioCustomMiles'),
    customMileageCharge: v3Number('scenarioCustomMileageCharge'),
    programId: v3Raw('scenarioProgramId')
  };

  if (scenario.onePay && !scenario.name.toLowerCase().includes('one')) {
    scenario.name = 'One-Pay ' + scenario.name;
  }

  const existingIndex = v3Scenarios.findIndex(function(s) {
    return s.id === scenario.id;
  });
  if (existingIndex >= 0) {
    scenario.selected = v3Scenarios[existingIndex].selected;
    v3Scenarios[existingIndex] = scenario;
  } else {
    v3Scenarios.push(scenario);
  }
  closeScenarioEditor();
  renderV3Scenarios();
}

/* Override summary to show residual adjustments and One-Pay. */
function scenarioSummary(scenario) {
  if (scenario.type === 'lease') {
    const result = calculateV3Scenario(scenario);
    const adjusted = result.ready
      ? result.adjustedResidualPercent.toFixed(2) + '%'
      : '—';
    return (scenario.onePay ? 'One-Pay · ' : '') +
      scenario.term + ' months · ' +
      Number(scenario.miles || 0).toLocaleString('en-US') +
      ' miles · Adjusted residual ' + adjusted +
      ' · MF ' + (scenario.moneyFactor === '' ? '—' : scenario.moneyFactor);
  }
  if (scenario.type === 'finance') {
    return scenario.term + ' months · APR ' +
      (scenario.apr === '' ? '—' : scenario.apr + '%');
  }
  if (scenario.type === 'select') {
    return scenario.term + ' months · APR ' +
      (scenario.apr === '' ? '—' : scenario.apr + '%') +
      ' · Balloon ' +
      (scenario.balloon === '' ? '—' : scenario.balloon + '%');
  }
  return 'Cash purchase · Tax ' +
    (v3Raw('v3TaxRate') === '' ? '—' : v3Raw('v3TaxRate') + '%');
}

/* Override customer presentation to show incentive and residual detail. */
const alpha3RenderCustomerPresentation = renderCustomerPresentation;
function renderCustomerPresentation() {
  alpha3RenderCustomerPresentation();

  document.querySelectorAll('.customer-scenario-card').forEach(function(card, index) {
    const selected = v3Scenarios.filter(function(s) {
      return s.selected && calculateV3Scenario(s).ready;
    });
    const scenario = selected[index];
    if (!scenario) return;
    const result = calculateV3Scenario(scenario);
    const body = card.querySelector('.customer-card-body');
    if (!body) return;

    if (result.incentives > 0) {
      body.insertAdjacentHTML(
        'afterbegin',
        '<div><span>Incentives</span><strong>' +
          v3Money(result.incentives) + '</strong></div>'
      );
    }

    if (scenario.type === 'lease' && scenario.showResidual) {
      body.insertAdjacentHTML(
        'beforeend',
        '<div><span>Base Residual</span><strong>' +
          result.baseResidualPercent.toFixed(2) + '%</strong></div>' +
        '<div><span>Mileage Adjustment</span><strong>+' +
          result.mileageResidualAdjustment.toFixed(2) + '%</strong></div>' +
        '<div><span>Adjusted Residual</span><strong>' +
          result.adjustedResidualPercent.toFixed(2) + '%</strong></div>'
      );
    }

    if (scenario.type === 'lease' && scenario.showRate) {
      body.insertAdjacentHTML(
        'beforeend',
        '<div><span>Used Money Factor</span><strong>' +
          result.usedMoneyFactor.toFixed(5) + '</strong></div>'
      );
    }

    if (scenario.onePay) {
      const payment = card.querySelector('.customer-card-payment');
      const label = card.querySelector('.customer-card-payment-label');
      payment.textContent = v3Money(result.onePayTotal);
      label.textContent = 'TOTAL ONE-PAY LEASE';
      body.insertAdjacentHTML(
        'afterbegin',
        '<div><span>Equivalent Monthly</span><strong>' +
          v3Money(result.equivalentMonthly) + '</strong></div>'
      );
    }
  });
}

/* Enhance editor live previews. */
document.addEventListener('input', function(event) {
  if ([
    'scenarioResidual','scenarioMiles','scenarioInceptionMileage',
    'scenarioInceptionCharge','scenarioCustomMiles',
    'scenarioCustomMileageCharge'
  ].includes(event.target.id)) {
    updateScenarioResidualPreview();
  }
});
document.addEventListener('change', function(event) {
  if ([
    'scenarioResidual','scenarioMiles','scenarioInceptionMileage',
    'scenarioInceptionCharge','scenarioCustomMiles',
    'scenarioCustomMileageCharge'
  ].includes(event.target.id)) {
    updateScenarioResidualPreview();
  }
});

/* Alpha 4 initialization */
document.addEventListener('DOMContentLoaded', function() {
  v3DealIncentives = getDealIncentives();
  v3Programs = getProgramRecords();
  renderDealIncentiveRows();
  renderProgramIncentiveRows();
  renderProgramHistory();
  refreshScenarioProgramOptions();

  const month = new Date().toISOString().slice(0, 7);
  if (v3Element('programMonth') && !v3Element('programMonth').value) {
    v3Element('programMonth').value = month;
  }
});
