"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

global.window = {};
global.document = {
  addEventListener() {}
};

require("../assets/js/tools/lunar.js");

const convertSolar2Lunar = global.window.VUH.convertSolar2Lunar;
const VIETNAM_TIME_ZONE = 7;

function lunar(date) {
  const [year, month, day] = date.split("-").map(Number);
  return convertSolar2Lunar(day, month, year, VIETNAM_TIME_ZONE);
}

function assertLunar(date, lunarDay, lunarMonth, lunarYear, lunarLeap = 0) {
  assert.deepEqual(lunar(date), { lunarDay, lunarMonth, lunarYear, lunarLeap });
}

test("new moon just after midnight on 2026-08-13 stays on the correct local date", () => {
  assertLunar("2026-08-12", 30, 6, 2026);
  assertLunar("2026-08-13", 1, 7, 2026);
});

test("other USNO new moons just after midnight in Vietnam stay on the correct date", () => {
  // USNO: 2023-03-21 17:23 UTC and 2023-10-14 17:55 UTC.
  assertLunar("2023-03-21", 30, 2, 2023);
  assertLunar("2023-03-22", 1, 2, 2023, 1);
  assertLunar("2023-10-14", 30, 8, 2023);
  assertLunar("2023-10-15", 1, 9, 2023);
});

test("lunar month 6/2026 has 30 days and month 7/2026 has 29 days", () => {
  assertLunar("2026-07-14", 1, 6, 2026);
  assertLunar("2026-08-12", 30, 6, 2026);
  assertLunar("2026-08-13", 1, 7, 2026);
  assertLunar("2026-09-10", 29, 7, 2026);
  assertLunar("2026-09-11", 1, 8, 2026);
});

test("recent Lunar New Year dates remain correct", () => {
  assertLunar("2024-02-10", 1, 1, 2024);
  assertLunar("2025-01-29", 1, 1, 2025);
  assertLunar("2026-02-17", 1, 1, 2026);
});

test("every lunar month from 1900 through 2100 has either 29 or 30 days", () => {
  let previousMonthStart = null;
  let previousLunarDay = null;

  for (let year = 1900; year <= 2100; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
      for (let day = 1; day <= daysInMonth; day += 1) {
        const value = convertSolar2Lunar(day, month, year, VIETNAM_TIME_ZONE);
        assert.ok(value.lunarDay >= 1 && value.lunarDay <= 30, `${year}-${month}-${day}: invalid lunar day ${value.lunarDay}`);

        if (value.lunarDay !== 1) {
          if (previousLunarDay !== null) {
            assert.equal(value.lunarDay, previousLunarDay + 1, `${year}-${month}-${day}: lunar day is not consecutive`);
          }
          previousLunarDay = value.lunarDay;
          continue;
        }

        const currentMonthStart = Date.UTC(year, month - 1, day) / 86400000;
        if (previousMonthStart !== null) {
          const monthLength = currentMonthStart - previousMonthStart;
          assert.ok(monthLength === 29 || monthLength === 30, `${year}-${month}-${day}: previous month has ${monthLength} days`);
        }
        previousMonthStart = currentMonthStart;
        previousLunarDay = value.lunarDay;
      }
    }
  }
});
