function getNum(id) {
    const element = document.getElementById(id);
    return element ? (parseFloat(element.value) || 0) : 0;
  }

  function money(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  function checked(name) {
    const element = document.querySelector('input[name="' + name + '"]:checked');
    return element ? element.value : '';
  }

  function isShown(id) {
    return document.getElementById(id).checked;
  }

  function standardPayment(principal, annualRate, months) {
    if (principal <= 0 || months <= 0) return 0;
    const r = annualRate / 100 / 12;
    if (r === 0) return principal / months;
    return principal * r / (1 - Math.pow(1 + r, -months));
  }

  function balloonPayment(principal, annualRate, months, balloon) {
    if (principal <= 0 || months <= 0) return 0;
    const finalBalloon = Math.min(Math.max(balloon, 0), principal);
    const r = annualRate / 100 / 12;
    if (r === 0) return (principal - finalBalloon) / months;
    const pvBalloon = finalBalloon / Math.pow(1 + r, months);
    return (principal - pvBalloon) * r / (1 - Math.pow(1 + r, -months));
  }

  function incentiveTotal(prefix) {
    return getNum(prefix + 'Incentive1') +
           getNum(prefix + 'Incentive2') +
           getNum(prefix + 'Incentive3');
  }

  function incentiveDetails(prefix) {
    const details = [];
    for (let i = 1; i <= 3; i++) {
      const amount = getNum(prefix + 'Incentive' + i);
      const nameField = document.getElementById(prefix + 'IncentiveName' + i);
      const name = nameField ? nameField.value.trim() : '';
      if (amount > 0) {
        details.push({ name: name || ('Incentive ' + i), amount: amount });
      }
    }
    return details;
  }

  function renderNamedIncentives(prefix, details, combine) {
    const container = document.getElementById(prefix + 'NamedIncentives');
    if (!container) return;
    if (combine || details.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';
    container.innerHTML = details.map(function(item) {
      return '<div class="named-incentive-line"><span>' + item.name + '</span><strong>' + money(item.amount) + '</strong></div>';
    }).join('');
  }

  function getDealValues() {
    const msrp = getNum('msrp');
    const discount = getNum('discount');

    const leaseIncentives = incentiveTotal('lease');
    const retailIncentives = incentiveTotal('retail');
    const selectIncentives = incentiveTotal('select');
    const leaseIncentiveDetails = incentiveDetails('lease');
    const retailIncentiveDetails = incentiveDetails('retail');
    const selectIncentiveDetails = incentiveDetails('select');

    const leaseSellingPrice = Math.max(msrp - discount - leaseIncentives, 0);
    const retailSellingPrice = Math.max(msrp - discount - retailIncentives, 0);
    const selectSellingPrice = Math.max(msrp - discount - selectIncentives, 0);

    const tradeValue1 = getNum('tradeValue1');
    const tradeValue2 = getNum('tradeValue2');
    const payoff1 = getNum('payoff1');
    const payoff2 = getNum('payoff2');

    const rawEquity1 = tradeValue1 - payoff1;
    const rawEquity2 = tradeValue2 - payoff2;
    const positiveTradeEquity = Math.max(rawEquity1, 0) + Math.max(rawEquity2, 0);
    const negativeTradeEquity = Math.abs(Math.min(rawEquity1, 0)) + Math.abs(Math.min(rawEquity2, 0));

    const cashDown = getNum('cashDown');
    const cashBack = getNum('cashBack');
    const capReduction = Math.max(positiveTradeEquity + cashDown - cashBack, 0);

    const regFees = getNum('regFees');
    const docFee = getNum('docFee');
    const miscFee = getNum('miscFee');
    const afterSell1 = getNum('afterSell1');
    const afterSell2 = getNum('afterSell2');
    const commonFees = regFees + docFee + miscFee + afterSell1 + afterSell2;
    const acquisitionFee = getNum('acquisitionFee');
    const taxRate = getNum('salesTaxRate') / 100;

    return {
      msrp, discount,
      leaseIncentives, retailIncentives, selectIncentives,
      leaseIncentiveDetails, retailIncentiveDetails, selectIncentiveDetails,
      leaseSellingPrice, retailSellingPrice, selectSellingPrice,
      tradeValue1, tradeValue2, payoff1, payoff2,
      positiveTradeEquity, negativeTradeEquity,
      cashDown, cashBack, capReduction,
      commonFees, acquisitionFee, taxRate
    };
  }

  function calculateResidual(deal) {
    const residualPercent = getNum('baseResidual') + getNum('includedMiles');
    let residual = deal.msrp * (residualPercent / 100);

    const inceptionMileage = getNum('inceptionMileage');
    if (inceptionMileage > 500) {
      residual -= (inceptionMileage - 500) * getNum('inceptionMileageCharge');
    }

    const customMileage = getNum('customMileage');
    const leaseMonths = getNum('leaseMonths');
    if (customMileage > 15000 && leaseMonths > 0) {
      const totalExtraMiles = ((customMileage - 15000) / 12) * leaseMonths;
      residual -= totalExtraMiles * getNum('customMileageCharge');
    }

    return Math.max(residual, 0);
  }

  function financeAmountFor(sellingPrice, d) {
    const taxableVehicleAmount = Math.max(
      sellingPrice - d.tradeValue1 - d.tradeValue2,
      0
    );
    const vehicleTax = taxableVehicleAmount * d.taxRate;
    const feeTax = d.commonFees * d.taxRate;

    return Math.max(
      sellingPrice -
      d.capReduction +
      d.negativeTradeEquity +
      d.commonFees +
      vehicleTax +
      feeTax,
      0
    );
  }

  function applyDisplayChoices() {
    const showLease = isShown('displayLease');
    const showRetail = isShown('displayRetail');
    const showSelect = isShown('displaySelect');

    document.getElementById('leaseInputSection').classList.toggle('hidden', !showLease);
    document.getElementById('retailInputSection').classList.toggle('hidden', !showRetail);
    document.getElementById('selectInputSection').classList.toggle('hidden', !showSelect);

    document.getElementById('screenLeaseCard').classList.toggle('hidden', !showLease);
    document.getElementById('screenRetailCard').classList.toggle('hidden', !showRetail);
    document.getElementById('screenSelectCard').classList.toggle('hidden', !showSelect);

    document.getElementById('quoteLeaseCard').classList.toggle('hidden', !showLease);
    document.getElementById('quoteRetailCard').classList.toggle('hidden', !showRetail);
    document.getElementById('quoteSelectCard').classList.toggle('hidden', !showSelect);

    const count = [showLease, showRetail, showSelect].filter(Boolean).length || 1;
    const columns = 'repeat(' + count + ', minmax(0, 1fr))';
    document.querySelector('.comparison').style.gridTemplateColumns = columns;
    document.querySelector('.quote-comparison').style.gridTemplateColumns = columns;
  }

  function updateCashPurchaseDisplay(isCash) {
    const monthsField = document.getElementById('financeMonthsField');
    const aprField = document.getElementById('financeAprField');
    if (monthsField) monthsField.classList.toggle('hidden', isCash);
    if (aprField) aprField.classList.toggle('hidden', isCash);
  }

  function calculateAll() {
    const d = getDealValues();

    document.getElementById('leaseSellingPrice').value = money(d.leaseSellingPrice);
    document.getElementById('retailSellingPrice').value = money(d.retailSellingPrice);
    document.getElementById('selectSellingPrice').value = money(d.selectSellingPrice);
    document.getElementById('tradeEquityDisplay').value = money(d.positiveTradeEquity);
    document.getElementById('negativeEquityDisplay').value = money(d.negativeTradeEquity);

    const residual = calculateResidual(d);
    const leaseMonths = getNum('leaseMonths');
    const moneyFactor = getNum('moneyFactor');
    const feesIncluded = checked('feesIncluded') === 'yes';

    const leaseTaxBase = d.cashDown + d.acquisitionFee + d.commonFees;
    const leaseUpfrontTax = leaseTaxBase * d.taxRate;
    const leaseFeesTotal = d.acquisitionFee + d.commonFees + leaseUpfrontTax;
    const leaseCapCost =
      d.leaseSellingPrice -
      d.capReduction +
      d.negativeTradeEquity +
      (feesIncluded ? leaseFeesTotal : 0);

    const leaseDepreciation = leaseMonths > 0 ? (leaseCapCost - residual) / leaseMonths : 0;
    const leaseRent = (leaseCapCost + residual) * moneyFactor;
    const leaseBasePayment = leaseDepreciation + leaseRent;
    const leasePayment = Math.max(leaseBasePayment * (1 + d.taxRate), 0);
    const leaseDue = d.cashDown + leasePayment + (feesIncluded ? 0 : leaseFeesTotal);

    const leaseType = checked('leaseType') || 'standard';
    const onePayAmount = Math.max((leasePayment * leaseMonths) + leaseDue, 0);
    const onePayEquivalentMonthly = leaseMonths > 0 ? onePayAmount / leaseMonths : 0;

    document.getElementById('onePayAmount').value = money(onePayAmount);
    document.getElementById('onePayEquivalentMonthly').value = money(onePayEquivalentMonthly);

    document.getElementById('residualValue').value = money(residual);
    document.getElementById('leasePayment').value = money(leasePayment);
    document.getElementById('leaseUpfrontTax').value = money(leaseUpfrontTax);

    const totalTradeValue = d.tradeValue1 + d.tradeValue2;
    const totalPayoff = d.payoff1 + d.payoff2;

    const retailTaxableVehicle = Math.max(d.retailSellingPrice - totalTradeValue, 0);
    const retailSalesTax = (retailTaxableVehicle + d.commonFees) * d.taxRate;
    const retailFinanceAmount = financeAmountFor(d.retailSellingPrice, d);
    const financeMonths = getNum('financeMonths');
    const aprRate = getNum('aprRate');
    const retailPayment = standardPayment(retailFinanceAmount, aprRate, financeMonths);
    const cashPurchase = document.getElementById('cashPurchase').checked;
    const cashPurchaseTotal = retailFinanceAmount;

    document.getElementById('amountFinanced').value = money(retailFinanceAmount);
    document.getElementById('financePayment').value = money(retailPayment);
    document.getElementById('cashPurchaseTotal').value = money(cashPurchaseTotal);

    const selectTaxableVehicle = Math.max(d.selectSellingPrice - totalTradeValue, 0);
    const selectSalesTax = (selectTaxableVehicle + d.commonFees) * d.taxRate;
    const selectFinanceAmount = financeAmountFor(d.selectSellingPrice, d);
    const selectMonths = getNum('selectMonths');
    const selectApr = getNum('selectAprRate');
    const balloon = d.msrp * (getNum('balloonPercent') / 100);
    const selectPayment = balloonPayment(selectFinanceAmount, selectApr, selectMonths, balloon);

    document.getElementById('balloonValue').value = money(balloon);
    document.getElementById('selectAmountFinanced').value = money(selectFinanceAmount);
    document.getElementById('selectPayment').value = money(selectPayment);

    const results = {
      d, residual, leaseMonths, moneyFactor, leasePayment, leaseDue,
      leaseType, onePayAmount, onePayEquivalentMonthly,
      leaseUpfrontTax, leaseCapCost,
      totalTradeValue, totalPayoff,
      financeMonths, aprRate, retailSalesTax, retailFinanceAmount, retailPayment,
      cashPurchase, cashPurchaseTotal,
      selectMonths, selectApr, balloon, selectSalesTax, selectFinanceAmount, selectPayment
    };

    updateScreenResults(results);
    updateQuote(results);
    applyDisplayChoices();
    updateCashPurchaseDisplay(cashPurchase);
  }

  function updateScreenResults(r) {
    document.getElementById('screenLeasePayment').textContent = money(r.leaseType === 'onepay' ? r.onePayAmount : r.leasePayment);
    document.getElementById('screenLeaseTerm').textContent = r.leaseMonths + ' months';
    document.getElementById('screenResidual').textContent = money(r.residual);
    document.getElementById('screenMF').textContent = r.moneyFactor.toFixed(5);
    document.getElementById('screenLeaseDue').textContent = money(r.leaseType === 'onepay' ? r.onePayAmount : r.leaseDue);

    document.getElementById('screenRetailPayment').textContent = money(r.cashPurchase ? r.cashPurchaseTotal : r.retailPayment);
    document.getElementById('screenRetailTerm').textContent = r.cashPurchase ? 'Cash Purchase' : r.financeMonths + ' months';
    document.getElementById('screenRetailApr').textContent = r.cashPurchase ? 'N/A' : r.aprRate.toFixed(2) + '%';
    document.getElementById('screenRetailAmount').textContent = money(r.retailFinanceAmount);
    document.getElementById('screenRetailDue').textContent = money(r.d.cashDown);

    document.getElementById('screenSelectPayment').textContent = money(r.selectPayment);
    document.getElementById('screenSelectTerm').textContent = r.selectMonths + ' months';
    document.getElementById('screenSelectApr').textContent = r.selectApr.toFixed(2) + '%';
    document.getElementById('screenBalloon').textContent = money(r.balloon);
    document.getElementById('screenSelectDue').textContent = money(r.d.cashDown);
  }

  function pricingSummary(label, discount, incentives, sellingPrice, combine) {
    if (combine) {
      return '<strong>' + label + ' Savings:</strong> ' +
             money(discount + incentives) +
             '<br><strong>' + label + ' Selling Price:</strong> ' +
             money(sellingPrice);
    }

    return '<strong>' + label + ' Discount:</strong> ' +
           money(discount) +
           '<br><strong>' + label + ' Incentives:</strong> ' +
           money(incentives) +
           '<br><strong>' + label + ' Selling Price:</strong> ' +
           money(sellingPrice);
  }

  function updateQuote(r) {
    const customer = document.getElementById('customerName').value.trim();
    const vehicle = document.getElementById('vehicle').value.trim();
    const trade1 = document.getElementById('tradeIn1').value.trim();
    const trade2 = document.getElementById('tradeIn2').value.trim();
    const combine = checked('combine') === 'yes';

    document.getElementById('quoteCustomer').innerHTML =
      '<strong>Client:</strong> ' + (customer || '');
    document.getElementById('quoteVehicle').innerHTML =
      '<strong>Vehicle:</strong> ' + (vehicle || '');

    const quoteNumber = document.getElementById('quoteNumber').value.trim();
    const quoteDate = document.getElementById('quoteDate').value;
    const vin = document.getElementById('vin').value.trim();

    document.getElementById('quoteNumberDisplay').innerHTML =
      '<strong>Quote:</strong> ' + (quoteNumber || '') +
      (quoteDate ? ' &nbsp; <strong>Date:</strong> ' + quoteDate : '');

    document.getElementById('quoteVinDisplay').innerHTML =
      vin ? '<strong>VIN:</strong> ' + vin : '';

    const totalTradeValue = r.totalTradeValue;
    const totalPayoff = r.totalPayoff;
    const leaseSubtotal = r.d.leaseSellingPrice - totalTradeValue;
    const retailSubtotal = r.d.retailSellingPrice - totalTradeValue;
    const selectSubtotal = r.d.selectSellingPrice - totalTradeValue;

    const leaseMiscDisplay =
      getNum('miscFee') + getNum('afterSell1') + getNum('afterSell2') +
      getNum('acquisitionFee') + r.d.cashBack;
    const retailMiscDisplay =
      getNum('miscFee') + getNum('afterSell1') + getNum('afterSell2') +
      r.d.cashBack;
    const selectMiscDisplay = retailMiscDisplay;

    const leaseDisplayTotal =
      leaseSubtotal + totalPayoff + r.leaseUpfrontTax +
      getNum('regFees') + getNum('docFee') + leaseMiscDisplay - r.d.cashDown;
    const retailDisplayTotal =
      retailSubtotal + totalPayoff + r.retailSalesTax +
      getNum('regFees') + getNum('docFee') + retailMiscDisplay - r.d.cashDown;
    const selectDisplayTotal =
      selectSubtotal + totalPayoff + r.selectSalesTax +
      getNum('regFees') + getNum('docFee') + selectMiscDisplay - r.d.cashDown;

    function fillBreakdown(prefix, adjustedPrice, incentives, subtotal, salesTax, miscFees, total) {
      document.getElementById(prefix + 'BreakMSRP').textContent = money(r.d.msrp);

      if (combine) {
        document.getElementById(prefix + 'BreakDiscount').textContent =
          money(r.d.discount + incentives);
        document.getElementById(prefix + 'BreakIncentiveRow').style.display = 'none';
      } else {
        document.getElementById(prefix + 'BreakDiscount').textContent =
          money(r.d.discount);
        document.getElementById(prefix + 'BreakIncentiveRow').style.display = 'flex';
        document.getElementById(prefix + 'BreakIncentives').textContent =
          money(incentives);
      }

      document.getElementById(prefix + 'BreakAdjusted').textContent = money(adjustedPrice);
      document.getElementById(prefix + 'BreakTrade').textContent = money(totalTradeValue);
      document.getElementById(prefix + 'BreakSubtotal').textContent = money(subtotal);
      document.getElementById(prefix + 'BreakPayoff').textContent = money(totalPayoff);
      document.getElementById(prefix + 'BreakTax').textContent = money(salesTax);
      document.getElementById(prefix + 'BreakReg').textContent = money(getNum('regFees'));
      document.getElementById(prefix + 'BreakDoc').textContent = money(getNum('docFee'));
      document.getElementById(prefix + 'BreakMisc').textContent = money(miscFees);
      document.getElementById(prefix + 'BreakCash').textContent = '-' + money(r.d.cashDown);
      document.getElementById(prefix + 'BreakTotal').textContent = money(total);
    }

    fillBreakdown(
      'lease', r.d.leaseSellingPrice, r.d.leaseIncentives,
      leaseSubtotal, r.leaseUpfrontTax, leaseMiscDisplay, r.leaseCapCost
    );
    fillBreakdown(
      'retail', r.d.retailSellingPrice, r.d.retailIncentives,
      retailSubtotal, r.retailSalesTax, retailMiscDisplay, r.retailFinanceAmount
    );
    fillBreakdown(
      'select', r.d.selectSellingPrice, r.d.selectIncentives,
      selectSubtotal, r.selectSalesTax, selectMiscDisplay, r.selectFinanceAmount
    );

    renderNamedIncentives('lease', r.d.leaseIncentiveDetails, combine);
    renderNamedIncentives('retail', r.d.retailIncentiveDetails, combine);
    renderNamedIncentives('select', r.d.selectIncentiveDetails, combine);

    const selectedPayments = [];
    if (isShown('displayLease')) selectedPayments.push({ id: 'leasePaymentDifference', value: r.leasePayment });
    if (isShown('displayRetail')) selectedPayments.push({ id: 'retailPaymentDifference', value: r.retailPayment });
    if (isShown('displaySelect')) selectedPayments.push({ id: 'selectPaymentDifference', value: r.selectPayment });
    const lowestPayment = selectedPayments.length ? Math.min.apply(null, selectedPayments.map(function(item) { return item.value; })) : 0;

    ['leasePaymentDifference', 'retailPaymentDifference', 'selectPaymentDifference'].forEach(function(id) {
      document.getElementById(id).textContent = '';
    });
    selectedPayments.forEach(function(item) {
      const difference = item.value - lowestPayment;
      document.getElementById(item.id).textContent = difference < 0.005
        ? 'Lowest monthly payment'
        : '+' + money(difference) + ' per month vs. lowest';
    });

    const leaseTotalCost = (r.leasePayment * r.leaseMonths) + Math.max(r.leaseDue - r.leasePayment, 0);
    const retailInterest = Math.max((r.retailPayment * r.financeMonths) - r.retailFinanceAmount, 0);
    const retailTotalPaid = (r.retailPayment * r.financeMonths) + r.d.cashDown;
    const selectTotalPaid = (r.selectPayment * r.selectMonths) + r.balloon + r.d.cashDown;

    document.getElementById('quoteLeaseTotalCost').textContent = money(leaseTotalCost);
    document.getElementById('quoteRetailInterest').textContent = money(retailInterest);
    document.getElementById('quoteRetailTotalPaid').textContent = money(retailTotalPaid);
    document.getElementById('quoteSelectTotalPaid').textContent = money(selectTotalPaid);

    const milesSelect = document.getElementById('includedMiles');
    const milesText = milesSelect.options[milesSelect.selectedIndex].text;

    const leasePaymentElement = document.getElementById('quoteLeasePayment');
    const leasePaymentLabel = document.getElementById('quoteLeasePaymentLabel');
    const onePayDetail = document.getElementById('quoteOnePayDetail');

    if (r.leaseType === 'onepay') {
      leasePaymentElement.textContent = money(r.onePayAmount);
      leasePaymentLabel.textContent = 'ONE-PAY LEASE';
      onePayDetail.hidden = false;
      onePayDetail.textContent = 'Equivalent Monthly: ' + money(r.onePayEquivalentMonthly);
    } else {
      leasePaymentElement.textContent = money(r.leasePayment);
      leasePaymentLabel.textContent = 'PER MONTH';
      onePayDetail.hidden = true;
      onePayDetail.textContent = '';
    }
    document.getElementById('quoteLeaseTerm').textContent = r.leaseMonths + ' months';
    document.getElementById('quoteLeaseMiles').textContent =
      milesText === 'Select Miles' ? '' : milesText;
    document.getElementById('quoteLeaseResidual').textContent = money(r.residual);
    document.getElementById('quoteLeaseMF').textContent = r.moneyFactor.toFixed(5);
    document.getElementById('quoteLeaseDue').textContent = money(r.leaseType === 'onepay' ? r.onePayAmount : r.leaseDue);

    const retailTitle = document.getElementById('quoteRetailTitle');
    const retailPaymentLabel = document.getElementById('quoteRetailPaymentLabel');
    if (r.cashPurchase) {
      retailTitle.textContent = 'Cash Purchase';
      document.getElementById('quoteRetailPayment').textContent = money(r.cashPurchaseTotal);
      retailPaymentLabel.textContent = 'TOTAL CASH DUE';
      document.getElementById('quoteRetailTerm').textContent = 'Cash Purchase';
      document.getElementById('quoteRetailApr').textContent = '';
    } else {
      if (retailTitle) retailTitle.textContent = 'Finance';
      document.getElementById('quoteRetailPayment').textContent = money(r.retailPayment);
      retailPaymentLabel.textContent = 'PER MONTH';
      document.getElementById('quoteRetailTerm').textContent = r.financeMonths + ' months';
      document.getElementById('quoteRetailApr').textContent = r.aprRate.toFixed(2) + '%';
    }
    document.getElementById('quoteRetailDueUpFront').textContent = money(r.d.cashDown);

    document.getElementById('quoteSelectPayment').textContent = money(r.selectPayment);
    document.getElementById('quoteSelectTerm').textContent = r.selectMonths + ' months';
    document.getElementById('quoteSelectApr').textContent = r.selectApr.toFixed(2) + '%';
    document.getElementById('quoteBalloon').textContent = money(r.balloon);
    document.getElementById('quoteSelectDueUpFront').textContent = money(r.d.cashDown);

    const showLeaseDetails = document.getElementById('showLeaseDetails').checked;
    document.getElementById('quoteLeaseResidualRow').style.display =
      showLeaseDetails ? 'flex' : 'none';
    document.getElementById('quoteLeaseMFRow').style.display =
      showLeaseDetails ? 'flex' : 'none';

    document.getElementById('quoteRetailAprRow').style.display =
      (!r.cashPurchase && document.getElementById('showRetailRate').checked) ? 'flex' : 'none';

    const showSelectDetails = document.getElementById('showSelectDetails').checked;
    document.getElementById('quoteSelectAprRow').style.display =
      showSelectDetails ? 'flex' : 'none';
    document.getElementById('quoteBalloonRow').style.display =
      showSelectDetails ? 'flex' : 'none';
  }
