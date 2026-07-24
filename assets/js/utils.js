(function () {
  "use strict";

  window.VUH = window.VUH || {};

  window.VUH.formatNumber = function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return "0";
    }
    return new Intl.NumberFormat("vi-VN").format(value);
  };

  window.VUH.toNumber = function toNumber(raw) {
    if (typeof raw !== "string") {
      return Number(raw);
    }
    const normalized = raw.replace(/[\s,.](?=\d{3}\b)/g, "").replace(",", ".");
    return Number(normalized);
  };

  window.VUH.daysBetween = function daysBetween(from, to) {
    const oneDay = 24 * 60 * 60 * 1000;
    const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.floor((utcTo - utcFrom) / oneDay);
  };

  window.VUH.removeVietnameseAccents = function removeVietnameseAccents(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };
})();
