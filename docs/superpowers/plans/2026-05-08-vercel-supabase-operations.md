# Vercel Supabase Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the cloud cost review tool from local JSON/workbook storage to a Vercel API backed by Supabase database and storage.

**Architecture:** Keep the current static frontend and Python workbook parser. Add Vercel Python API routes that read/write Supabase through REST and Storage APIs, while preserving local fallback behavior for desktop testing.

**Tech Stack:** Static HTML/CSS/ES modules, Vercel Python Functions, Supabase REST API, Supabase Storage, Python standard library XLSX XML handling.

---

### Task 1: Supabase Schema And Client

**Files:**
- Create: `supabase/schema.sql`
- Create: `lib/supabase_store.py`
- Modify: `tests/test_review_server.py`

- [ ] Add SQL tables for `workbooks`, `review_states`, `provider_links`, and a private `cloud-cost-workbooks` storage bucket.
- [ ] Add a standard-library Supabase REST/Storage client using `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`.
- [ ] Add tests for configuration detection and review-state payload shaping.

### Task 2: Vercel API Routes

**Files:**
- Create: `api/current.py`
- Create: `api/review-state.py`
- Create: `api/upload.py`
- Create: `api/export-reviewed.py`
- Modify: `scripts/review_server.py`

- [ ] Add Python route handlers using Vercel's `BaseHTTPRequestHandler` pattern.
- [ ] Keep local fallback for `/api/current`, upload, and export when Supabase env vars are absent.
- [ ] Add workbook export from Supabase Storage bytes so the original workbook is not stored on Vercel's filesystem.

### Task 3: Frontend Remote State

**Files:**
- Modify: `src/app-core.js`
- Modify: `src/app.js`
- Modify: `tests/app-core.test.mjs`

- [ ] Load `/api/current` first, with the existing static JSON as fallback.
- [ ] Load persisted review state from `/api/review-state?workbookId=...`.
- [ ] Save checks, links, provider links, and memos to Supabase with a debounce while preserving browser local fallback.

### Task 4: Deployment Files And Verification

**Files:**
- Create: `vercel.json`
- Create: `.env.example`
- Create: `docs/deploy/vercel-supabase.md`

- [ ] Document Supabase setup, Vercel environment variables, and deployment steps.
- [ ] Run JS syntax/tests, Python compile/tests, and a local API smoke test.
