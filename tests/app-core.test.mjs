import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyVerificationOverrides,
  buildReviewExportRows,
  buildReviewStatePayload,
  canManageProtectedActions,
  filterRows,
  formatCurrency,
  buildMonthChartItems,
  getEffectiveEvidenceUrl,
  getRowsWithMemos,
  getVisibleMonths,
  normalizeExternalUrl,
  uploaderIsAllowed,
  normalizeText,
  rowIsLocallyVerified,
  rowIsVerified,
  uiText,
} from '../src/app-core.js';

const rows = [
  {
    id: 'row-4',
    rowNumber: 4,
    provider: 'AWS',
    costReviewer: '김승훈',
    verified: '',
    currentCost: 1200,
    diffRate: 0.12,
  },
  {
    id: 'row-5',
    rowNumber: 5,
    provider: 'Azure',
    costReviewer: ' 김승훈 ',
    verified: 'v',
    currentCost: 0,
    diffRate: -1,
  },
  {
    id: 'row-6',
    rowNumber: 6,
    provider: 'GCP',
    costReviewer: '엄기성',
    verified: '',
    currentCost: 300,
    diffRate: -0.02,
  },
];

test('normalizeText trims whitespace and lowercases text', () => {
  assert.equal(normalizeText('  AWS 김승훈  '), 'aws 김승훈');
  assert.equal(normalizeText(null), '');
});

test('rowIsVerified treats v as verified and ignores case or whitespace', () => {
  assert.equal(rowIsVerified({ verified: ' v ' }), true);
  assert.equal(rowIsVerified({ verified: 'V' }), true);
  assert.equal(rowIsVerified({ verified: '' }), false);
});

test('filterRows returns only rows for the searched reviewer name', () => {
  const result = filterRows(rows, { reviewer: '김승훈', provider: 'all', status: 'all' });
  assert.deepEqual(result.map((row) => row.id), ['row-4', 'row-5']);
});

test('filterRows applies provider and open status filters together', () => {
  const result = filterRows(rows, { reviewer: '김승훈', provider: 'AWS', status: 'open' });
  assert.deepEqual(result.map((row) => row.id), ['row-4']);
});

test('applyVerificationOverrides marks locally approved rows without changing the source rows', () => {
  const result = applyVerificationOverrides(rows, { 'row-4': true });
  assert.equal(rowIsVerified(result[0]), true);
  assert.equal(rowIsLocallyVerified(result[0]), true);
  assert.equal(rows[0].verified, '');
});

test('applyVerificationOverrides distinguishes source Excel v from web v', () => {
  const result = applyVerificationOverrides(rows, {});

  assert.equal(rowIsVerified(result[1]), true);
  assert.equal(result[1].sourceVerified, true);
  assert.equal(rowIsLocallyVerified(result[1]), false);
});

test('applyVerificationOverrides can hide source Excel v for a full screen reset', () => {
  const result = applyVerificationOverrides(rows, { 'row-5': false });

  assert.equal(result[1].sourceVerified, true);
  assert.equal(result[1].sourceVerifiedHidden, true);
  assert.equal(rowIsVerified(result[1]), false);
});

test('formatCurrency returns compact KRW strings for table cells', () => {
  assert.equal(formatCurrency(1529469), '1,529,469');
  assert.equal(formatCurrency(null), '-');
});

test('getVisibleMonths shows recent months by default and all months when enabled', () => {
  const months = Array.from({ length: 12 }, (_, index) => ({
    header: `M${index + 1}`,
    value: index + 1,
  }));

  assert.deepEqual(getVisibleMonths(months, false).map((month) => month.header), [
    'M10',
    'M11',
    'M12',
  ]);
  assert.deepEqual(getVisibleMonths(months, true).map((month) => month.header), [
    'M1',
    'M2',
    'M3',
    'M4',
    'M5',
    'M6',
    'M7',
    'M8',
    'M9',
    'M10',
    'M11',
    'M12',
  ]);
});

test('buildMonthChartItems includes KRW labels for each chart bar', () => {
  const items = buildMonthChartItems([
    { header: 'Feb 2026(KRW)', value: 56879 },
    { header: 'Mar 2026(KRW)', value: 49010 },
    { header: 'Apr 2026(KRW)', value: 14711, isCurrent: true },
  ]);

  assert.deepEqual(
    items.map((item) => item.valueLabel),
    ['56,879원', '49,010원', '14,711원'],
  );
  assert.deepEqual(
    items.map((item) => item.shortLabel),
    ['Feb', 'Mar', 'Apr'],
  );
});

test('getEffectiveEvidenceUrl uses provider link when account link is blank', () => {
  const row = { id: 'row-10', provider: 'AWS', evidenceUrl: '' };
  const result = getEffectiveEvidenceUrl(row, {}, { AWS: 'https://provider.example/aws' });

  assert.equal(result, 'https://provider.example/aws');
});

test('getEffectiveEvidenceUrl prefers account link over provider link', () => {
  const row = { id: 'row-10', provider: 'AWS', evidenceUrl: '' };
  const result = getEffectiveEvidenceUrl(
    row,
    { 'row-10': 'https://account.example/aws-row-10' },
    { AWS: 'https://provider.example/aws' },
  );

  assert.equal(result, 'https://account.example/aws-row-10');
});

