const authPanel = document.querySelector("[data-auth-panel]");
const dashboard = document.querySelector("[data-dashboard]");
const authForm = document.querySelector("[data-auth-form]");
const authMode = document.querySelector("[data-auth-mode]");
const authTitle = document.querySelector("[data-auth-title]");
const authCopy = document.querySelector("[data-auth-copy]");
const authStatus = document.querySelector("[data-auth-status]");
const authSubmit = document.querySelector("[data-auth-submit]");
const passwordInput = document.querySelector("#password");
const emailAuthForm = document.querySelector("[data-email-auth-form]");
const sendAdminCode = document.querySelector("[data-send-admin-code]");
const emailAuthStatus = document.querySelector("[data-email-auth-status]");
const fileInput = document.querySelector("[data-file-input]");
const fileName = document.querySelector("[data-file-name]");
const storyControls = document.querySelector("[data-story-controls]");
const featureStoryInput = document.querySelector("[data-feature-story]");
const uploadForm = document.querySelector("[data-upload-form]");
const uploadStatus = document.querySelector("[data-upload-status]");
const library = document.querySelector("[data-library]");
const mtnStatus = document.querySelector("[data-mtn-admin-status]");
const mtnConfigForm = document.querySelector("[data-mtn-config-form]");
const mtnProvisionForm = document.querySelector("[data-mtn-provision-form]");
const mtnProvisionStatus = document.querySelector("[data-mtn-provision-status]");
const bankStatus = document.querySelector("[data-bank-admin-status]");
const bankConfigForm = document.querySelector("[data-bank-config-form]");
const paymentStatus = document.querySelector("[data-payment-admin-status]");
const paymentConfigForm = document.querySelector("[data-payment-config-form]");
const readinessStatus = document.querySelector("[data-readiness-status]");
const readinessBoard = document.querySelector("[data-readiness-board]");
const campaignStatus = document.querySelector("[data-campaign-status]");
const campaignForm = document.querySelector("[data-campaign-form]");
const campaignList = document.querySelector("[data-campaign-list]");
const reportStatus = document.querySelector("[data-report-status]");
const reportForm = document.querySelector("[data-report-form]");
const reportList = document.querySelector("[data-report-list]");
const emailStatus = document.querySelector("[data-email-status]");
const updateEmailForm = document.querySelector("[data-update-email-form]");
const subscriberCount = document.querySelector("[data-subscriber-count]");
const emailOutbox = document.querySelector("[data-email-outbox]");
const metricMedia = document.querySelector("[data-metric-media]");
const metricCampaigns = document.querySelector("[data-metric-campaigns]");
const metricSubscribers = document.querySelector("[data-metric-subscribers]");
const metricReadiness = document.querySelector("[data-metric-readiness]");

let setupRequired = false;

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: options.body instanceof FormData ? options.headers : {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(connectionHelp());
  }
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(connectionHelp());
  }
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

function connectionHelp() {
  if (location.protocol === "file:") {
    return "Open the master page through the secure local server: run START_AL_IHSAN_SITE.bat, then use http://127.0.0.1:8090/master.html.";
  }
  if (location.port !== "8090") {
    return "The secure upload API is on port 8090. Run START_AL_IHSAN_SITE.bat, then open http://127.0.0.1:8090/master.html.";
  }
  return "The secure upload server is not responding. Run START_AL_IHSAN_SITE.bat again, then reload this page.";
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

async function boot() {
  const status = await api("/api/status");
  setupRequired = status.setupRequired;

  if (status.authenticated) {
    showDashboard();
    return;
  }

  authPanel.hidden = false;
  dashboard.hidden = true;

  if (setupRequired) {
    authMode.textContent = "First-time setup";
    authTitle.textContent = "Create your master password.";
    authCopy.textContent = "Choose a strong password. It will be stored as a salted hash on this server and used to protect uploads.";
    authSubmit.textContent = "Create password";
    passwordInput.autocomplete = "new-password";
  }
}

async function showDashboard() {
  authPanel.hidden = true;
  dashboard.hidden = false;
  await Promise.all([loadLibrary(), loadMtnConfig(), loadBankConfig(), loadPaymentConfig(), loadReadiness(), loadCampaigns(), loadReports(), loadSubscribers()]);
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(authStatus, "Working...");
  const password = passwordInput.value;

  try {
    if (setupRequired) {
      await api("/api/setup", { method: "POST", body: JSON.stringify({ password }) });
      setupRequired = false;
    }
    await api("/api/login", { method: "POST", body: JSON.stringify({ password }) });
    passwordInput.value = "";
    setStatus(authStatus, "Unlocked.");
    window.siteToast?.("Master page unlocked", "You can now manage the live site.");
    await showDashboard();
  } catch (error) {
    setStatus(authStatus, error.message, true);
    window.siteToast?.("Login failed", error.message, "error");
  }
});

