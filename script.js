const CONTACT = {
  whatsapp: "256704698086",
  email: "alihsanchar@gmail.com",
};

const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const modal = document.querySelector("[data-modal]");
const openDonateButtons = document.querySelectorAll("[data-open-donate]");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const mtnStatus = document.querySelector("[data-mtn-status]");
const mtnMessage = document.querySelector("[data-mtn-message]");
const mtnPhone = document.querySelector("[data-mtn-phone]");
const mtnPay = document.querySelector("[data-mtn-pay]");
let mtnPayment = { enabled: false, configured: false, currency: "UGX" };

const GOALS = {
  water: {
    label: "Water well target",
    cause: "Water well construction",
    target: 1100,
    defaultAmount: 70,
    copy: "Your donation covers {percent}% of one complete water well.",
  },
  masjid: {
    label: "Masjid construction target",
    cause: "Masjid construction",
    target: 20000,
    defaultAmount: 1100,
    copy: "Your donation covers {percent}% of a complete masjid target.",
  },
  food: {
    label: "Food pack campaign",
    cause: "Food packs and orphan feeding",
    target: 3000,
    defaultAmount: 30,
    copy: "Your donation covers {percent}% of a 100 food-pack campaign.",
  },
  "qurban-goat": {
    label: "Qurban goat",
    cause: "Qurban distribution - goat",
    target: 80,
    defaultAmount: 80,
    copy: "Your donation covers {percent}% of one qurban goat.",
  },
  "qurban-lamb": {
    label: "Qurban lamb",
    cause: "Qurban distribution - lamb",
    target: 100,
    defaultAmount: 100,
    copy: "Your donation covers {percent}% of one qurban lamb.",
  },
  "qurban-bull": {
    label: "Qurban bull",
    cause: "Qurban distribution - bull",
    target: 400,
    defaultAmount: 400,
    copy: "Your donation covers {percent}% of one qurban bull.",
  },
  quran: {
    label: "Quran copy campaign",
    cause: "Quran distribution",
    target: 1000,
    defaultAmount: 10,
    copy: "Your donation covers {percent}% of a 100 Quran-copy campaign.",
  },
};

let activeCampaigns = [];
const staticPublicData = window.AL_IHSAN_STATIC_DATA || {};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function impactText(cause, amountValue) {
  const amount = Number(amountValue) || 0;
  const safeCause = (cause || "").toLowerCase();

  if (amount <= 0) {
    return "Enter an amount to see the project impact.";
  }

  if (safeCause.includes("water")) {
    const wells = Math.floor(amount / 1100);
    return wells >= 1
      ? `Your gift can fund ${plural(wells, "complete water well")}.`
      : "Your gift goes toward a long lasting community water well.";
  }

  if (safeCause.includes("masjid")) {
    const percent = Math.min(100, Math.round((amount / 20000) * 100));
    return `Your gift covers about ${percent}% of a $20,000 masjid target.`;
  }

  if (safeCause.includes("quran")) {
    const copies = Math.floor(amount / 10);
    return copies >= 1
      ? `Your gift can provide ${plural(copies, "Quran copy")}.`
      : "Your gift goes toward Quran distribution for children, elders, and new Muslims.";
  }

  if (safeCause.includes("qurban")) {
    if (amount >= 400) {
      return `Your gift can provide ${plural(Math.floor(amount / 400), "bull")} for qurban distribution.`;
    }
    if (amount >= 100) {
      return `Your gift can provide ${plural(Math.floor(amount / 100), "lamb")} for qurban distribution.`;
    }
    if (amount >= 80) {
      return `Your gift can provide ${plural(Math.floor(amount / 80), "goat")} for qurban distribution.`;
    }
    return "Your gift goes toward qurban meat distribution for poor families.";
  }

  if (safeCause.includes("ramadhan") || safeCause.includes("iftar")) {
    const meals = Math.floor(amount / 3);
    const packs = Math.floor(amount / 10);
    if (packs >= 1) {
      return `Your gift can share about ${plural(meals, "iftar meal")} or ${plural(packs, "food pack")}.`;
    }
    return `Your gift can share about ${plural(Math.max(1, meals), "iftar meal")}.`;
  }

  if (safeCause.includes("food") || safeCause.includes("orphan")) {
    const packs = Math.floor(amount / 30);
    const meals = Math.floor(amount / 1);
    if (packs >= 1) {
      return `Your gift can provide ${plural(packs, "food pack")} or ${plural(meals, "orphan meal")}.`;
    }
    return `Your gift can provide ${plural(meals, "orphan meal")}.`;
  }

  return "Your donation will support the most urgent approved charity project.";
}

