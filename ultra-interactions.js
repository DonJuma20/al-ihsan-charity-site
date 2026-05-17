(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toneSections = document.querySelectorAll("[data-tone]");
  const hero = document.querySelector(".hero");
  const navLinks = Array.from(document.querySelectorAll(".site-nav a[href^='#']"));
  const studioLinks = Array.from(document.querySelectorAll(".studio-nav a[href^='#']"));
  const tiltCards = document.querySelectorAll(
    ".project-card, .qurban-card, .campaign-card, .trust-card, .report-card, .impact-item, .faith-card, .method-card, .media-card, .managed-card"
  );
  const magneticTargets = document.querySelectorAll(".btn, .header-donate, .studio-nav a");

  if (toneSections.length) {
    document.body.dataset.tone = toneSections[0].dataset.tone || "ivory";
    let toneTicking = false;
    const updateTone = () => {
      const focusLine = window.innerHeight * 0.44;
      const active = Array.from(toneSections).find((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top <= focusLine && rect.bottom >= focusLine;
      }) || toneSections[0];
      document.body.dataset.tone = active.dataset.tone || "ivory";
      toneTicking = false;
    };
    const queueToneUpdate = () => {
      if (toneTicking) return;
      toneTicking = true;
      window.requestAnimationFrame(updateTone);
    };
    updateTone();
    window.addEventListener("scroll", queueToneUpdate, { passive: true });
    window.addEventListener("resize", queueToneUpdate);
  }

  if (hero && !reduceMotion) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      hero.style.setProperty("--hero-x", x.toFixed(3));
      hero.style.setProperty("--hero-y", y.toFixed(3));
    });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--hero-x", "0");
      hero.style.setProperty("--hero-y", "0");
    });
  }

  if (!reduceMotion) {
    tiltCards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        card.style.setProperty("--tilt-x", `${((0.5 - py) * 8).toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${((px - 0.5) * 8).toFixed(2)}deg`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });

    magneticTargets.forEach((target) => {
      target.addEventListener("pointermove", (event) => {
        const rect = target.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        target.style.transform = `translate(${(x * 0.08).toFixed(2)}px, ${(y * 0.08).toFixed(2)}px)`;
      });
      target.addEventListener("pointerleave", () => {
        target.style.transform = "";
      });
    });
  }

  if (navLinks.length) {
    const byId = new Map(navLinks.map((link) => [link.getAttribute("href").slice(1), link]));
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => link.classList.remove("is-active"));
          byId.get(entry.target.id)?.classList.add("is-active");
        });
      },
      { rootMargin: "-35% 0px -55%", threshold: 0.1 }
    );
    byId.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) navObserver.observe(section);
    });
  }

  if (studioLinks.length) {
    const studioById = new Map(studioLinks.map((link) => [link.getAttribute("href").slice(1), link]));
    const studioObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          studioLinks.forEach((link) => link.classList.remove("is-active"));
          studioById.get(entry.target.id)?.classList.add("is-active");
        });
      },
      { rootMargin: "-20% 0px -65%", threshold: 0.1 }
    );
    studioById.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) studioObserver.observe(section);
    });
    studioLinks[0]?.classList.add("is-active");
  }
})();