sendAdminCode?.addEventListener("click", async () => {
  const email = emailAuthForm.querySelector("[data-admin-email]").value.trim();
  setStatus(emailAuthStatus, "Sending login code...");
  try {
    const result = await api("/api/auth/email/request", { method: "POST", body: JSON.stringify({ email }) });
    const suffix = result.devCode ? ` Local dev code: ${result.devCode}` : "";
    setStatus(emailAuthStatus, `Code sent/prepared for ${result.maskedEmail}.${suffix}`);
    window.siteToast?.("Login code sent", "Check your admin inbox.");
  } catch (error) {
    setStatus(emailAuthStatus, error.message, true);
    window.siteToast?.("Code failed", error.message, "error");
  }
});

emailAuthForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailAuthForm.querySelector("[data-admin-email]").value.trim();
  const code = emailAuthForm.querySelector("[data-admin-code]").value.trim();
  setStatus(emailAuthStatus, "Verifying code...");
  try {
    await api("/api/auth/email/verify", { method: "POST", body: JSON.stringify({ email, code }) });
    setStatus(emailAuthStatus, "Unlocked.");
    window.siteToast?.("Master page unlocked", "Email code accepted.");
    await showDashboard();
  } catch (error) {
    setStatus(emailAuthStatus, error.message, true);
    window.siteToast?.("Login failed", error.message, "error");
  }
});

document.querySelector("[data-logout]").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST", body: JSON.stringify({}) });
  window.location.reload();
});

document.querySelector("[data-refresh]").addEventListener("click", loadLibrary);

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  fileName.textContent = file?.name || "No file selected";
  const isVideo = Boolean(file?.type?.startsWith("video/"));
  storyControls?.classList.toggle("is-active", isVideo);
  if (featureStoryInput) featureStoryInput.checked = isVideo;
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(uploadStatus, "Uploading...");
  const form = new FormData(uploadForm);

  try {
    await api("/api/admin/upload", { method: "POST", body: form });
    uploadForm.reset();
    fileName.textContent = "No file selected";
    storyControls?.classList.remove("is-active");
    setStatus(uploadStatus, "Published to the website.");
    window.siteToast?.("Media published", "The field update is now available on the public site.");
    await loadLibrary();
  } catch (error) {
    setStatus(uploadStatus, error.message, true);
    window.siteToast?.("Upload failed", error.message, "error");
  }
});

mtnConfigForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(mtnStatus, "Saving MTN settings...");
  const form = new FormData(mtnConfigForm);
  const payload = {
    enabled: Boolean(mtnConfigForm.querySelector("[data-mtn-enabled]").checked),
    baseUrl: form.get("baseUrl"),
    targetEnvironment: form.get("targetEnvironment"),
    currency: String(form.get("currency") || "").toUpperCase(),
    merchantPhone: form.get("merchantPhone"),
    subscriptionKey: form.get("subscriptionKey"),
    apiUser: form.get("apiUser"),
    apiKey: form.get("apiKey"),
  };

  try {
    const status = await api("/api/admin/mtn/config", { method: "POST", body: JSON.stringify(payload) });
    mtnConfigForm.querySelectorAll('input[type="password"]').forEach((input) => {
      input.value = "";
    });
    renderMtnConfig(status);
    await loadReadiness();
    window.siteToast?.("MTN settings saved", "Donation routing settings were updated.");
  } catch (error) {
    setStatus(mtnStatus, error.message, true);
    window.siteToast?.("MTN save failed", error.message, "error");
  }
});

mtnProvisionForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(mtnProvisionStatus, "Provisioning sandbox credentials...");
  const form = new FormData(mtnProvisionForm);

  try {
    const status = await api("/api/admin/mtn/provision-sandbox", {
      method: "POST",
      body: JSON.stringify({
        subscriptionKey: form.get("subscriptionKey"),
        callbackHost: form.get("callbackHost"),
        baseUrl: mtnConfigForm?.querySelector("[data-mtn-base-url]")?.value,
        currency: mtnConfigForm?.querySelector("[data-mtn-currency]")?.value,
        merchantPhone: mtnConfigForm?.querySelector("[data-mtn-merchant-phone]")?.value,
      }),
    });
    mtnProvisionForm.querySelector("[data-mtn-provision-key]").value = "";
    setStatus(mtnProvisionStatus, "Sandbox credentials created and saved.");
    renderMtnConfig(status);
    await loadReadiness();
    window.siteToast?.("Sandbox provisioned", "MTN sandbox credentials were created.");
  } catch (error) {
    setStatus(mtnProvisionStatus, error.message, true);
    window.siteToast?.("Provisioning failed", error.message, "error");
  }
});

bankConfigForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(bankStatus, "Saving ABSA receiving details...");
  const form = new FormData(bankConfigForm);
  const payload = {
    accountName: form.get("accountName"),
    bankName: form.get("bankName"),
    branch: form.get("branch"),
    accountNumber: form.get("accountNumber"),
    swift: form.get("swift"),
    currency: form.get("currency"),
    referencePrefix: form.get("referencePrefix"),
    instructions: form.get("instructions"),
  };

  try {
    const status = await api("/api/admin/bank/config", { method: "POST", body: JSON.stringify(payload) });
    bankConfigForm.querySelector("[data-bank-account-number]").value = "";
    renderBankConfig(status);
    await loadReadiness();
    window.siteToast?.("ABSA details saved", "Bank transfer information was updated.");
  } catch (error) {
    setStatus(bankStatus, error.message, true);
    window.siteToast?.("Bank save failed", error.message, "error");
  }
});

paymentConfigForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(paymentStatus, "Saving payment methods...");
  const form = new FormData(paymentConfigForm);
  try {
    const status = await api("/api/admin/payment/config", {
      method: "POST",
      body: JSON.stringify({
        airtelEnabled: paymentConfigForm.querySelector("[data-airtel-enabled]").checked,
        airtelProvider: form.get("airtelProvider"),
        airtelMerchantPhone: form.get("airtelMerchantPhone"),
        airtelPaymentLink: form.get("airtelPaymentLink"),
        airtelInstructions: form.get("airtelInstructions"),
        cardProvider: form.get("cardProvider"),
        cardCheckoutUrl: form.get("cardCheckoutUrl"),
        paymentPublicKey: form.get("paymentPublicKey"),
        paymentSecretKey: form.get("paymentSecretKey"),
      }),
    });
    paymentConfigForm.querySelectorAll('input[type="password"]').forEach((input) => {
      input.value = "";
    });
    renderPaymentConfig(status);
    await loadReadiness();
    window.siteToast?.("Payment methods saved", "Airtel and card settings were updated.");
  } catch (error) {
    setStatus(paymentStatus, error.message, true);
    window.siteToast?.("Payment save failed", error.message, "error");
  }
});

campaignForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(campaignStatus, "Saving campaign...");
  const form = new FormData(campaignForm);
  try {
    const data = await api("/api/admin/campaigns", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setStatus(campaignStatus, "Campaign saved and public goal updated.");
    campaignForm.querySelector("[data-campaign-id]").value = "";
    renderCampaigns(data.campaigns);
    window.siteToast?.("Campaign saved", "Public progress updated instantly.");
  } catch (error) {
    setStatus(campaignStatus, error.message, true);
    window.siteToast?.("Campaign save failed", error.message, "error");
  }
});

reportForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(reportStatus, "Publishing report...");
  const form = new FormData(reportForm);
  try {
    const data = await api("/api/admin/reports", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setStatus(reportStatus, "Verified report published to the public ledger.");
    reportForm.querySelector("[data-report-id]").value = "";
    renderReports(data.reports);
    window.siteToast?.("Report published", "The transparency ledger is updated.");
  } catch (error) {
    setStatus(reportStatus, error.message, true);
    window.siteToast?.("Report failed", error.message, "error");
  }
});

updateEmailForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(emailStatus, "Preparing donor update...");
  const form = new FormData(updateEmailForm);
  try {
    const result = await api("/api/admin/email/update", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    setStatus(emailStatus, `Update sent/prepared for ${result.recipients} subscribers via ${result.provider}.`);
    window.siteToast?.("Update prepared", `${result.recipients} subscriber${result.recipients === 1 ? "" : "s"} reached.`);
    await loadSubscribers();
  } catch (error) {
    setStatus(emailStatus, error.message, true);
    window.siteToast?.("Email update failed", error.message, "error");
  }
});

campaignForm?.querySelectorAll("[data-campaign-unit-cost], [data-campaign-quantity]").forEach((field) => {
  field.addEventListener("input", () => {
    const unitCost = Number(campaignForm.querySelector("[data-campaign-unit-cost]").value) || 0;
    const quantity = Number(campaignForm.querySelector("[data-campaign-quantity]").value) || 1;
    campaignForm.querySelector("[data-campaign-target]").value = Math.max(1, Math.round(unitCost * quantity));
  });
});

function renderMedia(item) {
  const card = document.createElement("article");
  card.className = "media-card";
  const media = item.kind === "video"
    ? `<video src="${item.src}" controls preload="metadata"></video>`
    : `<img src="${item.src}" alt="${item.alt || item.title}">`;

  card.innerHTML = `
    ${media}
    <div>
      <h3>${escapeHtml(item.title || "Untitled media")}</h3>
      <p>${escapeHtml(item.caption || "Published to the public website.")}</p>
      ${item.kind === "video" && item.featureStory ? `<span class="media-chip">Homepage story</span>` : ""}
      <button class="btn btn-secondary" type="button"><i data-lucide="trash-2" aria-hidden="true"></i>Delete</button>
    </div>
  `;

  card.querySelector("button").addEventListener("click", async () => {
    if (!confirm("Delete this media from the website?")) return;
    await api(`/api/admin/media/${encodeURIComponent(item.id)}`, { method: "DELETE", body: JSON.stringify({}) });
    await loadLibrary();
  });

  return card;
}

async function loadLibrary() {
  library.innerHTML = "<p>Loading media...</p>";
  try {
    const { media } = await api("/api/admin/media");
    metricMedia.textContent = String(media.length);
    library.innerHTML = "";
    if (!media.length) {
      library.innerHTML = "<p>No uploaded media yet. Publish your first field update above.</p>";
      return;
    }
    media.forEach((item) => library.appendChild(renderMedia(item)));
    window.lucide?.createIcons();
  } catch (error) {
    library.innerHTML = `<p class="status is-error">${escapeHtml(error.message)}</p>`;
  }
}

async function loadMtnConfig() {
  if (!mtnConfigForm) return;
  try {
    renderMtnConfig(await api("/api/admin/mtn/config"));
  } catch (error) {
    setStatus(mtnStatus, error.message, true);
  }
}

