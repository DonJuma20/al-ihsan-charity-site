const CONTACT = {
  whatsapp: "256704698086",
  email: "alihsanchar@gmail.com",
};

const causeInput = document.querySelector("[data-cause]");
const amountInput = document.querySelector("[data-amount]");
const nameInput = document.querySelector("[data-name]");
const contactInput = document.querySelector("[data-contact]");
const summaryAmount = document.querySelector("[data-summary-amount]");
const summaryCause = document.querySelector("[data-summary-cause]");
const summaryImpact = document.querySelector("[data-summary-impact]");
const summaryFrequency = document.querySelector("[data-summary-frequency]");
const methodStatus = document.querySelector("[data-method-status]");
const mtnPhone = document.querySelector("[data-mtn-phone]");
const mtnButton = document.querySelector("[data-pay-mtn]");
const mtnMessage = document.querySelector("[data-mtn-message]");
const cardButton = document.querySelector("[data-pay-card]");
const cardMessage = document.querySelector("[data-card-message]");
const bankDetails = document.querySelector("[data-bank-details]");
const bankWhatsapp = document.querySelector("[data-bank-whatsapp]");
const bankMessage = document.querySelector("[data-bank-message]");
const whatsappLink = document.querySelector("[data-whatsapp]");
const emailLink = document.querySelector("[data-email]");
const airtelWhatsapp = document.querySelector("[data-airtel-whatsapp]");
const airtelMessage = document.querySelector("[data-airtel-message]");
const airtelCopy = document.querySelector("[data-airtel-copy]");
const frequencyButtons = document.querySelectorAll("[data-frequency]");
const frequencyNote = document.querySelector("[data-frequency-note]");
const qurbanBooking = document.querySelector("[data-qurban-booking]");
const qurbanAnimalButtons = document.querySelectorAll("[data-qurban-animal]");
const qurbanQuantity = document.querySelector("[data-qurban-quantity]");
const qurbanFor = document.querySelector("[data-qurban-for]");
const recommendedRoute = document.querySelector("[data-recommended-route]");
const recommendedCopy = document.querySelector("[data-recommended-copy]");
const methodCards = document.querySelectorAll("[data-method-card]");
const checkoutSteps = Array.from(document.querySelectorAll(".checkout-rail article"));

let paymentMethods = null;
let givingFrequency = "one-time";
let qurbanAnimal = "goat";

function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function impactText(cause, amountValue) {
  const amount = Number(amountValue) || 0;
  const safeCause = (cause || "").toLowerCase();
  if (amount <= 0) return "Enter an amount to see the project impact.";
  if (safeCause.includes("water")) return amount >= 1100 ? `Funds ${plural(Math.floor(amount / 1100), "complete water well")}.` : "Contributes toward one long lasting community water well.";
  if (safeCause.includes("masjid")) return `Covers about ${Math.min(100, Math.round((amount / 20000) * 100))}% of a masjid target.`;
  if (safeCause.includes("quran")) return amount >= 10 ? `Provides ${plural(Math.floor(amount / 10), "Quran copy")}.` : "Contributes toward Quran distribution.";
  if (safeCause.includes("qurban")) {
    if (amount >= 400) return `Provides ${plural(Math.floor(amount / 400), "bull")} for qurban distribution.`;
    if (amount >= 100) return `Provides ${plural(Math.floor(amount / 100), "lamb")} for qurban distribution.`;
    if (amount >= 80) return `Provides ${plural(Math.floor(amount / 80), "goat")} for qurban distribution.`;
    return "Contributes toward qurban meat distribution.";
  }
  if (safeCause.includes("ramadhan") || safeCause.includes("iftar")) return `Shares about ${plural(Math.max(1, Math.floor(amount / 3)), "iftar meal")}.`;
  if (safeCause.includes("food") || safeCause.includes("orphan")) return amount >= 30 ? `Provides ${plural(Math.floor(amount / 30), "food pack")} or ${plural(Math.floor(amount), "orphan meal")}.` : `Provides ${plural(Math.floor(amount), "orphan meal")}.`;
  return "Supports the most urgent approved charity project.";
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function setMethodState(method, state, label) {
  const card = document.querySelector(`[data-method-card="${method}"]`);
  if (!card) return;
  card.dataset.liveState = state;
  let badge = card.querySelector(".method-state");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "method-state";
    card.prepend(badge);
  }
  badge.textContent = label;
}

function setRecommendedMethod(method, title, copy) {
  if (!recommendedRoute || !recommendedCopy) return;
  recommendedRoute.textContent = title;
  recommendedCopy.textContent = copy;
  methodCards.forEach((card) => card.classList.toggle("is-selected", card.dataset.methodCard === method));
}

