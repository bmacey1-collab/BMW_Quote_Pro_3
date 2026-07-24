const BUILT_IN_PRESETS = {
  standard: {
    leaseMonths: "36",
    financeMonths: "60",
    selectMonths: "60",
    acquisitionFee: "925",
    regFees: "135",
    docFee: "595"
  }
};

function getPresetStorage() {
  try {
    return JSON.parse(localStorage.getItem("vehicleQuoteProgramPresets") || "{}");
  } catch (error) {
    console.error("Unable to read presets:", error);
    return {};
  }
}

function refreshPresetList() {
  const select = document.getElementById("programPreset");
  if (!select) return;

  const selected = select.value;
  const presets = getPresetStorage();

  select.innerHTML =
    '<option value="">Select a preset</option>' +
    '<option value="standard">Standard BMW Defaults</option>';

  Object.keys(presets).sort().forEach(function(name) {
    const option = document.createElement("option");
    option.value = "saved:" + name;
    option.textContent = name;
    select.appendChild(option);
  });

  if ([...select.options].some(function(option) { return option.value === selected; })) {
    select.value = selected;
  }
}

function collectPresetValues() {
  const ids = [
    "salesTaxRate",
    "leaseMonths", "baseResidual", "includedMiles", "moneyFactor",
    "inceptionMileageCharge", "customMileageCharge",
    "financeMonths", "aprRate",
    "selectMonths", "selectAprRate", "balloonPercent",
    "acquisitionFee", "regFees", "docFee", "miscFee",
    "leaseIncentive1", "leaseIncentive2", "leaseIncentive3",
    "retailIncentive1", "retailIncentive2", "retailIncentive3",
    "selectIncentive1", "selectIncentive2", "selectIncentive3"
  ];

  const values = {};
  ids.forEach(function(id) {
    const element = document.getElementById(id);
    if (element) values[id] = element.value;
  });
  return values;
}

function restorePresetValues(values) {
  if (!values) return;
  Object.entries(values).forEach(function(entry) {
    const element = document.getElementById(entry[0]);
    if (element) element.value = entry[1];
  });
  calculateAll();
}

function applyProgramPreset() {
  const value = document.getElementById("programPreset").value;
  if (!value) return;

  if (value.startsWith("saved:")) {
    restorePresetValues(getPresetStorage()[value.slice(6)]);
    return;
  }

  restorePresetValues(BUILT_IN_PRESETS[value]);
}

function saveCustomPreset() {
  const name = document.getElementById("presetName").value.trim();
  if (!name) {
    alert("Enter a name for the preset.");
    return;
  }

  const presets = getPresetStorage();
  presets[name] = collectPresetValues();
  localStorage.setItem("vehicleQuoteProgramPresets", JSON.stringify(presets));
  refreshPresetList();
  document.getElementById("programPreset").value = "saved:" + name;
}

function deleteCustomPreset() {
  const value = document.getElementById("programPreset").value;
  if (!value.startsWith("saved:")) {
    alert("Select a saved custom preset first.");
    return;
  }

  const name = value.slice(6);
  if (!confirm('Delete preset "' + name + '"?')) return;

  const presets = getPresetStorage();
  delete presets[name];
  localStorage.setItem("vehicleQuoteProgramPresets", JSON.stringify(presets));
  refreshPresetList();
}
