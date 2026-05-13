import {
  applyVerificationOverrides,
  buildMonthChartItems,
  buildReviewExportRows,
  buildReviewStatePayload,
  canManageProtectedActions,
  filterRows,
  formatCurrency,
  formatRate,
  getEffectiveEvidenceUrl,
  getRowsWithMemos,
  getUniqueProviders,
  getVisibleMonths,
  normalizeExternalUrl,
  rowIsLocallyVerified,
  rowIsVerified,
  summarizeRows,
  uiText,
} from './app-core.js';

const STORAGE_KEY = 'cloud-cost-review-state-v1';
const FOLDER_LINK_PREFIX = 'folder::';

const state = {
  data: null,
  rows: [],
  filteredRows: [],
  selectedId: null,
  overrides: {},
  links: {},
  providerLinks: {},
  memos: {},
  language: 'ko',
  uploaderName: '',
  workbookId: null,
  remoteReviewEnabled: false,
  downloadCount: 0,
};

let remoteSaveTimer = null;

const els = {
  sheetName: document.querySelector('#sheet-name'),
  languageSelect: document.querySelector('#language-select'),
  reviewerSearch: document.querySelector('#reviewer-search'),
  providerFilter: document.querySelector('#provider-filter'),
  statusFilter: document.querySelector('#status-filter'),
  recentMonthsOnly: document.querySelector('#recent-months-only'),
  showOwnerColumn: document.querySelector('#show-owner-column'),
  workbookUpload: document.querySelector('#workbook-upload'),
  uploaderName: document.querySelector('#uploader-name'),
  uploadPermissionStatus: document.querySelector('#upload-permission-status'),
  kpiStrip: document.querySelector('#kpi-strip'),
  clearLocal: document.querySelector('#clear-local'),
  clearMemos: document.querySelector('#clear-memos'),
  downloadReviewed: document.querySelector('#download-reviewed'),
  confirmModal: document.querySelector('#confirm-modal'),
  modalTitle: document.querySelector('#modal-title'),
  modalBody: document.querySelector('#modal-body'),
  modalCancel: document.querySelector('#modal-cancel'),
  modalConfirm: document.querySelector('#modal-confirm'),
  resultSummary: document.querySelector('#result-summary'),
  reviewTable: document.querySelector('#review-table'),
  tableHead: document.querySelector('#table-head'),
  tableBody: document.querySelector('#table-body'),
  detailAccount: document.querySelector('#detail-account'),
  detailSubtitle: document.querySelector('#detail-subtitle'),
  detailBody: document.querySelector('#detail-body'),
  openEvidence: document.querySelector('#open-evidence'),
  verifySelected: document.querySelector('#verify-selected'),
};

function loadLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    state.overrides = saved.overrides || {};
    state.links = saved.links || {};
    state.providerLinks = saved.providerLinks || {};
    state.memos = saved.memos || {};
    state.language = saved.language || 'ko';
    state.uploaderName = saved.uploaderName || '';
  } catch {
    state.overrides = {};
    state.links = {};
    state.providerLinks = {};
    state.memos = {};
    state.language = 'ko';
    state.uploaderName = '';
  }
}

function saveLocalState(syncRemote = true) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      overrides: state.overrides,
      links: state.links,
      providerLinks: state.providerLinks,
      memos: state.memos,
      language: state.language,
      uploaderName: state.uploaderName,
    }),
  );
  if (syncRemote) {
    scheduleRemoteStateSave();
  }
}

function t(key) {
  return uiText(key, state.language);
}

function applyStaticTranslations() {
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  els.reviewerSearch.placeholder = t('reviewerPlaceholder');
  els.uploaderName.placeholder = t('uploadOperatorPlaceholder');
  setProviderAllOptionText();
  updateUploadPermission();
}

