(function () {
  "use strict";

  // Bậc thuế TNCN lũy tiến từng phần (thu nhập từ tiền lương/tiền công), đơn vị VND/tháng.
  const TNCN_BRACKETS = [
    { upTo: 5000000, rate: 0.05 },
    { upTo: 10000000, rate: 0.1 },
    { upTo: 18000000, rate: 0.15 },
    { upTo: 32000000, rate: 0.2 },
    { upTo: 52000000, rate: 0.25 },
    { upTo: 80000000, rate: 0.3 },
    { upTo: Infinity, rate: 0.35 }
  ];
  const GT_BAN_THAN = 11000000;
  const GT_NGUOI_PHU_THUOC = 4400000;
  const LUONG_CO_SO = 2340000; // dùng làm trần đóng BHXH/BHYT (20 lần lương cơ sở)
  const VUNG_LUONG_TOI_THIEU = {
    "1": 4960000,
    "2": 4410000,
    "3": 3860000,
    "4": 3450000
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
    let remaining = Math.max(0, taxableIncome);
    let tax = 0;
    let previousUpTo = 0;
    for (let i = 0; i < TNCN_BRACKETS.length; i += 1) {
      const bracket = TNCN_BRACKETS[i];
      const bracketWidth = bracket.upTo - previousUpTo;
      const amountInBracket = Math.min(remaining, bracketWidth);
      if (amountInBracket <= 0) break;
      tax += amountInBracket * bracket.rate;
      remaining -= amountInBracket;
      previousUpTo = bracket.upTo;
      if (remaining <= 0) break;
    }
    return tax;
  }

  function computeInsurance(grossSalary, regionMin) {
    const bhxhBhytBase = Math.min(grossSalary, 20 * LUONG_CO_SO);
    const bhtnBase = Math.min(grossSalary, 20 * regionMin);
    const bhxh = bhxhBhytBase * 0.08;
    const bhyt = bhxhBhytBase * 0.015;
    const bhtn = bhtnBase * 0.01;
    return { bhxh, bhyt, bhtn, total: bhxh + bhyt + bhtn };
  }

  function grossToNet(gross, dependents, regionMin) {
    const insurance = computeInsurance(gross, regionMin);
    const preTaxIncome = gross - insurance.total;
    const deduction = GT_BAN_THAN + GT_NGUOI_PHU_THUOC * dependents;
    const taxableIncome = Math.max(0, preTaxIncome - deduction);
    const tax = calcTNCN(taxableIncome);
    const net = preTaxIncome - tax;
    return { insurance, preTaxIncome, deduction, taxableIncome, tax, net };
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
      const tax = calcTNCN(taxableIncome);
      const afterTax = income - tax;

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Giảm trừ gia cảnh</span><b>" + window.VUH.formatNumber(Math.round(deduction)) + " VND</b></div>",
        "<div class=\"tile\"><span>Thu nhập chịu thuế</span><b>" + window.VUH.formatNumber(Math.round(taxableIncome)) + " VND</b></div>",
        "<div class=\"tile\"><span>Thuế TNCN phải nộp</span><b>" + window.VUH.formatNumber(Math.round(tax)) + " VND</b></div>",
        "<div class=\"tile\"><span>Thu nhập còn lại</span><b>" + window.VUH.formatNumber(Math.round(afterTax)) + " VND</b></div>",
        "</div>",
        "<p class=\"small\">Tính theo biểu thuế lũy tiến từng phần 7 bậc, giảm trừ bản thân 11 triệu/tháng và người phụ thuộc 4,4 triệu/tháng. Chưa gồm các khoản giảm trừ khác (bảo hiểm, từ thiện...).</p>"
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

      output.innerHTML = [
        "<div class=\"kpi\">",
        "<div class=\"tile\"><span>Lương Gross</span><b>" + window.VUH.formatNumber(Math.round(gross)) + " VND</b></div>",
        "<div class=\"tile\"><span>Bảo hiểm (8% + 1,5% + 1%)</span><b>" + window.VUH.formatNumber(Math.round(detail.insurance.total)) + " VND</b></div>",
        "<div class=\"tile\"><span>Thuế TNCN</span><b>" + window.VUH.formatNumber(Math.round(detail.tax)) + " VND</b></div>",
        "<div class=\"tile\"><span>Lương Net thực nhận</span><b>" + window.VUH.formatNumber(Math.round(detail.net)) + " VND</b></div>",
        "</div>",
        "<p class=\"small\">BHXH 8% + BHYT 1,5% (trần 20 lần lương cơ sở 2.340.000đ) và BHTN 1% (trần 20 lần lương tối thiểu vùng). Kết quả Net → Gross là giá trị gần đúng dò ngược.</p>"
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

      output.innerHTML = [
        "<div class=\"qr-result\">",
        "<img data-vietqr-image src=\"" + imageUrl + "\" alt=\"Mã QR chuyển khoản VietQR\" width=\"260\" height=\"260\" />",
        "<div class=\"qr-result__info\">",
        "<p><strong>Ngân hàng:</strong> " + (bankName ? bankName.name : "") + "</p>",
        "<p><strong>Số tài khoản:</strong> " + account + "</p>",
        amountRaw > 0 ? "<p><strong>Số tiền:</strong> " + window.VUH.formatNumber(amountRaw) + " VND</p>" : "",
        "<label for=\"vietqrLink\">Liên kết ảnh QR</label>",
        "<textarea id=\"vietqrLink\" rows=\"3\" readonly></textarea>",
        "</div>",
        "</div>",
        "<p class=\"notice\">Mã QR được tạo bởi VietQR.io (img.vietqr.io). Vui lòng kiểm tra kỹ tên người nhận trên app ngân hàng trước khi chuyển tiền.</p>"
      ].join("");

      const linkArea = output.querySelector("#vietqrLink");
      if (linkArea) linkArea.value = imageUrl;

      const image = output.querySelector("[data-vietqr-image]");
      if (image) {
        image.addEventListener("error", function () {
          output.innerHTML = "<p><strong>Không thể tải mã QR từ VietQR.io. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.</strong></p>";
        });
      }
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

