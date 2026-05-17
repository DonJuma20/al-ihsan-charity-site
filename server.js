const crypto = require("node:crypto");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, ".env");

loadDotEnv(ENV_FILE);

function resolveStoragePath(value, fallback) {
  if (!value) return fallback;
  return path.isAbsolute(value) ? value : path.resolve(ROOT, value);
}

const STORAGE_ROOT = resolveStoragePath(process.env.APP_STORAGE_DIR, ROOT);
const DATA_DIR = resolveStoragePath(process.env.DATA_DIR, path.join(STORAGE_ROOT, "data"));
const UPLOAD_DIR = resolveStoragePath(process.env.UPLOAD_DIR, path.join(STORAGE_ROOT, "uploads"));
const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const MEDIA_FILE = path.join(DATA_DIR, "media.json");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "subscribers.json");
const EMAIL_CODES_FILE = path.join(DATA_DIR, "email-codes.json");
const EMAIL_OUTBOX_FILE = path.join(DATA_DIR, "email-outbox.json");
const PORT = Number(process.env.PORT || 8090);
const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const SESSION_HOURS = 12;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov"]);
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];
const DEFAULT_ADMIN_EMAIL = "jumamuyita0@gmail.com";
const DEFAULT_CAMPAIGNS = [
  {
    id: "build-10-masjids",
    title: "Build 10 village masjids",
    cause: "Masjid construction",
    icon: "landmark",
    unitName: "masjid",
    unitCost: 20000,
    quantity: 10,
    target: 200000,
    priceNote: "$20,000 funds one complete village masjid, from planning and materials to worship-ready completion.",
    priceUpdatedAt: new Date().toISOString(),
    raised: 0,
    currency: "USD",
    status: "active",
    description: "A long-term sadaqah jariyah campaign to build ten complete village masjids in Uganda.",
    location: "Jinja, Uganda",
    beneficiaries: "Village worshippers",
    milestone: "Campaign open",
    nextNeed: "First masjid funding",
    createdAt: new Date().toISOString(),
  },
  {
    id: "water-wells-uganda",
    title: "Clean water wells",
    cause: "Water well construction",
    icon: "droplets",
    unitName: "well",
    unitCost: 1100,
    quantity: 10,
    target: 11000,
    priceNote: "$1,100 is the current water well estimate.",
    priceUpdatedAt: new Date().toISOString(),
    raised: 0,
    currency: "USD",
    status: "active",
    description: "Fund deep community water wells for rural families, children, and elders.",
    location: "Rural Uganda",
    beneficiaries: "Families and children",
    milestone: "Campaign open",
    nextNeed: "First well funding",
    createdAt: new Date().toISOString(),
  },
  {
    id: "quran-copies",
    title: "Quran distribution",
    cause: "Quran distribution",
    icon: "book-open",
    unitName: "Quran",
    unitCost: 10,
    quantity: 100,
    target: 1000,
    priceNote: "$10 is the current Quran copy estimate.",
    priceUpdatedAt: new Date().toISOString(),
    raised: 0,
    currency: "USD",
    status: "active",
    description: "Give Quran copies to children, elders, new Muslims, and students of knowledge.",
    location: "Uganda",
    beneficiaries: "Students of knowledge",
    milestone: "Distribution active",
    nextNeed: "More Quran copies",
    createdAt: new Date().toISOString(),
  },
];

function loadDotEnv(file) {
  if (!fsSync.existsSync(file)) return;
  const content = fsSync.readFileSync(file, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^"|"$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await ensureJsonFile(MEDIA_FILE, []);
  await ensureJsonFile(PAYMENTS_FILE, []);
  await ensureJsonFile(CAMPAIGNS_FILE, DEFAULT_CAMPAIGNS);
  await ensureJsonFile(REPORTS_FILE, []);
  await ensureJsonFile(SUBSCRIBERS_FILE, []);
  await ensureJsonFile(EMAIL_CODES_FILE, []);
  await ensureJsonFile(EMAIL_OUTBOX_FILE, []);
}

async function ensureJsonFile(file, fallback) {
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, `${JSON.stringify(fallback, null, 2)}\n`);
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' https://unpkg.com 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, payload, headers = {}) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function authConfig() {
  return readJson(AUTH_FILE, null);
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || "";
  header.split(";").forEach((part) => {
    const [key, ...value] = part.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value.join("="));
  });
  return cookies;
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createSession(secret) {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const nonce = crypto.randomBytes(18).toString("base64url");
  const payload = `${expires}.${nonce}`;
  return `${payload}.${sign(payload, secret)}`;
}

function createDonorSession(email, secret) {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ email, expires })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

function donorSession(req, auth) {
  if (!auth?.sessionSecret) return null;
  const token = parseCookies(req).aicf_donor;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, auth.sessionSecret);
  if (expected.length !== signature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!sanitizeEmail(parsed.email) || Number(parsed.expires) <= Date.now()) return null;
    return { email: sanitizeEmail(parsed.email), expires: Number(parsed.expires) };
  } catch {
    return null;
  }
}

function validSession(req, auth) {
  if (!auth?.sessionSecret) return false;
  const token = parseCookies(req).aicf_session;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload, auth.sessionSecret);
  const actual = parts[2];
  if (expected.length !== actual.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return false;
  return Number(parts[0]) > Date.now();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("base64url")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return { salt, hash };
}

function verifyPassword(password, auth) {
  const candidate = crypto.scryptSync(password, auth.salt, 64).toString("base64url");
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(auth.passwordHash));
}

function adminEmail(auth) {
  return sanitizeEmail(process.env.ADMIN_EMAIL || auth?.adminEmail || DEFAULT_ADMIN_EMAIL);
}

function sanitizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function maskEmail(email) {
  const clean = sanitizeEmail(email);
  if (!clean) return "";
  const [name, domain] = clean.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

function codeHash(code, salt) {
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("base64url");
}

async function createEmailCode({ email, purpose, subject, text, html }) {
  const cleanEmail = sanitizeEmail(email);
  if (!cleanEmail) throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
  const code = String(crypto.randomInt(100000, 1000000));
  const salt = crypto.randomBytes(12).toString("base64url");
  const codes = await readJson(EMAIL_CODES_FILE, []);
  const now = new Date().toISOString();
  const next = codes
    .filter((item) => !(item.email === cleanEmail && item.purpose === purpose))
    .filter((item) => new Date(item.expiresAt).getTime() > Date.now());
  next.unshift({
    id: crypto.randomUUID(),
    email: cleanEmail,
    purpose,
    salt,
    hash: codeHash(code, salt),
    attempts: 0,
    createdAt: now,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  await fs.writeFile(EMAIL_CODES_FILE, JSON.stringify(next.slice(0, 500), null, 2));
  const delivery = await deliverEmail({
    to: cleanEmail,
    subject,
    text: `${text}\n\nYour code is ${code}. It expires in 10 minutes.`,
    html: `${html}<p style="font-size:24px;font-weight:800;letter-spacing:4px">${code}</p><p>This code expires in 10 minutes.</p>`,
    code,
    purpose,
  });
  return { delivery, devCode: delivery.mode === "local-outbox" ? code : undefined };
}

async function verifyEmailCode({ email, purpose, code }) {
  const cleanEmail = sanitizeEmail(email);
  const cleanCode = String(code || "").replace(/\D/g, "");
  const codes = await readJson(EMAIL_CODES_FILE, []);
  const item = codes.find((entry) => entry.email === cleanEmail && entry.purpose === purpose);
  if (!item || new Date(item.expiresAt).getTime() < Date.now()) {
    throw Object.assign(new Error("The code expired. Request a new one."), { status: 400 });
  }
  if (item.attempts >= 5) {
    throw Object.assign(new Error("Too many attempts. Request a new code."), { status: 429 });
  }
  const ok = crypto.timingSafeEqual(Buffer.from(codeHash(cleanCode, item.salt)), Buffer.from(item.hash));
  const next = codes.filter((entry) => entry.id !== item.id);
  if (!ok) {
    item.attempts += 1;
    next.unshift(item);
    await fs.writeFile(EMAIL_CODES_FILE, JSON.stringify(next, null, 2));
    throw Object.assign(new Error("Incorrect code."), { status: 401 });
  }
  await fs.writeFile(EMAIL_CODES_FILE, JSON.stringify(next, null, 2));
  return true;
}

function emailConfig() {
  return {
    provider: (process.env.EMAIL_PROVIDER || "local-outbox").toLowerCase(),
    from: process.env.EMAIL_FROM || "Al-Ihsan Charity Foundation <updates@alihsancharity.org>",
    resendKey: process.env.RESEND_API_KEY || "",
    brevoKey: process.env.BREVO_API_KEY || "",
  };
}

async function deliverEmail(message) {
  const config = emailConfig();
  const baseRecord = {
    id: crypto.randomUUID(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    purpose: message.purpose || "general",
    createdAt: new Date().toISOString(),
  };

  if (config.provider === "resend" && config.resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (response.ok) return { mode: "resend", delivered: true };
  }

  if (config.provider === "brevo" && config.brevoKey) {
    const senderEmail = /<([^>]+)>/.exec(config.from)?.[1] || config.from;
    const senderName = config.from.includes("<") ? config.from.split("<")[0].trim() : "Al-Ihsan Charity Foundation";
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.brevoKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
      }),
    });
    if (response.ok) return { mode: "brevo", delivered: true };
  }

  const outbox = await readJson(EMAIL_OUTBOX_FILE, []);
  outbox.unshift({ ...baseRecord, code: message.code || undefined, mode: "local-outbox", delivered: false });
  await fs.writeFile(EMAIL_OUTBOX_FILE, JSON.stringify(outbox.slice(0, 1000), null, 2));
  return { mode: "local-outbox", delivered: false };
}

async function readBody(req, limit = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Request is too large."), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req, limit) {
  const raw = (await readBody(req, limit)).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw Object.assign(new Error("Invalid JSON body."), { status: 400 });
  }
}

function normalizeMsisdn(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("256") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.length === 9) return `256${digits}`;
  return digits;
}