function updateUploadPermission() {
  const allowed = canManageProtectedActions(state.uploaderName);
  els.workbookUpload.disabled = !allowed;
  els.clearLocal.disabled = !allowed;
  els.clearMemos.disabled = !allowed;
  els.downloadReviewed.disabled = !allowed;
  els.workbookUpload.closest('.upload-control')?.classList.toggle('disabled', !allowed);
  els.uploadPermissionStatus.textContent = allowed ? t('uploadAllowed') : t('uploadLocked');
  els.uploadPermissionStatus.classList.toggle('allowed', allowed);
}

function resetReviewState({ preserveProviderLinks = false } = {}) {
  const providerLinks = preserveProviderLinks ? { ...state.providerLinks } : {};
  state.overrides = {};
  state.links = {};
  state.providerLinks = providerLinks;
  state.memos = {};
  saveLocalState();
}

function effectiveRows() {
  return applyVerificationOverrides(state.rows, state.overrides).map((row) => ({
    ...row,
    evidenceUrl: getEffectiveEvidenceUrl(row, state.links, state.providerLinks),
    accountEvidenceUrl: state.links[row.id] || '',
    providerEvidenceUrl: state.providerLinks[row.provider] || '',
    providerFolderEvidenceUrl: state.providerLinks[providerFolderKey(row.provider)] || '',
    memo: state.memos[row.id] || '',
  }));
}

function providerFolderKey(provider) {
  return `${FOLDER_LINK_PREFIX}${provider || ''}`;
}

function currentFilters() {
  return {
    reviewer: els.reviewerSearch.value,
    provider: els.providerFilter.value,
    status: els.statusFilter.value,
  };
}

function renderProviderOptions(rows) {
  for (const provider of getUniqueProviders(rows)) {
    const option = document.createElement('option');
    option.value = provider;
    option.textContent = provider;
    els.providerFilter.append(option);
  }
}

function renderTableHead() {
  const visibleMonths = getVisibleMonths(state.data.monthColumns, els.recentMonthsOnly.checked);
  const ownerVisible = els.showOwnerColumn.checked;
  const tableWidth = (els.recentMonthsOnly.checked ? 1460 : 1900) - (ownerVisible ? 0 : 140);
  els.reviewTable.style.minWidth = `${tableWidth}px`;
  els.reviewTable.style.width = `${tableWidth}px`;
  const monthHeaders = visibleMonths
    .map((month) => {
      const className = month.isCurrent ? 'number current-cost' : 'number';
      return `<th class="${className}">${escapeHtml(month.header || `Column ${month.column}`)}</th>`;
    })
    .join('');

  els.tableHead.innerHTML = `
    <tr>
      <th>${t('provider')}</th>
      <th>${t('entity')}</th>
      <th>${t('studio')}</th>
      <th>${t('team')}</th>
      <th>${t('project')}</th>
      <th>${t('account')}</th>
      ${ownerVisible ? `<th>${t('owner')}</th>` : ''}
      <th>${t('costReviewer')}</th>
      ${monthHeaders}
      <th class="number">${t('diff')}</th>
      <th class="number">${t('diffRate')}</th>
      <th>${t('evidenceLink')}</th>
      <th>${t('review')}</th>
    </tr>
  `;
}

function renderKpis(rows) {
  const allSummary = summarizeRows(effectiveRows());
  const reviewerScopeRows = filterRows(effectiveRows(), { ...currentFilters(), status: 'all' });
  const summary = summarizeRows(reviewerScopeRows);
  els.kpiStrip.innerHTML = `
    <div class="kpi"><b>${rows.length}</b><span>${t('currentShown')}</span></div>
    <div class="kpi"><b>${summary.open}</b><span>${t('open')}</span></div>
    <div class="kpi"><b>${summary.verified}</b><span>${t('verifiedDone')}</span></div>
    <div class="kpi"><b>${allSummary.missingReviewer}</b><span>${t('missingReviewer')}</span></div>
  `;
}

function renderTableBody(rows) {
  if (rows.length === 0) {
    els.tableBody.innerHTML = `
      <tr>
        <td colspan="24">${t('noRows')}</td>
      </tr>
    `;
    return;
  }

  els.tableBody.innerHTML = rows.map((row) => rowTemplate(row)).join('');
}