test('getEffectiveEvidenceUrl uses provider folder link when detail links are blank', () => {
  const row = { id: 'row-10', provider: 'AWS', evidenceUrl: '' };
  const result = getEffectiveEvidenceUrl(row, {}, { 'folder::AWS': 'https://folder.example/aws' });

  assert.equal(result, 'https://folder.example/aws');
});

test('normalizeExternalUrl adds https when protocol is missing', () => {
  assert.equal(normalizeExternalUrl('docs.google.com/file'), 'https://docs.google.com/file');
  assert.equal(normalizeExternalUrl('https://docs.google.com/file'), 'https://docs.google.com/file');
  assert.equal(normalizeExternalUrl(''), '');
});

test('getRowsWithMemos returns rows that have non-empty review memos', () => {
  const result = getRowsWithMemos(
    [
      { id: 'row-10', rowNumber: 10, account: 'aws-a', provider: 'AWS', costReviewer: 'Kim' },
      { id: 'row-11', rowNumber: 11, account: 'azure-b', provider: 'Azure', costReviewer: 'Lee' },
    ],
    {
      'row-10': '  check variance  ',
      'row-11': '   ',
    },
  );

  assert.deepEqual(result, [
    {
      id: 'row-10',
      rowNumber: 10,
      account: 'aws-a',
      provider: 'AWS',
      costReviewer: 'Kim',
      memo: 'check variance',
    },
  ]);
});

test('uiText returns English and Korean labels with Korean fallback', () => {
  assert.equal(uiText('reviewerSearch', 'ko'), '검수자 검색');
  assert.equal(uiText('reviewerSearch', 'en'), 'Reviewer');
  assert.equal(uiText('reviewerPlaceholder', 'ko'), '예 : 이윤슬');
  assert.equal(uiText('reviewerPlaceholder', 'en'), 'e.g. Yunseul Lee');
  assert.equal(uiText('recentOnly', 'ko'), '12개월값 보기');
  assert.equal(uiText('recentOnly', 'en'), 'Show 12 months');
  assert.equal(uiText('showOwner', 'ko'), 'Owner 보기');
  assert.equal(uiText('showOwner', 'en'), 'Show Owner');
  assert.equal(uiText('evidenceLink', 'ko'), 'Link');
  assert.equal(uiText('accountLink', 'ko'), 'Link');
  assert.equal(uiText('providerLink', 'ko'), 'Link');
  assert.equal(uiText('accountOverrideLink', 'ko'), '상세내역 폴더링크');
  assert.equal(uiText('verifyButton', 'ko'), 'Check');
  assert.equal(uiText('verifySelected', 'ko'), 'Check');
  assert.equal(uiText('memoPlaceholder', 'ko'), '비용 증감 사유를 작성해주세요.');
  assert.equal(uiText('language', 'ko'), 'Language');
  assert.equal(uiText('uploadOperatorPlaceholder', 'ko'), '');
  assert.equal(uiText('reviewerSearch', 'fr'), '검수자 검색');
  assert.equal(uiText('missing.translation.key', 'en'), 'missing.translation.key');
});

test('uploaderIsAllowed accepts configured uploader names', () => {
  assert.equal(uploaderIsAllowed('이윤슬'), true);
  assert.equal(uploaderIsAllowed('이윤슬'), true);
  assert.equal(uploaderIsAllowed(' yunseul lee '), true);
  assert.equal(uploaderIsAllowed('Yunseul  Lee'), true);
  assert.equal(uploaderIsAllowed('Jordan'), false);
});

test('canManageProtectedActions uses uploader name for protected controls', () => {
  assert.equal(canManageProtectedActions('이윤슬'), true);
  assert.equal(canManageProtectedActions('Jordan'), false);
});

test('buildReviewExportRows returns row numbers and visible verified state for export', () => {
  const prepared = applyVerificationOverrides(rows, { 'row-4': true, 'row-5': false });

  assert.deepEqual(buildReviewExportRows(prepared), [
    { rowNumber: 4, verified: true },
    { rowNumber: 5, verified: false },
    { rowNumber: 6, verified: false },
  ]);
});

test('buildReviewStatePayload serializes checks links provider links and memos', () => {
  const result = buildReviewStatePayload({
    workbookId: 'book-1',
    rows,
    overrides: { 'row-4': true, 'row-6': false },
    links: { 'row-4': 'https://account.example/detail' },
    providerLinks: {
      AWS: 'https://provider.example/aws',
      'folder::AWS': 'https://provider.example/folder',
    },
    memos: { 'row-6': 'need follow-up' },
  });

  assert.deepEqual(result, {
    workbookId: 'book-1',
    rows: [
      {
        rowId: 'row-4',
        rowNumber: 4,
        verified: true,
        accountEvidenceUrl: 'https://account.example/detail',
        memo: '',
      },
      {
        rowId: 'row-5',
        rowNumber: 5,
        verified: true,
        accountEvidenceUrl: '',
        memo: '',
      },
      {
        rowId: 'row-6',
        rowNumber: 6,
        verified: false,
        accountEvidenceUrl: '',
        memo: 'need follow-up',
      },
    ],
    providerLinks: {
      AWS: 'https://provider.example/aws',
      'folder::AWS': 'https://provider.example/folder',
    },
  });
});