function buildMessage(values) {
  const amount = formatCurrency(values.amount);
  const nameLine = values.name ? `My name is ${values.name}. ` : "";
  const noteLine = values.note ? `Message: ${values.note}` : "Please send me bank details and the project report process.";

  return [
    "Assalamu alaikum Al-Ihsan Charity Foundation.",
    `${nameLine}I would like to donate ${amount} for ${values.cause}.`,
    noteLine,
    "Jazakum Allahu khairan.",
  ].join("\n");
}

function setDonateLinks(config) {
  const values = {
    cause: config.cause.value,
    amount: config.amount.value,
    name: config.name?.value.trim() || "",
    note: config.note?.value.trim() || "",
  };
  const message = buildMessage(values);
  const subject = `Donation pledge for ${values.cause}`;

  config.whatsapp.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
  config.email.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  if (config.payment) {
    const params = new URLSearchParams({ cause: values.cause, amount: values.amount });
    config.payment.href = `/pay.html?${params.toString()}`;
  }
  config.impact.textContent = impactText(values.cause, values.amount);
}

function markActiveAmount(buttons, amount) {
  buttons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.amountButton || button.dataset.modalAmountButton) === Number(amount));
  });
}

function wireDonationForm(config) {
  const buttons = Array.from(config.buttons);
  const update = () => {
    setDonateLinks(config);
    markActiveAmount(buttons, config.amount.value);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.amountButton || button.dataset.modalAmountButton;
      config.amount.value = value;
      update();
    });
  });

  [config.cause, config.amount, config.name, config.note].filter(Boolean).forEach((field) => {
    field.addEventListener("input", update);
    field.addEventListener("change", update);
  });

  [config.whatsapp, config.email].forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!config.amount.value || Number(config.amount.value) <= 0) {
        event.preventDefault();
        config.amount.focus();
      }
    });
  });

  update();
  return { update };
}

const inlineDonation = wireDonationForm({
  cause: document.querySelector("[data-cause-input]"),
  amount: document.querySelector("[data-amount-input]"),
  name: document.querySelector("[data-name-input]"),
  note: document.querySelector("[data-note-input]"),
  impact: document.querySelector("[data-impact-line]"),
  whatsapp: document.querySelector("[data-donate-whatsapp]"),
  email: document.querySelector("[data-donate-email]"),
  payment: document.querySelector("[data-open-payment]"),
  buttons: document.querySelectorAll("[data-amount-button]"),
});

const modalDonation = wireDonationForm({
  cause: document.querySelector("[data-modal-cause]"),
  amount: document.querySelector("[data-modal-amount]"),
  name: document.querySelector("[data-modal-name]"),
  note: document.querySelector("[data-modal-note]"),
  impact: document.querySelector("[data-modal-impact]"),
  whatsapp: document.querySelector("[data-modal-whatsapp]"),
  email: document.querySelector("[data-modal-email]"),
  buttons: document.querySelectorAll("[data-modal-amount-button]"),
});

function paymentUrl(source = {}) {
  const cause = source.cause || "General sadaqah and urgent needs";
  const amount = source.amount || "30";
  const params = new URLSearchParams({ cause, amount });
  return `/pay.html?${params.toString()}`;
}

function openDonationModal(source = {}) {
  window.location.href = paymentUrl(source);
}

