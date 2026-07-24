(function () {
  "use strict";

  const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
  const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
  const TZ = 7;

  function INT(value) {
    return Math.floor(value);
  }

  // Julian Day Number (JDN) theo thuật toán Meeus, dùng cho toàn bộ tính toán
  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) {
      jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    }
    return jd;
  }

  // Thời điểm Sóc (New Moon) thứ k, đầy đủ các số hạng hiệu chỉnh thiên văn
  // (chính xác hơn nhiều so với công thức 1 số hạng đơn giản)
  function NewMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const dr = Math.PI / 180;
    let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 -= 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 += 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 -= 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 -= 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 += 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));

    let deltat;
    if (T < -11) {
      deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
      deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }

    return jd1 + C1 - deltat;
  }

  // Kinh độ Mặt Trời tức thời (0-11, mỗi cung 30 độ), đầy đủ số hạng hiệu chỉnh
  function SunLongitude(jdn) {
    const T = (jdn - 2451545.0) / 36525;
    const T2 = T * T;
    const dr = Math.PI / 180;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    let L = L0 + DL;
    L *= dr;
    L -= Math.PI * 2 * INT(L / (Math.PI * 2));
    return INT((L / Math.PI) * 6);
  }

  function getNewMoonDay(k, timeZone) {
    return INT(NewMoon(k) + 0.5 + timeZone / 24);
  }

  function getSunLongitude(dayNumber, timeZone) {
    return SunLongitude(dayNumber - 0.5 - timeZone / 24);
  }

  function getLunarMonth11(yy, timeZone) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = INT(off / 29.530588853);
    let nm = getNewMoonDay(k, timeZone);
    const sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) {
      nm = getNewMoonDay(k - 1, timeZone);
    }
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    let last;
    do {
      last = arc;
      i += 1;
      arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    return i - 1;
  }

  // Chuyển Dương lịch sang Âm lịch - thuật toán đầy đủ, có xử lý tháng nhuận chính xác
  function convertSolar2Lunar(dd, mm, yy, timeZone) {
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) {
      monthStart = getNewMoonDay(k, timeZone);
    }

    let a11 = getLunarMonth11(yy, timeZone);
    let b11 = a11;
    let lunarYear;

    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
      lunarYear = yy + 1;
      b11 = getLunarMonth11(yy + 1, timeZone);
    }

    const lunarDay = dayNumber - monthStart + 1;
    let diff = INT((monthStart - a11) / 29);
    let lunarLeap = 0;
    let lunarMonth = diff + 11;

    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) {
        lunarMonth = diff + 10;
        if (diff === leapMonthDiff) {
          lunarLeap = 1;
        }
      }
    }

    if (lunarMonth > 12) {
      lunarMonth -= 12;
    }

    if (lunarMonth >= 11 && diff < 4) {
      lunarYear -= 1;
    }

    return {
      lunarDay,
      lunarMonth,
      lunarYear,
      lunarLeap
    };
  }

  // Can Chi năm (theo năm âm lịch, chu kỳ 60 năm chuẩn)
  function canChiYear(year) {
    let idxCan = (year - 4) % 10;
    let idxChi = (year - 4) % 12;
    if (idxCan < 0) idxCan += 10;
    if (idxChi < 0) idxChi += 12;
    return CAN[idxCan] + " " + CHI[idxChi];
  }

  // Can Chi tháng - áp dụng quy tắc "Ngũ Hổ Độn" cổ truyền:
  // Chi tháng suy trực tiếp từ số tháng âm lịch (tháng 1 = Dần, tháng 2 = Mão, ...,
  // tháng 11 = Tý, tháng 12 = Sửu). Can tháng suy từ Can năm âm lịch theo bảng ngũ hổ độn.
  function canChiMonth(lunarMonth, lunarYear) {
    let idxCanNam = (lunarYear - 4) % 10;
    if (idxCanNam < 0) idxCanNam += 10;

    const idxChiThang = (lunarMonth + 1) % 12;
    const idxCanThang = (idxCanNam * 2 + idxChiThang) % 10;

    return CAN[idxCanThang] + " " + CHI[idxChiThang];
  }

  // Can Chi ngày (chu kỳ Lục thập hoa giáp, dựa trên Julian Day Number)
  function canChiDay(dd, mm, yy) {
    const jd = jdFromDate(dd, mm, yy);
    return CAN[(jd + 9) % 10] + " " + CHI[(jd + 1) % 12];
  }

  function formatVNDate(date) {
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  }

  const WEEKDAYS_VN = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

  function vnWeekday(date) {
    return WEEKDAYS_VN[date.getDay()];
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatSolarShort(date) {
    return pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1) + "/" + date.getFullYear();
  }

  // Tìm ngày rằm (15 âm lịch) và mùng 1 âm lịch gần nhất kể từ ngày cho trước (tính cả hôm nay).
  // Một tháng âm lịch dài tối đa 30 ngày nên chỉ cần quét tối đa vài chục ngày, không tốn hiệu năng.
  function findNearestLunarMarks(fromDate) {
    let mung1 = null;
    let ram = null;
    for (let offset = 0; offset <= 40 && (!mung1 || !ram); offset += 1) {
      const d = new Date(fromDate);
      d.setDate(d.getDate() + offset);
      const lunar = convertSolar2Lunar(d.getDate(), d.getMonth() + 1, d.getFullYear(), TZ);
      if (!mung1 && lunar.lunarDay === 1) {
        mung1 = { date: d, offset };
      }
      if (!ram && lunar.lunarDay === 15) {
        ram = { date: d, offset };
      }
    }
    return { mung1, ram };
  }

  function describeMark(mark) {
    if (!mark) {
      return "không xác định";
    }
    const countdown = mark.offset === 0 ? "hôm nay" : "còn " + mark.offset + " ngày";
    return formatSolarShort(mark.date) + " (" + vnWeekday(mark.date) + ") - " + countdown;
  }

  function renderNearestNote(fromDate) {
    const nearestEl = document.querySelector("[data-lunar-nearest]");
    if (!nearestEl) {
      return;
    }
    const { mung1, ram } = findNearestLunarMarks(fromDate);
    nearestEl.innerHTML = [
      "<p><strong>Ngày rằm gần nhất:</strong> " + describeMark(ram) + "</p>",
      "<p><strong>Mùng 1 gần nhất:</strong> " + describeMark(mung1) + "</p>"
    ].join("");
  }

  // Lịch âm tháng: chỉ tính lunar cho các ngày thuộc tháng dương lịch đang hiển thị
  // (tối đa 31 lần gọi convertSolar2Lunar mỗi lần render) - không lưu trữ dữ liệu, không lag.
  const calState = { year: null, month: null, selected: null };

  function renderMonthCalendar(year, month) {
    calState.year = year;
    calState.month = month;

    const titleEl = document.querySelector("[data-cal-title]");
    const gridEl = document.querySelector("[data-cal-grid]");
    if (!titleEl || !gridEl) {
      return;
    }

    titleEl.textContent = "Tháng " + month + "/" + year;

    const today = new Date();
    const todayStr = today.getFullYear() + "-" + pad2(today.getMonth() + 1) + "-" + pad2(today.getDate());

    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leading = (firstDay.getDay() + 6) % 7; // tuần bắt đầu từ Thứ Hai

    const cells = [];
    for (let i = 0; i < leading; i += 1) {
      cells.push('<div class="cal-day cal-day--empty"></div>');
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const lunar = convertSolar2Lunar(day, month, year, TZ);
      const dateStr = year + "-" + pad2(month) + "-" + pad2(day);
      const classes = ["cal-day"];
      if (dateStr === todayStr) classes.push("cal-day--today");
      if (dateStr === calState.selected) classes.push("cal-day--selected");
      if (lunar.lunarDay === 1) classes.push("cal-day--mung1");
      if (lunar.lunarDay === 15) classes.push("cal-day--ram");

      cells.push(
        '<button type="button" class="' + classes.join(" ") + '" data-date="' + dateStr + '">' +
          '<span class="cal-day__solar">' + day + "</span>" +
          '<span class="cal-day__lunar">' + lunar.lunarDay + "</span>" +
        "</button>"
      );
    }

    const totalCells = leading + daysInMonth;
    const trailing = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < trailing; i += 1) {
      cells.push('<div class="cal-day cal-day--empty"></div>');
    }

    gridEl.innerHTML = cells.join("");
  }

  function initMonthCalendar() {
    const prevBtn = document.querySelector("[data-cal-prev]");
    const nextBtn = document.querySelector("[data-cal-next]");
    const todayBtn = document.querySelector("[data-cal-today]");
    const gridEl = document.querySelector("[data-cal-grid]");
    if (!prevBtn || !nextBtn || !gridEl) {
      return;
    }

    prevBtn.addEventListener("click", function () {
      let { year, month } = calState;
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      renderMonthCalendar(year, month);
    });

    nextBtn.addEventListener("click", function () {
      let { year, month } = calState;
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      renderMonthCalendar(year, month);
    });

    if (todayBtn) {
      todayBtn.addEventListener("click", function () {
        const dateInput = document.querySelector("#solarDate");
        const form = dateInput && dateInput.closest("form");
        if (!dateInput || !form) {
          return;
        }
        dateInput.valueAsDate = new Date();
        form.dispatchEvent(new Event("submit", { cancelable: true }));
      });
    }

    gridEl.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-date]");
      if (!btn) {
        return;
      }
      const dateInput = document.querySelector("#solarDate");
      const form = dateInput && dateInput.closest("form");
      if (!dateInput || !form) {
        return;
      }
      dateInput.value = btn.getAttribute("data-date");
      form.dispatchEvent(new Event("submit", { cancelable: true }));
    });
  }

  function initLunarTool() {
    const form = document.querySelector("[data-lunar-form]");
    const output = document.querySelector("[data-lunar-output]");

    if (!form || !output) {
      return;
    }

    const input = form.querySelector("#solarDate");
    input.valueAsDate = new Date();

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!input.value) {
        output.innerHTML = "<p><strong>Vui lòng chọn ngày dương lịch.</strong></p>";
        return;
      }

      const solar = new Date(input.value + "T00:00:00");
      const dd = solar.getDate();
      const mm = solar.getMonth() + 1;
      const yy = solar.getFullYear();

      const lunar = convertSolar2Lunar(dd, mm, yy, TZ);
      const lunarStr = lunar.lunarDay + "/" + lunar.lunarMonth + "/" + lunar.lunarYear;

      output.innerHTML = [
        "<p><strong>Ngày âm:</strong> " + lunarStr + (lunar.lunarLeap ? " (tháng nhuận)" : "") + "</p>",
        "<p><strong>Can chi năm:</strong> " + canChiYear(lunar.lunarYear) + "</p>",
        "<p><strong>Can chi tháng:</strong> " + canChiMonth(lunar.lunarMonth, lunar.lunarYear) + "</p>",
        "<p><strong>Can chi ngày:</strong> " + canChiDay(dd, mm, yy) + "</p>",
        "<p class=\"small\">Dương lịch: " + formatVNDate(solar) + " (GMT+7)</p>"
      ].join("");

      renderNearestNote(solar);
      calState.selected = input.value;
      renderMonthCalendar(yy, mm);
    });

    initMonthCalendar();
    form.dispatchEvent(new Event("submit"));
  }


  window.VUH = window.VUH || {};
  window.VUH.convertSolar2Lunar = convertSolar2Lunar;
  window.VUH.initLunarTool = initLunarTool;

  document.addEventListener("DOMContentLoaded", initLunarTool);
})();
