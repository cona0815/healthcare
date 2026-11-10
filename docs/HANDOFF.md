# 接手狀態與程式地圖

匯出日期：2026-11-10。本地基底 commit 是 `bb2c399`（運動整合與獎勵），其後未提交修改全部納入本次匯出。不要用 git checkout 覆蓋成舊版本。來源遠端為 https://github.com/cona0815/healthcare.git；正式站 https://healthcona.netlify.app/。壓縮檔沒有 Git 憑證或 .git。

## 本機已完成、尚未發布

- 完整手機視覺整理：統一間距、字型、卡片、表單、五個底部導覽；320／390／430 px 曾以本機預覽檢查。
- 五種外觀：森林日常、多彩日常、小島日常、甜心日常（奶油粉）、星際科技（深藍冰藍）。ThemePicker 支援並保留選擇。實際／示範使用不同外觀儲存鍵。
- GAS 未設定或空白時只存本機，定期本機備份可用，不顯示待雲端同步。既有待同步資料保留，並未因切換而刪除。
- 本機還原在 quota 錯誤時先釋放已變更欄位，再還原舊值，已加入容量錯誤回歸測試。
- 門診編輯改為相同 ID upsert，取消舊的先刪後存；失敗保留編輯表單。
- 健檢結果儲存失敗可重試同一結果，避免再次呼叫 AI；成功訊息不再假稱已傳 Google Sheets。
- 運動重試同步以已存版本為準；報告防重；食譜、門診等等待本機儲存完成後才更新畫面。
- GAS 連線驗證失敗不覆蓋舊設定，明確區分「連線驗證」與「資料同步完成」。

## 功能與關鍵檔案

| 範圍 | 位置與行為 |
| --- | --- |
| 主入口與導航 | App.tsx、index.tsx、types.ts |
| 外觀 | ThemePicker.tsx、themes.css、presentation.css、themeVariants.css；新增主題最後覆蓋既有樣式 |
| 飲食辨識 | FoodAnalyzer.tsx、AnalysisResultCard.tsx、services/geminiService.ts、foodGuidance.ts、foodLanguage.ts |
| 餐點管理 | MealManager.tsx、ManualFoodEntry.tsx、DuplicateMealDialog.tsx、foodRecords.ts、foodThumbnail.ts；編輯、刪除、復原、防重、綠黃紅時間點 |
| 第一餐倒數 | FastingCard.tsx、NutritionSettings.tsx、mealTimes.ts、nutritionGoals.ts；由早餐啟動、自訂時數、跨日與改餐需重新計算 |
| 健康分類 | HealthOverview.tsx、HealthManagement.tsx、TodayTasks.tsx、TaskBoard.tsx、CareTools.tsx |
| 健康打卡 | MedicationReminders.tsx；今日總覽是用藥提醒勾選，「設定提醒」需開提醒編輯器，不是智慧藥師 |
| 運動 | WorkoutPlanner.tsx、StrengthTraining.tsx、ManualWorkout.tsx、ExerciseHub.tsx；手動先行，組數／次數／重量、帶入上次、休息計時、每週課表、歷史趨勢 |
| 獎勵 | HealthRewards.tsx、healthRewards.ts；連續天數與 3/7/14/30/60/100 天里程碑，從實際紀錄計算 |
| 本機資料 | dbService.ts、storageMode.ts；localStorage 為記錄主儲存位置 |
| 備份 | DeviceBackup.tsx、LocalBackupScheduler.tsx、deviceBackup.ts、localSnapshots.ts；IndexedDB 快照，預設每週、可每天、保留最近 7 份 |
| 同步與衝突 | syncQueue.ts、CloudBackupVersions.tsx、GasSetup.tsx；持久化佇列、v3 驗證與衝突保留 |
| 伺服器與部署 | server.ts、netlify/functions/api.ts、netlify.toml、vite.config.ts |
| 測試 | tests/*.test.ts、gasHarness.ts；假 storage／假 GAS 試算表，不連使用者真實服務 |
| 圖片與模型 | public/brand、public/images/exercises、public/pose；完整 WASM／MediaPipe 模型已包含 |

表中的元件檔在 components/，服務檔在 services/。

健康助手分類為「飲食與營養」「運動與量測」「用藥與就醫」「快速記錄與待辦」。個人資料在設定；活動量與熱量目標整合到營養設定。當天有門診才在今日總覽顯示提醒。

## 資料保存注意事項

- 本機正式記錄多使用 hg_* 鍵，示範記錄多為 demo_v2_*，特定設定另有 demo 鍵。禁止用示範覆蓋正式資料。
- 純本機模式不會自動把既有資料全部上傳到新 GAS。切換、全量備份與還原遵循現有 UI／驗證流程，不能把「連線成功」當作「所有資料已同步」。
- 定期備份在應用程式執行中／重新開啟時檢查；瀏覽器關閉不會持續背景計時。瀏覽器資料被清除時 IndexedDB 備份也會消失，因此另存下載的備份檔仍必要。
- 本次匯出沒有瀏覽器健康紀錄、真實照片、金鑰或雲端連線設定。保留的 demoData.ts 是虛構測試資料。
- 部分舊人物模式相關程式和素材仍留在原始碼，功能已取消。

## 驗證與已知限制

本次匯出重新執行 113 項測試、App 入口型別檢查、正式建置、離線 app shell 腳本，均通過。沒有對使用者真實 GAS 或真正 iPhone 做遠端實測；不可宣稱這些已驗證。

- package.json 的 Node 18.x、.nvmrc／Netlify 的 20 與本機驗證 24.14.1 不一致，需要後續統一版本及 CI。
- 主 bundle 約 865 kB，建置有大於 500 kB 警告；可後續按功能分割載入。
- 自動化包含備份 quota 錯誤回復，但不能承諾裝置突然斷電或瀏覽器永久拒寫時絕對不失資料。
- 原始 README 有舊內容，已移到 docs/README-original.md；不要依舊敘述恢復未設定 GAS 也排同步的行為。
- 如果公開部署改成共用伺服器 Gemini 金鑰，目前代理沒有使用者驗證／用量限制；請先評估配額控制，勿在前端硬寫金鑰。

## 曾建議但尚未實作

1. 運動紀錄編輯與回收桶。
2. 獎勵保留當時的目標快照；目前更改個人目標可能重新計算過去達標結果。
3. 還原備份前顯示資料差異預覽。

以上是待討論項目，不代表使用者已要求在此次交接自行加入。
