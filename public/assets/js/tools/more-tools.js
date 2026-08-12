(function () {
  "use strict";

  const UNIT_CATEGORIES = {
    length: {
      units: {
        m: { label: "Mét (m)", toBase: (v) => v, fromBase: (v) => v },
        km: { label: "Ki-lô-mét (km)", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
        cm: { label: "Xen-ti-mét (cm)", toBase: (v) => v / 100, fromBase: (v) => v * 100 },
        mile: { label: "Dặm (mile)", toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
        ft: { label: "Feet (ft)", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
        inch: { label: "Inch", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 }
      }
    },
    mass: {
      units: {
        kg: { label: "Ki-lô-gam (kg)", toBase: (v) => v, fromBase: (v) => v },
        g: { label: "Gam (g)", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
        lb: { label: "Pound (lbs)", toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
        ta: { label: "Tạ (VN)", toBase: (v) => v * 100, fromBase: (v) => v / 100 },
        tan: { label: "Tấn", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 }
      }
    },
    temperature: {
      units: {
        c: { label: "Độ C (°C)", toBase: (v) => v, fromBase: (v) => v },
        f: { label: "Độ F (°F)", toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
        k: { label: "Kelvin (K)", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 }
      }
    }
  };

  const SHOE_MEN = [
    { vn: 38, us: 6, uk: 5.5 },
    { vn: 39, us: 6.5, uk: 6 },
    { vn: 40, us: 7, uk: 6.5 },
    { vn: 41, us: 8, uk: 7.5 },
    { vn: 42, us: 8.5, uk: 8 },
    { vn: 43, us: 9.5, uk: 9 },
    { vn: 44, us: 10.5, uk: 10 },
    { vn: 45, us: 11.5, uk: 11 },
    { vn: 46, us: 12.5, uk: 12 }
  ];
  const SHOE_WOMEN = [
    { vn: 35, us: 5, uk: 2.5 },
    { vn: 36, us: 5.5, uk: 3.5 },
    { vn: 37, us: 6.5, uk: 4.5 },
    { vn: 38, us: 7.5, uk: 5.5 },
    { vn: 39, us: 8.5, uk: 6.5 },
    { vn: 40, us: 9, uk: 7 },
    { vn: 41, us: 9.5, uk: 7.5 }
  ];
  const CLOTHING_SIZES = [
    { label: "XS", vn: 36 },
    { label: "S", vn: 38 },
    { label: "M", vn: 40 },
    { label: "L", vn: 42 },
    { label: "XL", vn: 44 },
    { label: "XXL", vn: 46 }
  ];

  function secureRandomInt(min, max) {
    const range = max - min + 1;
    const array = new Uint32Array(1);
    const maxUint32 = 0xffffffff;
    const limit = maxUint32 - (maxUint32 % range);
    let value;
    do {
      window.crypto.getRandomValues(array);
      value = array[0];
    } while (value >= limit);
    return min + (value % range);
  }

  function generatePassword(length, useUpper, useLower, useNumbers, useSymbols) {
    const sets = [];
    if (useUpper) sets.push("ABCDEFGHJKLMNPQRSTUVWXYZ");
    if (useLower) sets.push("abcdefghijkmnpqrstuvwxyz");
    if (useNumbers) sets.push("23456789");
    if (useSymbols) sets.push("!@#$%^&*()-_=+[]{}");
    if (sets.length === 0) return "";

    const allChars = sets.join("");
    const chars = [];
    // Đảm bảo mỗi loại ký tự được chọn xuất hiện ít nhất 1 lần.
    sets.forEach(function (set) {
      chars.push(set[secureRandomInt(0, set.length - 1)]);
    });
    while (chars.length < length) {
      chars.push(allChars[secureRandomInt(0, allChars.length - 1)]);
    }
    // Xáo trộn (Fisher-Yates) bằng nguồn ngẫu nhiên bảo mật.
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = secureRandomInt(0, i);
      const tmp = chars[i];
      chars[i] = chars[j];
      chars[j] = tmp;
    }
    return chars.slice(0, length).join("");
  }

  function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (/(.)\1\1/.test(password)) score -= 1; // ký tự lặp lại 3 lần liên tiếp
    if (/^(123|abc|password|qwerty)/i.test(password)) score -= 2;

    score = Math.max(0, Math.min(score, 7));
    const levels = ["Rất yếu", "Yếu", "Trung bình", "Khá", "Mạnh", "Rất mạnh", "Rất mạnh", "Rất mạnh"];
    return { score, label: levels[score] };
  }

  function bmiClassification(bmi) {
    if (bmi < 18.5) return "Thiếu cân (gầy)";
    if (bmi < 23) return "Bình thường";
    if (bmi < 25) return "Thừa cân";
    if (bmi < 30) return "Béo phì độ I";
    return "Béo phì độ II trở lên";
  }

  function initMoreTools() {
    const form = document.querySelector("[data-more-form]");
    const output = document.querySelector("[data-more-output]");
    if (!form || !output) return;

    const modeSelect = form.querySelector("[data-more-mode]");
    const panels = form.querySelectorAll("[data-mode-panel]");

    const unitCategory = form.querySelector("#unitCategory");
    const unitFrom = form.querySelector("#unitFrom");
    const unitTo = form.querySelector("#unitTo");
    const unitValue = form.querySelector("#unitValue");

    const sizeType = form.querySelector("#sizeType");
    const sizeValue = form.querySelector("#sizeValue");

    const bmiHeight = form.querySelector("#bmiHeight");
    const bmiWeight = form.querySelector("#bmiWeight");

    const passwordAction = form.querySelector("#passwordAction");
    const passwordPanels = form.querySelectorAll("[data-sub-panel]");
    const pwLength = form.querySelector("#pwLength");
    const pwUpper = form.querySelector("#pwUpper");
    const pwLower = form.querySelector("#pwLower");
    const pwNumbers = form.querySelector("#pwNumbers");
    const pwSymbols = form.querySelector("#pwSymbols");
    const pwCheckInput = form.querySelector("#pwCheckInput");

    const randomAction = form.querySelector("#randomAction");
    const randomMin = form.querySelector("#randomMin");
    const randomMax = form.querySelector("#randomMax");
    const randomList = form.querySelector("#randomList");
    const randomPickCount = form.querySelector("#randomPickCount");

    const qrText = form.querySelector("#qrText");

    function populateUnitSelects() {
      const category = UNIT_CATEGORIES[unitCategory.value];
      const keys = Object.keys(category.units);
      const optionsHtml = keys
        .map(function (key) {
          return "<option value=\"" + key + "\">" + category.units[key].label + "</option>";
        })
        .join("");
      unitFrom.innerHTML = optionsHtml;
      unitTo.innerHTML = optionsHtml;
      unitTo.selectedIndex = Math.min(1, keys.length - 1);
    }
    unitCategory.addEventListener("change", populateUnitSelects);
    populateUnitSelects();

    function populateSizeSelect() {
      let source;
      if (sizeType.value === "shoe-men") source = SHOE_MEN;
      else if (sizeType.value === "shoe-women") source = SHOE_WOMEN;
      else source = CLOTHING_SIZES;

      if (sizeType.value === "clothing") {
        sizeValue.innerHTML = source
          .map(function (row) {
            return "<option value=\"" + row.label + "\">" + row.label + " (VN " + row.vn + ")</option>";
          })
          .join("");
      } else {
        sizeValue.innerHTML = source
          .map(function (row) {
            return "<option value=\"" + row.vn + "\">VN/EU " + row.vn + "</option>";
          })
          .join("");
      }
    }
    sizeType.addEventListener("change", populateSizeSelect);
    populateSizeSelect();

    function applySubPanel(select, panels) {
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-sub-panel") !== select.value;
      });
    }
    const passwordModePanel = form.querySelector("[data-mode-panel=\"password\"]");
    const randomModePanel = form.querySelector("[data-mode-panel=\"random\"]");
    const passwordSubPanels = passwordModePanel.querySelectorAll("[data-sub-panel]");
    const randomSubPanels = randomModePanel.querySelectorAll("[data-sub-panel]");

    passwordAction.addEventListener("change", function () {
      applySubPanel(passwordAction, passwordSubPanels);
    });
    applySubPanel(passwordAction, passwordSubPanels);

    randomAction.addEventListener("change", function () {
      applySubPanel(randomAction, randomSubPanels);
    });
    applySubPanel(randomAction, randomSubPanels);

    function applyMode(mode) {
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-mode-panel") !== mode;
      });
    }
    applyMode(modeSelect.value);
    modeSelect.addEventListener("change", function () {
      applyMode(modeSelect.value);
    });

    function renderUnit() {
      const category = UNIT_CATEGORIES[unitCategory.value];
      const value = Number(unitValue.value || 0);
      const fromUnit = category.units[unitFrom.value];
      const toUnit = category.units[unitTo.value];
      const base = fromUnit.toBase(value);
      const result = toUnit.fromBase(base);

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Kết quả</span><b>" + window.VUH.formatNumber(Math.round(result * 10000) / 10000) + " " + toUnit.label + "</b></div>",
        "</div>"
      ].join("");
    }

    function renderSize() {
      const value = sizeValue.value;
      if (sizeType.value === "clothing") {
        const row = CLOTHING_SIZES.find(function (r) {
          return r.label === value;
        });
        output.innerHTML = [
          "<div class=\"kpi\">",
          "<div class=\"tile\"><span>Size quốc tế</span><b>" + row.label + "</b></div>",
          "<div class=\"tile\"><span>Size VN tương ứng</span><b>" + row.vn + "</b></div>",
          "</div>",
          "<p class=\"notice\">Bảng size quần áo chỉ mang tính tham khảo, mỗi thương hiệu có thể quy đổi khác nhau.</p>"
        ].join("");
        return;
      }
      const source = sizeType.value === "shoe-men" ? SHOE_MEN : SHOE_WOMEN;
      const row = source.find(function (r) {
        return String(r.vn) === String(value);
      });
      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Size VN/EU</span><b>" + row.vn + "</b></div>",
        "<div class=\"tile\"><span>Size US</span><b>" + row.us + "</b></div>",
        "<div class=\"tile\"><span>Size UK</span><b>" + row.uk + "</b></div>",
        "</div>",
        "<p class=\"notice\">Bảng quy đổi size giày chỉ mang tính tham khảo, có thể khác nhau tùy hãng.</p>"
      ].join("");
    }

    function renderBMI() {
      const heightCm = Number(bmiHeight.value || 0);
      const weightKg = Number(bmiWeight.value || 0);
      if (heightCm <= 0 || weightKg <= 0) {
        output.innerHTML = "<p><strong>Vui lòng nhập chiều cao và cân nặng hợp lệ.</strong></p>";
        return;
      }
      const heightM = heightCm / 100;
      const bmi = weightKg / (heightM * heightM);

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Chỉ số BMI</span><b>" + bmi.toFixed(1) + "</b></div>",
        "<div class=\"tile\"><span>Phân loại</span><b>" + bmiClassification(bmi) + "</b></div>",
        "</div>",
        "<p class=\"small\">Phân loại theo thang khuyến nghị cho người châu Á (WHO khu vực Tây Thái Bình Dương), chỉ mang tính tham khảo.</p>"
      ].join("");
    }

    function renderPassword() {
      if (passwordAction.value === "generate") {
        const length = Math.max(4, Math.min(64, Number(pwLength.value || 16)));
        const password = generatePassword(length, pwUpper.checked, pwLower.checked, pwNumbers.checked, pwSymbols.checked);
        if (!password) {
          output.innerHTML = "<p><strong>Vui lòng chọn ít nhất 1 loại ký tự.</strong></p>";
          return;
        }
        const strength = checkPasswordStrength(password);
        output.innerHTML = [
          "<label for=\"pwResult\">Mật khẩu vừa tạo</label>",
          "<textarea id=\"pwResult\" rows=\"2\" readonly></textarea>",
          "<p><strong>Độ mạnh:</strong> " + strength.label + "</p>",
          "<p class=\"notice\">Mật khẩu được tạo bằng bộ sinh số ngẫu nhiên bảo mật của trình duyệt (Web Crypto API), không lưu trữ hay gửi đi bất kỳ đâu.</p>"
        ].join("");
        const pwResult = output.querySelector("#pwResult");
        if (pwResult) pwResult.value = password;
      } else {
        const password = pwCheckInput.value || "";
        if (!password) {
          output.innerHTML = "<p><strong>Vui lòng nhập mật khẩu cần kiểm tra.</strong></p>";
          return;
        }
        const strength = checkPasswordStrength(password);
        output.innerHTML = [
          "<div class=\"kpi\">",
          "<div class=\"tile\"><span>Độ dài</span><b>" + password.length + " ký tự</b></div>",
          "<div class=\"tile\"><span>Đánh giá</span><b>" + strength.label + "</b></div>",
          "</div>",
          "<p class=\"notice\">Việc kiểm tra diễn ra hoàn toàn trên trình duyệt của bạn, mật khẩu không được gửi đi bất kỳ đâu.</p>"
        ].join("");
      }
    }

    function renderRandom() {
      if (randomAction.value === "range") {
        const min = Math.round(Number(randomMin.value || 0));
        const max = Math.round(Number(randomMax.value || 0));
        if (min > max) {
          output.innerHTML = "<p><strong>Số bắt đầu phải nhỏ hơn hoặc bằng số kết thúc.</strong></p>";
          return;
        }
        const result = secureRandomInt(min, max);
        output.innerHTML = [
          "<div class=\"kpi\">",
          "<div class=\"tile\"><span>Kết quả ngẫu nhiên</span><b>" + window.VUH.formatNumber(result) + "</b></div>",
          "</div>"
        ].join("");
      } else {
        const items = (randomList.value || "")
          .split("\n")
          .map(function (item) {
            return item.trim();
          })
          .filter(Boolean);
        const count = Math.max(1, Math.min(items.length, Math.round(Number(randomPickCount.value || 1))));
        if (items.length === 0) {
          output.innerHTML = "<p><strong>Vui lòng nhập danh sách cần bốc thăm.</strong></p>";
          return;
        }
        const pool = items.slice();
        const picked = [];
        for (let i = 0; i < count; i += 1) {
          const idx = secureRandomInt(0, pool.length - 1);
          picked.push(pool[idx]);
          pool.splice(idx, 1);
        }
        const resultList = document.createElement("div");
        resultList.className = "kpi";

        picked.forEach(function (item, index) {
          const tile = document.createElement("div");
          tile.className = "tile";

          const label = document.createElement("span");
          label.textContent = "Kết quả " + (index + 1);

          const value = document.createElement("b");
          value.textContent = item;

          tile.append(label, value);
          resultList.appendChild(tile);
        });

        output.replaceChildren(resultList);
      }
    }

    function renderQR() {
      const text = (qrText.value || "").trim();
      if (!text) {
        output.innerHTML = "<p><strong>Vui lòng nhập văn bản hoặc liên kết.</strong></p>";
        return;
      }
      output.innerHTML = [
        "<div class=\"qr-result\">",
        "<canvas data-qr-canvas></canvas>",
        "<div class=\"qr-result__info\">",
        "<button class=\"btn-ghost\" type=\"button\" data-qr-download>Tải ảnh QR (PNG)</button>",
        "</div>",
        "</div>"
      ].join("");

      const canvas = output.querySelector("[data-qr-canvas]");
      try {
        window.VUH.drawQRCode(canvas, text, { level: "M", cellSize: 6 });
      } catch (e) {
        output.innerHTML = "<p><strong>Nội dung quá dài để tạo mã QR. Vui lòng rút gọn bớt.</strong></p>";
        return;
      }

      const downloadBtn = output.querySelector("[data-qr-download]");
      if (downloadBtn) {
        downloadBtn.addEventListener("click", function () {
          const link = document.createElement("a");
          link.download = "qr-code.png";
          link.href = canvas.toDataURL("image/png");
          link.click();
        });
      }
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const mode = modeSelect.value;
      if (mode === "unit") renderUnit();
      else if (mode === "size") renderSize();
      else if (mode === "bmi") renderBMI();
      else if (mode === "password") renderPassword();
      else if (mode === "random") renderRandom();
      else if (mode === "qr") renderQR();
    });

    form.dispatchEvent(new Event("submit"));
  }

  document.addEventListener("DOMContentLoaded", initMoreTools);
})();