function openDonationModalLegacy(source = {}) {
  const cause = source.cause || "General sadaqah and urgent needs";
  const amount = source.amount || "30";
  modal.hidden = false;
  document.body.classList.add("modal-open");
  setSelectValue(document.querySelector("[data-modal-cause]"), cause);
  document.querySelector("[data-modal-amount]").value = amount;
  modalDonation.update();
  setTimeout(() => document.querySelector("[data-modal-amount]").focus(), 30);
}

function closeDonationModal() {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function setSelectValue(select, value) {
  const exists = Array.from(select.options).some((option) => option.value === value || option.textContent === value);
  if (!exists) {
    select.add(new Option(value, value));
  }
  select.value = value;
}

function setMtnMessage(message, isError = false) {
  if (!mtnMessage) return;
  mtnMessage.textContent = message;
  mtnMessage.classList.toggle("is-error", isError);
}

function pulseHaptic(element) {
  if (navigator.vibrate) {
    navigator.vibrate(18);
  }
  element.classList.add("is-haptic");
  window.setTimeout(() => element.classList.remove("is-haptic"), 260);
}

openDonateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openDonationModal({
      cause: button.dataset.cause,
      amount: button.dataset.amount,
    });
  });
});

closeModalButtons.forEach((button) => button.addEventListener("click", closeDonationModal));

document.querySelectorAll("button, .btn, .amount-row button").forEach((element) => {
  element.addEventListener("pointerdown", () => pulseHaptic(element));
});

async function loadMtnStatus() {
  if (!mtnStatus || !mtnPay) return;
  try {
    const response = await fetch("/api/payments/mtn/status", { credentials: "same-origin" });
    const status = await response.json();
    mtnPayment = status;
    if (status.configured) {
      mtnStatus.textContent = `Ready: ${status.currency}`;
      mtnPay.disabled = false;
      setMtnMessage("Donor receives an MTN MoMo confirmation prompt on their phone.");
    } else {
      mtnStatus.textContent = "Setup required";
      mtnPay.disabled = true;
      setMtnMessage(status.setupMessage || "MTN API credentials are not connected yet. WhatsApp/email pledge still works.", true);
    }
  } catch {
    mtnStatus.textContent = "Server offline";
    mtnPay.disabled = true;
    setMtnMessage("Start the secure server before using MTN payments.", true);
  }
}

async function requestMtnPayment() {
  if (!mtnPayment.configured) {
    setMtnMessage("MTN API credentials are not connected yet. Use the pledge buttons for now.", true);
    return;
  }

  const donorPhone = mtnPhone.value.trim();
  const amount = document.querySelector("[data-amount-input]").value;
  const cause = document.querySelector("[data-cause-input]").value;
  const donorName = document.querySelector("[data-name-input]").value.trim();

  mtnPay.disabled = true;
  setMtnMessage("Sending MTN confirmation prompt...");

  try {
    const response = await fetch("/api/payments/mtn/request-to-pay", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        currency: mtnPayment.currency,
        cause,
        donorName,
        donorPhone,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "MTN payment failed.");
    setMtnMessage(`${data.message} Reference: ${data.referenceId}`);
    window.siteToast?.("MTN request sent", "The donor should now confirm on their phone.");
  } catch (error) {
    setMtnMessage(error.message, true);
    window.siteToast?.("MTN request failed", error.message, "error");
  } finally {
    mtnPay.disabled = false;
  }
}

mtnPay?.addEventListener("click", requestMtnPayment);

