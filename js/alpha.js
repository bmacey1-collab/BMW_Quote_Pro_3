let alphaScenarioCount = 3;
function addScenarioPreview() {
  const grid = document.getElementById('scenarioPreviewGrid');
  if (!grid) return;
  if (alphaScenarioCount >= 6) {
    if (typeof showToast === 'function') showToast('Alpha preview allows up to six draft scenarios.', 'error');
    return;
  }
  alphaScenarioCount += 1;
  const types = [
    {key:'lease', label:'Lease'},
    {key:'finance', label:'Finance'},
    {key:'cash', label:'Cash Purchase'},
    {key:'select', label:'BMW Select'}
  ];
  const type = types[(alphaScenarioCount - 1) % types.length];
  const card = document.createElement('article');
  card.className = 'scenario-preview-card ' + type.key;
  card.innerHTML = '<div class="scenario-type">' + type.label + '</div>' +
    '<h3>Scenario ' + alphaScenarioCount + '</h3>' +
    '<p>Duplicate, rename, validate, and roll payment in later Alpha builds.</p>' +
    '<span class="scenario-status">Design preview</span>';
  grid.appendChild(card);
}