function rowTemplate(row) {
  const selected = row.id === state.selectedId ? 'selected' : '';
  const verified = rowIsVerified(row);
  const localVerified = rowIsLocallyVerified(row);
  const visibleMonths = getVisibleMonths(row.months, els.recentMonthsOnly.checked);
  const ownerCell = els.showOwnerColumn.checked ? `<td>${escapeHtml(row.owner)}</td>` : '';
  const monthCells = visibleMonths
    .map((month) => {
      const className = month.isCurrent ? 'number current-cost' : 'number';
      return `<td class="${className}">${formatCurrency(month.value)}</td>`;
    })
    .join('');
  const diffClass = Number(row.diff) > 0 ? 'diff-up' : Number(row.diff) < 0 ? 'diff-down' : '';
  const rateClass =
    Number(row.diffRate) > 0 ? 'diff-up' : Number(row.diffRate) < 0 ? 'diff-down' : '';
  const linkLabel = row.accountEvidenceUrl
    ? t('accountLink')
    : row.providerEvidenceUrl
      ? t('providerLink')
      : t('linkInput');
  const action = verified
    ? `<span class="verified-mark ${localVerified ? 'web-mark' : 'source-mark'}">v</span>`
    : `<button class="row-button" data-action="verify">${t('verifyButton')}</button>`;

  return `
    <tr class="${selected}" data-row-id="${escapeAttr(row.id)}">
      <td>${escapeHtml(row.provider)}</td>
      <td>${escapeHtml(row.entity)}</td>
      <td>${escapeHtml(row.studio)}</td>
      <td>${escapeHtml(row.team)}</td>
      <td>${escapeHtml(row.project)}</td>
      <td title="${escapeAttr(row.account)}">${escapeHtml(row.account)}</td>
      ${ownerCell}
      <td>${escapeHtml(row.costReviewer)}</td>
      ${monthCells}
      <td class="number ${diffClass}">${formatCurrency(row.diff)}</td>
      <td class="number ${rateClass}">${formatRate(row.diffRate)}</td>
      <td><button class="row-button" data-action="evidence">${linkLabel}</button></td>
      <td>${action}</td>
    </tr>
  `;
}