const goalProject = document.querySelector("[data-goal-project]");
const goalDonation = document.querySelector("[data-goal-donation]");
const goalDonate = document.querySelector("[data-goal-donate]");
const goalRing = document.querySelector("[data-goal-ring]");
const goalPercent = document.querySelector("[data-goal-percent]");
const goalLabel = document.querySelector("[data-goal-label]");
const goalSummary = document.querySelector("[data-goal-summary]");
const goalCopy = document.querySelector("[data-goal-copy]");
const goalBar = document.querySelector("[data-goal-bar]");
const publicCampaigns = document.querySelector("[data-public-campaigns]");
const publicReports = document.querySelector("[data-public-reports]");
const reportCount = document.querySelector("[data-report-count]");
const fieldSites = document.querySelector("[data-field-sites]");
const liveCampaignCount = document.querySelector("[data-live-campaign-count]");
const liveRaised = document.querySelector("[data-live-raised]");
const liveTarget = document.querySelector("[data-live-target]");
const spotlightTitle = document.querySelector("[data-spotlight-title]");
const spotlightCopy = document.querySelector("[data-spotlight-copy]");
const spotlightGap = document.querySelector("[data-spotlight-gap]");
const spotlightDonate = document.querySelector("[data-spotlight-donate]");
const goalPresets = document.querySelector("[data-goal-presets]");
const giftDock = document.querySelector("[data-gift-dock]");
const giftDockToggle = document.querySelector("[data-gift-dock-toggle]");
const giftDockList = document.querySelector("[data-gift-dock-list]");

function defaultCampaigns() {
  return Object.entries(GOALS).map(([id, goal]) => ({
    id,
    title: goal.label,
    cause: goal.cause,
    target: goal.target,
    raised: 0,
    currency: "USD",
    unitName: "project",
    unitCost: goal.defaultAmount,
    quantity: 1,
    icon: "heart-handshake",
    priceNote: "",
    priceUpdatedAt: "",
    description: goal.copy.replace("{percent}", "your"),
  }));
}

function fallbackCampaigns() {
  return Array.isArray(staticPublicData.campaigns) && staticPublicData.campaigns.length
    ? staticPublicData.campaigns
    : defaultCampaigns();
}

function currentCampaign() {
  return activeCampaigns.find((campaign) => campaign.id === goalProject.value) || activeCampaigns[0] || fallbackCampaigns()[0];
}

function updateGoal() {
  const goal = currentCampaign();
  const donation = Math.max(0, Number(goalDonation.value) || 0);
  const raised = Math.max(0, Number(goal.raised) || 0);
  const target = Math.max(1, Number(goal.target) || 1);
  const rawPercent = ((raised + donation) / target) * 100;
  const percent = Math.min(100, rawPercent);
  const displayPercent = Math.round(percent);

  goalRing.style.setProperty("--progress", percent.toFixed(2));
  goalBar.style.width = `${percent}%`;
  goalPercent.textContent = `${displayPercent}%`;
  goalLabel.textContent = goal.title;
  goalSummary.textContent = `${formatCurrency(raised + donation)} of ${formatCurrency(target)}`;
  const priceLine = goal.unitCost ? ` Latest price: ${formatCurrency(goal.unitCost)} per ${goal.unitName || "unit"}.` : "";
  goalCopy.textContent = `${formatCurrency(donation)} moves this campaign to ${displayPercent}% funded.${priceLine} ${goal.description || ""}`.trim();
  renderGoalPresets(goal);
}

goalProject.addEventListener("change", () => {
  const goal = currentCampaign();
  goalDonation.value = goal.unitCost || Math.max(1, Math.round((Number(goal.target) || 1) / 10));
  updateGoal();
});

goalDonation.addEventListener("input", updateGoal);

goalDonate.addEventListener("click", () => {
  const goal = currentCampaign();
  window.location.href = paymentUrl({ cause: goal.cause, amount: goalDonation.value });
});

async function loadCampaigns() {
  activeCampaigns = fallbackCampaigns();
  try {
    const response = await fetch("/api/public/campaigns", { credentials: "same-origin" });
    if (response.ok) {
      const data = await response.json();
      if (data.campaigns?.length) activeCampaigns = data.campaigns;
    }
  } catch {}

  goalProject.innerHTML = activeCampaigns
    .map((campaign) => `<option value="${escapeHtml(campaign.id)}">${escapeHtml(campaign.title)} - ${formatCurrency(campaign.target)}</option>`)
    .join("");
  goalDonation.value = activeCampaigns[0]?.unitCost || 70;
  renderPublicCampaigns();
  renderPulseBoard();
  renderGiftDock();
  updateGoal();
}

