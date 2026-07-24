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
})();