function renderDetail() {
  const row = effectiveRows().find((candidate) => candidate.id === state.selectedId);

  if (!row) {
    els.detailAccount.textContent = t('selectAccount');
    els.detailSubtitle.textContent = t('selectAccountHelp');
    els.detailBody.innerHTML = `
      <div class="empty-state">${t('emptyDetail')}</div>
      ${memoOverviewTemplate()}
    `;
    els.openEvidence.disabled = true;
    els.verifySelected.disabled = true;
    els.openEvidence.textContent = t('openEvidence');
    els.verifySelected.textContent = t('verifySelected');
    return;
  }

  const verified = rowIsVerified(row);
  const localVerified = rowIsLocallyVerified(row);
  els.detailAccount.textContent = row.account || '(계정명 없음)';
  els.detailSubtitle.textContent = `${row.provider || '-'} · ${row.team || '-'} · Row ${row.rowNumber}`;
  els.openEvidence.disabled = !row.evidenceUrl;
  els.verifySelected.disabled = verified;
  els.openEvidence.textContent = t('openEvidence');
  els.verifySelected.textContent = verified ? t('alreadyVerified') : t('verifySelected');

  const visibleMonths = getVisibleMonths(row.months, els.recentMonthsOnly.checked);
  const chartItems = buildMonthChartItems(visibleMonths);
  const bars = chartItems
    .map((month) => {
      return `
        <div class="chart-column" title="${escapeAttr(month.header)}: ${month.valueLabel}">
          <span class="bar-value" style="display:block;color:#111827;font-size:11px;font-weight:800;line-height:1.15;text-align:center;white-space:nowrap;overflow:visible;">${escapeHtml(month.valueLabel)}</span>
          <div class="bar-wrap">
            <div class="bar ${month.isCurrent ? 'current' : ''}" style="height:${month.height}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
  const labels = chartItems
    .map((month) => `<span>${escapeHtml(month.shortLabel)}</span>`)
    .join('');

  els.detailBody.innerHTML = `
    <section class="detail-card">
      <h2>${t('accountInfo')}</h2>
      <div class="metric-grid">
        <div class="metric"><span>${t('reviewer')}</span><b>${escapeHtml(row.costReviewer || '-')}</b></div>
        <div class="metric"><span>${t('columnKStatus')}</span><b>${verified ? t('checkedV') : t('open')}</b></div>
        <div class="metric"><span>${t('owner')}</span><b>${escapeHtml(row.owner || '-')}</b></div>
        <div class="metric"><span>${t('project')}</span><b>${escapeHtml(row.project || '-')}</b></div>
        <div class="metric"><span>${t('currentCost')}</span><b>${formatCurrency(row.currentCost)}</b></div>
        <div class="metric"><span>Diff rate</span><b>${formatRate(row.diffRate)}</b></div>
      </div>
      <div class="spark" style="grid-template-columns:repeat(${visibleMonths.length}, minmax(0, 1fr))">${bars}</div>
      <div class="bar-labels" style="grid-template-columns:repeat(${visibleMonths.length}, minmax(0, 1fr))">${labels}</div>
    </section>

    <section class="detail-card">
      <h2>${t('providerSharedLink')}</h2>
      <div class="evidence-box">
        <button id="open-provider-evidence" class="link-open-button" type="button" ${row.providerEvidenceUrl ? '' : 'disabled'}>${t('providerLink')}</button>
        <input id="provider-evidence-url-input" value="${escapeAttr(row.providerEvidenceUrl)}" placeholder="${escapeAttr(`${row.provider || 'Provider'} ${t('providerSharedPlaceholderSuffix')}`)}">
      </div>
    </section>

    <section class="detail-card">
      <h2>${t('accountOverrideLink')}</h2>
      <div class="evidence-box">
        <button id="open-account-evidence" class="link-open-button" type="button" ${row.providerFolderEvidenceUrl ? '' : 'disabled'}>${t('accountOverrideLink')}</button>
        <input id="evidence-url-input" value="${escapeAttr(row.providerFolderEvidenceUrl)}" placeholder="${escapeAttr(t('accountOverridePlaceholder'))}">
      </div>
    </section>

    <section class="detail-card memo-box">
      <h2>${t('reviewMemo')}</h2>
      <div class="evidence-box">
        <textarea id="memo-input" placeholder="${escapeAttr(t('memoPlaceholder'))}">${escapeHtml(row.memo)}</textarea>
      </div>
    </section>

    ${memoOverviewTemplate()}
  `;

  document.querySelector('#provider-evidence-url-input').addEventListener('input', (event) => {
    const value = event.target.value.trim();
    if (value) {
      state.providerLinks[row.provider] = value;
    } else {
      delete state.providerLinks[row.provider];
    }
    saveLocalState();
    els.openEvidence.disabled = !getEffectiveEvidenceUrl(row, state.links, state.providerLinks);
    document.querySelector('#open-provider-evidence').disabled = !value;
  });
  document.querySelector('#provider-evidence-url-input').addEventListener('change', render);
  document.querySelector('#evidence-url-input').addEventListener('input', (event) => {
    const value = event.target.value.trim();
    const folderKey = providerFolderKey(row.provider);
    if (value) {
      state.providerLinks[folderKey] = value;
    } else {
      delete state.providerLinks[folderKey];
    }
    saveLocalState();
    els.openEvidence.disabled = !getEffectiveEvidenceUrl(row, state.links, state.providerLinks);
    document.querySelector('#open-account-evidence').disabled = !value;
  });
  document.querySelector('#evidence-url-input').addEventListener('change', render);
  document.querySelector('#open-provider-evidence')?.addEventListener('click', () => {
    const url = document.querySelector('#provider-evidence-url-input')?.value.trim();
    if (url) {
      window.open(normalizeExternalUrl(url), '_blank', 'noopener,noreferrer');
    }
  });
  document.querySelector('#open-account-evidence')?.addEventListener('click', () => {
    const url = document.querySelector('#evidence-url-input')?.value.trim();
    if (url) {
      window.open(normalizeExternalUrl(url), '_blank', 'noopener,noreferrer');
    }
  });
  document.querySelector('#memo-input').addEventListener('input', (event) => {
    state.memos[row.id] = event.target.value;
    saveLocalState();
    renderMemoOverview();
  });
}

function memoOverviewTemplate() {
  const rowsWithMemos = getRowsWithMemos(effectiveRows(), state.memos);
  const countLabel =
    state.language === 'ko'
      ? `${rowsWithMemos.length}${t('memoOverviewCount')}`
      : `${rowsWithMemos.length} ${t('memoOverviewCount')}`;
  const body = rowsWithMemos.length
    ? rowsWithMemos
        .map(
          (row) => `
            <button class="memo-list-item" type="button" data-memo-row-id="${escapeAttr(row.id)}">
              <span class="memo-account">${escapeHtml(row.account || '(계정명 없음)')}</span>
              <span class="memo-meta">${escapeHtml(row.provider || '-')} · ${escapeHtml(row.costReviewer || '-')} · Row ${escapeHtml(row.rowNumber || '-')}</span>
              <span class="memo-text">${escapeHtml(row.memo)}</span>
            </button>
          `,
        )
        .join('')
    : `<div class="empty-state compact">${t('noReviewMemos')}</div>`;

  return `
    <section class="detail-card memo-overview-card">
      <h2><span>${t('memoOverview')}</span><b>${countLabel}</b></h2>
      <div id="memo-overview-list" class="memo-overview-list">${body}</div>
    </section>
  `;
}

function renderMemoOverview() {
  const container = document.querySelector('.memo-overview-card');
  if (container) {
    const tmp = document.createElement('div');
    tmp.innerHTML = memoOverviewTemplate();
    container.innerHTML = tmp.querySelector('.memo-overview-card').innerHTML;
  }
}

function render() {
  const rows = filterRows(effectiveRows(), currentFilters());
  state.filteredRows = rows;
  if (!rows.some((row) => row.id === state.selectedId)) {
    state.selectedId = rows[0]?.id || null;
  }
  renderKpis(rows);
  renderTableBody(rows);
  renderDetail();
  els.resultSummary.textContent =
    state.language === 'ko'
      ? `${rows.length.toLocaleString('ko-KR')}${t('rowsShown')}`
      : `${rows.length.toLocaleString('en-US')} ${t('rowsShown')}`;
}

function verifyRow(rowId) {
  state.overrides[rowId] = true;
  state.selectedId = rowId;
  saveLocalState();
  render();
}

function openEvidence(rowId) {
  const row = effectiveRows().find((candidate) => candidate.id === rowId);
  if (row?.evidenceUrl) {
    window.open(normalizeExternalUrl(row.evidenceUrl), '_blank', 'noopener,noreferrer');
    return;
  }
  state.selectedId = rowId;
  render();
  document.querySelector('#evidence-url-input')?.focus();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('\n', ' ');
}

async function init() {
  loadLocalState();
  els.languageSelect.value = state.language;
  els.uploaderName.value = state.uploaderName;
  applyStaticTranslations();
  await loadData();
  renderProviderOptions(state.rows);
  renderTableHead();
  render();
}

async function loadData() {
  const apiResponse = await fetch(`/api/current?ts=${Date.now()}`, { cache: 'no-store' });
  if (apiResponse.status === 403 || apiResponse.status === 401) {
    throw new Error(`Access denied (${apiResponse.status})`);
  }
  let response = apiResponse;
  if (!apiResponse.ok) {
    const fallback = await fetch(`./data/cost-accounts.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!fallback.ok) {
      throw new Error(`Failed to load data: ${fallback.status} ${fallback.statusText}`);
    }
    response = fallback;
  }
  state.data = await response.json();
  state.rows = state.data.rows;
  state.workbookId = state.data.workbookId || 'local';
  state.selectedId = state.rows[0]?.id || null;
  els.sheetName.textContent = state.data.sheetName;
  await loadReviewState();
}