function updateCheckoutRail() {
  if (!checkoutSteps.length) return;
  checkoutSteps.forEach((step) => step.classList.remove("is-active", "is-complete"));
  if (causeInput.value) checkoutSteps[0]?.classList.add("is-complete");
  if (Number(amountInput.value) > 0) checkoutSteps[1]?.classList.add("is-complete");
  checkoutSteps[2]?.classList.add("is-active");
}

function buildMessage() {
  const name = nameInput.value.trim();
  const contact = contactInput.value.trim();
  const amount = formatCurrency(amountInput.value);
  const monthly = givingFrequency === "monthly";
  const qurbanLine = isQurbanCause()
    ? `Qurban booking: ${qurbanQuantity.value || 1} ${plural(Number(qurbanQuantity.value) || 1, qurbanAnimal).replace(/^\\d+ /, "")}${qurbanFor.value.trim() ? ` for ${qurbanFor.value.trim()}` : ""}.`
    : "";
  return [
    "Assalamu alaikum Al-Ihsan Charity Foundation.",
    `${name ? `My name is ${name}. ` : ""}I would like to make a ${monthly ? "monthly pledge of" : "donation of"} ${amount} for ${causeInput.value}.`,
    qurbanLine,
    contact ? `My contact for receipt/update is: ${contact}.` : "Please guide me on completing this donation.",
    "Jazakum Allahu khairan.",
  ].filter(Boolean).join("\n");
}

function updateSummary() {
  const amount = amountInput.value || 0;
  summaryAmount.textContent = formatCurrency(amount);
  summaryCause.textContent = causeInput.value;
  summaryFrequency.textContent = givingFrequency === "monthly" ? "Monthly pledge" : "Current gift";
  summaryImpact.textContent = impactText(causeInput.value, amount);

  const message = buildMessage();
  whatsappLink.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
  emailLink.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Donation pledge for ${causeInput.value}`)}&body=${encodeURIComponent(message)}`;
  emailLink.setAttribute("role", "link");

  bankWhatsapp.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(`${message}\nI would like to use ABSA bank transfer. Please verify receiving details and reconciliation instructions.`)}`;
  airtelWhatsapp.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(`${message}\nI would like to ask whether Airtel Money is available for this donation.`)}`;

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.preset) === Number(amountInput.value));
  });

  updateRecommendedRoute();
  updateCheckoutRail();
}

function isQurbanCause() {
  return causeInput.value.toLowerCase().includes("qurban");
}

function updateFrequency(nextFrequency) {
  givingFrequency = nextFrequency;
  frequencyButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.frequency === nextFrequency);
  });
  frequencyNote.textContent = nextFrequency === "monthly"
    ? "Monthly pledge requests are prepared for the team. Automatic recurring charging is not live yet."
    : "One-time gifts can continue through the available payment methods below.";
  updateSummary();
}

function syncQurbanBooking() {
  const visible = isQurbanCause();
  qurbanBooking.hidden = !visible;
  if (!visible) return;
  const value = causeInput.value.toLowerCase();
  if (value.includes("lamb")) qurbanAnimal = "lamb";
  else if (value.includes("bull")) qurbanAnimal = "bull";
  else qurbanAnimal = "goat";
  qurbanAnimalButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.qurbanAnimal === qurbanAnimal);
  });
}

function updateQurbanBooking(animal = qurbanAnimal) {
  qurbanAnimal = animal;
  const selected = Array.from(qurbanAnimalButtons).find((button) => button.dataset.qurbanAnimal === animal);
  const quantity = Math.max(1, Number(qurbanQuantity.value) || 1);
  const price = Number(selected?.dataset.price) || 0;
  causeInput.value = `Qurban distribution - ${animal}`;
  amountInput.value = price * quantity;
  syncQurbanBooking();
  updateSummary();
}

function applyQueryParams() {
  const params = new URLSearchParams(location.search);
  const cause = params.get("cause");
  const amount = params.get("amount");
  if (cause) {
    const exists = Array.from(causeInput.options).some((option) => option.value === cause || option.textContent === cause);
    if (!exists) causeInput.add(new Option(cause, cause));
    causeInput.value = cause;
  }
  if (amount && Number(amount) > 0) amountInput.value = amount;
}

