export function normalizeText(value) {
  return String(value ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

const UI_TEXT = {
  reviewerSearch: { ko: '검수자 검색', en: 'Reviewer' },
  reviewerPlaceholder: { ko: '예 : 이윤슬', en: 'e.g. Yunseul Lee' },
  provider: { ko: 'Provider', en: 'Provider' },
  allProviders: { ko: 'All', en: 'All' },
  status: { ko: '상태', en: 'Status' },
  statusOpen: { ko: '미검수 우선', en: 'Open first' },
  statusAll: { ko: '전체', en: 'All' },
  statusVerified: { ko: '검수 완료', en: 'Verified' },
  recentOnly: { ko: '12개월값 보기', en: 'Show 12 months' },
  showOwner: { ko: 'Owner 보기', en: 'Show Owner' },
  uploadWorkbook: { ko: '월별 엑셀 업로드', en: 'Upload monthly Excel' },
  uploadOperator: { ko: '업로드 담당자', en: 'Uploader' },
  uploadOperatorPlaceholder: { ko: '', en: '' },
  uploadLocked: {
    ko: '허용된 담당자만 가능',
    en: 'Allowed uploaders only',
  },
  uploadAllowed: { ko: '업로드/초기화/다운로드 가능', en: 'Upload/reset/download allowed' },
  downloadReviewed: { ko: 'K열 반영 엑셀 다운로드', en: 'Download Excel with K updated' },
  clearChecks: { ko: '화면 체크 초기화', en: 'Reset screen checks' },
  clearMemos: { ko: '메모 전체 삭제', en: 'Delete all memos' },
  clearMemosComplete: { ko: '모든 검수 메모를 삭제했습니다.', en: 'All review memos have been deleted.' },
  clearMemosDialogTitle: { ko: '검수 메모 전체 삭제', en: 'Delete All Review Memos' },
  clearMemosDialogBody: { ko: '작성된 검수 메모를 모두 삭제합니다.\n이 작업은 되돌릴 수 없습니다.', en: 'All review memos will be permanently deleted.\nThis action cannot be undone.' },
  clearMemosDialogCount: { ko: '개 메모가 삭제됩니다.', en: 'memo(s) will be deleted.' },
  cancel: { ko: '취소', en: 'Cancel' },
  confirmDelete: { ko: '삭제', en: 'Delete' },
  currentShown: { ko: '현재 표시', en: 'Shown' },
  open: { ko: '미검수', en: 'Open' },
  verifiedDone: { ko: '검수 완료', en: 'Verified' },
  missingReviewer: { ko: '검수자 없음', en: 'No reviewer' },
  tableTitle: { ko: '엑셀 유사 표 보기', en: 'Excel-like Table' },
  loadingData: { ko: '데이터를 불러오는 중입니다.', en: 'Loading data.' },
  noRows: { ko: '조건에 맞는 계정이 없습니다.', en: 'No accounts match the filters.' },
  evidenceLink: { ko: 'Link', en: 'Link' },
  review: { ko: '검수', en: 'Review' },
  entity: { ko: 'Entity', en: 'Entity' },
  studio: { ko: 'Studio', en: 'Studio' },
  team: { ko: 'Team', en: 'Team' },
  project: { ko: 'Project', en: 'Project' },
  account: { ko: 'Account', en: 'Account' },
  costReviewer: { ko: '검수자', en: 'Cost Reviewer' },
  diff: { ko: 'Diff', en: 'Diff' },
  diffRate: { ko: 'Diff rate', en: 'Diff rate' },
  accountLink: { ko: 'Link', en: 'Link' },
  providerLink: { ko: 'Link', en: 'Link' },
  linkInput: { ko: '링크 입력', en: 'Add link' },
  verifyButton: { ko: 'Check', en: 'Check' },
  selectAccount: { ko: '계정을 선택하세요', en: 'Select an account' },
  selectAccountHelp: {
    ko: '표에서 행을 선택하면 월별 비용과 검수 작업이 표시됩니다.',
    en: 'Select a row to view monthly costs and review actions.',
  },
  emptyDetail: {
    ko: '검수할 계정을 선택하거나 검수자 이름으로 검색해보세요.',
    en: 'Select an account to review, or search by reviewer name.',
  },
  openEvidence: { ko: '상세내역 열기', en: 'Open detail link' },
  verifySelected: { ko: 'Check', en: 'Check' },
  alreadyVerified: { ko: '이미 체크됨', en: 'Already checked' },
  accountInfo: { ko: '계정 정보', en: 'Account Info' },
  reviewer: { ko: '검수자', en: 'Reviewer' },
  columnKStatus: { ko: '검수 상태', en: 'Review Status' },
  owner: { ko: 'Owner', en: 'Owner' },
  project: { ko: 'Project', en: 'Project' },
  currentCost: { ko: 'W열 현재 비용', en: 'Current Cost in W' },
  checkedV: { ko: '체크됨', en: 'Checked' },
  providerSharedLink: { ko: '상세내역 링크', en: 'Detail Link' },
  providerSharedPlaceholderSuffix: {
    ko: '전체 계정에 적용할 상세내역 링크',
    en: 'detail link for all accounts',
  },
  providerSharedHint: {
    ko: '계정들은 계정별 링크가 비어 있으면 이 링크를 사용합니다.',
    en: 'accounts use this link when account-specific link is blank.',
  },
  accountOverrideLink: { ko: '상세내역 폴더링크', en: 'Detail Folder Link' },
  accountOverridePlaceholder: {
    ko: '이 계정만 다른 상세내역 링크를 쓰는 경우 입력',
    en: 'Enter only when this account uses a separate detail link',
  },
  currentUsedLink: { ko: '현재 사용 링크', en: 'Current link' },
  none: { ko: '없음', en: 'None' },
  reviewMemo: { ko: '검수 메모', en: 'Review Memo' },
  memoOverview: { ko: '검수 메모 모아보기', en: 'Review Memo Overview' },
  memoOverviewCount: { ko: '개 메모', en: 'memos' },
  noReviewMemos: { ko: '저장된 검수 메모가 없습니다.', en: 'No review memos saved.' },
  memoPlaceholder: {
    ko: '비용 증감 사유를 작성해주세요.',
    en: 'Add notes for mismatched amounts or follow-up items.',
  },
  rowsShown: { ko: '개 계정 표시 중', en: 'accounts shown' },
  uploadInProgress: { ko: '업로드 중입니다.', en: 'is uploading.' },
  uploadFailed: { ko: '업로드 실패', en: 'Upload failed' },
  uploadComplete: { ko: '업로드 완료', en: 'uploaded' },
  downloadInProgress: { ko: 'K열 반영 엑셀을 만드는 중입니다.', en: 'Creating Excel with K updates.' },
  downloadFailed: { ko: '엑셀 다운로드 실패', en: 'Excel download failed' },
  downloadComplete: { ko: 'K열 반영 엑셀을 다운로드했습니다.', en: 'Downloaded Excel with K updates.' },
  resetComplete: {
    ko: '화면의 모든 체크를 초기화했습니다. 공유링크와 메모는 유지됩니다.',
    en: 'All visible check marks were reset. Detail links and memos are preserved.',
  },
  loadFailed: { ko: '데이터를 불러오지 못했습니다.', en: 'Could not load data.' },
  topMetaW: { ko: 'W열 현재 비용', en: 'Current cost in W' },
  topMeta12: { ko: '12개월 비교', en: '12-month comparison' },
  language: { ko: 'Language', en: 'Language' },
};

// Sync this list with ALLOWED_UPLOADERS env var on server
const ALLOWED_UPLOADERS = ['이윤슬', 'yunseul', 'yunseul lee'];

export function uiText(key, language = 'ko') {
  const entry = UI_TEXT[key];
  if (!entry) {
    return key;
  }
  if (Object.hasOwn(entry, language)) {
    return entry[language];
  }
  if (Object.hasOwn(entry, 'ko')) {
    return entry.ko;
  }
  return key;
}

export function uploaderIsAllowed(name) {
  return ALLOWED_UPLOADERS.includes(normalizeText(name));
}

export function canManageProtectedActions(name) {
  return uploaderIsAllowed(name);
}

export function rowIsVerified(row) {
  return rowIsLocallyVerified(row) || (normalizeText(row?.verified) === 'v' && !row?.sourceVerifiedHidden);
}

export function rowIsLocallyVerified(row) {
  return row?.locallyVerified === true;
}

export function getRowsWithMemos(rows, memos = {}) {
  return rows
    .map((row) => ({
      ...row,
      memo: String(memos[row.id] || '').trim(),
    }))
    .filter((row) => row.memo);
}

export function applyVerificationOverrides(rows, overrides = {}) {
  return rows.map((row) => {
    const sourceVerified = normalizeText(row?.verified) === 'v';
    if (overrides[row.id] === true) {
      return {
        ...row,
        sourceVerified,
        sourceVerifiedHidden: false,
        verified: 'v',
        locallyVerified: true,
      };
    }
    if (overrides[row.id] === false) {
      return {
        ...row,
        sourceVerified,
        sourceVerifiedHidden: sourceVerified,
        locallyVerified: false,
      };
    }
    return { ...row, sourceVerified, sourceVerifiedHidden: false, locallyVerified: false };
  });
}

export function filterRows(rows, filters = {}) {
  const reviewer = normalizeText(filters.reviewer);
  const provider = normalizeText(filters.provider);
  const status = normalizeText(filters.status || 'all');

  return rows.filter((row) => {
    const reviewerMatches = !reviewer || normalizeText(row.costReviewer).includes(reviewer);
    const providerMatches = !provider || provider === 'all' || normalizeText(row.provider) === provider;
    const verified = rowIsVerified(row);
    const statusMatches =
      status === 'all' ||
      (status === 'open' && !verified) ||
      (status === 'verified' && verified);

    return reviewerMatches && providerMatches && statusMatches;
  });
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return String(value);
  }

  return Math.round(number).toLocaleString('en-US');
}

export function formatKrw(value) {
  const formatted = formatCurrency(value);
  return formatted === '-' ? '-' : `${formatted}원`;
}

export function shortMonthLabel(header) {
  const value = String(header || '').replace('(KRW)', '').replace(/\s+/g, ' ').trim();
  return value.split(' ')[0] || '-';
}

export function buildMonthChartItems(months = []) {
  const maxValue = Math.max(1, ...months.map((month) => Math.max(0, Number(month.value) || 0)));

  return months.map((month) => {
    const value = Math.max(0, Number(month.value) || 0);
    return {
      ...month,
      height: Math.max(4, Math.round((value / maxValue) * 76)),
      valueLabel: formatKrw(month.value),
      shortLabel: shortMonthLabel(month.header),
    };
  });
}

export function formatRate(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return String(value);
  }

  return `${number > 0 ? '+' : ''}${(number * 100).toFixed(1)}%`;
}

