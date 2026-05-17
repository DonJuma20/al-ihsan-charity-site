(function () {
  const iconMap = [
    [/donate|give|support|fund|share|sadaqah|qurban/i, "heart-handshake"],
    [/whatsapp/i, "message-circle"],
    [/email|mail/i, "mail"],
    [/payment|methods|checkout|card/i, "credit-card"],
    [/mtn|momo|prompt|phone/i, "smartphone-nfc"],
    [/bank/i, "landmark"],
    [/upload|publish/i, "upload-cloud"],
    [/logout/i, "log-out"],
    [/open|view|back/i, "external-link"],
    [/refresh/i, "refresh-cw"],
    [/delete/i, "trash-2"],
  ];

  function shouldSkip(element) {
    return element.matches(".nav-toggle, .modal-close") || element.querySelector("svg, [data-lucide]");
  }

  function addIcon(element) {
    if (shouldSkip(element)) return;
    const text = element.textContent.trim();
    const match = iconMap.find(([pattern]) => pattern.test(text));
    if (!match) return;
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", match[1]);
    icon.setAttribute("aria-hidden", "true");
    element.prepend(icon);
  }

  function iconForText(text) {
    const rules = [
      [/water|well|clean/i, "droplets"],
      [/masjid|mosque/i, "landmark"],
      [/food|iftar|ramadhan|meal/i, "utensils"],
      [/qurban|goat|lamb|bull|cow|meat/i, "badge-dollar-sign"],
      [/quran|islam|faith|hadith/i, "book-open"],
      [/orphan|widow|family|girl/i, "users-round"],
      [/education|school|study/i, "graduation-cap"],
      [/sadaqah|charity/i, "heart-handshake"],
    ];
    return rules.find(([pattern]) => pattern.test(text))?.[1] || "sparkles";
  }

  function addCardIcons() {
    document.querySelectorAll(".project-card-body, .impact-item, .faith-card").forEach((card) => {
      if (card.querySelector(".card-icon")) return;
      const holder = document.createElement("span");
      holder.className = "card-icon";
      holder.innerHTML = `<i data-lucide="${iconForText(card.textContent)}" aria-hidden="true"></i>`;
      card.prepend(holder);
    });
  }

  function pulse(element) {
    if (navigator.vibrate) navigator.vibrate(14);
    element.classList.add("is-haptic");
    window.setTimeout(() => element.classList.remove("is-haptic"), 220);
  }

  function installScrollProgress() {
    const bar = document.createElement("span");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function installLoader() {
    const loader = document.querySelector("[data-site-loader]");
    if (!loader) return;

    let loaderHidden = false;
    const hideLoader = () => {
      if (loaderHidden) return;
      loaderHidden = true;
      loader.classList.add("is-hidden");
      window.setTimeout(() => loader.remove(), 720);
    };

    const scheduleHide = () => window.setTimeout(hideLoader, 260);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", scheduleHide, { once: true });
    } else {
      scheduleHide();
    }

    window.addEventListener("load", scheduleHide, { once: true });
    window.addEventListener("pageshow", scheduleHide, { once: true });
    window.setTimeout(hideLoader, 2200);
  }

  function installToasts() {
    const stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);

    window.siteToast = function siteToast(title, message, type = "success") {
      const toast = document.createElement("article");
      toast.className = `toast${type === "error" ? " is-error" : ""}`;
      toast.innerHTML = `
        <i data-lucide="${type === "error" ? "triangle-alert" : "badge-check"}" aria-hidden="true"></i>
        <div>
          <strong>${title}</strong>
          <p>${message}</p>
        </div>
      `;
      stack.appendChild(toast);
      window.lucide?.createIcons();
      window.setTimeout(() => toast.remove(), 4200);
    };
  }

  document.querySelectorAll("button, .btn, .back-link, .quick-links a, .master-link").forEach((element) => {
    addIcon(element);
    element.addEventListener("pointerdown", () => pulse(element), { passive: true });
  });

  addCardIcons();
  installLoader();
  installToasts();
  installScrollProgress();
  window.lucide?.createIcons();
})();
