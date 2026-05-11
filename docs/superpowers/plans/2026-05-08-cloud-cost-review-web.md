# Cloud Cost Review Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Excel-like cloud cost review web app using the provided workbook data.

**Architecture:** Use a static app with focused JavaScript modules. A Python extractor reads the workbook once and writes `data/cost-accounts.json`; the browser app loads that JSON, renders the table, filters by reviewer/provider/status, and persists verification marks in `localStorage`.

**Tech Stack:** Static HTML/CSS/JavaScript, Node built-in test runner for pure behavior tests, Python `openpyxl` for workbook extraction, local HTTP server for browser testing.

---

### Task 1: Core Filtering And Verification State

**Files:**
- Create: `src/app-core.js`
- Create: `tests/app-core.test.mjs`

- [ ] **Step 1: Write tests for reviewer filtering, status filtering, and verification overrides.**

Run: `/Users/ralrariralra/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/app-core.test.mjs`
Expected: FAIL because `src/app-core.js` does not exist.

- [ ] **Step 2: Implement `normalizeText`, `rowIsVerified`, `filterRows`, and `applyVerificationOverrides`.**

Run the same command.
Expected: PASS.

### Task 2: Workbook Data Extraction

**Files:**
- Create: `scripts/extract_cost_data.py`
- Create generated output: `data/cost-accounts.json`

- [ ] **Step 1: Extract rows from `Usage Apr 2026`.**

Fields include row number, K verified value, Provider, Entity, Studio, Team, Project, Account, Owner, Cost Reviewer, 12 monthly cost columns L:W, current W value, Diff, and Diff rate.

- [ ] **Step 2: Run extractor.**

Run: `/Users/ralrariralra/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/extract_cost_data.py`
Expected: `data/cost-accounts.json` exists and contains workbook metadata plus account rows.

### Task 3: Web App Shell

**Files:**
- Create: `index.html`
- Create: `src/styles.css`
- Create: `src/app.js`

- [ ] **Step 1: Build an Excel-like table interface.**

Include reviewer search, provider/status filters, KPI counters, sticky K column, 12 month columns, W current cost highlight, diff columns, shared-link placeholder button, and verification button.

- [ ] **Step 2: Wire browser behavior to `src/app-core.js`.**

Load JSON, apply filters, render rows, select row details, update local verification overrides, and re-render counters.

### Task 4: Verification

**Files:**
- Modify only if verification finds issues.

- [ ] **Step 1: Run unit tests.**

Run: `/Users/ralrariralra/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/app-core.test.mjs`
Expected: PASS.

- [ ] **Step 2: Start a local static server.**

Run: `/Users/ralrariralra/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m http.server 61888`
Expected: local app is available at `http://localhost:61888`.

- [ ] **Step 3: Open the browser and verify.**

Check that reviewer search filters rows, 12 month columns display, selecting a row updates the side panel, and clicking `v 체크` marks the row.
