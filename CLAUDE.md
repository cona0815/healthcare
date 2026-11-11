# Claude 專案工作規則

請先讀 README.md 和 docs/HANDOFF.md。這個專案是「健康日常」，繁體中文、手機優先的 React + TypeScript + Vite 網頁應用。使用者要在這份本機最新版繼續開發。

## 重要約束

1. 不要自動部署、推送或修改正式 GAS／Google 試算表；除非使用者明確要求更新網站或雲端。這份交接不代表發布授權。
2. 保留現有使用者資料及未提交修改。變更資料結構要相容舊資料；測試使用 demo 或隔離 fixtures，不能清空真實 localStorage、IndexedDB 或雲端資料。
3. 沒有 GAS URL 必須是本機模式；不可出現待同步或虛假的雲端成功訊息。GAS 成功必須驗證回應，錯誤保留待同步紀錄。
4. 備份還原不得留下部分覆蓋資料；維持驗證、容量錯誤回復及衝突保留行為。不要移除餐點穩定 ID、revision、tombstone 或防重機制。
5. 人物／寵物模式已被使用者取消。舊程式檔與素材留存不代表可以重新啟用。
6. GAS 雲端同步是進階選用功能，只放在設定頁最下方預設收合的「進階」區；其他畫面不要再把 GAS 當成必要設定。手機介面緊湊，底部五個導覽要持續可見；不要再堆過大的卡片。儲存、備份與同步狀態只出現在設定。保留五種外觀，不要只留下前三種。
7. 輕斷食以當日最早的「早餐」紀錄開始計時，支援自訂進食／空腹時數；未記早餐先等待，不用午餐晚餐偷啟動。編輯或刪除早餐要重新計算。倒數顯示時、分、秒。
8. 飲食控制獎勵條件已確認為「三餐完整＋熱量在個人目標 ±10%」。運動至少 30 分鐘。不能獎勵不吃飯或把缺資料當成功。
9. 不要從照片推斷疾病或直接宣稱診斷。以測量與記錄為依據，用一般健康管理語句。保留現有必要的就醫提示。
10. 不要讀出、寫死或上傳使用者 API 金鑰；不要在日誌記錄個人健康內容。`.env.example` 只有空值。
11. 資安（2026-11-11 稽核後）：伺服器代理只用使用者自己的金鑰，不可加回伺服器金鑰備援或 /api/debug；轉給 Gemini 的 config 一律經 proxyGuard.ts 白名單（擋 httpOptions，防 SSRF），錯誤只回 Google 的說明文字；伺服器打包輸出到 server-dist/，不可放回 dist（會被公開下載）；CORS 只允許本站與本機；netlify.toml 有強制 CSP，新增外部連線、字型或嵌入前要先改 CSP 並實測；GAS v4 起存取密碼必填（沒執行 setupAccessToken 前拒絕所有讀寫），網站儲存 GAS 前會用錯誤密碼探測、確認真的有保護才讓存；GAS 只允許 8 種資料表，改 GAS_CODE 後要重新產生 gas/Code.gs；不可用 dangerouslySetInnerHTML 或原生 alert 顯示結果。

## 開發與驗證

安裝 `npm ci`，開發 `npm run dev`。從 `/?demo=1` 或 `/preview-mobile.html?demo=1` 驗證；使用 320、390、430 px 手機寬度，檢查五種主題、表單、對話框、底部導覽。

修改資料、同步、餐點、備份、計時邏輯後需執行相關測試及 `npm test`。發布前執行型別檢查（README 有完整指令）、`npm run build`、`node scripts/check-offline.mjs`。有 Git 時再跑 `git diff --check`。

目前沒有 tsconfig.json，請不要直接把 `npx tsc --noEmit` 當成已完成型別檢查。本次驗證基準 138 項測試（2026-11-11 起含 GAS 必填密碼、主畫面教學、代理白名單等測試）。

`server.ts` 是 Express + Gemini API 代理，開發時掛 Vite middleware。 代理會原樣轉送 Google 的狀態碼（400 金鑰錯、404 模型停用、429 額度用完），並提供 `/api/gemini/models` 查目前可用模型；前端呼叫 Gemini 一律走 `services/aiSettings.ts` 的 `runWithModelFallback`，不可寫死單一模型名稱。`netlify/functions/api.ts` 是 serverless 包裝；不能僅把靜態頁搬走就期待 AI API 正常。環境版本宣告不一致，詳見 README。

root 的 fix-*.js、replace.js、ultimate-fix.js、test-api*.js 等屬舊診斷／一次性腳本，保留作完整交接，不是安裝步驟，不要批次執行。標準自動測試在 tests/。
