(function () {
  "use strict";

  const WEEKDAYS_VN = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  function safeDate(value) {
    const date = new Date(value + "T00:00:00");
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function vnWeekday(date) {
    return WEEKDAYS_VN[date.getDay()];
  }

  function countWorkdays(from, to) {
    const [start, end] = from <= to ? [from, to] : [to, from];
    let current = new Date(start);
    let count = 0;

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        count += 1;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  function findNextTet(fromDate) {
    if (!window.VUH || typeof window.VUH.convertSolar2Lunar !== "function") {
      return null;
    }

    const probe = new Date(fromDate);
    for (let i = 0; i < 420; i += 1) {
      const lunar = window.VUH.convertSolar2Lunar(
        probe.getDate(),
        probe.getMonth() + 1,
        probe.getFullYear(),
        7
      );
      if (lunar.lunarDay === 1 && lunar.lunarMonth === 1 && lunar.lunarLeap === 0) {
        return new Date(probe);
      }
      probe.setDate(probe.getDate() + 1);
    }
    return null;
  }

  // Tính tuổi chính xác theo năm / tháng / ngày (mượn ngày của tháng trước khi cần).
  function calcPreciseAge(birth, today) {
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months, days };
  }

  // Quy tắc Naegele: dự sinh = ngày đầu kỳ kinh cuối + 280 ngày (40 tuần).
  function calcPregnancy(lmpDate, today) {
    const dueDate = new Date(lmpDate);
    dueDate.setDate(dueDate.getDate() + 280);

    const daysPregnant = Math.max(0, window.VUH.daysBetween(lmpDate, today));
    const weeks = Math.floor(daysPregnant / 7);
    const days = daysPregnant % 7;
    const daysLeft = window.VUH.daysBetween(today, dueDate);

    let trimester = 1;
    if (weeks >= 28) trimester = 3;
    else if (weeks >= 13) trimester = 2;

    return { dueDate, weeks, days, daysLeft, trimester };
  }

  function initDateTools() {
    const form = document.querySelector("[data-date-form]");
    const output = document.querySelector("[data-date-output]");

    if (!form || !output) {
      return;
    }

    const modeSelect = form.querySelector("[data-tool-mode]");
    const panels = form.querySelectorAll("[data-mode-panel]");
    const birthInput = form.querySelector("#birthDate");
    const fromInput = form.querySelector("#fromDate");
    const toInput = form.querySelector("#toDate");
    const lmpInput = form.querySelector("#lmpDate");
    const eventNameInput = form.querySelector("#eventName");
    const eventDateInput = form.querySelector("#eventDate");

    const now = new Date();
    const nowText = now.toISOString().slice(0, 10);
    birthInput.value = "1995-01-01";
    fromInput.value = nowText;
    toInput.value = nowText;
    lmpInput.value = nowText;
    eventDateInput.value = nowText;

    function applyMode(mode) {
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-mode-panel") !== mode;
      });
      birthInput.required = mode === "age";
      fromInput.required = mode === "workdays";
      toInput.required = mode === "workdays";
      lmpInput.required = mode === "pregnancy";
      eventDateInput.required = mode === "countdown";
    }

    applyMode(modeSelect.value);
    modeSelect.addEventListener("change", function () {
      applyMode(modeSelect.value);
    });

    function renderAge() {
      const birth = safeDate(birthInput.value);
      if (!birth) {
        output.innerHTML = "<p><strong>Vui lòng nhập ngày sinh hợp lệ.</strong></p>";
        return;
      }
      const today = new Date();
      const { years, months, days } = calcPreciseAge(birth, today);

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Số năm</span><b>" + years + "</b></div>",
        "<div class=\"tile\"><span>Số tháng</span><b>" + months + "</b></div>",
        "<div class=\"tile\"><span>Số ngày</span><b>" + days + "</b></div>",
        "</div>"
      ].join("");
    }

    function renderWorkdays() {
      const from = safeDate(fromInput.value);
      const to = safeDate(toInput.value);
      if (!from || !to) {
        output.innerHTML = "<p><strong>Vui lòng nhập đủ ngày hợp lệ.</strong></p>";
        return;
      }
      const totalDays = window.VUH.daysBetween(from, to);
      const workdays = countWorkdays(from, to);

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Số ngày giữa 2 mốc</span><b>" + window.VUH.formatNumber(Math.abs(totalDays)) + "</b></div>",
        "<div class=\"tile\"><span>Ngày làm việc</span><b>" + window.VUH.formatNumber(workdays) + "</b></div>",
        "</div>"
      ].join("");
    }

    function renderTet() {
      const today = new Date();
      const nextTet = findNextTet(today);
      if (!nextTet) {
        output.innerHTML = "<p>Không thể tính Tết từ dữ liệu hiện tại.</p>";
        return;
      }
      const tetCount = window.VUH.daysBetween(today, nextTet);

      output.innerHTML = [
        "<p><strong>Còn " + window.VUH.formatNumber(tetCount) + " ngày đến Tết Âm lịch tiếp theo</strong></p>",
        "<p>Ngày mùng 1 Tết: " + vnWeekday(nextTet) + ", ngày " + formatDate(nextTet) + "</p>"
      ].join("");
    }

    function renderPregnancy() {
      const lmp = safeDate(lmpInput.value);
      if (!lmp) {
        output.innerHTML = "<p><strong>Vui lòng nhập ngày đầu kỳ kinh cuối hợp lệ.</strong></p>";
        return;
      }
      const today = new Date();
      const { dueDate, weeks, days, daysLeft, trimester } = calcPregnancy(lmp, today);

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Tuổi thai hiện tại</span><b>" + weeks + " tuần " + days + " ngày</b></div>",
        "<div class=\"tile\"><span>Tam cá nguyệt</span><b>Thứ " + trimester + "</b></div>",
        "<div class=\"tile\"><span>Ngày dự sinh</span><b>" + formatDate(dueDate) + "</b></div>",
        "</div>",
        "<p class=\"small\">" + (daysLeft >= 0
          ? "Còn khoảng " + window.VUH.formatNumber(daysLeft) + " ngày đến ngày dự sinh."
          : "Đã qua ngày dự sinh khoảng " + window.VUH.formatNumber(Math.abs(daysLeft)) + " ngày.") + "</p>",
        "<p class=\"notice\">Tính theo quy tắc Naegele (dự sinh = ngày đầu kỳ kinh cuối + 280 ngày), giả định chu kỳ kinh 28 ngày. Chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.</p>"
      ].join("");
    }

    function renderCountdown() {
      const eventDate = safeDate(eventDateInput.value);
      if (!eventDate) {
        output.innerHTML = "<p><strong>Vui lòng nhập ngày sự kiện hợp lệ.</strong></p>";
        return;
      }
      const name = (eventNameInput.value || "").trim() || "Sự kiện";
      const today = new Date();
      const diff = window.VUH.daysBetween(today, eventDate);

      const message = document.createElement("p");
      const eventName = document.createElement("span");
      eventName.textContent = "\"" + name + "\"";
      if (diff > 0) {
        message.append("Còn ");
        const days = document.createElement("strong");
        days.textContent = window.VUH.formatNumber(diff) + " ngày";
        message.append(days, " đến ", eventName);
      } else if (diff === 0) {
        message.append("Hôm nay chính là ngày ", eventName, "!");
      } else {
        message.append(eventName, " đã qua ");
        const days = document.createElement("strong");
        days.textContent = window.VUH.formatNumber(Math.abs(diff)) + " ngày";
        message.appendChild(days);
      }

      const eventDateSummary = document.createElement("p");
      eventDateSummary.textContent = "Ngày diễn ra: " + vnWeekday(eventDate) + ", ngày " + formatDate(eventDate);
      output.replaceChildren(message, eventDateSummary);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const mode = modeSelect.value;
      if (mode === "age") {
        renderAge();
      } else if (mode === "workdays") {
        renderWorkdays();
      } else if (mode === "tet") {
        renderTet();
      } else if (mode === "pregnancy") {
        renderPregnancy();
      } else if (mode === "countdown") {
        renderCountdown();
      }
    });

    form.dispatchEvent(new Event("submit"));
  }

  document.addEventListener("DOMContentLoaded", initDateTools);
})();