async function loadReviewState() {
  state.remoteReviewEnabled = false;
  if (!state.workbookId || state.workbookId === 'local') {
    return;
  }
  try {
    const response = await fetch(
      `/api/review-state?workbookId=${encodeURIComponent(state.workbookId)}&ts=${Date.now()}`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      return;
    }
    const remoteState = await response.json();
    state.overrides = remoteState.overrides || {};
    state.links = remoteState.links || {};
    state.providerLinks = remoteState.providerLinks || {};
    state.memos = remoteState.memos || {};
    state.remoteReviewEnabled = true;
    saveLocalState(false);
  } catch {
    state.remoteReviewEnabled = false;
  }
}

function scheduleRemoteStateSave() {
  if (!state.remoteReviewEnabled || !state.workbookId || !state.rows.length) {
    return;
  }
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(saveRemoteReviewState, 700);
}

async function saveRemoteReviewState() {
  if (!state.remoteReviewEnabled || !state.workbookId) {
    return;
  }
  const payload = buildReviewStatePayload({
    workbookId: state.workbookId,
    rows: state.rows,
    overrides: state.overrides,
    links: state.links,
    providerLinks: state.providerLinks,
    memos: state.memos,
  });
  try {
    const response = await fetch('/api/review-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    state.remoteReviewEnabled = response.ok;
  } catch {
    state.remoteReviewEnabled = false;
  }
}

function resetProviderOptions() {
  els.providerFilter.innerHTML = '<option value="all"></option>';
  setProviderAllOptionText();
}

function setProviderAllOptionText() {
  const allOption = els.providerFilter.querySelector('option[value="all"]');
  if (allOption) {
    allOption.textContent = t('allProviders');
  }
}

async function uploadWorkbook(file) {
  if (!file) {
    return;
  }
  if (!canManageProtectedActions(state.uploaderName)) {
    throw new Error(t('uploadLocked'));
  }

  els.resultSummary.textContent = `${file.name} ${t('uploadInProgress')}`;
  const preservedProviderLinks = { ...state.providerLinks };
  const formData = new FormData();
  formData.append('workbook', file);
  formData.append('uploader', state.uploaderName);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || t('uploadFailed'));
  }

  const result = await response.json();
  await loadData();
  state.providerLinks = { ...preservedProviderLinks, ...state.providerLinks };
  resetReviewState({ preserveProviderLinks: true });
  resetProviderOptions();
  renderProviderOptions(state.rows);
  renderTableHead();
  render();
  els.resultSummary.textContent =
    state.language === 'ko'
      ? `${result.filename} ${t('uploadComplete')}: ${result.sheetName}, ${result.rowCount.toLocaleString('ko-KR')}${t('rowsShown')}`
      : `${result.filename} ${t('uploadComplete')}: ${result.sheetName}, ${result.rowCount.toLocaleString('en-US')} ${t('rowsShown')}`;
}