export function getUniqueProviders(rows) {
  return [...new Set(rows.map((row) => row.provider).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getVisibleMonths(months, showAllMonths = false) {
  if (showAllMonths) {
    return [...months];
  }

  return months.slice(-3);
}

export function getEffectiveEvidenceUrl(row, accountLinks = {}, providerLinks = {}) {
  const accountLink = normalizeText(accountLinks[row.id]) ? accountLinks[row.id].trim() : '';
  const providerLink = normalizeText(providerLinks[row.provider])
    ? providerLinks[row.provider].trim()
    : '';
  const providerFolderLink = normalizeText(providerLinks[`folder::${row.provider}`])
    ? providerLinks[`folder::${row.provider}`].trim()
    : '';
  const sourceLink = normalizeText(row.evidenceUrl) ? row.evidenceUrl.trim() : '';

  return accountLink || providerLink || providerFolderLink || sourceLink;
}

export function normalizeExternalUrl(url) {
  const value = String(url || '').trim();
  if (!value) {
    return '';
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
    return value;
  }
  return `https://${value}`;
}

export function buildReviewExportRows(rows) {
  return rows
    .map((row) => ({
      rowNumber: Number(row.rowNumber),
      verified: rowIsVerified(row),
    }))
    .filter((row) => Number.isFinite(row.rowNumber));
}

export function buildReviewStatePayload({
  workbookId,
  rows,
  overrides = {},
  links = {},
  providerLinks = {},
  memos = {},
}) {
  return {
    workbookId,
    rows: rows.map((row) => ({
      rowId: row.id,
      rowNumber: Number(row.rowNumber),
      verified: overrides[row.id] === true ? true : overrides[row.id] === false ? false : rowIsVerified(row),
      accountEvidenceUrl: String(links[row.id] || '').trim(),
      memo: String(memos[row.id] || '').trim(),
    })),
    providerLinks: Object.fromEntries(
      Object.entries(providerLinks)
        .map(([provider, url]) => [provider, String(url || '').trim()])
        .filter(([provider, url]) => normalizeText(provider) && normalizeText(url)),
    ),
  };
}

export function summarizeRows(rows) {
  const total = rows.length;
  const verified = rows.filter(rowIsVerified).length;
  const open = total - verified;
  const missingReviewer = rows.filter((row) => !normalizeText(row.costReviewer)).length;

  return { total, verified, open, missingReviewer };
}
