(function () {
  "use strict";

  function removeVietnameseAccents(value) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  }

  function titleCase(value) {
    return removeVietnameseAccents(value)
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map(function (chunk) {
        return chunk.charAt(0).toUpperCase() + chunk.slice(1);
      })
      .join(" ");
  }

  function splitWords(value) {
    return removeVietnameseAccents(value).split(/[^A-Za-z0-9]+/).filter(Boolean);
  }

  function capitalizeWord(word) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function pascalCase(value) {
    return splitWords(value)
      .map(function (word) {
        return capitalizeWord(word);
      })
      .join("");
  }

  function camelCase(value) {
    const words = splitWords(value);
    return words
      .map(function (word, index) {
        return index === 0 ? word.toLowerCase() : capitalizeWord(word);
      })
      .join("");
  }

  function snakeCase(value) {
    return splitWords(value)
      .map(function (word) {
        return word.toLowerCase();
      })
      .join("_");
  }

  function kebabCase(value) {
    return splitWords(value)
      .map(function (word) {
        return word.toLowerCase();
      })
      .join("-");
  }

  function constantCase(value) {
    return splitWords(value)
      .map(function (word) {
        return word.toUpperCase();
      })
      .join("_");
  }

  // Gạch ngang chữ (strikethrough) bằng ký tự combining U+0336, giữ nguyên được khi dán sang nơi khác (Facebook, Zalo...)
  function strikethroughText(value) {
    return Array.from(value)
      .map(function (ch) {
        return ch === "\n" ? ch : ch + "\u0336";
      })
      .join("");
  }

  // Gạch dưới chữ (underline) bằng ký tự combining U+0332, khác hẳn với gạch ngang ở trên
  function underlineText(value) {
    return Array.from(value)
      .map(function (ch) {
        return ch === "\n" ? ch : ch + "\u0332";
      })
      .join("");
  }

  // Đổi chữ cái/số ASCII (a-z, A-Z, 0-9) sang ký tự Unicode "Mathematical Alphanumeric"
  // để có hiệu ứng in đậm/in nghiêng ngay trong văn bản thường (không cần HTML).
  // Chữ có dấu tiếng Việt không có ký tự tương ứng nên giữ nguyên.
  function styleChar(ch, kind) {
    const code = ch.codePointAt(0);
    if (kind === "bold") {
      if (ch >= "A" && ch <= "Z") return String.fromCodePoint(0x1d400 + (code - 0x41));
      if (ch >= "a" && ch <= "z") return String.fromCodePoint(0x1d41a + (code - 0x61));
      if (ch >= "0" && ch <= "9") return String.fromCodePoint(0x1d7ce + (code - 0x30));
    } else if (kind === "italic") {
      if (ch === "h") return "\u210e";
      if (ch >= "A" && ch <= "Z") return String.fromCodePoint(0x1d434 + (code - 0x41));
      if (ch >= "a" && ch <= "z") return String.fromCodePoint(0x1d44e + (code - 0x61));
    }
    return ch;
  }

  function toStyledText(value, kind) {
    return Array.from(value)
      .map(function (ch) {
        return styleChar(ch, kind);
      })
      .join("");
  }

  function countWords(value) {
    return value.trim().length === 0 ? 0 : value.trim().split(/\s+/).length;
  }

  const STOPWORDS_VN = new Set([
    "va", "la", "cua", "co", "khong", "de", "cho", "nay", "voi", "mot", "cac",
    "trong", "nhung", "duoc", "toi", "ban", "da", "se", "nhu", "vao", "ra",
    "the", "o", "thi", "tai", "theo", "vi", "hay", "hoac", "neu", "khi"
  ]);

  function wordFrequency(value) {
    const stripped = removeVietnameseAccents(value).toLowerCase();
    const words = stripped.split(/[^a-z0-9]+/).filter(Boolean);
    const counts = new Map();
    words.forEach(function (word) {
      if (STOPWORDS_VN.has(word)) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort(function (a, b) {
        return b[1] - a[1];
      })
      .slice(0, 30);
  }

  function seoTrim(value, maxLength) {
    const text = value.trim().replace(/\s+/g, " ");
    if (text.length <= maxLength) {
      return text;
    }
    const cut = text.slice(0, maxLength - 1);
    const lastSpace = cut.lastIndexOf(" ");
    const safeCut = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
    return safeCut.trim() + "…";
  }

  function utf8ToBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function base64ToUtf8(value) {
    const binary = atob(value.trim());
    const bytes = Uint8Array.from(binary, function (ch) {
      return ch.charCodeAt(0);
    });
    return new TextDecoder().decode(bytes);
  }

  function initTextTools() {
    const form = document.querySelector("[data-text-form]");
    const output = document.querySelector("[data-text-output]");

    if (!form || !output) {
      return;
    }

    const input = form.querySelector("#sourceText");
    const modeSelect = form.querySelector("#textMode");
    const seoOptionsRow = form.querySelector("#seoOptionsRow");
    const seoMaxLength = form.querySelector("#seoMaxLength");

    function applyMode(mode) {
      if (seoOptionsRow) {
        seoOptionsRow.hidden = mode !== "seotrim";
      }
    }

    if (modeSelect) {
      applyMode(modeSelect.value);
      modeSelect.addEventListener("change", function () {
        applyMode(modeSelect.value);
      });
    }

    function renderTextarea(transformed, source) {
      output.innerHTML = [
        "<label for=\"resultText\">Kết quả</label>",
        "<textarea id=\"resultText\" rows=\"5\" readonly></textarea>",
        "<p><strong>Số từ:</strong> " + window.VUH.formatNumber(countWords(source)) + " | <strong>Số ký tự:</strong> " + window.VUH.formatNumber(source.length) + "</p>"
      ].join("");

      const resultText = output.querySelector("#resultText");
      resultText.value = transformed;
    }

    function renderWordFrequency(source) {
      const entries = wordFrequency(source);
      if (entries.length === 0) {
        output.innerHTML = "<p><strong>Không có từ nào để đếm.</strong></p>";
        return;
      }
      const rows = entries
        .map(function (entry) {
          return "<tr><td>" + entry[0] + "</td><td>" + window.VUH.formatNumber(entry[1]) + "</td></tr>";
        })
        .join("");
      output.innerHTML = [
        "<table class=\"freq-table\">",
        "<thead><tr><th>Từ</th><th>Số lần xuất hiện</th></tr></thead>",
        "<tbody>" + rows + "</tbody>",
        "</table>",
        "<p class=\"small\">Đã bỏ dấu, không phân biệt hoa/thường, bỏ qua một số từ nối phổ biến. Hiển thị tối đa 30 từ xuất hiện nhiều nhất.</p>"
      ].join("");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const source = input.value || "";
      const mode = modeSelect.value;

      if (mode === "wordfreq") {
        renderWordFrequency(source);
        return;
      }

      if (mode === "base64-decode") {
        try {
          renderTextarea(base64ToUtf8(source), source);
        } catch (e) {
          output.innerHTML = "<p><strong>Chuỗi Base64 không hợp lệ.</strong></p>";
        }
        return;
      }

      if (mode === "url-decode") {
        try {
          renderTextarea(decodeURIComponent(source), source);
        } catch (e) {
          output.innerHTML = "<p><strong>Chuỗi URL encode không hợp lệ.</strong></p>";
        }
        return;
      }

      let transformed = source;

      if (mode === "remove-accent") {
        transformed = removeVietnameseAccents(source);
      } else if (mode === "upper") {
        transformed = source.toUpperCase();
      } else if (mode === "lower") {
        transformed = source.toLowerCase();
      } else if (mode === "title") {
        transformed = titleCase(source);
      } else if (mode === "pascal") {
        transformed = pascalCase(source);
      } else if (mode === "camel") {
        transformed = camelCase(source);
      } else if (mode === "snake") {
        transformed = snakeCase(source);
      } else if (mode === "kebab") {
        transformed = kebabCase(source);
      } else if (mode === "constant") {
        transformed = constantCase(source);
      } else if (mode === "underline") {
        transformed = underlineText(source);
      } else if (mode === "strike") {
        transformed = strikethroughText(source);
      } else if (mode === "bold") {
        transformed = toStyledText(source, "bold");
      } else if (mode === "italic") {
        transformed = toStyledText(source, "italic");
      } else if (mode === "seotrim") {
        const maxLength = Number((seoMaxLength && seoMaxLength.value) || 160);
        transformed = seoTrim(source, maxLength);
      } else if (mode === "base64-encode") {
        transformed = utf8ToBase64(source);
      } else if (mode === "url-encode") {
        transformed = encodeURIComponent(source);
      }

      renderTextarea(transformed, source);
    });

    const copyBtn = document.querySelector("[data-copy-result]");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        const resultText = output.querySelector("#resultText");
        if (!resultText || !resultText.value) {
          return;
        }
        navigator.clipboard.writeText(resultText.value).then(function () {
          copyBtn.textContent = "Đã sao chép";
          setTimeout(function () {
            copyBtn.textContent = "Sao chép kết quả";
          }, 1200);
        });
      });
    }

    form.dispatchEvent(new Event("submit"));
  }

  document.addEventListener("DOMContentLoaded", initTextTools);
})();