async function downloadReviewedWorkbook() {
  if (!canManageProtectedActions(state.uploaderName)) {
    els.resultSummary.textContent = t('uploadLocked');
    return;
  }

  state.downloadCount += 1;
  els.resultSummary.textContent = t('downloadInProgress');
  const response = await fetch('/api/export-reviewed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploader: state.uploaderName,
      rows: buildReviewExportRows(effectiveRows()),
      count: state.downloadCount,
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || t('downloadFailed'));
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const filenameMatch = disposition.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] || 'cloud-cost-reviewed.xlsx';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  els.resultSummary.textContent = t('downloadComplete');
}

els.languageSelect.addEventListener('change', () => {
  state.language = els.languageSelect.value;
  saveLocalState();
  applyStaticTranslations();
  renderTableHead();
  render();
});
els.uploaderName.addEventListener('input', () => {
  state.uploaderName = els.uploaderName.value;
  saveLocalState();
  updateUploadPermission();
});
els.reviewerSearch.addEventListener('input', render);
els.providerFilter.addEventListener('change', render);
els.statusFilter.addEventListener('change', render);
els.recentMonthsOnly.addEventListener('change', () => {
  renderTableHead();
  render();
});
els.showOwnerColumn.addEventListener('change', () => {
  renderTableHead();
  render();
});
els.workbookUpload.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  try {
    await uploadWorkbook(file);
  } catch (error) {
    els.resultSummary.textContent = `${t('uploadFailed')}: ${error.message}`;
  } finally {
    event.target.value = '';
  }
});
els.clearLocal.addEventListener('click', () => {
  if (!canManageProtectedActions(state.uploaderName)) {
    els.resultSummary.textContent = t('uploadLocked');
    return;
  }
  state.overrides = Object.fromEntries(state.rows.map((row) => [row.id, false]));
  saveLocalState();
  render();
  els.resultSummary.textContent = t('resetComplete');
});
function openConfirmModal({ title, body, onConfirm }) {
  els.modalTitle.textContent = title;
  els.modalBody.textContent = body;
  els.modalConfirm.textContent = t('confirmDelete');
  els.modalCancel.textContent = t('cancel');
  els.confirmModal.hidden = false;
  els.modalConfirm.onclick = () => {
    els.confirmModal.hidden = true;
    onConfirm();
  };
  els.modalCancel.onclick = () => {
    els.confirmModal.hidden = true;
  };
}

