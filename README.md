# 健康日常 — Claude 完整接手專案

匯出日期：2026-11-10（Asia/Taipei）。這是目前本機工作目錄的完整原始碼快照，包含尚未發布的修改，並非只匯出上一個 Git commit。

## 先啟動

請在解壓後的 `healthcare` 資料夾開啟終端機：

```sh
npm ci
npm run dev
```

- 手機示範：<http://localhost:3000/preview-mobile.html?demo=1>
- 示範全頁：<http://localhost:3000/?demo=1>
- 正常入口：<http://localhost:3000/>
- 示範資料為虛構資料，不需要 GAS 或 AI 金鑰。
- 第一次安裝需要網路。`node_modules` 沒有打包，請依 `package-lock.json` 安裝。
- 目前匯出驗證環境：Node 24.14.1、npm 11.11.0。`.nvmrc` 與 Netlify 設定為 20，但 `package.json` 的 engines 還標 18.x；這是既有版本宣告不一致。匯出沒有擅自改版本，請 Claude 後續統一並跑完測試。npm 可能顯示 engines 警告。

若 3000 已被占用，PowerShell：

```powershell
$env:PORT = '3003'
npm run dev
```

此時網址改成 `http://localhost:3003/preview-mobile.html?demo=1`。

## 交給 Claude

先讀 `CLAUDE.md`，再讀 `docs/HANDOFF.md`。可直接貼上 `給Claude的接手指令.txt`。若使用能讀本機專案的 Claude 工具，開啟解壓後的 `healthcare` 資料夾。

## AI 與 GAS（選用）

- 不設定 GAS：資料只存在目前瀏覽器，仍可手動記錄與本機備份。
- AI 辨識需要 Gemini 金鑰及網路，可在應用程式設定輸入。也可複製 `.env.example` 為 `.env`，填 `GEMINI_API_KEY` 作為伺服器端金鑰；目前 `server.ts` 讀取 `.env`，不是原始舊 README 提到的 `.env.local`。
- GAS 完整程式在 `gas/Code.gs`；前端的權威來源是 `components/GasSetup.tsx` 的 `GAS_CODE`。
- 更新既有 GAS 請沿用原試算表、原 Apps Script 專案與部署，操作說明見 `gas/README.md`。
- 套件內沒有任何實際 API 金鑰、GAS 連線網址或部署憑證。

## 資料與驗證

專案原始碼不等於健康資料備份。健康資料在原瀏覽器的 localStorage 與 IndexedDB，換電腦、連接埠或網站不會自動帶過去。請先從原應用程式「設定」下載備份，確認檔案留存，再在新環境使用應用程式還原；不要直接覆蓋、清空舊資料。API 金鑰與 GAS 設定需要另行輸入。

```sh
npm test
npx tsc --noEmit --jsx react-jsx --moduleResolution bundler --module esnext --target es2022 --esModuleInterop --skipLibCheck App.tsx
npm run build
node scripts/check-offline.mjs
```

本次檢查：113/113 測試通過、型別檢查與建置通過、離線 app shell 檢查通過。建置仍有主要 JS bundle 超過 500 kB 的既有警告。

若要本機執行正式建置（PowerShell）：

```powershell
npm run build
Copy-Item -LiteralPath preview-mobile.html -Destination dist/preview-mobile.html
$env:NODE_ENV = 'production'
npm start
```

`npm run preview` 僅提供 Vite 靜態預覽，不包含 Express 的 AI API。要回到開發模式，先清除目前終端機的 `NODE_ENV` 再執行 `npm run dev`。

## 匯出內容

完整應用原始碼、相依套件 lock、所有 public 素材（含 MediaPipe 模型與 WASM）、測試、GAS、Netlify 設定、手機預覽及接手文件。保留舊人物模式的原始碼與素材供歷史參考，但人物模式已取消，不應重新啟用。

排除：可重新產生的 node_modules／dist、Git 資料庫、暫存截圖／影片／日誌、私人設定及歷史對話匯入檔。原始 README 保留於 `docs/README-original.md`，其中部分說明已過時，請以本文件與實際程式為準。

`EXPORT_MANIFEST.json` 記錄每個匯出檔案的 SHA-256；`docs/SOURCE_SNAPSHOT.json` 記錄來源版本、未提交修改及來源檔案雜湊。正式網站尚未更新。
