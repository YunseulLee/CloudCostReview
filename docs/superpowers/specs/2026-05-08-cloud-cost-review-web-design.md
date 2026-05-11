# Cloud Cost Review Web Design

## Goal
Build a local web app that lets cost reviewers inspect cloud account costs outside Excel while preserving the familiar Excel-like review workflow.

## Source
The first version uses `Cloud Cost of 2026-04.xlsx`, especially the `Usage Apr 2026` sheet.

## Core Workflow
1. A reviewer searches their own name.
2. The table filters to accounts where `Cost Reviewer` matches that name.
3. Each account row shows identity fields, 12 months of cost history, the current review month amount from column W, diff, diff rate, and current K-column verified status.
4. The reviewer opens or checks the provided shared cost evidence link.
5. After confirming the amount, the reviewer clicks a web button that marks the row as `v`.

## Interface
The main view should resemble the existing Excel sheet:
- Sticky `verified` column on the left.
- Wide horizontal table for at least 12 months of costs.
- Search controls for reviewer name, provider, and review status.
- Side detail panel for the selected row with a compact 12-month trend, current amount, and verification actions.

## Data Handling
The prototype exports workbook rows into a local JSON file. Browser state stores web-side verification changes in `localStorage` so reviewers can test the workflow without modifying the original Excel file.

## First-Version Limits
The first version does not write changes back into the original workbook. After the workflow feels right, the next step is adding an export or controlled Excel update that writes `v` into K for approved rows.
