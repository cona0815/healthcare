<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/494bda51-c65b-4fbb-9f83-89047a5bbc66

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backup validation

## Local feature preview

Open `http://localhost:3000/?demo=1` after `npm run dev` to try the demo without credentials. Demo records use isolated `demo_v2_` browser storage keys; no AI or cloud requests are made. The demo supports medication checkoffs, manual measurements, walking records, sample appointments, and 7/30-day trends. Reset restores fictional sample data only.

The regular dashboard now includes today's medication, measurement, exercise and appointment tasks plus trends for blood pressure, fasting glucose and weight. Missing readings remain gaps; daily readings are averaged and post-meal glucose is excluded from fasting trends.

## Backup validation

Run `npm test` for the cloud-backup regression tests and `npm run build` for the production build.

Backups require the Apps Script code supplied in System Settings with `backup_all` support. A backup is marked successful only after the server confirms the full operation. Network errors, outdated deployments, and failed responses preserve the previous successful-backup time; no partial fallback is reported as a full backup. Initial loading must finish before the automatic backup starts. Cloud restore failures are propagated to Settings so they cannot display a success message.

## 健康工具（手機與桌面）

- 首頁「今日待辦」：服藥與回診可勾選；量測／運動依實際紀錄顯示完成。
- 「趨勢」：7／30 天血壓、空腹血糖與體重；展開完成率可查看每日缺漏。
- 「健康工具」：症狀日記、當日飲食與用藥對照、藥品庫存、常用飲食／運動範本、日期區間看診 PDF、同步中心。
- 藥品庫存是使用者管理的剩餘數量，可手動扣除一天用量或編輯補藥；提醒顯示於應用程式內，未提供背景推播。
- PDF 在瀏覽器本機產生，中文以影像嵌入，支援 A4 多頁；文字不可選取。
- `/?demo=1` 使用完整介面與隔離的 `demo_v2_` 本機資料，不使用正式金鑰或同步。
- 首次設定頁可選「本機手動紀錄」，不需要 Gemini 或 Sheets。AI 分析仍須連網與設定金鑰。
- 所有儲存／刪除使用持久化同步佇列；錯誤顯示於同步中心，重新連線或每 30 秒重試。系統設定可關閉自動同步。
- 未指定資料庫的變更須於設定 Sheets 後按「重試同步」；其他資料庫的待處理項目不會送往目前連線。這不是跨裝置衝突合併系統。
- 原本每週全量覆寫備份改為逐筆背景同步；手動全量備份仍保留，待同步未完成時會擋下。新設定 `hg_auto_sync` 控制自動同步。
- 離線重新開啟需使用 `npm run build` 的正式檔案（HTTPS 或 localhost），且至少成功載入一次以快取。Vite 開發模式不註冊 Service Worker。AI 與雲端請求不快取。
- 驗證：`npm test`、`npm run build`、`node scripts/check-offline.mjs`。手動驗證請使用示範資料，避免修改真實健康紀錄。

## 運動圖解與姿勢評分

六種運動提供專業線稿圖解、左右滑動的三階段教學、返回運動分類及獨立影片教學卡。影片分析限 30 秒／3 MB，需使用者確認後經本機代理傳送 Google Gemini。部分項目無法判讀時不顯示綜合百分制分數，上方集中顯示原因與補拍建議。文字報告只保存在目前瀏覽器，各運動與評分版本分開比較。

部署使用 netlify.toml；必要的伺服器金鑰應設定在部署平台環境變數，不會嵌入前端。測試影片、截圖、tmp 及本機環境設定不納入發佈。
