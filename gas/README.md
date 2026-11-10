# Google Apps Script 後端

`Code.gs` 是從這次匯出的 `components/GasSetup.tsx` 的 `GAS_CODE` 實際值產生，版本標示 v3.0，包含完整備份與餐點衝突安全協定。

若原本已有試算表與 GAS：

1. 先在原 App 下載本機資料備份，並另存 Google 試算表副本。
2. 從原試算表「擴充功能 → Apps Script」開啟原專案。確認是原本連線的專案，保留其他自訂檔案。
3. 備存原後端程式，將原健康日常後端檔案內容更新成 Code.gs。不要把新舊 doPost／同名函式並列，以免互相覆蓋。不要刪除任何試算表分頁或清除資料。
4. 儲存後在「部署 → 管理部署」編輯原網頁應用程式部署，選新版本再部署，保留原執行身分與存取範圍設定。選項文字可能隨 Google UI 改變。
5. 沿用原部署網址，回到 App 設定測試連線，確認同步結果。若改網址須確認確實指向原資料，再處理原本待同步佇列。

本說明只供使用者操作，匯出過程未連線、未更新 GAS、未碰原試算表。

若 Claude 後續修改 GAS_CODE，請重新產生此 Code.gs，不要讓兩份程式不一致。可在專案根目錄執行：

```sh
node --import tsx --input-type=module -e "import {GAS_CODE} from './components/GasSetup.tsx'; import fs from 'node:fs'; fs.writeFileSync('gas/Code.gs', GAS_CODE, 'utf8');"
```

## v3.1 資安更新（2026-11-11）

- 只允許 8 種資料表（Profile、FoodLogs、Workouts、Appointments、Recipes、Vitals、Reports、WorkoutPlan）寫入或刪除。
- 欄位名稱以 = + - @ 開頭時直接略過，避免試算表公式注入。
- 選用的存取密碼：更新程式並重新部署後，在 Apps Script 編輯器選 `setupAccessToken` 執行，到「執行記錄」複製密碼，貼到 App 設定「GAS 雲端同步」的「存取密碼」欄位並儲存。每台裝置都要填。之後沒有密碼的請求一律拒絕。執行 `clearAccessToken` 可取消。
- 沒有設定密碼時行為和 v3.0 相同，所以舊部署不會因為網站更新而壞掉。
- 重新部署請用「部署 → 管理部署作業 → 編輯 → 版本：新版本」，網址才不會改變。
