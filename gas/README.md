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