function renderPublicCampaigns() {
  if (!publicCampaigns) return;
  publicCampaigns.innerHTML = activeCampaigns.slice(0, 4).map((campaign) => {
    const percent = Math.min(100, Math.round(((Number(campaign.raised) || 0) / (Number(campaign.target) || 1)) * 100));
    return `
      <article class="campaign-card reveal is-visible">
        <span class="card-icon"><i data-lucide="${escapeHtml(campaign.icon || "target")}" aria-hidden="true"></i></span>
        <div>
          <p class="eyebrow">${percent}% funded</p>
          <h3>${escapeHtml(campaign.title)}</h3>
          <p>${escapeHtml(campaign.description || campaign.cause)}</p>
          ${renderCampaignMeta(campaign)}
          <p class="price-line">Latest: ${formatCurrency(campaign.unitCost)} / ${escapeHtml(campaign.unitName || "unit")}${campaign.priceUpdatedAt ? ` - updated ${escapeHtml(formatShortDate(campaign.priceUpdatedAt))}` : ""}</p>
          ${campaign.priceNote ? `<p class="price-note">${escapeHtml(campaign.priceNote)}</p>` : ""}
          <div class="mini-progress"><i style="width:${percent}%"></i></div>
          <strong>${formatCurrency(campaign.raised)} raised / ${formatCurrency(campaign.target)}</strong>
        </div>
      </article>
    `;
  }).join("");
  window.lucide?.createIcons();
}

function renderGoalPresets(goal) {
  if (!goalPresets) return;
  const target = Math.max(1, Number(goal.target) || 1);
  const unitCost = Math.max(1, Number(goal.unitCost) || Math.round(target / 10));
  const values = Array.from(new Set([
    unitCost,
    Math.max(unitCost, Math.round(target * 0.1)),
    Math.max(unitCost, Math.round(target * 0.25)),
    target,
  ])).sort((a, b) => a - b);

  goalPresets.innerHTML = values.map((value) => `
    <button type="button" data-goal-preset="${value}" class="${Number(goalDonation.value) === value ? "is-active" : ""}">
      ${value >= target ? "Complete goal" : formatCurrency(value)}
    </button>
  `).join("");

  goalPresets.querySelectorAll("[data-goal-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      goalDonation.value = button.dataset.goalPreset;
      updateGoal();
    });
  });
}

function renderPulseBoard() {
  if (!activeCampaigns.length) return;
  const totalRaised = activeCampaigns.reduce((sum, campaign) => sum + (Number(campaign.raised) || 0), 0);
  const totalTarget = activeCampaigns.reduce((sum, campaign) => sum + (Number(campaign.target) || 0), 0);
  const scoredCampaigns = activeCampaigns
    .map((campaign) => ({
      ...campaign,
      gap: Math.max(0, (Number(campaign.target) || 0) - (Number(campaign.raised) || 0)),
      percent: Math.min(100, Math.round(((Number(campaign.raised) || 0) / Math.max(1, Number(campaign.target) || 1)) * 100)),
    }));
  const spotlightPool = scoredCampaigns.some((campaign) => campaign.gap > 0)
    ? scoredCampaigns.filter((campaign) => campaign.gap > 0)
    : scoredCampaigns;
  const spotlight = spotlightPool
    .sort((a, b) => a.gap - b.gap || b.percent - a.percent)[0];

  liveCampaignCount.textContent = String(activeCampaigns.length);
  liveRaised.textContent = formatCurrency(totalRaised);
  liveTarget.textContent = formatCurrency(totalTarget);

  if (spotlight) {
    spotlightTitle.textContent = spotlight.title;
    spotlightCopy.textContent = spotlight.nextNeed
      ? `${spotlight.percent}% funded. Next field need: ${spotlight.nextNeed}.`
      : `${spotlight.percent}% funded. Your gift can help move this campaign toward completion.`;
    spotlightGap.textContent = spotlight.gap > 0 ? `${formatCurrency(spotlight.gap)} left` : "Goal reached";
    spotlightDonate.dataset.cause = spotlight.cause;
    spotlightDonate.dataset.amount = spotlight.unitCost || Math.max(1, Math.round((spotlight.target || 1) / 10));
  }
}

