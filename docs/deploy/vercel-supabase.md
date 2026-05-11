# Vercel + Supabase 운영 배포 가이드

## 1. Supabase 준비

1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 실행합니다.
3. Storage에 `cloud-cost-workbooks` bucket이 생성되었는지 확인합니다.
4. Project Settings > API에서 다음 값을 확인합니다.
   - Project URL
   - service_role key

service_role key는 서버 전용 비밀키입니다. 브라우저 코드나 문서 공유 화면에 노출하면 안 됩니다.

## 2. Vercel 환경변수

Vercel Project Settings > Environment Variables에 아래 값을 추가합니다.

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=cloud-cost-workbooks
```

## 3. 배포

Vercel CLI를 쓰는 경우:

```bash
vercel
vercel --prod
```

GitHub 저장소를 연결하는 경우:

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 Import Project를 선택합니다.
3. Framework Preset은 Other로 둡니다.
4. 환경변수를 입력한 뒤 Deploy를 누릅니다.

## 4. 운영 흐름

1. 업로드 담당자 이름에 `이윤슬` 또는 `Yunseul Lee`를 입력합니다.
2. 월별 Excel 파일을 업로드합니다.
3. 검수자들은 배포 URL에서 본인 이름을 검색합니다.
4. 체크, 상세내역 링크, 별도 상세내역 링크, 검수 메모는 Supabase에 저장됩니다.
5. `K열 반영 엑셀 다운로드`를 누르면 원본 Excel을 Supabase Storage에서 불러와 K열 체크를 반영한 파일을 내려받습니다.

## 5. 보안 메모

현재 버전은 업로드/다운로드 권한을 담당자 이름으로 제한합니다. 외부 공개 URL로 운영하려면 다음 단계로 Supabase Auth 또는 Vercel Deployment Protection을 추가하는 것을 권장합니다.