function renderMtnConfig(status) {
  if (!mtnConfigForm) return;
  mtnConfigForm.querySelector("[data-mtn-enabled]").checked = Boolean(status.enabled);
  mtnConfigForm.querySelector("[data-mtn-base-url]").value = status.baseUrl || "https://sandbox.momodeveloper.mtn.com";
  mtnConfigForm.querySelector("[data-mtn-environment]").value = status.environment || "sandbox";
  mtnConfigForm.querySelector("[data-mtn-currency]").value = status.currency || "EUR";
  mtnConfigForm.querySelector("[data-mtn-merchant-phone]").value = status.merchantPhone || "256780937446";
  setMask("[data-mtn-subscription-mask]", status.masked?.subscriptionKey, "Collections key");
  setMask("[data-mtn-user-mask]", status.masked?.apiUser, "API user");
  setMask("[data-mtn-key-mask]", status.masked?.apiKey, "API key");

  if (status.configured) {
    setStatus(mtnStatus, `Connected: ${status.environment} / ${status.currency}`);
  } else {
    const missing = status.missing?.length ? ` Missing: ${status.missing.join(", ")}.` : "";
    setStatus(mtnStatus, `${status.setupMessage}${missing}`, true);
  }

  window.lucide?.createIcons();
}

function setMask(selector, value, label) {
  const element = mtnConfigForm.querySelector(selector);
  element.textContent = value ? `${label}: ${value}` : `${label}: not saved`;
}

async function loadBankConfig() {
  if (!bankConfigForm) return;
  try {
    renderBankConfig(await api("/api/admin/bank/config"));
  } catch (error) {
    setStatus(bankStatus, error.message, true);
  }
}

function renderBankConfig(status) {
  if (!bankConfigForm) return;
  const details = status.details || {};
  bankConfigForm.querySelector("[data-bank-account-name]").value = details.accountName || "AL-IHSAN CHARITY FOUNDATION";
  bankConfigForm.querySelector("[data-bank-name]").value = details.bankName || "Absa Bank Uganda";
  bankConfigForm.querySelector("[data-bank-branch]").value = details.branch || "";
  bankConfigForm.querySelector("[data-bank-swift]").value = details.swift || "";
  bankConfigForm.querySelector("[data-bank-currency]").value = details.currency || "UGX";
  bankConfigForm.querySelector("[data-bank-reference]").value = details.referencePrefix || "AICF-DONATION";
  bankConfigForm.querySelector("[data-bank-instructions]").value = details.instructions || "Use your name and donation cause as the transfer reference, then send proof for reconciliation.";
  bankConfigForm.querySelector("[data-bank-account-mask]").textContent = status.masked?.accountNumber
    ? `Account number: ${status.masked.accountNumber}`
    : "Account number: not saved";

  if (status.configured) {
    setStatus(bankStatus, "ABSA bank transfer details are live on the donation page.");
  } else {
    setStatus(bankStatus, status.setupMessage || "Add the ABSA account number to publish bank transfer details.", true);
  }

  window.lucide?.createIcons();
}

async function loadPaymentConfig() {
  if (!paymentConfigForm) return;
  try {
    renderPaymentConfig(await api("/api/admin/payment/config"));
  } catch (error) {
    setStatus(paymentStatus, error.message, true);
  }
}

async function loadReadiness() {
  if (!readinessBoard) return;
  try {
    const data = await api("/api/admin/readiness");
    const readyCount = data.checks.filter((item) => item.ready).length;
    metricReadiness.textContent = `${Math.round((readyCount / Math.max(1, data.checks.length)) * 100)}%`;
    setStatus(readinessStatus, `${readyCount} of ${data.checks.length} launch checks ready.`);
    readinessBoard.innerHTML = data.checks.map((item) => `
      <article class="readiness-item ${item.ready ? "is-ready" : "is-pending"}">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${item.ready ? "Ready" : "Pending"}</span>
        <p>${escapeHtml(item.detail)}</p>
      </article>
    `).join("");
  } catch (error) {
    setStatus(readinessStatus, error.message, true);
  }
}

