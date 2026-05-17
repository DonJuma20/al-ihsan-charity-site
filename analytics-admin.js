const dashboard = document.querySelector("[data-analytics-dashboard]");
const locked = document.querySelector("[data-analytics-locked]");
const refreshButton = document.querySelector("[data-refresh-analytics]");
const geoNote = document.querySelector("[data-geo-note]");
const totals = {
  pageViews: document.querySelector("[data-total-pageviews]"),
  clicks: document.querySelector("[data-total-clicks]"),
  videos: document.querySelector("[data-total-videos]"),
  sessions: document.querySelector("[data-total-sessions]"),
  known: document.querySelector("[data-total-known]"),
};
const topPages = document.querySelector("[data-top-pages]");
const topClicks = document.querySelector("[data-top-clicks]");
const visitorRows = document.querySelector("[data-visitor-rows]");
const eventList = document.querySelector("[data-event-list]");

async function api(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Analytics response was not readable.");
  }
  if (!response.ok) throw new Error(data.error || "Analytics could not load.");
  return data;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function visitorLabel(visitor) {
  if (visitor.knownName || visitor.knownEmail || visitor.knownPhone) {
    return {
      title: visitor.knownName || visitor.knownEmail || visitor.knownPhone,
      detail: [visitor.knownEmail, visitor.knownPhone].filter(Boolean).join(" / "),
    };
  }
  return {
    title: "Anonymous visitor",
    detail: visitor.sessionId.slice(0, 10),
  };
}

function locationLabel(visitor) {
  return [visitor.country, visitor.timezone].filter(Boolean).join(" / ") || "Location unavailable";
}

function renderRanks(container, rows, emptyText) {
  container.innerHTML = rows.length
    ? rows.map((item) => `
        <article class="rank-row">
          <strong>${escapeHtml(item.label)}</strong>
          <span>${item.count}</span>
        </article>
      `).join("")
    : `<p>${escapeHtml(emptyText)}</p>`;
}

function renderVisitors(visitors) {
  visitorRows.innerHTML = visitors.length
    ? visitors.map((visitor) => {
        const label = visitorLabel(visitor);
        return `
          <tr>
            <td><strong>${escapeHtml(label.title)}</strong><span>${escapeHtml(label.detail)}</span></td>
            <td>${escapeHtml(locationLabel(visitor))}</td>
            <td>${visitor.pageViews}</td>
            <td>${visitor.clicks}</td>
            <td>${visitor.videoPlays}</td>
            <td>${escapeHtml(formatDate(visitor.lastSeen))}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="6">No analytics yet.</td></tr>`;
}

function renderEvents(events) {
  eventList.innerHTML = events.length
    ? events.map((event) => `
        <article class="event-row">
          <strong>${escapeHtml(event.label || event.type)}</strong>
          <span>${escapeHtml(event.type)}${event.path ? ` / ${escapeHtml(event.path)}` : ""}</span>
          <small>${escapeHtml(formatDate(event.createdAt))}</small>
        </article>
      `).join("")
    : "<p>No events recorded yet.</p>";
}

async function loadAnalytics() {
  try {
    const data = await api("/api/admin/analytics");
    locked.hidden = true;
    dashboard.hidden = false;
    totals.pageViews.textContent = data.totals.pageViews;
    totals.clicks.textContent = data.totals.clicks;
    totals.videos.textContent = data.totals.videoPlays;
    totals.sessions.textContent = data.totals.sessions;
    totals.known.textContent = data.totals.knownVisitors;
    geoNote.textContent = data.geoConfigured
      ? "Country-level location enrichment is active. Known names and emails appear only when a visitor has provided them."
      : "Analytics are active. Add IPINFO_TOKEN on the server if you want country-level visitor location enrichment.";
    renderRanks(topPages, data.topPages || [], "No page views yet.");
    renderRanks(topClicks, data.topClicks || [], "No clicks yet.");
    renderVisitors(data.visitors || []);
    renderEvents(data.recentEvents || []);
  } catch {
    dashboard.hidden = true;
    locked.hidden = false;
  }
}

refreshButton?.addEventListener("click", loadAnalytics);
loadAnalytics();
