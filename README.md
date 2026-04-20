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
