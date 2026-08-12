# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Prevented DOM-based self-XSS in random draw, VietQR account, and event countdown results by rendering untrusted input with `textContent`.

## [1.0.0] - 2026-07-24
- Initial production-ready release.
- Added multi-page static architecture with shared CSS and JS.
- Added core utility pages for Vietnamese users:
  - Lunar calendar converter and can-chi lookup.
  - Date utilities (age, workday count, Tet countdown).
  - Loan and savings calculators.
  - Text tools (accent remover, word-char counter, case transform).
- Added accessibility, SEO, and GitHub Pages CI deployment workflow.
- Added reusable AI skill folder and MIT license.
