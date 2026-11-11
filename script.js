
import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

// =================================
// SUPABASE VERBINDUNG
// =================================

const SUPABASE_URL = "https://gdheajxrajtgauvqqztq.supabase.co";
const SUPABASE_KEY = "sb_publishable_PZLkO3aoGAi9eHX9ft7flA_Ek41l_3o";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let machines = [];

// =================================
// DATENBANK LADEN
// =================================

async function loadMachines() {
  const { data, error } = await supabase
    .from("machines")
    .select("id, name, started_at, ends_at")
    .order("id");

  if (error) {
    showMessage("Fehler beim Laden der Waschmaschinen.");
    console.error(error);
    return;
  }

  machines = data;
  renderMachines();
}

// =================================
// TIMER FORMATIEREN
// =================================

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

// =================================
// MASCHINEN ANZEIGEN
// =================================

function renderMachines() {
  machines.forEach(machine => {
    const element = document.getElementById(
      `machine-${machine.id}`
    );

    if (!element) return;

    const status = element.querySelector(".status");
    const timer = element.querySelector(".timer");
    const description = element.querySelector(".description");
    const startButton = element.querySelector(".start-button");
    const releaseButton = element.querySelector(".release-button");

    const occupied = machine.started_at !== null;

    startButton.hidden = occupied;
    releaseButton.hidden = !occupied;

    if (!occupied) {
      status.textContent = "Frei";
      status.className = "status";

      timer.textContent = "00:00:00";
      description.textContent = "Bereit zum Waschen";

      return;
    }

    const remaining = Math.max(
      0,
      Math.ceil(
        (new Date(machine.ends_at).getTime() - Date.now()) / 1000
      )
    );

    if (remaining > 0) {
      status.textContent = "Belegt";
      status.className = "status busy";

      timer.textContent = formatTime(remaining);
      description.textContent = "Verbleibende Waschzeit";
    } else {
      status.textContent = "Zeit abgelaufen";
      status.className = "status expired";

      timer.textContent = "00:00:00";
      description.textContent = "Bitte Maschine freigeben";
    }
  });
}

// =================================
// WASCHEN STARTEN
// =================================

async function startMachine(id) {
  const button = document.querySelector(
    `#machine-${id} .start-button`
  );

  button.disabled = true;
  showMessage("");

  const { error } = await supabase.rpc(
    "start_machine",
    { p_machine_id: id }
  );

  if (error) {
    showMessage("Start fehlgeschlagen: " + error.message);
    button.disabled = false;
    return;
  }

  showMessage("Waschmaschine wurde gestartet.");
  await loadMachines();

  button.disabled = false;
}

// =================================
// MASCHINE FREIGEBEN
// =================================

async function releaseMachine(id) {
  const button = document.querySelector(
    `#machine-${id} .release-button`
  );

  button.disabled = true;
  showMessage("");

  const { error } = await supabase.rpc(
    "release_machine",
    { p_machine_id: id }
  );

  if (error) {
    showMessage("Freigabe fehlgeschlagen: " + error.message);
    button.disabled = false;
    return;
  }

  showMessage("Waschmaschine wurde freigegeben.");
  await loadMachines();

  button.disabled = false;
}

// =================================
// MELDUNGEN
// =================================

function showMessage(message) {
  document.getElementById("message").textContent = message;
}

// =================================
// FUNKTIONEN FÜR HTML VERFÜGBAR MACHEN
// =================================

window.startMachine = startMachine;
window.releaseMachine = releaseMachine;

// =================================
// LIVE-UPDATES VON SUPABASE
// =================================

supabase
  .channel("waschkueche-live")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "machines"
    },
    () => {
      loadMachines();
    }
  )
  .subscribe();

// =================================
// STARTEN
// =================================

loadMachines();

// Timer jede Sekunde aktualisieren
setInterval(renderMachines, 1000);

// Zusätzliche Synchronisierung alle 30 Sekunden
setInterval(loadMachines, 30000);
