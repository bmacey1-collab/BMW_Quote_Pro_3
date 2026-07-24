window.addEventListener('unhandledrejection', function(event) {
  console.error('BMW Quote Pro promise error:', event.reason);

  const message = event.reason && event.reason.message
    ? event.reason.message
    : String(event.reason || 'Unexpected application error');

  if (typeof showToast === 'function') {
    showToast(message, 'error');
  }
});

window.addEventListener('online', function() {
  const status = document.getElementById('connectionStatus');
  if (status && supabaseClient) {
    status.textContent = 'Connected automatically';
    status.classList.add('connected');
    status.classList.remove('error');
  }
});

window.addEventListener('offline', function() {
  const status = document.getElementById('connectionStatus');
  if (status) {
    status.textContent = 'Browser is offline';
    status.classList.add('error');
  }
});

window.addEventListener("error", function(event) {
  console.error("BMW Quote Pro error:", event.error || event.message);

  const status = document.getElementById("connectionStatus");
  if (status) {
    status.textContent = "Application error — check browser console";
    status.classList.add("error");
  }
});

document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll(".tab-button").forEach(function(button) {
    button.addEventListener("click", function() {
      showTab(button.dataset.tab);
    });
  });

  document.querySelectorAll("input, select, textarea").forEach(function(element) {
    if (["supabaseUrl", "supabaseKey", "authEmail", "authPassword",
         "savedQuoteSearch", "savedStatusFilter", "presetName"].includes(element.id)) {
      return;
    }

    element.addEventListener("input", calculateAll);
    element.addEventListener("change", calculateAll);
  });

  setDefaultQuoteDate();
  refreshPresetList();
  updateAboutDiagnostics();
  initializeSupabase();
  updateDatabaseSetupVisibility();
  calculateAll();
});
