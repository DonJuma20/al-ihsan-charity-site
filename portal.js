const portalAuth = document.querySelector("[data-portal-auth]");
const portalForm = document.querySelector("[data-portal-form]");
const portalEmail = document.querySelector("[data-portal-email]");
const portalCode = document.querySelector("[data-portal-code]");
const sendPortalCode = document.querySelector("[data-send-portal-code]");
const portalStatus = document.querySelector("[data-portal-status]");
const portalDashboard = document.querySelector("[data-portal-dashboard]");
const portalEmailLabel = document.querySelector("[data-portal-email-label]");
const receiptList = document.querySelector("[data-receipt-list]");
const portalLogout = document.querySelector("[data-portal-logout]");

function setStatus(message, isError = false) {
  portalStatus.textContent = message;
  portalStatus.classList.toggle("is-error", isError);
}

function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function date(value) {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function renderDonations(donations) {
  receiptList.innerHTML = donations.length
    ? donations.map((donation) => `
        <article class="receipt-card">
          <strong>${money(donation.amount, donation.currency)} - ${escapeHtml(donation.cause)}</strong>
          <div class="receipt-meta">
            <span>${escapeHtml(donation.provider)}</span>
            <span>${escapeHtml(donation.status)}</span>
            <span>${escapeHtml(donation.frequency || "one-time")}</span>
            ${donation.qurbanAnimal ? `<span>${escapeHtml(donation.qurbanQuantity || 1)} ${escapeHtml(donation.qurbanAnimal)}</span>` : ""}
          </div>
          <p>Reference: ${escapeHtml(donation.referenceId || "Pending")}</p>
          <p>${escapeHtml(date(donation.createdAt))}</p>
        </article>
      `).join("")
    : `
      <article class="receipt-card">
        <strong>No recorded donations yet</strong>
        <p>Donations made with the same email contact will appear here once recorded by the payment flow.</p>
      </article>
    `;
}

async function loadPortal() {
  try {
    const data = await api("/api/portal/me");
    portalAuth.hidden = true;
    portalDashboard.hidden = false;
    portalEmailLabel.textContent = data.email;
    renderDonations(data.donations || []);
  } catch {
    portalAuth.hidden = false;
    portalDashboard.hidden = true;
  }
}

sendPortalCode.addEventListener("click", async () => {
  setStatus("Sending portal code...");
  try {
    const data = await api("/api/portal/request", {
      method: "POST",
      body: JSON.stringify({ email: portalEmail.value.trim() }),
    });
    const suffix = data.devCode ? ` Local dev code: ${data.devCode}` : "";
    setStatus(`Code request accepted for ${data.maskedEmail}.${suffix || " Check your inbox, or contact Al-Ihsan if email delivery is not connected yet."}`);
    window.siteToast?.("Portal code sent", "Check your email to continue.");
  } catch (error) {
    setStatus(error.message, true);
    window.siteToast?.("Code failed", error.message, "error");
  }
});

portalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Opening portal...");
  try {
    await api("/api/portal/verify", {
      method: "POST",
      body: JSON.stringify({
        email: portalEmail.value.trim(),
        code: portalCode.value.trim(),
      }),
    });
    await loadPortal();
    window.siteToast?.("Portal opened", "Your donation history is ready.");
  } catch (error) {
    setStatus(error.message, true);
    window.siteToast?.("Portal login failed", error.message, "error");
  }
});

portalLogout.addEventListener("click", async () => {
  await fetch("/api/portal/logout", { method: "POST", credentials: "same-origin" });
  window.location.reload();
});

loadPortal();
