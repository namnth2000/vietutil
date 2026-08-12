(function () {
  "use strict";

  const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
  const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
  const TZ = 7;
  const NEW_MOON_EPOCH = 2451550.09765;
  const SYNODIC_MONTH = 29.530588853;

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

  function sinDeg(angle) {
    return Math.sin(angle * Math.PI / 180);
  }

  // ΔT = TT - UT (giây). Các đa thức lịch sử của Espenak/Meeus giúp chuyển
  // thời điểm Sóc từ Dynamical Time của công thức thiên văn sang Universal Time.
  function deltaTSeconds(year) {
    let t;
    let u;

    if (year < -500) {
      u = (year - 1820) / 100;
      return -20 + 32 * u * u;
    }
    if (year < 500) {
      u = year / 100;
      return 10583.6 - 1014.41 * u + 33.78311 * u ** 2 - 5.952053 * u ** 3
        - 0.1798452 * u ** 4 + 0.022174192 * u ** 5 + 0.0090316521 * u ** 6;
    }
    if (year < 1600) {
      u = (year - 1000) / 100;
      return 1574.2 - 556.01 * u + 71.23472 * u ** 2 + 0.319781 * u ** 3
        - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6;
    }
    if (year < 1700) {
      t = year - 1600;
      return 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129;
    }
    if (year < 1800) {
      t = year - 1700;
      return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000;
    }
    if (year < 1860) {
      t = year - 1800;
      return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3
        - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6
        + 0.000000000875 * t ** 7;
    }
    if (year < 1900) {
      t = year - 1860;
      return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3
        - 0.0004473624 * t ** 4 + t ** 5 / 233174;
    }
    if (year < 1920) {
      t = year - 1900;
      return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
    }
    if (year < 1941) {
      t = year - 1920;
      return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
    }
    if (year < 1961) {
      t = year - 1950;
      return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
    }
    if (year < 1986) {
      t = year - 1975;
      return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
    }
    if (year < 2005) {
      t = year - 2000;
      return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3
        + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
    }
    if (year < 2050) {
      t = year - 2000;
      return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
    }
    if (year < 2150) {
      u = (year - 1820) / 100;
      return -20 + 32 * u * u - 0.5628 * (2150 - year);
    }

    u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  }

  // Thời điểm Sóc thứ k theo Meeus, Astronomical Algorithms (ấn bản 2,
  // chương 49). Kết quả trả về là Julian Date theo UT, không phải TT.
  function NewMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T;
    const T3 = T2 * T;
    const T4 = T3 * T;
    const E = 1 - 0.002516 * T - 0.0000074 * T2;
    const M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;
    const Mpr = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
    const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
    const omega = 124.7746 - 1.56375580 * k + 0.0020672 * T2 + 0.00000215 * T3;

    let jde = NEW_MOON_EPOCH + SYNODIC_MONTH * k + 0.0001337 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
    jde += -0.40720 * sinDeg(Mpr) + 0.17241 * E * sinDeg(M) + 0.01608 * sinDeg(2 * Mpr);
    jde += 0.01039 * sinDeg(2 * F) + 0.00739 * E * sinDeg(Mpr - M) - 0.00514 * E * sinDeg(Mpr + M);
    jde += 0.00208 * E * E * sinDeg(2 * M) - 0.00111 * sinDeg(Mpr - 2 * F) - 0.00057 * sinDeg(Mpr + 2 * F);
    jde += 0.00056 * E * sinDeg(2 * Mpr + M) - 0.00042 * sinDeg(3 * Mpr) + 0.00042 * E * sinDeg(M + 2 * F);
    jde += 0.00038 * E * sinDeg(M - 2 * F) - 0.00024 * E * sinDeg(2 * Mpr - M) - 0.00017 * sinDeg(omega);
    jde += -0.00007 * sinDeg(Mpr + 2 * M) + 0.00004 * sinDeg(2 * Mpr - 2 * F) + 0.00004 * sinDeg(3 * M);
    jde += 0.00003 * sinDeg(Mpr + M - 2 * F) + 0.00003 * sinDeg(2 * Mpr + 2 * F);
    jde += -0.00003 * sinDeg(Mpr + M + 2 * F) + 0.00003 * sinDeg(Mpr - M + 2 * F);
    jde += -0.00002 * sinDeg(Mpr - M - 2 * F) - 0.00002 * sinDeg(3 * Mpr + M) + 0.00002 * sinDeg(4 * Mpr);

    const planetaryCorrections = [
      [0.000325, 299.77 + 0.107408 * k - 0.009173 * T2],
      [0.000165, 251.88 + 0.016321 * k],
      [0.000164, 251.83 + 26.651886 * k],
      [0.000126, 349.42 + 36.412478 * k],
      [0.000110, 84.66 + 18.206239 * k],
      [0.000062, 141.74 + 53.303771 * k],
      [0.000060, 207.14 + 2.453732 * k],
      [0.000056, 154.84 + 7.306860 * k],
      [0.000047, 34.52 + 27.261239 * k],
      [0.000042, 207.19 + 0.121824 * k],
      [0.000040, 291.34 + 1.844379 * k],
      [0.000037, 161.72 + 24.198154 * k],
      [0.000035, 239.56 + 25.513099 * k],
      [0.000023, 331.55 + 3.592518 * k]
    ];

    for (const [coefficient, angle] of planetaryCorrections) {
      jde += coefficient * sinDeg(angle);
    }

    const approximateYear = 2000 + k / 12.3685;
    return jde - deltaTSeconds(approximateYear) / 86400;
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

  // Tìm đúng kỳ Sóc gần nhất không nằm sau ngày đang xét. Không dựa vào giả
  // định sai số của công thức luôn nhỏ hơn một phía của mốc tháng giao hội.
  function getNewMoonOnOrBefore(dayNumber, timeZone) {
    let k = INT((dayNumber - NEW_MOON_EPOCH) / SYNODIC_MONTH);
    let newMoonDay = getNewMoonDay(k, timeZone);

    while (newMoonDay > dayNumber) {
      k -= 1;
      newMoonDay = getNewMoonDay(k, timeZone);
    }

    let nextNewMoonDay = getNewMoonDay(k + 1, timeZone);
    while (nextNewMoonDay <= dayNumber) {
      k += 1;
      newMoonDay = nextNewMoonDay;
      nextNewMoonDay = getNewMoonDay(k + 1, timeZone);
    }

    return { k, dayNumber: newMoonDay };
  }

  function getSunLongitude(dayNumber, timeZone) {
    return SunLongitude(dayNumber - 0.5 - timeZone / 24);
  }

  function getLunarMonth11(yy, timeZone) {
    const lastNewMoon = getNewMoonOnOrBefore(jdFromDate(31, 12, yy), timeZone);
    let nm = lastNewMoon.dayNumber;
    const sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) {
      nm = getNewMoonDay(lastNewMoon.k - 1, timeZone);
    }
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    const k = getNewMoonOnOrBefore(a11, timeZone).k;
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
    const monthStart = getNewMoonOnOrBefore(dayNumber, timeZone).dayNumber;

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

      const lunarLabel = lunar.lunarDay === 1 ? lunar.lunarDay + "/" + lunar.lunarMonth : String(lunar.lunarDay);

      cells.push(
        '<button type="button" class="' + classes.join(" ") + '" data-date="' + dateStr + '">' +
          '<span class="cal-day__solar">' + day + "</span>" +
          '<span class="cal-day__lunar">' + lunarLabel + "</span>" +
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