function sanitizeEnvValue(value) {
  return String(value ?? "").replace(/[\r\n]/g, "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function serializeEnvValue(value) {
  const clean = sanitizeEnvValue(value);
  if (!clean) return "";
  if (/[\s#"'\\]/.test(clean)) {
    return `"${clean.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return clean;
}

async function updateDotEnv(updates) {
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates)
      .filter(([key]) => /^[A-Z0-9_]+$/.test(key))
      .map(([key, value]) => [key, sanitizeEnvValue(value)])
  );
  let lines = [];
  try {
    lines = (await fs.readFile(ENV_FILE, "utf8")).split(/\r?\n/);
  } catch {
    lines = [
      "# Al-Ihsan Charity Foundation local server settings",
      "# Do not publish this file. It may contain live API credentials.",
      "",
    ];
  }

  const written = new Set();
  const next = lines.map((line) => {
    const match = /^\s*([A-Z0-9_]+)\s*=/.exec(line);
    if (!match || !(match[1] in cleanUpdates)) return line;
    written.add(match[1]);
    return `${match[1]}=${serializeEnvValue(cleanUpdates[match[1]])}`;
  });

  Object.entries(cleanUpdates).forEach(([key, value]) => {
    process.env[key] = value;
    if (!written.has(key)) next.push(`${key}=${serializeEnvValue(value)}`);
  });

  await fs.writeFile(ENV_FILE, `${next.join("\n").replace(/\n+$/g, "")}\n`);
}

function mtnConfig() {
  return {
    enabled: process.env.MTN_MOMO_ENABLED === "true",
    baseUrl: process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com",
    environment: process.env.MTN_MOMO_TARGET_ENVIRONMENT || "sandbox",
    subscriptionKey: process.env.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY || "",
    apiUser: process.env.MTN_MOMO_API_USER || "",
    apiKey: process.env.MTN_MOMO_API_KEY || "",
    currency: process.env.MTN_MOMO_CURRENCY || "EUR",
    merchantPhone: normalizeMsisdn(process.env.MTN_MOMO_MERCHANT_PHONE || "256780937446"),
  };
}

function isMtnConfigured(config = mtnConfig()) {
  return Boolean(config.enabled && config.subscriptionKey && config.apiUser && config.apiKey);
}

function maskSecret(value) {
  if (!value) return "";
  const clean = String(value);
  if (clean.length <= 8) return "configured";
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function mtnMissing(config = mtnConfig()) {
  const missing = [];
  if (!config.enabled) missing.push("MTN_MOMO_ENABLED=true");
  if (!config.subscriptionKey) missing.push("MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY");
  if (!config.apiUser) missing.push("MTN_MOMO_API_USER");
  if (!config.apiKey) missing.push("MTN_MOMO_API_KEY");
  return missing;
}

function mtnSetupStage(config = mtnConfig()) {
  if (!config.subscriptionKey) return "missing_collection_subscription";
  if (!config.apiUser || !config.apiKey) return "missing_api_user_key";
  if (!config.enabled) return "ready_but_disabled";
  return "ready";
}

function mtnSetupMessage(config = mtnConfig()) {
  const stage = mtnSetupStage(config);
  if (stage === "missing_collection_subscription") {
    return "Subscribe to the MTN MoMo Collections product, then paste the primary subscription key in the master page.";
  }
  if (stage === "missing_api_user_key") {
    return "A Collections subscription key is present. Generate or paste the API User and API Key next.";
  }
  if (stage === "ready_but_disabled") {
    return "Credentials are present. Turn MTN MoMo on in the master page to activate RequestToPay.";
  }
  return "MTN MoMo RequestToPay is connected on the server.";
}

function mtnPublicStatus(config = mtnConfig()) {
  return {
    enabled: config.enabled,
    configured: isMtnConfigured(config),
    environment: config.environment,
    currency: config.currency,
    merchantPhone: config.merchantPhone,
    mode: config.enabled ? "MTN MoMo RequestToPay" : "manual pledge fallback",
    missing: mtnMissing(config),
    setupStage: mtnSetupStage(config),
    setupMessage: mtnSetupMessage(config),
    docs: {
      product: "https://momodeveloper.mtn.com/product#product=collections",
      api: "https://momodeveloper.mtn.com/API-collections",
      community: "https://momodevelopercommunity.mtn.com/how-to-59/understanding-momo-open-api-keys-sandbox-and-production-455",
    },
  };
}

function mtnPrivateStatus(config = mtnConfig()) {
  return {
    ...mtnPublicStatus(config),
    baseUrl: config.baseUrl,
    masked: {
      subscriptionKey: maskSecret(config.subscriptionKey),
      apiUser: maskSecret(config.apiUser),
      apiKey: maskSecret(config.apiKey),
    },
  };
}

function cardConfig() {
  return {
    provider: process.env.PAYMENT_PROVIDER || "not configured",
    configured: Boolean(process.env.PAYMENT_PUBLIC_KEY && process.env.PAYMENT_SECRET_KEY),
    checkoutUrl: process.env.PAYMENT_CHECKOUT_URL || "",
    logo: "/assets/logos/card.svg",
  };
}

function airtelConfig() {
  return {
    configured: process.env.AIRTEL_ENABLED === "true" && Boolean(process.env.AIRTEL_MERCHANT_PHONE || process.env.AIRTEL_PAYMENT_LINK),
    enabled: process.env.AIRTEL_ENABLED === "true",
    merchantPhone: normalizeMsisdn(process.env.AIRTEL_MERCHANT_PHONE || ""),
    paymentLink: process.env.AIRTEL_PAYMENT_LINK || "",
    provider: process.env.AIRTEL_PROVIDER || "Manual Airtel Money",
    instructions: process.env.AIRTEL_INSTRUCTIONS || "Use Airtel Money and send proof for reconciliation.",
    logo: "/assets/logos/airtel-logo.svg",
  };
}

function paymentPrivateStatus() {
  const card = cardConfig();
  const airtel = airtelConfig();
  return {
    card: {
      ...card,
      masked: {
        publicKey: maskSecret(process.env.PAYMENT_PUBLIC_KEY || ""),
        secretKey: maskSecret(process.env.PAYMENT_SECRET_KEY || ""),
      },
    },
    airtel,
    setupMessage: "Connect card checkout through a licensed gateway, and Airtel through a payment link, merchant number, or aggregator.",
  };
}

function bankConfig() {
  const accountName = process.env.SETTLEMENT_ACCOUNT_NAME || "AL-IHSAN CHARITY FOUNDATION";
  const details = {
    accountName,
    bankName: process.env.SETTLEMENT_BANK_NAME || "Absa Bank Uganda",
    branch: process.env.SETTLEMENT_BANK_BRANCH || "",
    accountNumber: process.env.SETTLEMENT_ACCOUNT_NUMBER || "",
    swift: process.env.SETTLEMENT_SWIFT_BIC || "",
    currency: process.env.SETTLEMENT_CURRENCY || "UGX",
    referencePrefix: process.env.SETTLEMENT_REFERENCE_PREFIX || "AICF-DONATION",
    instructions: process.env.SETTLEMENT_INSTRUCTIONS || "Use your name and donation cause as the transfer reference, then send proof for reconciliation.",
  };
  return {
    configured: Boolean(details.bankName && details.accountNumber),
    details,
  };
}

function maskAccountNumber(value) {
  const clean = String(value || "").replace(/\s+/g, "");
  if (!clean) return "";
  if (clean.length <= 4) return "configured";
  return `${"*".repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}

function bankPrivateStatus(config = bankConfig()) {
  return {
    configured: config.configured,
    details: {
      ...config.details,
      accountNumber: "",
    },
    masked: {
      accountNumber: maskAccountNumber(config.details.accountNumber),
    },
    setupMessage: config.configured
      ? "ABSA receiving details are live on the donation page."
      : "Add the ABSA account number to publish bank transfer details.",
  };
}

async function getMtnToken(config) {
  const credentials = Buffer.from(`${config.apiUser}:${config.apiKey}`).toString("base64");
  const response = await fetch(`${config.baseUrl}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": config.subscriptionKey,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw Object.assign(new Error(data.message || "MTN token request failed."), { status: 502 });
  }
  return data.access_token;
}

async function savePayment(record) {
  const payments = await readJson(PAYMENTS_FILE, []);
  payments.unshift(record);
  await fs.writeFile(PAYMENTS_FILE, JSON.stringify(payments.slice(0, 1000), null, 2));
}

function publicDonationRecord(payment) {
  return {
    provider: payment.provider,
    referenceId: payment.referenceId,
    amount: payment.amount,
    currency: payment.currency,
    cause: payment.cause,
    status: payment.status,
    frequency: payment.frequency || "one-time",
    qurbanAnimal: payment.qurbanAnimal || "",
    qurbanQuantity: payment.qurbanQuantity || 0,
    createdAt: payment.createdAt,
  };
}

function publicReadinessStatus() {
  const mtn = mtnConfig();
  const card = cardConfig();
  const bank = bankConfig();
  const email = emailConfig();
  const publicSiteUrl = process.env.PUBLIC_SITE_URL || "";
  return {
    publicSiteUrl,
    checks: [
      {
        id: "https",
        label: "HTTPS domain",
        ready: /^https:\/\/(?!your-domain\.org)/i.test(publicSiteUrl),
        detail: /^https:\/\//i.test(publicSiteUrl) ? publicSiteUrl : "Set PUBLIC_SITE_URL to the live HTTPS domain.",
      },
      {
        id: "email",
        label: "Live email",
        ready: (email.provider === "resend" && Boolean(email.resendKey)) || (email.provider === "brevo" && Boolean(email.brevoKey)),
        detail: email.provider === "local-outbox" ? "Email is still using local outbox." : `Provider: ${email.provider}`,
      },
      {
        id: "mtn",
        label: "MTN production",
        ready: isMtnConfigured(mtn) && mtn.environment !== "sandbox",
        detail: isMtnConfigured(mtn) ? `${mtn.environment} / ${mtn.currency}` : "MTN still needs live credentials.",
      },
      {
        id: "card",
        label: "Card checkout",
        ready: card.configured && Boolean(card.checkoutUrl),
        detail: card.configured ? card.provider : "No live card gateway keys saved.",
      },
      {
        id: "bank",
        label: "ABSA receiving",
        ready: bank.configured,
        detail: bank.configured ? `${bank.details.bankName} / ${bank.details.currency}` : "ABSA account number is not saved.",
      },
    ],
  };
}

function sanitizeFilename(name) {
  const base = path.basename(name || "upload").replace(/[^a-z0-9_.-]+/gi, "-").replace(/^-+|-+$/g, "");
  return base || "upload";
}

function parseMultipart(buffer, boundary) {
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buffer.indexOf(boundaryBuffer);

  while (start !== -1) {
    start += boundaryBuffer.length;
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;

    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), start);
    if (headerEnd === -1) break;
    const rawHeaders = buffer.slice(start, headerEnd).toString("utf8");
    let contentStart = headerEnd + 4;
    let next = buffer.indexOf(boundaryBuffer, contentStart);
    if (next === -1) break;
    let contentEnd = next - 2;
    if (contentEnd < contentStart) contentEnd = contentStart;

    const headers = {};
    rawHeaders.split("\r\n").forEach((line) => {
      const index = line.indexOf(":");
      if (index > -1) headers[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
    });

    const disposition = headers["content-disposition"] || "";
    const name = /name="([^"]+)"/.exec(disposition)?.[1];
    const filename = /filename="([^"]*)"/.exec(disposition)?.[1];
    parts.push({
      name,
      filename,
      type: headers["content-type"] || "application/octet-stream",
      data: buffer.slice(contentStart, contentEnd),
    });
    start = next;
  }

  return parts;
}

async function publicMedia() {
  const media = await readJson(MEDIA_FILE, []);
  return media.filter((item) => item.published !== false).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function requireAdmin(req, res) {
  const auth = await authConfig();
  if (!auth) {
    sendJson(res, 428, { error: "Admin password has not been created yet." });
    return null;
  }
  if (!validSession(req, auth)) {
    sendJson(res, 401, { error: "Login required." });
    return null;
  }
  return auth;
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/status" && req.method === "GET") {
    const auth = await authConfig();
    return sendJson(res, 200, { setupRequired: !auth, authenticated: !!auth && validSession(req, auth) });
  }

  if (url.pathname === "/api/setup" && req.method === "POST") {
    if (await authConfig()) return sendJson(res, 409, { error: "Admin password already exists." });
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    if (!body.password || body.password.length < 10) {
      return sendJson(res, 400, { error: "Use at least 10 characters for the admin password." });
    }
    const { salt, hash } = hashPassword(body.password);
    const auth = {
      salt,
      passwordHash: hash,
      sessionSecret: crypto.randomBytes(32).toString("base64url"),
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(AUTH_FILE, JSON.stringify(auth, null, 2));
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === "/api/login" && req.method === "POST") {
    const auth = await authConfig();
    if (!auth) return sendJson(res, 428, { error: "Admin password has not been created yet." });
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    if (!body.password || !verifyPassword(body.password, auth)) {
      return sendJson(res, 401, { error: "Incorrect password." });
    }
    const cookie = createSession(auth.sessionSecret);
    return sendJson(res, 200, { ok: true }, {
      "Set-Cookie": `aicf_session=${encodeURIComponent(cookie)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_HOURS * 60 * 60}`,
    });
  }

  if (url.pathname === "/api/auth/email/request" && req.method === "POST") {
    const auth = await authConfig();
    if (!auth) return sendJson(res, 428, { error: "Admin password must be created before email-code login." });
    const body = await readJsonBody(req, 64 * 1024);
    const email = sanitizeEmail(body.email);
    const allowed = adminEmail(auth);
    if (!email || email !== allowed) {
      return sendJson(res, 403, { error: "This email is not registered as the master admin email." });
    }
    const result = await createEmailCode({
      email,
      purpose: "admin-login",
      subject: "Your Al-Ihsan master login code",
      text: "Use this code to unlock the Al-Ihsan Charity Foundation master page.",
      html: "<p>Use this code to unlock the Al-Ihsan Charity Foundation master page.</p>",
    });
    return sendJson(res, 200, { ok: true, delivery: result.delivery, devCode: result.devCode, maskedEmail: maskEmail(email) });
  }

  if (url.pathname === "/api/auth/email/verify" && req.method === "POST") {
    const auth = await authConfig();
    if (!auth) return sendJson(res, 428, { error: "Admin password has not been created yet." });
    const body = await readJsonBody(req, 64 * 1024);
    const email = sanitizeEmail(body.email);
    if (!email || email !== adminEmail(auth)) return sendJson(res, 403, { error: "This email is not registered as the master admin email." });
    await verifyEmailCode({ email, purpose: "admin-login", code: body.code });
    const cookie = createSession(auth.sessionSecret);
    return sendJson(res, 200, { ok: true }, {
      "Set-Cookie": `aicf_session=${encodeURIComponent(cookie)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_HOURS * 60 * 60}`,
    });
  }

  if (url.pathname === "/api/portal/request" && req.method === "POST") {
    const body = await readJsonBody(req, 64 * 1024);
    const email = sanitizeEmail(body.email);
    if (!email) return sendJson(res, 400, { error: "Enter a valid email address." });
    const result = await createEmailCode({
      email,
      purpose: "donor-portal",
      subject: "Your Al-Ihsan donor portal code",
      text: "Use this code to open your Al-Ihsan donor portal.",
      html: "<p>Use this code to open your Al-Ihsan donor portal.</p>",
    });
    return sendJson(res, 200, { ok: true, delivery: result.delivery, devCode: result.devCode, maskedEmail: maskEmail(email) });
  }

  if (url.pathname === "/api/portal/verify" && req.method === "POST") {
    const auth = await authConfig();
    if (!auth) return sendJson(res, 428, { error: "The donor portal is not ready until the site admin password exists." });
    const body = await readJsonBody(req, 64 * 1024);
    const email = sanitizeEmail(body.email);
    await verifyEmailCode({ email, purpose: "donor-portal", code: body.code });
    const cookie = createDonorSession(email, auth.sessionSecret);
    return sendJson(res, 200, { ok: true }, {
      "Set-Cookie": `aicf_donor=${encodeURIComponent(cookie)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_HOURS * 60 * 60}`,
    });
  }

  if (url.pathname === "/api/portal/logout" && req.method === "POST") {
    send(res, 204, "", {
      "Set-Cookie": "aicf_donor=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      "Cache-Control": "no-store",
    });
    return;
  }

  if (url.pathname === "/api/portal/me" && req.method === "GET") {
    const auth = await authConfig();
    const session = donorSession(req, auth);
    if (!session) return sendJson(res, 401, { error: "Donor login required." });
    const payments = await readJson(PAYMENTS_FILE, []);
    const donations = payments
      .filter((item) => item.donorEmail === session.email)
      .map(publicDonationRecord);
    return sendJson(res, 200, {
      email: session.email,
      donations,
    });
  }

  if (url.pathname === "/api/logout" && req.method === "POST") {
    send(res, 204, "", {
      "Set-Cookie": "aicf_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      "Cache-Control": "no-store",
    });
    return;
  }

  if (url.pathname === "/api/payments/mtn/status" && req.method === "GET") {
    return sendJson(res, 200, mtnPublicStatus());
  }

  if (url.pathname === "/api/payments/methods" && req.method === "GET") {
    const mtn = mtnConfig();
    const card = cardConfig();
    const bank = bankConfig();
    return sendJson(res, 200, {
      mtn: mtnPublicStatus(mtn),
      card,
      airtel: airtelConfig(),
      bank,
      whatsapp: {
        configured: true,
        number: "256704698086",
      },
    });
  }

  if (url.pathname === "/api/payments/card/create" && req.method === "POST") {
    const card = cardConfig();
    if (!card.configured) {
      return sendJson(res, 503, {
        error: "Card checkout is not connected yet. Add a provider such as Pesapal, Flutterwave, DPO, or Network International, then place the live keys in .env.",
        provider: card.provider,
      });
    }
    if (card.checkoutUrl) {
      return sendJson(res, 200, {
        ok: true,
        provider: card.provider,
        checkoutUrl: card.checkoutUrl,
      });
    }

    return sendJson(res, 501, {
      error: "Card checkout keys are present, but the provider-specific checkout adapter has not been selected yet.",
      provider: card.provider,
      next: "Choose the provider adapter: Pesapal, Flutterwave, DPO, or another approved card acquirer.",
    });
  }

  if (url.pathname === "/api/payments/airtel/create" && req.method === "POST") {
    const airtel = airtelConfig();
    if (!airtel.configured) {
      return sendJson(res, 503, {
        error: "Airtel Money is not connected yet. Add an Airtel payment link, merchant number, or aggregator details in the master page.",
      });
    }
    const body = await readJsonBody(req, 64 * 1024);
    const donorEmail = sanitizeEmail(body.contact || body.donorEmail);
    await savePayment({
      provider: "airtel-money",
      referenceId: crypto.randomUUID(),
      amount: Number(body.amount) || 0,
      currency: "UGX",
      cause: String(body.cause || "General sadaqah and urgent needs").slice(0, 120),
      donorName: String(body.donorName || "Donor").slice(0, 80),
      donorEmail,
      donorContact: String(body.contact || "").slice(0, 120),
      frequency: body.frequency === "monthly" ? "monthly" : "one-time",
      status: "AWAITING_PROOF",
      createdAt: new Date().toISOString(),
    });
    return sendJson(res, 200, {
      ok: true,
      paymentLink: airtel.paymentLink,
      merchantPhone: airtel.merchantPhone,
      instructions: airtel.instructions,
      message: "Airtel donation instructions are ready.",
    });
  }

  if (url.pathname === "/api/payments/mtn/request-to-pay" && req.method === "POST") {
    const config = mtnConfig();
    if (!isMtnConfigured(config)) {
      return sendJson(res, 503, {
        error: mtnSetupMessage(config),
        needs: mtnMissing(config),
        setupStage: mtnSetupStage(config),
      });
    }

    const body = await readJsonBody(req, 64 * 1024);
    const amount = Number(body.amount);
    const donorPhone = normalizeMsisdn(body.donorPhone);
    const cause = String(body.cause || "General sadaqah and urgent needs").slice(0, 120);
    const donorName = String(body.donorName || "Donor").slice(0, 80);
    const donorEmail = sanitizeEmail(body.contact || body.donorEmail);
    const currency = String(body.currency || config.currency).toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0) return sendJson(res, 400, { error: "Enter a valid donation amount." });
    if (!/^256\d{9}$/.test(donorPhone)) return sendJson(res, 400, { error: "Enter a valid Uganda MTN phone number, for example 0780937446." });
    if (!/^[A-Z]{3}$/.test(currency)) return sendJson(res, 400, { error: "Invalid currency." });

    const referenceId = crypto.randomUUID();
    const externalId = `AICF-${Date.now()}`;
    const token = await getMtnToken(config);
    const payload = {
      amount: amount.toFixed(0),
      currency,
      externalId,
      payer: {
        partyIdType: "MSISDN",
        partyId: donorPhone,
      },
      payerMessage: `Al-Ihsan donation: ${cause}`,
      payeeNote: `Donation from ${donorName} for ${cause}`,
    };

    const response = await fetch(`${config.baseUrl}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": config.environment,
      },
      body: JSON.stringify(payload),
    });

    if (response.status !== 202) {
      const detail = await response.text().catch(() => "");
      return sendJson(res, 502, { error: "MTN MoMo RequestToPay failed.", detail });
    }

    await savePayment({
      provider: "mtn-momo",
      referenceId,
      externalId,
      amount,
      currency,
      cause,
      donorName,
      donorPhone,
      donorEmail,
      donorContact: String(body.contact || "").slice(0, 120),
      frequency: body.frequency === "monthly" ? "monthly" : "one-time",
      qurbanAnimal: String(body.qurbanAnimal || "").slice(0, 20),
      qurbanQuantity: Math.max(0, Number(body.qurbanQuantity) || 0),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

    return sendJson(res, 202, {
      ok: true,
      referenceId,
      status: "PENDING",
      message: "MTN has sent a confirmation prompt to the donor phone.",
    });
  }

  if (url.pathname.startsWith("/api/payments/mtn/") && req.method === "GET") {
    const config = mtnConfig();
    if (!isMtnConfigured(config)) return sendJson(res, 503, { error: "MTN MoMo is not enabled yet." });
    const referenceId = decodeURIComponent(url.pathname.split("/").pop());
    if (!/^[0-9a-f-]{36}$/i.test(referenceId)) return sendJson(res, 400, { error: "Invalid payment reference." });
    const token = await getMtnToken(config);
    const response = await fetch(`${config.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "X-Target-Environment": config.environment,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return sendJson(res, 502, { error: "Could not read MTN transaction status.", detail: data });
    return sendJson(res, 200, data);
  }

  if (url.pathname === "/api/public/media" && req.method === "GET") {
    return sendJson(res, 200, { media: await publicMedia() });
  }

  if (url.pathname === "/api/public/campaigns" && req.method === "GET") {
    const campaigns = await readJson(CAMPAIGNS_FILE, DEFAULT_CAMPAIGNS);
    return sendJson(res, 200, { campaigns: campaigns.filter((item) => item.status !== "hidden") });
  }

  if (url.pathname === "/api/public/reports" && req.method === "GET") {
    const reports = await readJson(REPORTS_FILE, []);
    return sendJson(res, 200, { reports: reports.filter((item) => item.status !== "hidden") });
  }

  if (url.pathname === "/api/public/field-map" && req.method === "GET") {
    const campaigns = await readJson(CAMPAIGNS_FILE, DEFAULT_CAMPAIGNS);
    const reports = await readJson(REPORTS_FILE, []);
    return sendJson(res, 200, {
      headquarters: {
        title: "Jinja City headquarters",
        location: "Jinja City, Uganda",
        coordinates: { x: 61, y: 62 },
      },
      sites: [
        ...campaigns
          .filter((item) => item.status !== "hidden" && item.location)
          .map((item) => ({
            title: item.title,
            type: "campaign",
            location: item.location,
            metric: item.milestone || item.beneficiaries || item.cause,
          })),
        ...reports
          .filter((item) => item.status !== "hidden" && item.location)
          .map((item) => ({
            title: item.title,
            type: "report",
            location: item.location,
            metric: item.metric || item.cause,
          })),
      ].slice(0, 8),
    });
  }

  if (url.pathname === "/api/subscribers/request" && req.method === "POST") {
    const body = await readJsonBody(req, 64 * 1024);
    const email = sanitizeEmail(body.email);
    if (!email) return sendJson(res, 400, { error: "Enter a valid email address." });
    const result = await createEmailCode({
      email,
      purpose: "subscriber",
      subject: "Confirm Al-Ihsan field updates",
      text: "Assalamu alaikum. Confirm your subscription to Al-Ihsan Charity Foundation field updates.",
      html: "<p>Assalamu alaikum.</p><p>Confirm your subscription to Al-Ihsan Charity Foundation field updates.</p>",
    });
    return sendJson(res, 200, { ok: true, delivery: result.delivery, devCode: result.devCode });
  }

  if (url.pathname === "/api/subscribers/verify" && req.method === "POST") {
    const body = await readJsonBody(req, 64 * 1024);
    const email = sanitizeEmail(body.email);
    await verifyEmailCode({ email, purpose: "subscriber", code: body.code });
    const subscribers = await readJson(SUBSCRIBERS_FILE, []);
    const existing = subscribers.find((item) => item.email === email);
    if (existing) {
      existing.status = "active";
      existing.updatedAt = new Date().toISOString();
    } else {
      subscribers.unshift({
        id: crypto.randomUUID(),
        email,
        name: String(body.name || "").slice(0, 80),
        status: "active",
        createdAt: new Date().toISOString(),
      });
    }
    await fs.writeFile(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 2));
    await deliverEmail({
      to: email,
      purpose: "subscriber-welcome",
      subject: "You are subscribed to Al-Ihsan updates",
      text: "Jazakum Allahu khairan. You will receive Al-Ihsan Charity Foundation project updates and campaign reports.",
      html: "<p>Jazakum Allahu khairan.</p><p>You will receive Al-Ihsan Charity Foundation project updates and campaign reports.</p>",
    });
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === "/api/admin/mtn/config" && req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
    return sendJson(res, 200, mtnPrivateStatus());
  }

  if (url.pathname === "/api/admin/mtn/config" && req.method === "POST") {
    if (!(await requireAdmin(req, res))) return;
    const body = await readJsonBody(req, 64 * 1024);
    const updates = {};

    if ("enabled" in body) updates.MTN_MOMO_ENABLED = body.enabled ? "true" : "false";
    if ("baseUrl" in body) {
      const baseUrl = sanitizeEnvValue(body.baseUrl) || "https://sandbox.momodeveloper.mtn.com";
      if (!/^https:\/\/[a-z0-9.-]+/i.test(baseUrl)) return sendJson(res, 400, { error: "Use a valid HTTPS MTN base URL." });
      updates.MTN_MOMO_BASE_URL = baseUrl.replace(/\/+$/g, "");
    }
    if ("targetEnvironment" in body) {
      const environment = sanitizeEnvValue(body.targetEnvironment) || "sandbox";
      if (!/^[a-z0-9_-]+$/i.test(environment)) return sendJson(res, 400, { error: "Use a valid MTN target environment." });
      updates.MTN_MOMO_TARGET_ENVIRONMENT = environment;
    }
    if ("currency" in body) {
      const currency = sanitizeEnvValue(body.currency || "UGX").toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) return sendJson(res, 400, { error: "Currency must be a 3-letter code such as UGX or EUR." });
      updates.MTN_MOMO_CURRENCY = currency;
    }
    if ("merchantPhone" in body) {
      const merchantPhone = normalizeMsisdn(body.merchantPhone);
      if (merchantPhone && !/^256\d{9}$/.test(merchantPhone)) return sendJson(res, 400, { error: "Use a valid Uganda phone number for the merchant line." });
      updates.MTN_MOMO_MERCHANT_PHONE = merchantPhone;
    }
    if ("subscriptionKey" in body && body.subscriptionKey) updates.MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY = body.subscriptionKey;
    if ("apiUser" in body && body.apiUser) updates.MTN_MOMO_API_USER = body.apiUser;
    if ("apiKey" in body && body.apiKey) updates.MTN_MOMO_API_KEY = body.apiKey;

    await updateDotEnv(updates);
    return sendJson(res, 200, mtnPrivateStatus());
  }

  if (url.pathname === "/api/admin/mtn/provision-sandbox" && req.method === "POST") {
    if (!(await requireAdmin(req, res))) return;
    const body = await readJsonBody(req, 64 * 1024);
    const current = mtnConfig();
    const subscriptionKey = sanitizeEnvValue(body.subscriptionKey || current.subscriptionKey);
    if (!subscriptionKey) {
      return sendJson(res, 400, {
        error: "Paste the MTN Collections subscription key first. It appears in your MTN Developer profile after subscribing to Collections.",
      });
    }

    const baseUrl = sanitizeEnvValue(body.baseUrl || current.baseUrl || "https://sandbox.momodeveloper.mtn.com").replace(/\/+$/g, "");
    if (!/^https:\/\/[a-z0-9.-]+/i.test(baseUrl)) return sendJson(res, 400, { error: "Use a valid HTTPS MTN base URL." });
    const callbackHost = sanitizeEnvValue(body.callbackHost || "https://alihsancharity.org");
    if (!/^https:\/\/[a-z0-9.-]+/i.test(callbackHost)) return sendJson(res, 400, { error: "Callback host must be an HTTPS URL." });

    const apiUser = crypto.randomUUID();
    const createUser = await fetch(`${baseUrl}/v1_0/apiuser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "X-Reference-Id": apiUser,
      },
      body: JSON.stringify({ providerCallbackHost: callbackHost }),
    });

    if (![200, 201].includes(createUser.status)) {
      const detail = await createUser.text().catch(() => "");
      return sendJson(res, 502, {
        error: "MTN rejected sandbox API user creation. Check that the key is the Collections primary subscription key.",
        detail,
      });
    }

    const createKey = await fetch(`${baseUrl}/v1_0/apiuser/${apiUser}/apikey`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    });
    const keyData = await createKey.json().catch(() => ({}));
    if (!createKey.ok || !keyData.apiKey) {
      return sendJson(res, 502, {
        error: "MTN created the sandbox API user, but did not return an API key.",
        detail: keyData,
      });
    }

    await updateDotEnv({
      MTN_MOMO_ENABLED: "true",
      MTN_MOMO_BASE_URL: baseUrl,
      MTN_MOMO_TARGET_ENVIRONMENT: "sandbox",
      MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY: subscriptionKey,
      MTN_MOMO_API_USER: apiUser,
      MTN_MOMO_API_KEY: keyData.apiKey,
      MTN_MOMO_CURRENCY: sanitizeEnvValue(body.currency || current.currency || "EUR").toUpperCase(),
      MTN_MOMO_MERCHANT_PHONE: normalizeMsisdn(body.merchantPhone || current.merchantPhone || "256780937446"),
    });

    return sendJson(res, 201, mtnPrivateStatus());
  }

  if (url.pathname === "/api/admin/bank/config" && req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
    return sendJson(res, 200, bankPrivateStatus());
  }

  if (url.pathname === "/api/admin/bank/config" && req.method === "POST") {
    if (!(await requireAdmin(req, res))) return;
    const body = await readJsonBody(req, 64 * 1024);
    const currency = sanitizeEnvValue(body.currency || "UGX").toUpperCase();
    const swift = sanitizeEnvValue(body.swift || "").toUpperCase();
    const accountNumber = sanitizeEnvValue(body.accountNumber || "").replace(/\s+/g, "");
    const referencePrefix = sanitizeEnvValue(body.referencePrefix || "AICF-DONATION").toUpperCase();

    if (currency && !/^[A-Z]{3}(\/[A-Z]{3}){0,2}$/.test(currency)) {
      return sendJson(res, 400, { error: "Currency must look like UGX, USD, or UGX/USD." });
    }
    if (swift && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(swift)) {
      return sendJson(res, 400, { error: "SWIFT/BIC must be 8 or 11 letters/numbers." });
    }
    if (accountNumber && !/^[0-9A-Z-]{5,34}$/i.test(accountNumber)) {
      return sendJson(res, 400, { error: "Use a valid bank account number without spaces." });
    }
    if (referencePrefix && !/^[A-Z0-9-]{3,24}$/.test(referencePrefix)) {
      return sendJson(res, 400, { error: "Reference prefix can use A-Z, 0-9, and hyphen only." });
    }

    await updateDotEnv({
      SETTLEMENT_ACCOUNT_NAME: body.accountName || "AL-IHSAN CHARITY FOUNDATION",
      SETTLEMENT_BANK_NAME: body.bankName || "Absa Bank Uganda",
      SETTLEMENT_BANK_BRANCH: body.branch || "",
      SETTLEMENT_ACCOUNT_NUMBER: accountNumber,
      SETTLEMENT_SWIFT_BIC: swift,
      SETTLEMENT_CURRENCY: currency || "UGX",
      SETTLEMENT_REFERENCE_PREFIX: referencePrefix || "AICF-DONATION",
      SETTLEMENT_INSTRUCTIONS: body.instructions || "Use your name and donation cause as the transfer reference, then send proof for reconciliation.",
    });

    return sendJson(res, 200, bankPrivateStatus());
  }

  if (url.pathname === "/api/admin/payment/config" && req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
    return sendJson(res, 200, paymentPrivateStatus());
  }

  if (url.pathname === "/api/admin/payment/config" && req.method === "POST") {
    if (!(await requireAdmin(req, res))) return;
    const body = await readJsonBody(req, 64 * 1024);
    const updates = {
      AIRTEL_ENABLED: body.airtelEnabled ? "true" : "false",
      AIRTEL_PROVIDER: body.airtelProvider || "Manual Airtel Money",
      AIRTEL_MERCHANT_PHONE: normalizeMsisdn(body.airtelMerchantPhone || ""),
      AIRTEL_PAYMENT_LINK: body.airtelPaymentLink || "",
      AIRTEL_INSTRUCTIONS: body.airtelInstructions || "Use Airtel Money and send proof for reconciliation.",
      PAYMENT_PROVIDER: body.cardProvider || "not configured",
      PAYMENT_CHECKOUT_URL: body.cardCheckoutUrl || "",
    };
    if (body.paymentPublicKey) updates.PAYMENT_PUBLIC_KEY = body.paymentPublicKey;
    if (body.paymentSecretKey) updates.PAYMENT_SECRET_KEY = body.paymentSecretKey;
    await updateDotEnv(updates);
    return sendJson(res, 200, paymentPrivateStatus());
  }

  if (url.pathname === "/api/admin/campaigns" && req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
    return sendJson(res, 200, { campaigns: await readJson(CAMPAIGNS_FILE, DEFAULT_CAMPAIGNS) });
  }

  if (url.pathname === "/api/admin/campaigns" && req.method === "POST") {
    if (!(await requireAdmin(req, res))) return;
    const body = await readJsonBody(req, 128 * 1024);
    const campaigns = await readJson(CAMPAIGNS_FILE, DEFAULT_CAMPAIGNS);
    const quantity = Math.max(1, Number(body.quantity) || 1);
    const unitCost = Math.max(0, Number(body.unitCost) || 0);
    const explicitTarget = Number(body.target) || 0;
    const target = Math.max(1, explicitTarget || unitCost * quantity || 1);
    const existing = campaigns.find((entry) => entry.id === body.id);
    const pricingChanged = !existing
      || Number(existing.unitCost) !== unitCost
      || Number(existing.quantity) !== quantity
      || Number(existing.target) !== target
      || String(existing.currency || "USD").toUpperCase().slice(0, 3) !== String(body.currency || "USD").toUpperCase().slice(0, 3);
    const item = {
      id: body.id && /^[a-z0-9-]{3,80}$/i.test(body.id) ? body.id : crypto.randomUUID(),
      title: String(body.title || "Untitled campaign").slice(0, 100),
      cause: String(body.cause || "General sadaqah and urgent needs").slice(0, 120),
      icon: String(body.icon || "heart-handshake").slice(0, 40),
      unitName: String(body.unitName || "project").slice(0, 40),
      unitCost,
      quantity,
      target,
      raised: Math.max(0, Number(body.raised) || 0),
      currency: String(body.currency || "USD").toUpperCase().slice(0, 3),
      status: ["active", "hidden"].includes(body.status) ? body.status : "active",
      description: String(body.description || "").slice(0, 400),
      location: String(body.location || "").slice(0, 100),
      beneficiaries: String(body.beneficiaries || "").slice(0, 80),
      milestone: String(body.milestone || "").slice(0, 120),
      nextNeed: String(body.nextNeed || "").slice(0, 180),
      priceNote: String(body.priceNote || "").slice(0, 220),
      priceUpdatedAt: pricingChanged ? new Date().toISOString() : existing?.priceUpdatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    const next = [item, ...campaigns.filter((entry) => entry.id !== item.id)];
    await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(next, null, 2));
    return sendJson(res, 200, { item, campaigns: next });
  }

  if (url.pathname.startsWith("/api/admin/campaigns/") && req.method === "DELETE") {
    if (!(await requireAdmin(req, res))) return;
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const campaigns = await readJson(CAMPAIGNS_FILE, DEFAULT_CAMPAIGNS);
    const next = campaigns.filter((entry) => entry.id !== id);
    await fs.writeFile(CAMPAIGNS_FILE, JSON.stringify(next, null, 2));
    return sendJson(res, 200, { ok: true, campaigns: next });
  }

  if (url.pathname === "/api/admin/reports" && req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
    return sendJson(res, 200, { reports: await readJson(REPORTS_FILE, []) });
  }

  if (url.pathname === "/api/admin/readiness" && req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
    return sendJson(res, 200, publicReadinessStatus());
  }

  if (url.pathname === "/api/admin/reports" && req.method === "POST") {
    if (!(await requireAdmin(req, res))) return;
    const body = await readJsonBody(req, 128 * 1024);
    const reports = await readJson(REPORTS_FILE, []);
    const existing = reports.find((entry) => entry.id === body.id);
    const item = {
      id: body.id && /^[a-z0-9-]{3,80}$/i.test(body.id) ? body.id : crypto.randomUUID(),
      title: String(body.title || "Untitled report").slice(0, 120),
      cause: String(body.cause || "General sadaqah and urgent needs").slice(0, 120),
      location: String(body.location || "").slice(0, 100),
      metric: String(body.metric || "").slice(0, 120),
      deliveredOn: String(body.deliveredOn || "").slice(0, 20),
      summary: String(body.summary || "").slice(0, 500),
      icon: String(body.icon || "clipboard-check").slice(0, 40),
      status: ["active", "hidden"].includes(body.status) ? body.status : "active",
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    const next = [item, ...reports.filter((entry) => entry.id !== item.id)];
    await fs.writeFile(REPORTS_FILE, JSON.stringify(next, null, 2));
    return sendJson(res, 200, { item, reports: next });
  }

  if (url.pathname.startsWith("/api/admin/reports/") && req.method === "DELETE") {
    if (!(await requireAdmin(req, res))) return;
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const reports = await readJson(REPORTS_FILE, []);
    const next = reports.filter((entry) => entry.id !== id);
    await fs.writeFile(REPORTS_FILE, JSON.stringify(next, null, 2));
    return sendJson(res, 200, { ok: true, reports: next });
  }

  if (url.pathname === "/api/admin/subscribers" && req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
    return sendJson(res, 200, {
      subscribers: await readJson(SUBSCRIBERS_FILE, []),
      outbox: (await readJson(EMAIL_OUTBOX_FILE, [])).slice(0, 20).map((item) => ({
        id: item.id,
        to: item.to,
        subject: item.subject,
        purpose: item.purpose,
        createdAt: item.createdAt,
        mode: item.mode,
      })),
      emailProvider: emailConfig().provider,
    });
  }

  if (url.pathname === "/api/admin/email/update" && req.method === "POST") {
    if (!(await requireAdmin(req, res))) return;
    const body = await readJsonBody(req, 128 * 1024);
    const subscribers = (await readJson(SUBSCRIBERS_FILE, [])).filter((item) => item.status === "active");
    const subject = String(body.subject || "Al-Ihsan Charity Foundation field update").slice(0, 120);
    const headline = String(body.headline || "A new mercy reached the field").slice(0, 120);
    const message = String(body.message || "").slice(0, 3000);
    if (!message) return sendJson(res, 400, { error: "Write an update message first." });
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#171a20">
        <h1 style="color:#e11232">${escapeHtml(headline)}</h1>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
        <p style="color:#07553d;font-weight:700">Jazakum Allahu khairan for supporting Al-Ihsan Charity Foundation.</p>
      </div>`;
    for (const subscriber of subscribers) {
      await deliverEmail({ to: subscriber.email, subject, text: `${headline}\n\n${message}`, html, purpose: "field-update" });
    }
    return sendJson(res, 200, { ok: true, recipients: subscribers.length, provider: emailConfig().provider });
  }

  if (url.pathname === "/api/admin/media" && req.method === "GET") {
    if (!(await requireAdmin(req, res))) return;
    return sendJson(res, 200, { media: await readJson(MEDIA_FILE, []) });
  }

  if (url.pathname === "/api/admin/upload" && req.method === "POST") {
    if (!(await requireAdmin(req, res))) return;
    const contentType = req.headers["content-type"] || "";
    const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
    if (!boundary) return sendJson(res, 400, { error: "Missing multipart boundary." });
    const body = await readBody(req, MAX_UPLOAD_BYTES);
    const parts = parseMultipart(body, boundary);
    const filePart = parts.find((part) => part.name === "media" && part.filename);
    if (!filePart) return sendJson(res, 400, { error: "Choose a photo or video to upload." });
    const typeOk = ALLOWED_MIME_PREFIXES.some((prefix) => filePart.type.startsWith(prefix));
    const original = sanitizeFilename(filePart.filename);
    const ext = path.extname(original).toLowerCase();
    if (!typeOk || !ALLOWED_EXTENSIONS.has(ext)) {
      return sendJson(res, 400, { error: "Only image and video uploads are allowed." });
    }
    const id = crypto.randomUUID();
    const filename = `${id}${ext}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), filePart.data, { flag: "wx" });
    const fields = Object.fromEntries(parts.filter((part) => !part.filename).map((part) => [part.name, part.data.toString("utf8")]));
    const media = await readJson(MEDIA_FILE, []);
    const item = {
      id,
      kind: filePart.type.startsWith("video/") ? "video" : "image",
      src: `/uploads/${filename}`,
      title: (fields.title || original).trim(),
      caption: (fields.caption || "").trim(),
      alt: (fields.alt || fields.title || original).trim(),
      mime: filePart.type,
      original,
      size: filePart.data.length,
      published: true,
      createdAt: new Date().toISOString(),
    };
    media.unshift(item);
    await fs.writeFile(MEDIA_FILE, JSON.stringify(media, null, 2));
    return sendJson(res, 201, { item });
  }

  if (url.pathname.startsWith("/api/admin/media/") && req.method === "DELETE") {
    if (!(await requireAdmin(req, res))) return;
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const media = await readJson(MEDIA_FILE, []);
    const item = media.find((entry) => entry.id === id);
    const next = media.filter((entry) => entry.id !== id);
    if (item?.src?.startsWith("/uploads/")) {
      await fs.rm(path.join(UPLOAD_DIR, path.basename(item.src)), { force: true });
    }
    await fs.writeFile(MEDIA_FILE, JSON.stringify(next, null, 2));
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: "API route not found." });
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/master") pathname = "/master.html";
  if (pathname === "/pay" || pathname === "/donate") pathname = "/pay.html";
  if (pathname === "/portal") pathname = "/portal.html";
  const staticRoot = pathname.startsWith("/uploads/") ? UPLOAD_DIR : ROOT;
  const relativePath = pathname.startsWith("/uploads/") ? pathname.slice("/uploads/".length) : pathname;
  const file = path.normalize(path.join(staticRoot, relativePath));
  const traversal = path.relative(staticRoot, file);
  if (traversal.startsWith("..") || path.isAbsolute(traversal)) return send(res, 403, "Forbidden");
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return send(res, 404, "Not found");
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    const headers = { "Content-Type": type };
    if (pathname.startsWith("/uploads/")) headers["Cache-Control"] = "public, max-age=86400";
    send(res, 200, await fs.readFile(file), headers);
  } catch {
    send(res, 404, "Not found");
  }
}

ensureStore().then(() => {
  http
    .createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
        return await serveStatic(req, res, url);
      } catch (error) {
        sendJson(res, error.status || 500, { error: error.message || "Server error." });
      }
    })
    .listen(PORT, () => {
      console.log(`Al-Ihsan site running at http://127.0.0.1:${PORT}/`);
      console.log(`Master page: http://127.0.0.1:${PORT}/master.html`);
    });
});
