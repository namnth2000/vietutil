(function () {
  "use strict";

  const yearNode = document.querySelector("[data-year]");
  if (yearNode) {
    yearNode.textContent = String(new Date().getFullYear());
  }

  const searchInput = document.querySelector("[data-tool-search]");
  const toolCards = Array.from(document.querySelectorAll("[data-tool-card]"));

  if (searchInput && toolCards.length > 0) {
    searchInput.addEventListener("input", function (event) {
      const query = String(event.target.value || "").toLowerCase().trim();
      toolCards.forEach(function (card) {
        const text = String(card.textContent || "").toLowerCase();
        card.hidden = query.length > 0 && !text.includes(query);
      });
    });
  }

  // Close mobile drawer when clicking on internal links
  const navMobileInput = document.getElementById("nav-mobile-toggle");
  const navMobileLinks = document.querySelectorAll(".nav-mobile-list a");

  if (navMobileInput && navMobileLinks.length > 0) {
    navMobileLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        navMobileInput.checked = false;
      });
    });
  }

  // Limit long <select> dropdowns to a fixed number of visible options with scrolling,
  // by toggling the native "size" attribute (renders as an in-place scrollable listbox)
  // instead of the browser's full-height popup.
  // Runs on window "load" (after DOMContentLoaded) so selects whose options are populated
  // dynamically by other page scripts (e.g. bank/unit/size lists) are already filled in.
  const VISIBLE_OPTION_LIMIT = 10;

  function enableScrollableSelects() {
    Array.from(document.querySelectorAll("select")).forEach(function (select) {
      if (select.multiple || select.dataset.scrollableInit || select.options.length <= VISIBLE_OPTION_LIMIT) {
        return;
      }
      select.dataset.scrollableInit = "true";

      const parent = select.parentElement;
      if (parent) {
        if (window.getComputedStyle(parent).position === "static") {
          parent.style.position = "relative";
        }
        parent.style.minHeight = parent.offsetHeight + "px";
      }

      function expand() {
        select.size = Math.min(VISIBLE_OPTION_LIMIT, select.options.length);
      }
      function collapse() {
        select.removeAttribute("size");
      }

      select.addEventListener("mousedown", function (event) {
        if (select.hasAttribute("size")) {
          return;
        }
        event.preventDefault();
        expand();
      });

      select.addEventListener("keydown", function (event) {
        if (!select.hasAttribute("size") && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          expand();
          return;
        }
        if (event.key === "Escape" || event.key === "Tab") {
          collapse();
        }
      });

      select.addEventListener("change", collapse);
      select.addEventListener("blur", collapse);
    });
  }

  // Run immediately for selects already populated in the static HTML, then again after
  // "load" to catch selects whose options are filled in dynamically by other page scripts.
  enableScrollableSelects();
  window.addEventListener("load", enableScrollableSelects);

  // Generic modal/popup system, reusable across pages.
  // Markup contract:
  //   <div class="modal" id="my-modal" data-modal hidden>
  //     <div class="modal__box" role="dialog" aria-modal="true">
  //       <button type="button" class="modal__close" data-modal-close aria-label="Đóng">×</button>
  //       ...content...
  //     </div>
  //   </div>
  // Any element with [data-modal-open="my-modal"] opens it. Clicking [data-modal-close],
  // the dark backdrop itself, or pressing Escape closes the currently open modal(s).
  const allModals = Array.from(document.querySelectorAll("[data-modal]"));

  if (allModals.length > 0) {
    function openModal(modal) {
      modal.hidden = false;
      document.body.classList.add("modal-open");
    }
    function closeModal(modal) {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
    }

    document.addEventListener("click", function (event) {
      const opener = event.target.closest("[data-modal-open]");
      if (opener) {
        const modal = document.getElementById(opener.getAttribute("data-modal-open"));
        if (modal) {
          event.preventDefault();
          openModal(modal);
        }
        return;
      }

      const closer = event.target.closest("[data-modal-close]");
      if (closer) {
        const modal = closer.closest("[data-modal]");
        if (modal) {
          closeModal(modal);
        }
        return;
      }

      if (event.target.matches("[data-modal]")) {
        closeModal(event.target);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        allModals.forEach(function (modal) {
          if (!modal.hidden) {
            closeModal(modal);
          }
        });
      }
    });
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/service-worker.js").catch(function (error) {
        console.warn("Service worker registration failed:", error);
      });
    });
  }
})();
