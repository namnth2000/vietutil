(function () {
  "use strict";

  // Bậc thuế TNCN lũy tiến từng phần (thu nhập từ tiền lương/tiền công), đơn vị VND/tháng.
  // Biểu thuế 5 bậc theo Luật Thuế TNCN số 109/2025/QH15, áp dụng cho kỳ tính thuế từ 01/01/2026.
  const TNCN_BRACKETS = [
    { upTo: 10000000, rate: 0.05 },
    { upTo: 30000000, rate: 0.1 },
    { upTo: 60000000, rate: 0.2 },
    { upTo: 100000000, rate: 0.3 },
    { upTo: Infinity, rate: 0.35 }
  ];
  // Giảm trừ gia cảnh mới theo Nghị quyết số 110/2025/UBTVQH15, áp dụng từ 01/01/2026.
  const GT_BAN_THAN = 15500000;
  const GT_NGUOI_PHU_THUOC = 6200000;
  const LUONG_CO_SO = 2530000; // dùng làm trần đóng BHXH/BHYT (20 lần lương cơ sở), hiệu lực từ 01/07/2026
  // Mức lương tối thiểu vùng mới, hiệu lực từ 01/01/2026 (Nghị định số 293/2025/NĐ-CP).
  const VUNG_LUONG_TOI_THIEU = {
    "1": 5310000,
    "2": 4730000,
    "3": 4140000,
    "4": 3700000
  };

  const VIETQR_BANKS = [
    { bin: "970436", name: "Vietcombank" },
    { bin: "970415", name: "VietinBank" },
    { bin: "970418", name: "BIDV" },
    { bin: "970405", name: "Agribank" },
    { bin: "970407", name: "Techcombank" },
    { bin: "970422", name: "MB Bank" },
    { bin: "970416", name: "ACB" },
    { bin: "970432", name: "VPBank" },
    { bin: "970423", name: "TPBank" },
    { bin: "970403", name: "Sacombank" },
    { bin: "970437", name: "HDBank" },
    { bin: "970443", name: "SHB" },
    { bin: "970431", name: "Eximbank" },
    { bin: "970426", name: "MSB" },
    { bin: "970441", name: "VIB" },
    { bin: "970449", name: "LPBank" },
    { bin: "970448", name: "OCB" }
  ];

  function calcTNCN(taxableIncome) {
    const income = Math.max(0, taxableIncome);
    let remaining = income;
    let tax = 0;
    let previousUpTo = 0;
    const breakdown = TNCN_BRACKETS.map(function (bracket) {
      const bracketWidth = bracket.upTo - previousUpTo;
      const amountInBracket = Math.max(0, Math.min(remaining, bracketWidth));
      const taxInBracket = amountInBracket * bracket.rate;
      tax += taxInBracket;
      remaining = Math.max(0, remaining - amountInBracket);
      const row = {
        from: previousUpTo,
        upTo: bracket.upTo,
        rate: bracket.rate,
        taxableAmount: amountInBracket,
        taxAmount: taxInBracket
      };
      previousUpTo = bracket.upTo;
      return row;
    });
    return { tax, breakdown };
  }

  // Bảo hiểm phần người lao động đóng: BHXH 8%, BHYT 1,5%, BHTN 1%.
  function computeInsurance(grossSalary, regionMin) {
    const bhxhBhytBase = Math.min(grossSalary, 20 * LUONG_CO_SO);
    const bhtnBase = Math.min(grossSalary, 20 * regionMin);
    const bhxh = bhxhBhytBase * 0.08;
    const bhyt = bhxhBhytBase * 0.015;
    const bhtn = bhtnBase * 0.01;
    return { bhxh, bhyt, bhtn, total: bhxh + bhyt + bhtn };
  }

  // Bảo hiểm phần người sử dụng lao động đóng: BHXH 17%, BHTNLĐ-BNN 0,5%, BHYT 3%, BHTN 1%.
  function computeEmployerInsurance(grossSalary, regionMin) {
    const bhxhBhytBase = Math.min(grossSalary, 20 * LUONG_CO_SO);
    const bhtnBase = Math.min(grossSalary, 20 * regionMin);
    const bhxh = bhxhBhytBase * 0.17;
    const tnldBnn = bhxhBhytBase * 0.005;
    const bhyt = bhxhBhytBase * 0.03;
    const bhtn = bhtnBase * 0.01;
    return { bhxh, tnldBnn, bhyt, bhtn, total: bhxh + tnldBnn + bhyt + bhtn };
  }

  function grossToNet(gross, dependents, regionMin) {
    const insurance = computeInsurance(gross, regionMin);
    const preTaxIncome = gross - insurance.total;
    const deductionBanThan = GT_BAN_THAN;
    const deductionPhuThuoc = GT_NGUOI_PHU_THUOC * dependents;
    const deduction = deductionBanThan + deductionPhuThuoc;
    const taxableIncome = Math.max(0, preTaxIncome - deduction);
    const tncn = calcTNCN(taxableIncome);
    const net = preTaxIncome - tncn.tax;
    const employerInsurance = computeEmployerInsurance(gross, regionMin);
    return {
      insurance,
      preTaxIncome,
      deduction,
      deductionBanThan,
      deductionPhuThuoc,
      taxableIncome,
      tncn,
      tax: tncn.tax,
      net,
      employerInsurance
    };
  }

  function netToGross(targetNet, dependents, regionMin) {
    let lo = targetNet;
    let hi = targetNet * 1.6 + 20000000;
    for (let i = 0; i < 80; i += 1) {
      const mid = (lo + hi) / 2;
      const result = grossToNet(mid, dependents, regionMin);
      if (result.net < targetNet) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    const gross = (lo + hi) / 2;
    return { gross, detail: grossToNet(gross, dependents, regionMin) };
  }

  function buildVietQRImageUrl(options) {
    const params = new URLSearchParams();
    if (options.amount) {
      params.set("amount", String(Math.round(options.amount)));
    }
    if (options.message) {
      params.set("addInfo", options.message.slice(0, 50));
    }
    if (options.merchantName) {
      params.set("accountName", options.merchantName.slice(0, 50));
    }
    const path = options.bin + "-" + encodeURIComponent(options.account) + "-qr_only.png";
    const query = params.toString();
    return "https://img.vietqr.io/image/" + path + (query ? "?" + query : "");
  }

  function monthlyPayment(principal, annualRate, months) {
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) {
      return principal / months;
    }
    return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  }

  function compoundSavings(monthlyContribution, annualRate, months) {
    const monthlyRate = annualRate / 100 / 12;
    let balance = 0;
    for (let i = 0; i < months; i += 1) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
    }
    return balance;
  }

  function formatVnd(amount) {
    return window.VUH.formatNumber(Math.round(amount));
  }

  function bracketRangeLabel(row) {
    const fromLabel = formatVnd(row.from);
    const upToLabel = formatVnd(row.upTo);
    if (row.upTo === Infinity) {
      return "Trên " + fromLabel + " VNĐ";
    }
    if (row.from === 0) {
      return "Đến " + upToLabel + " VNĐ";
    }
    return "Trên " + fromLabel + " đến " + upToLabel + " VNĐ";
  }

  function buildTncnBracketTableHtml(breakdown) {
    const rows = breakdown
      .map(function (row) {
        return [
          "<tr>",
          "<td>" + bracketRangeLabel(row) + "</td>",
          "<td>" + Math.round(row.rate * 100) + "%</td>",
          "<td>" + formatVnd(row.taxableAmount) + " đ</td>",
          "<td>" + formatVnd(row.taxAmount) + " đ</td>",
          "</tr>"
        ].join("");
      })
      .join("");

    return [
      "<h3>Chi tiết thuế TNCN theo từng bậc</h3>",
      "<table class=\"detail-table\">",
      "<thead><tr><th>Mức chịu thuế</th><th>Thuế suất</th><th>Thu nhập chịu thuế</th><th>Tiền nộp</th></tr></thead>",
      "<tbody>" + rows + "</tbody>",
      "</table>"
    ].join("");
  }

  function buildGrossNetDetailHtml(gross, dependents, detail) {
    const rows = [
      ["Lương GROSS", formatVnd(gross), false],
      ["Bảo hiểm xã hội (8%)", "- " + formatVnd(detail.insurance.bhxh), false],
      ["Bảo hiểm y tế (1,5%)", "- " + formatVnd(detail.insurance.bhyt), false],
      ["Bảo hiểm thất nghiệp (1%)", "- " + formatVnd(detail.insurance.bhtn), false],
      ["Thu nhập trước thuế", formatVnd(detail.preTaxIncome), false],
      ["Giảm trừ gia cảnh bản thân", "- " + formatVnd(detail.deductionBanThan), false]
    ];
    if (dependents > 0) {
      rows.push(["Giảm trừ gia cảnh người phụ thuộc (" + dependents + " người)", "- " + formatVnd(detail.deductionPhuThuoc), false]);
    }
    rows.push(["Thu nhập chịu thuế", formatVnd(detail.taxableIncome), false]);
    rows.push(["Thuế thu nhập cá nhân", "- " + formatVnd(detail.tax), false]);
    rows.push(["Lương NET (thu nhập trước thuế - thuế TNCN)", formatVnd(detail.net) + " đ", true]);

    const employeeRowsHtml = rows
      .map(function (row) {
        const cls = row[2] ? " class=\"detail-table__total\"" : "";
        const valueSuffix = String(row[1]).endsWith("đ") ? "" : " đ";
        return "<tr" + cls + "><td>" + row[0] + "</td><td>" + row[1] + valueSuffix + "</td></tr>";
      })
      .join("");

    const employer = detail.employerInsurance;
    const employerTotal = gross + employer.total;
    const employerRows = [
      ["Lương GROSS", formatVnd(gross)],
      ["Bảo hiểm xã hội (17%)", formatVnd(employer.bhxh)],
      ["Bảo hiểm tai nạn lao động - bệnh nghề nghiệp (0,5%)", formatVnd(employer.tnldBnn)],
      ["Bảo hiểm y tế (3%)", formatVnd(employer.bhyt)],
      ["Bảo hiểm thất nghiệp (1%)", formatVnd(employer.bhtn)]
    ];
    const employerRowsHtml = employerRows
      .map(function (row) {
        return "<tr><td>" + row[0] + "</td><td>" + row[1] + " đ</td></tr>";
      })
      .join("");

    return [
      "<h3>Diễn giải chi tiết (VNĐ)</h3>",
      "<table class=\"detail-table\"><tbody>" + employeeRowsHtml + "</tbody></table>",
      buildTncnBracketTableHtml(detail.tncn.breakdown),
      "<h3>Người sử dụng lao động trả (VNĐ)</h3>",
      "<table class=\"detail-table\">",
      "<tbody>" + employerRowsHtml + "<tr class=\"detail-table__total\"><td>Tổng cộng</td><td>" + formatVnd(employerTotal) + " đ</td></tr></tbody>",
      "</table>",
      "<p class=\"notice\">Số liệu tham khảo theo quy định hiện hành: lương cơ sở 2.530.000đ/tháng, giảm trừ bản thân 15.500.000đ/tháng, người phụ thuộc 6.200.000đ/tháng, biểu thuế TNCN 5 bậc (Luật số 109/2025/QH15, áp dụng từ kỳ tính thuế năm 2026).</p>"
    ].join("");
  }

  function initFinanceTools() {
    const form = document.querySelector("[data-finance-form]");
    const output = document.querySelector("[data-finance-output]");

    if (!form || !output) {
      return;
    }

    const modeSelect = form.querySelector("[data-finance-mode]");
    const panels = form.querySelectorAll("[data-mode-panel]");

    const loanAmount = form.querySelector("#loanAmount");
    const loanRate = form.querySelector("#loanRate");
    const loanMonths = form.querySelector("#loanMonths");
    const saveMonthly = form.querySelector("#saveMonthly");
    const saveRate = form.querySelector("#saveRate");
    const saveMonths = form.querySelector("#saveMonths");

    const tncnIncome = form.querySelector("#tncnIncome");
    const tncnDependents = form.querySelector("#tncnDependents");

    const gnDirection = form.querySelector("#gnDirection");
    const gnAmount = form.querySelector("#gnAmount");
    const gnDependents = form.querySelector("#gnDependents");
    const gnRegion = form.querySelector("#gnRegion");

    const vietqrBank = form.querySelector("#vietqrBank");
    const vietqrAccount = form.querySelector("#vietqrAccount");
    const vietqrName = form.querySelector("#vietqrName");
    const vietqrAmount = form.querySelector("#vietqrAmount");
    const vietqrMessage = form.querySelector("#vietqrMessage");

    const detailModalContent = document.querySelector("#modal-finance-detail [data-modal-detail-content]");

    if (vietqrBank && !vietqrBank.dataset.filled) {
      vietqrBank.innerHTML = VIETQR_BANKS.map(function (bank) {
        return "<option value=\"" + bank.bin + "\">" + bank.name + "</option>";
      }).join("");
      vietqrBank.dataset.filled = "1";
    }

    function applyMode(mode) {
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-mode-panel") !== mode;
      });
      loanAmount.required = mode === "loan";
      loanRate.required = mode === "loan";
      loanMonths.required = mode === "loan";
      saveMonthly.required = mode === "savings";
      saveRate.required = mode === "savings";
      saveMonths.required = mode === "savings";
      tncnIncome.required = mode === "tncn";
      gnAmount.required = mode === "grossnet";
      vietqrAccount.required = mode === "vietqr";
    }

    applyMode(modeSelect.value);
    modeSelect.addEventListener("change", function () {
      applyMode(modeSelect.value);
    });

    function renderLoan() {
      const loan = Number(loanAmount.value || 0);
      const rate = Number(loanRate.value || 0);
      const months = Number(loanMonths.value || 0);

      if (loan <= 0 || months <= 0) {
        output.innerHTML = "<p><strong>Vui lòng nhập giá trị hợp lệ lớn hơn 0.</strong></p>";
        return;
      }

      const monthly = monthlyPayment(loan, rate, months);
      const totalPaid = monthly * months;
      const totalInterest = totalPaid - loan;

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Trả góp mỗi tháng</span><b>" + window.VUH.formatNumber(Math.round(monthly)) + " VND</b></div>",
        "<div class=\"tile\"><span>Tổng lãi vay</span><b>" + window.VUH.formatNumber(Math.round(totalInterest)) + " VND</b></div>",
        "<div class=\"tile\"><span>Tổng tiền phải trả</span><b>" + window.VUH.formatNumber(Math.round(totalPaid)) + " VND</b></div>",
        "</div>",
        "<p class=\"small\">Mô hình trả góp theo công thức annuity (dư nợ giảm dần, trả đều mỗi tháng).</p>"
      ].join("");
    }

    function renderSavings() {
      const monthly = Number(saveMonthly.value || 0);
      const rate = Number(saveRate.value || 0);
      const months = Number(saveMonths.value || 0);

      if (monthly < 0 || months <= 0) {
        output.innerHTML = "<p><strong>Vui lòng nhập giá trị hợp lệ lớn hơn 0.</strong></p>";
        return;
      }

      const savings = compoundSavings(monthly, rate, months);
      const totalContributed = monthly * months;
      const totalInterest = savings - totalContributed;

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Giá trị tiết kiệm</span><b>" + window.VUH.formatNumber(Math.round(savings)) + " VND</b></div>",
        "<div class=\"tile\"><span>Tổng tiền đã gửi</span><b>" + window.VUH.formatNumber(Math.round(totalContributed)) + " VND</b></div>",
        "<div class=\"tile\"><span>Tiền lãi nhận được</span><b>" + window.VUH.formatNumber(Math.round(totalInterest)) + " VND</b></div>",
        "</div>",
        "<p class=\"small\">Mô phỏng tiết kiệm theo lãi kép tháng, gửi đều mỗi tháng.</p>"
      ].join("");
    }

    function renderTNCN() {
      const income = Number(tncnIncome.value || 0);
      const dependents = Math.max(0, Number(tncnDependents.value || 0));

      if (income <= 0) {
        output.innerHTML = "<p><strong>Vui lòng nhập thu nhập hợp lệ lớn hơn 0.</strong></p>";
        return;
      }

      const deduction = GT_BAN_THAN + GT_NGUOI_PHU_THUOC * dependents;
      const taxableIncome = Math.max(0, income - deduction);
      const tncn = calcTNCN(taxableIncome);
      const afterTax = income - tncn.tax;

      if (detailModalContent) {
        detailModalContent.innerHTML = buildTncnBracketTableHtml(tncn.breakdown);
      }

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Giảm trừ gia cảnh</span><b>" + window.VUH.formatNumber(Math.round(deduction)) + " VND</b></div>",
        "<div class=\"tile\"><span>Thu nhập chịu thuế</span><b>" + window.VUH.formatNumber(Math.round(taxableIncome)) + " VND</b></div>",
        "<div class=\"tile\"><span>Thuế TNCN phải nộp</span><b>" + window.VUH.formatNumber(Math.round(tncn.tax)) + " VND</b></div>",
        "<div class=\"tile\"><span>Thu nhập còn lại</span><b>" + window.VUH.formatNumber(Math.round(afterTax)) + " VND</b></div>",
        "</div>",
        "<p class=\"small\">Tính theo biểu thuế lũy tiến từng phần 5 bậc (Luật số 109/2025/QH15), giảm trừ bản thân 15,5 triệu/tháng và người phụ thuộc 6,2 triệu/tháng. Chưa gồm các khoản giảm trừ khác (bảo hiểm, từ thiện...).</p>",
        "<button type=\"button\" class=\"btn-ghost\" data-modal-open=\"modal-finance-detail\">Xem diễn giải chi tiết</button>"
      ].join("");
    }

    function renderGrossNet() {
      const amount = Number(gnAmount.value || 0);
      const dependents = Math.max(0, Number(gnDependents.value || 0));
      const regionMin = VUNG_LUONG_TOI_THIEU[gnRegion.value] || VUNG_LUONG_TOI_THIEU["1"];

      if (amount <= 0) {
        output.innerHTML = "<p><strong>Vui lòng nhập số tiền hợp lệ lớn hơn 0.</strong></p>";
        return;
      }

      let gross;
      let detail;
      if (gnDirection.value === "net2gross") {
        const solved = netToGross(amount, dependents, regionMin);
        gross = solved.gross;
        detail = solved.detail;
      } else {
        gross = amount;
        detail = grossToNet(gross, dependents, regionMin);
      }

      if (detailModalContent) {
        detailModalContent.innerHTML = buildGrossNetDetailHtml(gross, dependents, detail);
      }

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Lương Gross</span><b>" + window.VUH.formatNumber(Math.round(gross)) + " VND</b></div>",
        "<div class=\"tile\"><span>Bảo hiểm (8% + 1,5% + 1%)</span><b>" + window.VUH.formatNumber(Math.round(detail.insurance.total)) + " VND</b></div>",
        "<div class=\"tile\"><span>Thuế TNCN</span><b>" + window.VUH.formatNumber(Math.round(detail.tax)) + " VND</b></div>",
        "<div class=\"tile\"><span>Lương Net thực nhận</span><b>" + window.VUH.formatNumber(Math.round(detail.net)) + " VND</b></div>",
        "</div>",
        "<p class=\"small\">BHXH 8% + BHYT 1,5% (trần 20 lần lương cơ sở 2.530.000đ) và BHTN 1% (trần 20 lần lương tối thiểu vùng). Kết quả Net → Gross là giá trị gần đúng dò ngược.</p>",
        "<button type=\"button\" class=\"btn-ghost\" data-modal-open=\"modal-finance-detail\">Xem diễn giải chi tiết (gồm phần người sử dụng lao động trả)</button>"
      ].join("");
    }

    function renderVietQR() {
      const account = (vietqrAccount.value || "").trim();
      if (!account) {
        output.innerHTML = "<p><strong>Vui lòng nhập số tài khoản.</strong></p>";
        return;
      }

      const amountRaw = Number(vietqrAmount.value || 0);
      const imageUrl = buildVietQRImageUrl({
        bin: vietqrBank.value,
        account: account,
        amount: amountRaw > 0 ? amountRaw : 0,
        message: vietqrMessage.value,
        merchantName: vietqrName.value
      });

      const bankName = VIETQR_BANKS.find(function (bank) {
        return bank.bin === vietqrBank.value;
      });

      const result = document.createElement("div");
      result.className = "qr-result";

      const image = document.createElement("img");
      image.dataset.vietqrImage = "";
      image.src = imageUrl;
      image.alt = "Mã QR chuyển khoản VietQR";
      image.width = 260;
      image.height = 260;

      const info = document.createElement("div");
      info.className = "qr-result__info";

      function appendInfoRow(labelText, valueText) {
        const row = document.createElement("p");
        const label = document.createElement("strong");
        const value = document.createElement("span");
        label.textContent = labelText;
        value.textContent = " " + valueText;
        row.append(label, value);
        info.appendChild(row);
      }

      appendInfoRow("Ngân hàng:", bankName ? bankName.name : "");
      appendInfoRow("Số tài khoản:", account);
      if (amountRaw > 0) {
        appendInfoRow("Số tiền:", window.VUH.formatNumber(amountRaw) + " VND");
      }

      const linkLabel = document.createElement("label");
      linkLabel.htmlFor = "vietqrLink";
      linkLabel.textContent = "Liên kết ảnh QR";

      const linkArea = document.createElement("textarea");
      linkArea.id = "vietqrLink";
      linkArea.rows = 3;
      linkArea.readOnly = true;
      linkArea.value = imageUrl;

      info.append(linkLabel, linkArea);
      result.append(image, info);

      const notice = document.createElement("p");
      notice.className = "notice";
      notice.textContent = "Mã QR được tạo bởi VietQR.io (img.vietqr.io). Vui lòng kiểm tra kỹ tên người nhận trên app ngân hàng trước khi chuyển tiền.";

      output.replaceChildren(result, notice);

      image.addEventListener("error", function () {
        output.innerHTML = "<p><strong>Không thể tải mã QR từ VietQR.io. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.</strong></p>";
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const mode = modeSelect.value;
      if (mode === "loan") {
        renderLoan();
      } else if (mode === "savings") {
        renderSavings();
      } else if (mode === "tncn") {
        renderTNCN();
      } else if (mode === "grossnet") {
        renderGrossNet();
      } else if (mode === "vietqr") {
        renderVietQR();
      }
    });

    form.dispatchEvent(new Event("submit"));
  }

  document.addEventListener("DOMContentLoaded", initFinanceTools);
})();