function renderGiftDock() {
  if (!giftDock || !giftDockList || !activeCampaigns.length) return;
  giftDock.hidden = false;
  giftDockList.innerHTML = activeCampaigns.slice(0, 4).map((campaign) => {
    const amount = campaign.unitCost || Math.max(1, Math.round((Number(campaign.target) || 1) / 10));
    return `
      <a href="${paymentUrl({ cause: campaign.cause, amount })}">
        <strong>${escapeHtml(campaign.title)}</strong>
        <span>${formatCurrency(amount)} quick gift</span>
      </a>
    `;
  }).join("");
}

function renderCampaignMeta(campaign) {
  const items = [campaign.location, campaign.beneficiaries, campaign.milestone].filter(Boolean);
  if (!items.length) return "";
  return `<div class="campaign-meta">${items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
}

function formatShortDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

loadCampaigns();

async function loadReports() {
  if (!publicReports || !reportCount) return;
  let reports = Array.isArray(staticPublicData.reports) ? staticPublicData.reports : [];
  try {
    const response = await fetch("/api/public/reports", { credentials: "same-origin" });
    if (response.ok) {
      const data = await response.json();
      reports = data.reports || reports;
    }
  } catch {}
  renderReports(reports);
}

loadReports();

function renderReports(reports) {
  reportCount.textContent = reports.length ? `${reports.length} verified report${reports.length === 1 ? "" : "s"}` : "No reports yet";
  publicReports.innerHTML = reports.length
    ? reports.slice(0, 3).map((report) => `
        <article class="report-card">
          <span class="card-icon"><i data-lucide="${escapeHtml(report.icon || "clipboard-check")}" aria-hidden="true"></i></span>
          <div class="report-meta">
            ${report.location ? `<span>${escapeHtml(report.location)}</span>` : ""}
            ${report.deliveredOn ? `<span>${escapeHtml(formatShortDate(report.deliveredOn))}</span>` : ""}
            ${report.metric ? `<span>${escapeHtml(report.metric)}</span>` : ""}
          </div>
          <h4>${escapeHtml(report.title)}</h4>
          <p>${escapeHtml(report.summary || report.cause)}</p>
        </article>
      `).join("")
    : `
      <article class="report-card report-empty">
        <span class="card-icon"><i data-lucide="sparkles" aria-hidden="true"></i></span>
        <h4>Verified reports will appear here</h4>
        <p>As field work is completed, Al-Ihsan can publish delivery notes, locations, and outcomes for donors to follow.</p>
      </article>
    `;
  window.lucide?.createIcons();
}

async function loadFieldMap() {
  if (!fieldSites) return;
  let data = staticPublicData.fieldMap || null;
  try {
    const response = await fetch("/api/public/field-map", { credentials: "same-origin" });
    if (response.ok) data = await response.json();
  } catch {}
  if (!data) return;
  const sites = [
    {
      title: data.headquarters.title,
      location: data.headquarters.location,
      metric: "Main coordination point",
    },
    ...(data.sites || []),
  ];
  fieldSites.innerHTML = sites.length
    ? sites.slice(0, 5).map((site) => `
        <article class="field-site">
          <strong>${escapeHtml(site.title)}</strong>
          <span>${escapeHtml(site.location || "Uganda")}</span>
          <small>${escapeHtml(site.metric || site.type || "Field work")}</small>
        </article>
      `).join("")
    : "";
}

loadFieldMap();

spotlightDonate?.addEventListener("click", () => {
  openDonationModal({
    cause: spotlightDonate.dataset.cause,
    amount: spotlightDonate.dataset.amount,
  });
});

giftDockToggle?.addEventListener("click", () => {
  const next = !giftDock.classList.contains("is-open");
  giftDock.classList.toggle("is-open", next);
  giftDockToggle.setAttribute("aria-expanded", String(next));
});

document.addEventListener("click", (event) => {
  if (!giftDock || giftDock.hidden || !giftDock.classList.contains("is-open")) return;
  if (giftDock.contains(event.target)) return;
  giftDock.classList.remove("is-open");
  giftDockToggle?.setAttribute("aria-expanded", "false");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) {
    closeDonationModal();
  }
});

navToggle.addEventListener("click", () => {
  const isOpen = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
  header.classList.toggle("is-open", !isOpen);
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    navToggle.setAttribute("aria-expanded", "false");
    header.classList.remove("is-open");
  }
});

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
  const message = "Assalamu alaikum Al-Ihsan Charity Foundation. I would like to ask about donating to your Uganda charity projects.";
  link.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
});

async function loadManagedMedia() {
  const section = document.querySelector("[data-managed-section]");
  const gallery = document.querySelector("[data-managed-gallery]");
  if (!section || !gallery) return;

  let media = Array.isArray(staticPublicData.media) ? staticPublicData.media : [];
  try {
    const response = await fetch("/api/public/media", { credentials: "same-origin" });
    if (response.ok) {
      const data = await response.json();
      media = data.media || media;
    }
  } catch {}
  if (!media.length) {
    section.hidden = true;
    return;
  }
  gallery.innerHTML = "";
  media.slice(0, 9).forEach((item) => {
    const card = document.createElement("article");
    card.className = "managed-card reveal is-visible";
    const mediaElement = item.kind === "video"
      ? `<video src="${item.src}" controls preload="metadata"></video>`
      : `<img src="${item.src}" alt="${escapeHtml(item.alt || item.title)}">`;
    card.innerHTML = `
      ${mediaElement}
      <div>
        <h3>${escapeHtml(item.title || "Field update")}</h3>
        <p>${escapeHtml(item.caption || "A new update from Al-Ihsan Charity Foundation.")}</p>
      </div>
    `;
    gallery.appendChild(card);
  });
  section.hidden = false;
}

const subscriberForm = document.querySelector("[data-subscriber-form]");
const subscriberStatus = document.querySelector("[data-subscriber-status]");
const sendSubscriberCode = document.querySelector("[data-send-subscriber-code]");

function setSubscriberStatus(message, isError = false) {
  if (!subscriberStatus) return;
  subscriberStatus.textContent = message;
  subscriberStatus.classList.toggle("is-error", isError);
}

sendSubscriberCode?.addEventListener("click", async () => {
  const form = new FormData(subscriberForm);
  const email = form.get("email");
  setSubscriberStatus("Sending confirmation code...");
  try {
    const response = await fetch("/api/subscribers/request", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not send code.");
    const dev = data.devCode ? ` Local dev code: ${data.devCode}` : "";
    setSubscriberStatus(`Confirmation code sent/prepared.${dev}`);
    window.siteToast?.("Code sent", "Check your inbox to confirm updates.");
  } catch (error) {
    setSubscriberStatus(error.message, true);
    window.siteToast?.("Code could not be sent", error.message, "error");
  }
});

subscriberForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(subscriberForm);
  setSubscriberStatus("Confirming subscription...");
  try {
    const response = await fetch("/api/subscribers/verify", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not subscribe.");
    subscriberForm.reset();
    setSubscriberStatus("Subscribed. Field updates will reach your email.");
    window.siteToast?.("Subscribed", "You will receive future field updates by email.");
  } catch (error) {
    setSubscriberStatus(error.message, true);
    window.siteToast?.("Subscription failed", error.message, "error");
  }
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

inlineDonation.update();
modalDonation.update();
loadMtnStatus();
loadManagedMedia();