function renderPaymentConfig(status) {
  const { airtel, card } = status;
  paymentConfigForm.querySelector("[data-airtel-enabled]").checked = Boolean(airtel.enabled);
  paymentConfigForm.querySelector("[data-airtel-provider]").value = airtel.provider || "Manual Airtel Money";
  paymentConfigForm.querySelector("[data-airtel-phone]").value = airtel.merchantPhone || "";
  paymentConfigForm.querySelector("[data-airtel-link]").value = airtel.paymentLink || "";
  paymentConfigForm.querySelector("[data-airtel-instructions]").value = airtel.instructions || "";
  paymentConfigForm.querySelector("[data-card-provider]").value = card.provider || "not configured";
  paymentConfigForm.querySelector("[data-card-checkout-url]").value = card.checkoutUrl || "";
  paymentConfigForm.querySelector("[data-card-public-mask]").textContent = card.masked?.publicKey ? `Public key: ${card.masked.publicKey}` : "Public key: not saved";
  paymentConfigForm.querySelector("[data-card-secret-mask]").textContent = card.masked?.secretKey ? `Secret key: ${card.masked.secretKey}` : "Secret key: not saved";
  setStatus(paymentStatus, `${airtel.configured ? "Airtel ready" : "Airtel pending"} / ${card.configured ? "Card keys saved" : "Card gateway pending"}`);
  window.lucide?.createIcons();
}

async function loadCampaigns() {
  if (!campaignList) return;
  try {
    const { campaigns } = await api("/api/admin/campaigns");
    metricCampaigns.textContent = String(campaigns.length);
    renderCampaigns(campaigns);
  } catch (error) {
    campaignList.innerHTML = `<p class="status is-error">${escapeHtml(error.message)}</p>`;
  }
}

function renderCampaigns(campaigns) {
  metricCampaigns.textContent = String(campaigns.length);
  campaignList.innerHTML = "";
  campaigns.forEach((campaign) => {
    const percent = Math.min(100, Math.round(((Number(campaign.raised) || 0) / (Number(campaign.target) || 1)) * 100));
    const card = document.createElement("article");
    card.className = "mini-record";
    card.innerHTML = `
      <strong>${escapeHtml(campaign.title)}</strong>
      <span>${escapeHtml(campaign.cause)} / ${percent}% funded</span>
      <small>${formatMoney(campaign.raised, campaign.currency)} of ${formatMoney(campaign.target, campaign.currency)}</small>
      <small>Latest price: ${formatMoney(campaign.unitCost, campaign.currency)} per ${escapeHtml(campaign.unitName || "unit")}</small>
      <small>${campaign.priceUpdatedAt ? `Price updated ${formatDate(campaign.priceUpdatedAt)}` : "Price update date pending"}</small>
      ${campaign.location ? `<small>${escapeHtml(campaign.location)}</small>` : ""}
      ${campaign.beneficiaries ? `<small>${escapeHtml(campaign.beneficiaries)}</small>` : ""}
      <div class="mini-progress"><i style="width:${percent}%"></i></div>
      <div class="mini-actions">
        <button class="btn btn-secondary" type="button" data-edit>Edit</button>
        <button class="btn btn-secondary" type="button" data-delete>Delete</button>
      </div>
    `;
    card.querySelector("[data-edit]").addEventListener("click", () => fillCampaignForm(campaign));
    card.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!confirm("Delete this campaign?")) return;
      const result = await api(`/api/admin/campaigns/${encodeURIComponent(campaign.id)}`, { method: "DELETE", body: JSON.stringify({}) });
      renderCampaigns(result.campaigns);
    });
    campaignList.appendChild(card);
  });
  window.lucide?.createIcons();
}