els.confirmModal.addEventListener('click', (event) => {
  if (event.target === els.confirmModal) {
    els.confirmModal.hidden = true;
  }
});

els.clearMemos.addEventListener('click', () => {
  if (!canManageProtectedActions(state.uploaderName)) {
    els.resultSummary.textContent = t('uploadLocked');
    return;
  }
  const count = Object.values(state.memos).filter((m) => String(m).trim()).length;
  openConfirmModal({
    title: t('clearMemosDialogTitle'),
    body: `${count}${t('clearMemosDialogCount')}\n${t('clearMemosDialogBody').split('\n')[1]}`,
    onConfirm: () => {
      state.memos = {};
      saveLocalState();
      scheduleRemoteStateSave();
      render();
      els.resultSummary.textContent = t('clearMemosComplete');
    },
  });
});
els.downloadReviewed.addEventListener('click', async () => {
  try {
    await downloadReviewedWorkbook();
  } catch (error) {
    els.resultSummary.textContent = `${t('downloadFailed')}: ${error.message}`;
  }
});

els.tableBody.addEventListener('click', (event) => {
  const rowEl = event.target.closest('tr[data-row-id]');
  if (!rowEl) {
    return;
  }

  const rowId = rowEl.dataset.rowId;
  const action = event.target.dataset.action;
  if (action === 'verify') {
    verifyRow(rowId);
    return;
  }
  if (action === 'evidence') {
    openEvidence(rowId);
    return;
  }

  state.selectedId = rowId;
  render();
});

els.detailBody.addEventListener('click', (event) => {
  const memoItem = event.target.closest('[data-memo-row-id]');
  if (!memoItem) {
    return;
  }
  state.selectedId = memoItem.dataset.memoRowId;
  render();
});

els.openEvidence.addEventListener('click', () => {
  if (state.selectedId) {
    openEvidence(state.selectedId);
  }
});

els.verifySelected.addEventListener('click', () => {
  if (state.selectedId) {
    verifyRow(state.selectedId);
  }
});

init().catch((error) => {
  els.resultSummary.textContent = t('loadFailed');
  els.detailBody.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
});
