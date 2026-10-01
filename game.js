"use strict";

const SAVE_KEY = "pocket-planet-save-v1";
const MILESTONES = [100, 500, 1500, 5000, 15000, 50000];
const state = loadState();
let toastTimeout;
let lastSavedAt = Date.now();

const elements = {
  dust: document.querySelector("#dust-count"),
  perTap: document.querySelector("#per-tap"),
  perSecond: document.querySelector("#per-second"),
  sproutsOwned: document.querySelector("#sprouts-owned"),
  beamsOwned: document.querySelector("#beams-owned"),
  sproutCost: document.querySelector("#sprout-cost"),
  beamCost: document.querySelector("#beam-cost"),
  sproutEffect: document.querySelector("#sprout-effect"),
  beamEffect: document.querySelector("#beam-effect"),
  upgradeCount: document.querySelector("#upgrade-count"),
  buySprout: document.querySelector("#buy-sprout"),
  buyBeam: document.querySelector("#buy-beam"),
  goalProgress: document.querySelector("#goal-progress-text"),
  progressFill: document.querySelector("#progress-fill"),
  goalMessage: document.querySelector("#goal-message"),
  worldAge: document.querySelector("#world-age"),
  planet: document.querySelector("#planet-button"),
  floatLayer: document.querySelector("#float-layer"),
  toast: document.querySelector("#toast")
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && Number.isFinite(saved.dust)) {
      const elapsedSeconds = Math.min(3600, Math.max(0, (Date.now() - saved.savedAt) / 1000));
      const beams = Math.max(0, Math.floor(saved.beams) || 0);
      return {
        dust: Math.max(0, saved.dust) + elapsedSeconds * beams,
        sprouts: Math.max(0, Math.floor(saved.sprouts) || 0),
        beams,
        totalEarned: Math.max(0, saved.totalEarned || saved.dust) + elapsedSeconds * beams
      };
    }
  } catch {
    localStorage.removeItem(SAVE_KEY);
  }

  return { dust: 0, sprouts: 0, beams: 0, totalEarned: 0 };
}

function tapPower() {
  return 1 + state.sprouts;
}

function sproutPrice() {
  return Math.floor(15 * Math.pow(1.45, state.sprouts));
}

function beamPrice() {
  return Math.floor(30 * Math.pow(1.55, state.beams));
}

function formatNumber(value) {
  if (value < 1000) return Math.floor(value).toLocaleString();
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  const [size, suffix] = units.find(([threshold]) => value >= threshold);
  const shortValue = value / size;
  return `${shortValue >= 100 ? Math.floor(shortValue) : shortValue.toFixed(1).replace(/\.0$/, "")}${suffix}`;
}

function render() {
  const dust = Math.floor(state.dust);
  const nextMilestone = MILESTONES.find((milestone) => state.totalEarned < milestone);
  const previousMilestone = MILESTONES[MILESTONES.indexOf(nextMilestone) - 1] || 0;
  const progress = nextMilestone
    ? Math.min(100, ((state.totalEarned - previousMilestone) / (nextMilestone - previousMilestone)) * 100)
    : 100;

  elements.dust.textContent = formatNumber(dust);
  elements.perTap.textContent = formatNumber(tapPower());
  elements.perSecond.textContent = formatNumber(state.beams);
  elements.sproutsOwned.textContent = state.sprouts;
  elements.beamsOwned.textContent = state.beams;
  elements.sproutCost.textContent = formatNumber(sproutPrice());
  elements.beamCost.textContent = formatNumber(beamPrice());
  elements.sproutEffect.textContent = `+${formatNumber(1)}`;
  elements.beamEffect.textContent = "1";
  elements.upgradeCount.textContent = `${state.sprouts + state.beams} owned`;
  elements.buySprout.disabled = dust < sproutPrice();
  elements.buyBeam.disabled = dust < beamPrice();
  elements.worldAge.textContent = `DAY ${String(Math.floor(state.totalEarned / 100) + 1).padStart(2, "0")}`;
  elements.progressFill.style.width = `${progress}%`;

  if (nextMilestone) {
    elements.goalProgress.textContent = `${formatNumber(state.totalEarned)} / ${formatNumber(nextMilestone)}`;
    elements.goalMessage.textContent = `Your next little moon is ${formatNumber(nextMilestone - state.totalEarned)} dust away.`;
  } else {
    elements.goalProgress.textContent = "ALL MOONS FOUND";
    elements.goalMessage.textContent = "Your tiny universe is anything but tiny now.";
  }
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    showToast("Progress could not be saved in this browser.");
  }
  lastSavedAt = Date.now();
}

function earn(amount) {
  state.dust += amount;
  state.totalEarned += amount;
  render();
}

function showFloat(amount, event) {
  const bounds = elements.planet.getBoundingClientRect();
  const float = document.createElement("span");
  float.className = "float-text";
  float.textContent = `+${formatNumber(amount)} ✦`;
  float.style.left = `${(event?.clientX ?? bounds.left + bounds.width / 2) - bounds.left}px`;
  float.style.top = `${(event?.clientY ?? bounds.top + bounds.height / 2) - bounds.top}px`;
  elements.floatLayer.append(float);
  float.addEventListener("animationend", () => float.remove(), { once: true });
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
}

elements.planet.addEventListener("click", (event) => {
  const amount = tapPower();
  earn(amount);
  showFloat(amount, event);
  elements.planet.classList.add("is-tapping");
  window.setTimeout(() => elements.planet.classList.remove("is-tapping"), 110);
});

elements.buySprout.addEventListener("click", () => {
  const cost = sproutPrice();
  if (state.dust < cost) return;
  state.dust -= cost;
  state.sprouts += 1;
  render();
  save();
  showToast("A moon sprout took root. Tap power +1!");
});

elements.buyBeam.addEventListener("click", () => {
  const cost = beamPrice();
  if (state.dust < cost) return;
  state.dust -= cost;
  state.beams += 1;
  render();
  save();
  showToast("Moonbeam collected. +1 dust per second!");
});

document.querySelector("#reset-button").addEventListener("click", () => {
  if (!window.confirm("Start over with a brand-new planet?")) return;
  state.dust = 0;
  state.sprouts = 0;
  state.beams = 0;
  state.totalEarned = 0;
  render();
  save();
  showToast("A fresh little world awaits.");
});

window.setInterval(() => {
  if (state.beams > 0) {
    earn(state.beams);
  }
  if (Date.now() - lastSavedAt >= 5000) save();
}, 1000);

window.addEventListener("beforeunload", save);
render();