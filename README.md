# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Git 커밋 / 푸시

프로젝트 루트에서 아래처럼 진행하면 됩니다.

```powershell
git status
git add -A
git commit -m "feat: update UI"
git push -u origin HEAD
```

## Vercel CLI 배포

### 1) 설치 / 로그인

```powershell
npm i -g vercel
vercel --version
vercel login
```

## 환경변수 (Vercel)

이 앱은 **허용된 계정만 접속**할 수 있도록 서버에서 Google `id_token`을 검증합니다.

- `VITE_GOOGLE_CLIENT_ID`: (프론트) Google OAuth Client ID
- `GOOGLE_CLIENT_ID`: (서버) 위와 동일한 Client ID (토큰 audience 검증용)
- `ALLOWED_EMAILS`: 허용 이메일 목록(콤마 구분). 예: `me@company.com,admin@company.com`
- `OPENAI_API_KEY`: (서버) OpenAI API Key
- `OPENAI_MODEL`: (선택) 모델명. 기본값: `gpt-4o-mini`

## 로컬: Google Drive → 지식(MD) 생성

Drive 폴더를 재귀적으로 순회해서 파일 내용을 읽고(`xlsx`/Google Sheets는 **시트(tab)별**로),
검색/질문용 Markdown 지식베이스를 생성합니다.

### 1) 준비 (로컬 환경변수)

로컬에서만 사용하세요(절대 커밋 금지).

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (선택, 기본값: `http://localhost:8787/oauth2callback`)

그리고 Google Cloud Console의 OAuth Client 설정에서 **Authorized redirect URIs**에 아래를 추가해야 합니다.

- `http://localhost:8787/oauth2callback`

> 참고: 첫 실행 시 스크립트가 로컬에 임시 콜백 서버(8787)를 띄워서 인증 코드를 자동으로 받습니다.

### 2) 실행

내 드라이브 전체(root)에서 생성:

```powershell
npm run kb:index -- --folderId root
```

특정 폴더에서만 생성:

```powershell
npm run kb:index -- --folderId <FOLDER_ID>
```

출력 위치:
- `knowledge/drive/<timestamp>/index.md` (전체 인덱스)
- 그 아래에 파일별 `.md`

### 폴더 ID 얻는 법

Drive에서 폴더 우클릭 → 링크 복사 → URL이 이런 형태입니다.

- `https://drive.google.com/drive/folders/<FOLDER_ID>`

### 2) 프로젝트 연결(link)

```powershell
vercel link
```

### 3) 배포

- 프리뷰 배포(테스트용 URL)

```powershell
vercel
```

- 프로덕션 배포(실서비스 URL)

```powershell
vercel --prod
```

### (선택) 배포 전 빌드 확인

```powershell
npm run build
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
