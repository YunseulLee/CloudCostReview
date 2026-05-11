export function normalizeText(value) {
  return String(value ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

const UI_TEXT = {
  reviewerSearch: { ko: '검수자 검색', en: 'Reviewer' },
  reviewerPlaceholder: { ko: '이윤슬', en: 'Yunseul Lee' },
  provider: { ko: 'Provider', en: 'Provider' },
  allProviders: { ko: 'All', en: 'All' },
  status: { ko: '상태', en: 'Status' },
  statusOpen: { ko: '미검수 우선', en: 'Open first' },
  statusAll: { ko: '전체', en: 'All' },
  statusVerified: { ko: '검수 완료', en: 'Verified' },
  recentOnly: { ko: '최근 3개월만 보기', en: 'Show recent 3 months' },
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
  currentShown: { ko: '현재 표시', en: 'Shown' },
  open: { ko: '미검수', en: 'Open' },
  verifiedDone: { ko: '검수 완료', en: 'Verified' },
  missingReviewer: { ko: '검수자 없음', en: 'No reviewer' },
  tableTitle: { ko: '엑셀 유사 표 보기', en: 'Excel-like Table' },
  loadingData: { ko: '데이터를 불러오는 중입니다.', en: 'Loading data.' },
  noRows: { ko: '조건에 맞는 계정이 없습니다.', en: 'No accounts match the filters.' },
  evidenceLink: { ko: '상세내역 링크', en: 'Detail link' },
  review: { ko: '검수', en: 'Review' },
  entity: { ko: 'Entity', en: 'Entity' },
  studio: { ko: 'Studio', en: 'Studio' },
  team: { ko: 'Team', en: 'Team' },
  project: { ko: 'Project', en: 'Project' },
  account: { ko: 'Account', en: 'Account' },
  costReviewer: { ko: '검수자', en: 'Cost Reviewer' },
  diff: { ko: 'Diff', en: 'Diff' },
  diffRate: { ko: 'Diff rate', en: 'Diff rate' },
  accountLink: { ko: '계정 링크', en: 'Account link' },
  providerLink: { ko: 'Provider 링크', en: 'Provider link' },
  linkInput: { ko: '링크 입력', en: 'Add link' },
  verifyButton: { ko: '체크', en: 'Check' },
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
  verifySelected: { ko: '체크', en: 'Check' },
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
  accountOverrideLink: { ko: '별도 상세내역 링크', en: 'Separate Detail Link' },
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
    ko: '금액이 다르거나 확인이 필요한 내용을 적어두세요.',
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

export function getVisibleMonths(months, recentOnly = false) {
  if (!recentOnly) {
    return [...months];
  }

  return months.slice(-3);
}

export function getEffectiveEvidenceUrl(row, accountLinks = {}, providerLinks = {}) {
  const accountLink = normalizeText(accountLinks[row.id]) ? accountLinks[row.id].trim() : '';
  const providerLink = normalizeText(providerLinks[row.provider])
    ? providerLinks[row.provider].trim()
    : '';
  const sourceLink = normalizeText(row.evidenceUrl) ? row.evidenceUrl.trim() : '';

  return accountLink || providerLink || sourceLink;
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
