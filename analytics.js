(function () {
  const CONSENT_KEY = "aicf_analytics_consent";
  const SESSION_KEY = "aicf_analytics_session";
  let enabled = false;

  function randomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function sessionId() {
    let value = sessionStorage.getItem(SESSION_KEY);
    if (!value) {
      value = randomId();
      sessionStorage.setItem(SESSION_KEY, value);
    }
    return value;
  }

  function fieldValue(selectors) {
    for (const selector of selectors) {
      const field = document.querySelector(selector);
      if (field?.value?.trim()) return field.value.trim();
    }
    return "";
  }

  function knownVisitor() {
    return {
      knownName: fieldValue(["[data-name-input]", "[data-modal-name]", "#inline-name", "#subscriber-name"]),
      knownEmail: fieldValue(["#subscriber-email", "[data-portal-email]", 'input[type="email"]']),
      knownPhone: fieldValue(["[data-mtn-phone]", 'input[type="tel"]']),
    };
  }

  function send(type, payload = {}) {
    if (!enabled) return;
    const body = JSON.stringify({
      consent: "granted",
      type,
      path: `${location.pathname}${location.search}`,
      referrer: document.referrer,
      pageTitle: document.title,
      sessionId: sessionId(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      language: navigator.language || "",
      ...knownVisitor(),
      ...payload,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/event", new Blob([body], { type: "application/json" }));
      return;
    }

    fetch("/api/analytics/event", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function labelFor(element) {
    return element.dataset.analyticsLabel
      || element.getAttribute("aria-label")
      || element.textContent?.replace(/\s+/g, " ").trim()
      || element.getAttribute("href")
      || element.tagName.toLowerCase();
  }

  function start() {
    if (enabled) return;
    enabled = true;
    send("page_view", { label: document.title });

    document.addEventListener("click", (event) => {
      const target = event.target.closest("a, button");
      if (!target || target.closest("[data-analytics-consent]")) return;
      send("click", {
        label: labelFor(target),
        href: target.getAttribute("href") || "",
      });
    });

    document.addEventListener("play", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLVideoElement)) return;
      send("video_play", {
        label: target.closest(".story-card, .managed-card")?.querySelector("h3")?.textContent?.trim()
          || target.getAttribute("src")
          || "Video play",
      });
    }, true);
  }

  function installConsent() {
    if (localStorage.getItem(CONSENT_KEY)) return;
    const banner = document.createElement("section");
    banner.className = "analytics-consent";
    banner.dataset.analyticsConsent = "true";
    banner.innerHTML = `
      <div>
        <strong>Improve the giving journey</strong>
        <p>Allow privacy-respecting analytics so Al-Ihsan can see page visits and button clicks. Names or emails are only stored when a visitor enters them.</p>
      </div>
      <div>
        <button class="btn btn-secondary" type="button" data-decline-analytics>Not now</button>
        <button class="btn btn-primary" type="button" data-accept-analytics>Allow analytics</button>
      </div>
    `;
    banner.querySelector("[data-accept-analytics]").addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "granted");
      banner.remove();
      start();
    });
    banner.querySelector("[data-decline-analytics]").addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "denied");
      banner.remove();
    });
    document.body.appendChild(banner);
    window.lucide?.createIcons();
  }

  if (localStorage.getItem(CONSENT_KEY) === "granted") {
    start();
  } else {
    installConsent();
  }
})();