function fillCampaignForm(campaign) {
  const fields = {
    "[data-campaign-id]": campaign.id,
    "[data-campaign-title]": campaign.title,
    "[data-campaign-cause]": campaign.cause,
    "[data-campaign-unit-name]": campaign.unitName,
    "[data-campaign-icon]": campaign.icon,
    "[data-campaign-unit-cost]": campaign.unitCost,
    "[data-campaign-quantity]": campaign.quantity,
    "[data-campaign-raised]": campaign.raised,
    "[data-campaign-currency]": campaign.currency,
    "[data-campaign-target]": campaign.target,
    "[data-campaign-price-note]": campaign.priceNote,
    "[data-campaign-location]": campaign.location,
    "[data-campaign-beneficiaries]": campaign.beneficiaries,
    "[data-campaign-milestone]": campaign.milestone,
    "[data-campaign-next-need]": campaign.nextNeed,
    "[data-campaign-description]": campaign.description,
  };
  Object.entries(fields).forEach(([selector, value]) => {
    const field = campaignForm.querySelector(selector);
    if (field) field.value = value || "";
  });
  campaignForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function loadReports() {
  if (!reportList) return;
  try {
    const { reports } = await api("/api/admin/reports");
    renderReports(reports);
  } catch (error) {
    reportList.innerHTML = `<p class="status is-error">${escapeHtml(error.message)}</p>`;
  }
}

function renderReports(reports) {
  reportList.innerHTML = "";
  if (!reports.length) {
    reportList.innerHTML = "<p>No reports published yet.</p>";
    return;
  }
  reports.forEach((report) => {
    const card = document.createElement("article");
    card.className = "mini-record";
    card.innerHTML = `
      <strong>${escapeHtml(report.title)}</strong>
      <span>${escapeHtml(report.cause)}</span>
      <small>${[report.location, report.metric, report.deliveredOn ? formatDate(report.deliveredOn) : ""].filter(Boolean).map(escapeHtml).join(" / ")}</small>
      <div class="mini-actions">
        <button class="btn btn-secondary" type="button" data-edit>Edit</button>
        <button class="btn btn-secondary" type="button" data-delete>Delete</button>
      </div>
    `;
    card.querySelector("[data-edit]").addEventListener("click", () => fillReportForm(report));
    card.querySelector("[data-delete]").addEventListener("click", async () => {
      if (!confirm("Delete this report?")) return;
      const result = await api(`/api/admin/reports/${encodeURIComponent(report.id)}`, { method: "DELETE", body: JSON.stringify({}) });
      renderReports(result.reports);
    });
    reportList.appendChild(card);
  });
  window.lucide?.createIcons();
}

function fillReportForm(report) {
  const fields = {
    "[data-report-id]": report.id,
    "[data-report-title]": report.title,
    "[data-report-cause]": report.cause,
    "[data-report-location]": report.location,
    "[data-report-metric]": report.metric,
    "[data-report-date]": report.deliveredOn,
    "[data-report-icon]": report.icon,
    "[data-report-summary]": report.summary,
  };
  Object.entries(fields).forEach(([selector, value]) => {
    const field = reportForm.querySelector(selector);
    if (field) field.value = value || "";
  });
  reportForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function loadSubscribers() {
  if (!subscriberCount) return;
  try {
    const data = await api("/api/admin/subscribers");
    const active = data.subscribers.filter((item) => item.status === "active");
    metricSubscribers.textContent = String(active.length);
    subscriberCount.textContent = `${active.length} subscriber${active.length === 1 ? "" : "s"}`;
    emailStatus.textContent = `Email provider: ${data.emailProvider}. ${data.emailProvider === "local-outbox" ? "Messages are saved to local outbox until a real provider key is added." : "Real email sending is enabled."}`;
    emailOutbox.innerHTML = data.outbox.length
      ? data.outbox.map((item) => `<article class="mini-record"><strong>${escapeHtml(item.subject)}</strong><span>${escapeHtml(item.to)}</span><small>${escapeHtml(item.createdAt)} / ${escapeHtml(item.mode || "sent")}</small></article>`).join("")
      : "<p>No email updates prepared yet.</p>";
  } catch (error) {
    setStatus(emailStatus, error.message, true);
  }
}

function formatMoney(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

boot().catch((error) => {
  authPanel.hidden = false;
  dashboard.hidden = true;
  authMode.textContent = "Connection issue";
  authTitle.textContent = "The master server is not connected.";
  authCopy.textContent = "Uploads require the Node server, because static HTML cannot securely accept photos, videos, or logins.";
  authSubmit.disabled = true;
  setStatus(authStatus, error.message, true);
});
