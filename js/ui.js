function showTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach(function(panel) {
    panel.classList.toggle("active", panel.id === tabId);
  });

  document.querySelectorAll(".tab-button").forEach(function(button) {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  if (tabId === "resultsTab") {
    calculateAll();
  }

  if (tabId === "savedTab" && currentUser) loadSavedQuotes();
  if (tabId === "dashboardTab" && currentUser) loadDashboard();
  if (tabId === "clientsTab" && currentUser) loadClients();
  if (tabId === "emailTab") {
    prepareEmailFromCurrentQuote();
    if (currentUser) loadEmailHistory();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setDefaultQuoteDate() {
  const dateField = document.getElementById("quoteDate");

  if (dateField && !dateField.value) {
    const now = new Date();
    const localDate = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );

    dateField.value = localDate.toISOString().slice(0, 10);
  }
}

function printWorksheet() {
  document.body.classList.remove("print-quote");
  document.body.classList.add("print-worksheet");
  window.print();
}

function printQuote() {
  calculateAll();
  showTab("resultsTab");
  document.body.classList.remove("print-worksheet");
  document.body.classList.add("print-quote");
  window.print();
}

window.addEventListener("afterprint", function() {
  document.body.classList.remove("print-worksheet", "print-quote");
});


function clearForm() {
  currentQuoteId = null;
  currentCustomerId = null;
  showCurrentRecord(null);

  document.querySelectorAll("input").forEach(function(input) {
    if (
      input.type === "radio" ||
      input.type === "checkbox" ||
      input.readOnly
    ) {
      return;
    }

    input.value = "";
  });

  const defaults = {
    leaseMonths: "36",
    financeMonths: "60",
    selectMonths: "60",
    acquisitionFee: "925",
    regFees: "135",
    docFee: "595",
    includedMiles: "0"
  };

  Object.entries(defaults).forEach(function(entry) {
    const element = document.getElementById(entry[0]);
    if (element) element.value = entry[1];
  });

  const notes = document.getElementById("quoteNotes");
  if (notes) notes.value = "";
  const customerIdDisplay = document.getElementById("customerIdDisplay");
  if (customerIdDisplay) customerIdDisplay.value = "";

  const combineNo = document.querySelector(
    'input[name="combine"][value="no"]'
  );
  if (combineNo) combineNo.checked = true;

  const feesYes = document.querySelector(
    'input[name="feesIncluded"][value="yes"]'
  );
  if (feesYes) feesYes.checked = true;

  const standardLease = document.querySelector(
    'input[name="leaseType"][value="standard"]'
  );
  if (standardLease) standardLease.checked = true;

  const cashPurchase = document.getElementById("cashPurchase");
  if (cashPurchase) cashPurchase.checked = false;

  [
    "displayLease",
    "displayRetail",
    "displaySelect",
    "showLeaseDetails",
    "showRetailRate",
    "showSelectDetails"
  ].forEach(function(id) {
    const element = document.getElementById(id);
    if (element) element.checked = true;
  });

  setDefaultQuoteDate();
  calculateAll();
}