async function loadMethods() {
  try {
    const response = await fetch("/api/payments/methods", { credentials: "same-origin" });
    paymentMethods = await response.json();
    if (!response.ok) throw new Error(paymentMethods.error || "Could not load payment methods.");

    const mtnLive = paymentMethods.mtn.configured && paymentMethods.mtn.environment !== "sandbox";
    const ready = [
      mtnLive ? "MTN live" : paymentMethods.mtn.configured ? "MTN sandbox" : "MTN pending",
      paymentMethods.card.configured ? "card ready" : "card pending",
      paymentMethods.airtel.configured ? "Airtel ready" : "Airtel pending",
      paymentMethods.bank.configured ? "ABSA ready" : "ABSA pending",
      "WhatsApp ready",
    ];
    methodStatus.textContent = ready.join("  /  ");

    document.querySelector('[data-method-card="mtn"]')?.classList.toggle("is-disabled", !paymentMethods.mtn.configured);
    document.querySelector('[data-method-card="card"]')?.classList.toggle("is-disabled", !paymentMethods.card.configured);
    document.querySelector('[data-method-card="airtel"]')?.classList.toggle("is-disabled", !paymentMethods.airtel.configured);
    document.querySelector('[data-method-card="bank"]')?.classList.toggle("is-disabled", !paymentMethods.bank.configured);

    if (paymentMethods.mtn.configured) {
      if (paymentMethods.mtn.environment === "sandbox") {
        setMethodState("mtn", "test", "Sandbox");
        setStatus(mtnMessage, `Sandbox connected for ${paymentMethods.mtn.currency}. Use live production keys before taking real donor money.`);
      } else {
        setMethodState("mtn", "ready", "Live");
        setStatus(mtnMessage, `Live for ${paymentMethods.mtn.currency}. Donor confirms on phone.`);
      }
      mtnButton.disabled = false;
    } else {
      setMethodState("mtn", "pending", "Setup");
      setStatus(mtnMessage, paymentMethods.mtn.setupMessage || "MTN API credentials are not connected yet.", true);
      mtnButton.disabled = true;
    }

    if (paymentMethods.card.configured) {
      setMethodState("card", paymentMethods.card.checkoutUrl ? "ready" : "test", paymentMethods.card.checkoutUrl ? "Live" : "Keys only");
      setStatus(cardMessage, `${paymentMethods.card.provider} keys detected. Provider checkout adapter still needs final selection.`);
    } else {
      setMethodState("card", "pending", "Setup");
      setStatus(cardMessage, "Card gateway is not connected yet. Use MTN, bank request, or WhatsApp for now.", true);
    }

    if (paymentMethods.airtel.configured) {
      setMethodState("airtel", "ready", "Ready");
      airtelCopy.textContent = paymentMethods.airtel.instructions;
      airtelWhatsapp.textContent = paymentMethods.airtel.paymentLink ? "Open Airtel payment" : "Send Airtel proof";
      airtelWhatsapp.href = paymentMethods.airtel.paymentLink || `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(`${buildMessage()}\nI will use Airtel Money through ${paymentMethods.airtel.merchantPhone || "the Airtel option"}.`)}`;
      setStatus(airtelMessage, `${paymentMethods.airtel.provider} is ready.`);
    } else {
      setMethodState("airtel", "pending", "Setup");
      setStatus(airtelMessage, "Airtel merchant number or payment link is not connected yet.", true);
    }

    if (paymentMethods.bank.configured) {
      setMethodState("bank", "ready", "Ready");
      const bank = paymentMethods.bank.details;
      bankDetails.classList.add("is-visible");
      bankDetails.innerHTML = [
        ["Name", bank.accountName],
        ["Bank", bank.bankName],
        ["Branch", bank.branch],
        ["Account", bank.accountNumber],
        ["SWIFT", bank.swift],
        ["Currency", bank.currency],
        ["Reference", bank.referencePrefix],
      ].filter(([, value]) => value).map(([label, value]) => `<span>${label}<strong>${value}</strong></span>`).join("");
      const bankMessageText = `${bank.instructions || "Use the verified bank details above and send proof for reconciliation."}`;
      setStatus(bankMessage, bankMessageText);
      bankWhatsapp.href = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(`${buildMessage()}\nI have sent/will send an ABSA bank transfer using reference ${bank.referencePrefix || "AICF-DONATION"}. Please reconcile and share the project report.`)}`;
    } else {
      setMethodState("bank", "pending", "Setup");
      setStatus(bankMessage, "ABSA account number is not published yet. Request verified details from the team.", true);
    }
    setMethodState("whatsapp", "ready", "Ready");
    updateRecommendedRoute();
  } catch (error) {
    methodStatus.textContent = "Payment server is offline.";
    document.querySelector('[data-method-card="mtn"]')?.classList.add("is-disabled");
    document.querySelector('[data-method-card="card"]')?.classList.add("is-disabled");
    document.querySelector('[data-method-card="airtel"]')?.classList.add("is-disabled");
    document.querySelector('[data-method-card="bank"]')?.classList.add("is-disabled");
    setMethodState("mtn", "pending", "Offline");
    setMethodState("card", "pending", "Offline");
    setMethodState("airtel", "pending", "Offline");
    setMethodState("bank", "pending", "Offline");
    setMethodState("whatsapp", "ready", "Ready");
    setRecommendedMethod(
      "whatsapp",
      "WhatsApp pledge",
      "The website payment server is not connected here, so the live human route is the correct path."
    );
    setStatus(mtnMessage, error.message, true);
    setStatus(cardMessage, error.message, true);
  }
}

function updateRecommendedRoute() {
  if (!recommendedRoute || !recommendedCopy) return;

  if (givingFrequency === "monthly") {
    setRecommendedMethod(
      "whatsapp",
      "WhatsApp pledge",
      "Monthly giving still needs human setup, so the team route is the cleanest next step."
    );
    return;
  }

  if (paymentMethods?.mtn?.configured && paymentMethods.mtn.environment !== "sandbox") {
    setRecommendedMethod(
      "mtn",
      "MTN MoMo",
      "Fastest live local route: the donor receives a phone confirmation prompt and approves directly."
    );
    return;
  }

  if (paymentMethods?.bank?.configured && Number(amountInput.value) >= 400) {
    setRecommendedMethod(
      "bank",
      "ABSA bank transfer",
      "Strong fit for larger gifts: use the verified bank details and send proof for reconciliation."
    );
    return;
  }

  if (paymentMethods?.airtel?.configured) {
    setRecommendedMethod(
      "airtel",
      "Airtel Money",
      "Airtel is configured and ready for donors who prefer that mobile money route."
    );
    return;
  }

  if (paymentMethods?.card?.configured) {
    setRecommendedMethod(
      "card",
      "Card checkout",
      "Best current path for international donors once the provider checkout opens."
    );
    return;
  }

  setRecommendedMethod(
    "whatsapp",
    "WhatsApp pledge",
    "The team route is ready now and can guide the donor through the best available payment option."
  );
}

async function payWithMtn() {
  if (givingFrequency === "monthly") {
    setStatus(mtnMessage, "Automatic monthly MTN charging is not live yet. Use WhatsApp pledge so the team can arrange recurring giving.", true);
    return;
  }
  if (!paymentMethods?.mtn.configured) {
    setStatus(mtnMessage, "MTN is not connected yet. Use WhatsApp pledge or bank request.", true);
    return;
  }
  mtnButton.disabled = true;
  setStatus(mtnMessage, "Sending confirmation prompt to donor phone...");
  try {
    const response = await fetch("/api/payments/mtn/request-to-pay", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountInput.value,
        currency: paymentMethods.mtn.currency,
        cause: causeInput.value,
        donorName: nameInput.value.trim(),
        donorPhone: mtnPhone.value.trim(),
        contact: contactInput.value.trim(),
        frequency: givingFrequency,
        qurbanAnimal,
        qurbanQuantity: Number(qurbanQuantity?.value) || 0,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "MTN payment failed.");
    setStatus(mtnMessage, `${data.message} Reference: ${data.referenceId}`);
    window.siteToast?.("MTN request sent", "The donor should now confirm on their phone.");
  } catch (error) {
    setStatus(mtnMessage, error.message, true);
    window.siteToast?.("MTN request failed", error.message, "error");
  } finally {
    mtnButton.disabled = false;
  }
}

async function payWithCard() {
  if (givingFrequency === "monthly") {
    setStatus(cardMessage, "Automatic monthly card charging is not live yet. Use WhatsApp pledge so the team can arrange recurring giving.", true);
    return;
  }
  setStatus(cardMessage, "Opening card checkout...");
  try {
    const response = await fetch("/api/payments/card/create", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountInput.value,
        cause: causeInput.value,
        donorName: nameInput.value.trim(),
        contact: contactInput.value.trim(),
        frequency: givingFrequency,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Card checkout is not available yet.");
    if (data.checkoutUrl) location.href = data.checkoutUrl;
  } catch (error) {
    setStatus(cardMessage, error.message, true);
    window.siteToast?.("Card checkout unavailable", error.message, "error");
  }
}

applyQueryParams();
syncQurbanBooking();
updateSummary();
loadMethods();

[causeInput, amountInput, nameInput, contactInput].forEach((field) => {
  field.addEventListener("input", updateSummary);
  field.addEventListener("change", updateSummary);
});

causeInput.addEventListener("change", syncQurbanBooking);
frequencyButtons.forEach((button) => button.addEventListener("click", () => updateFrequency(button.dataset.frequency)));
qurbanAnimalButtons.forEach((button) => button.addEventListener("click", () => updateQurbanBooking(button.dataset.qurbanAnimal)));
qurbanQuantity?.addEventListener("input", () => updateQurbanBooking());
qurbanFor?.addEventListener("input", updateSummary);

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    amountInput.value = button.dataset.preset;
    updateSummary();
  });
});

mtnButton.addEventListener("click", payWithMtn);
cardButton.addEventListener("click", payWithCard);
