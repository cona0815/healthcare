/**
 * HealthGuardian Backend v4.0 (Verified snapshots, conflict safety, required access token, strict delete)
 * 第一次使用：在編輯器上方函式選單選 setupAccessToken 按「執行」，把執行記錄裡的密碼貼到網站設定。
 * 沒有設定存取密碼前，這個 GAS 會拒絕所有讀寫，避免網址外流時資料被看光。
 * - Profile 追加模式
 * - 智慧讀取：跳過空白行，讀取最後一筆有效資料
 * - 支援 LockService 防止衝突
 */

function doPost(e) {
  try {
    var para;
    try {
      para = JSON.parse(e.postData.contents);
    } catch(e) {
      return createJSONOutput({status: "error", message: "Invalid JSON format"});
    }
    var denied = accessDenied(para);
    if (denied) return createJSONOutput(denied);
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = para.action;
    
    if(action === 'list_backups_v3') return createJSONOutput({status:'success',protocol:3,backups:readSheet(ss,'BackupIndexV3')});
    if(action === 'read_backup_v3') return createJSONOutput({status:'success',protocol:3,backup:readBlob(ss,para.backupId)});
    // Read Action
    if (action == 'read_all') {
      return createJSONOutput({
        protocol: 3,
        foodLogs: readMeals(ss),
        reports: readSheet(ss, 'Reports'),
        workouts: readSheet(ss, 'Workouts'),
        profile: readProfile(ss),
        appointments: readSheet(ss, 'Appointments'),
        recipes: readSheet(ss, 'Recipes'),
        workoutPlan: readSheet(ss, 'WorkoutPlan'),
        vitals: readSheet(ss, 'Vitals')
      });
    }
    
    // 寫入與刪除操作需要鎖定以防衝突
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000); 
    } catch (err) {
      return createJSONOutput({status: "error", message: "Server is busy, please try again."});
    }

    try {
      // Save Action
      if (action == 'save') {
        if (!ALLOWED_TYPES[para.type]) return createJSONOutput({status: "error", message: "資料類型錯誤"});
        var sheet = getOrCreateSheet(ss, para.type);
        var data = para.data;
        
        // Meals: retain stable ID, ignore older retries, preserve deletion tombstones.
        if (para.type === 'FoodLogs') return createJSONOutput({status:'error',message:'請更新網站以使用安全餐點同步 v3。'});
        // Profile: 追加模式 (Append Mode)
        if (para.type === 'Profile') {
           if (sheet.getLastRow() === 0) {
               var initialHeaders = safeHeaderKeys(Object.keys(data));
               sheet.appendRow(initialHeaders);
           }
           updateHeaders(sheet, data);
           
           // 直接追加新資料
           appendData(sheet, data);
           return createJSONOutput({status: "success", type: "Profile Appended"});
        }
        
        // WorkoutPlan: 覆寫模式
        if (para.type === 'WorkoutPlan') {
           var lastRow = sheet.getLastRow();
           if (lastRow > 1) {
             sheet.deleteRows(2, lastRow - 1);
           }
        }
        // 其他資料: 依 ID 更新 (刪除舊的)
        else if (data.id) {
           deleteById(sheet, data.id);
        }
    
        appendData(sheet, data);
        return createJSONOutput({status: "success"});
      }

      // Old destructive backups are deliberately disabled.
      if (action === 'backup_all') return createJSONOutput({status:'error',message:'請更新網站，使用保留歷史版本的完整備份。'});
      if (action === 'backup_snapshot_v3') {
        var backup = para.data;
        if (!backup || backup.format !== 'healthguardian-device' || backup.version !== 1 || !backup.data) throw new Error('備份格式錯誤');
        var result = writeBlob(ss, backup, 'Backup_');
        appendData(getOrCreateSheet(ss,'BackupIndexV3'),{id:result.id,createdAt:backup.createdAt,digest:result.digest});
        SpreadsheetApp.flush();
        if(!readSheet(ss,'BackupIndexV3').some(function(r){return r.id===result.id&&r.digest===result.digest;}))throw new Error('備份索引尚未確認');
        return createJSONOutput({status:'success',protocol:3,backupId:result.id,digest:result.digest});
      }
      if (action === 'save_meal_v3') {
        var meal=para.data, id=String(meal.id||meal.timestamp);
        if(!id || !para.operationId || !Number.isInteger(para.baseRevision) || !Number.isInteger(meal.revision) || meal.revision<=para.baseRevision || !meal.foodName || !Number.isFinite(Date.parse(meal.timestamp))) throw new Error('餐點同步格式錯誤，請更新網站');
        var current=readMeals(ss).filter(function(m){return String(m.id||m.timestamp)===id;})[0];
        if(current && current.operationId===para.operationId) return createJSONOutput({status:'success',protocol:3,operationId:para.operationId});
        if(Number(current ? current.revision||1 : 0)!==para.baseRevision) return createJSONOutput({status:'conflict',message:'另一台裝置已變更此餐點，尚未同步。請至同步中心處理衝突。',current:current||null});
        var saved=Object.assign({},meal,{id:id,operationId:para.operationId});
        // Write and verify a new immutable blob before appending a commit reference.
        var blob=writeBlob(ss,saved,'Meal_');
        appendData(getOrCreateSheet(ss,'MealVersionsV3'),{id:id,revision:saved.revision,blobId:blob.id,operationId:para.operationId});
        SpreadsheetApp.flush();
        if(!readMeals(ss).some(function(r){return r.id===id&&r.operationId===para.operationId;}))throw new Error('餐點儲存尚未確認');
        return createJSONOutput({status:'success',protocol:3,operationId:para.operationId});
      }

      // Delete Action
      if (action == 'delete') {
        if (!ALLOWED_TYPES[para.type]) return createJSONOutput({status: "error", message: "資料類型錯誤"});
        var sheet = ss.getSheetByName(para.type);
        if (sheet) {
          deleteById(sheet, para.id);
        }
        return createJSONOutput({status: "deleted"});
      }

      return createJSONOutput({status: "error", message: "Unknown action"});
    } finally {
      lock.releaseLock();
    }

  } catch (error) {
    return createJSONOutput({status: "error", message: error.toString()});
  }
}

// --- Helper Functions ---
function digestText(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');
}
function writeBlob(ss,value,prefix) {
  var text=JSON.stringify(value), digest=digestText(text), id=prefix+Utilities.getUuid();
  var sheet=ss.insertSheet(id), chunks=[];
  for(var i=0;i<text.length;i+=20000)chunks.push([String(i/20000),"'"+text.slice(i,i+20000)]);
  // Only resize the newly created version sheet; existing records are never cleared.
  if(sheet.getMaxRows&&sheet.getMaxRows()>chunks.length+1)sheet.deleteRows(chunks.length+2,sheet.getMaxRows()-chunks.length-1);
  if(sheet.getMaxColumns&&sheet.getMaxColumns()>2)sheet.deleteColumns(3,sheet.getMaxColumns()-2);
  sheet.getRange(1,1,chunks.length,2).setValues(chunks);
  SpreadsheetApp.flush();
  var copied=sheet.getRange(1,2,chunks.length,1).getValues().map(function(r){return String(r[0]);}).join('');
  if(digestText(copied)!==digest)throw new Error('備份驗證失敗，原資料與舊備份均保留');
  sheet.getRange(chunks.length+1,1,1,2).setValues([['COMMITTED',digest]]);
  SpreadsheetApp.flush();
  readBlob(ss,id);
  return {id:id,digest:digest};
}
function readBlob(ss,id) {
  if(!/^(Backup_|Meal_)[a-zA-Z0-9-]+$/.test(String(id)))throw new Error('版本識別碼錯誤');
  var sheet=ss.getSheetByName(id);if(!sheet)throw new Error('找不到備份版本');
  var rows=sheet.getDataRange().getValues(), end=rows.pop();
  if(!end||end[0]!=='COMMITTED')throw new Error('備份尚未完整寫入');
  var text=rows.map(function(r,i){if(Number(r[0])!==i)throw new Error('備份區塊不完整');return String(r[1]);}).join('');
  if(digestText(text)!==end[1])throw new Error('備份校驗失敗');
  return JSON.parse(text);
}
function readMeals(ss) {
  var map={};
  readSheet(ss,'FoodLogs').forEach(function(m){var id=String(m.id||m.timestamp);if(!map[id]||Number(m.revision||1)>Number(map[id].revision||1))map[id]=m;});
  readSheet(ss,'MealVersionsV3').forEach(function(ref){var m=readBlob(ss,ref.blobId);map[String(m.id)]=m;});
  return Object.keys(map).map(function(id){return map[id];});
}



function createJSONOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Security (v4.0) ---
// 只允許本系統會用到的資料表，避免被拿來建立或刪除任意分頁。
var ALLOWED_TYPES = {Profile:1, FoodLogs:1, Workouts:1, Appointments:1, Recipes:1, Vitals:1, Reports:1, WorkoutPlan:1};
// 欄位名稱若以 = + - @ 開頭會被試算表當成公式，直接略過。
function safeHeaderKeys(keys) {
  return keys.filter(function(k){ return typeof k === 'string' && k.length > 0 && k.length <= 64 && '=+-@'.indexOf(k.charAt(0)) === -1 && k.charCodeAt(0) > 32; });
}
// 必填的存取密碼：在編輯器執行一次 setupAccessToken，把執行記錄裡的密碼填到網站的「存取密碼」。
// 沒設定密碼時一律拒絕；再執行一次會換新密碼，舊密碼立即失效（懷疑外流時使用）。
function setupAccessToken() {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('HG_TOKEN', token);
  Logger.log('健康日常 GAS 存取密碼（請複製到 App 設定）：' + token);
  return token;
}
function clearAccessToken() {
  PropertiesService.getScriptProperties().deleteProperty('HG_TOKEN');
  Logger.log('已移除存取密碼：在重新執行 setupAccessToken 之前，所有讀寫都會被拒絕。');
}
// 逐字比對完整長度，不因前面字元不同就提早結束。
function sameToken(given, expected) {
  if (given.length !== expected.length) return false;
  var diff = 0;
  for (var i = 0; i < expected.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
function accessDenied(para) {
  var expected = PropertiesService.getScriptProperties().getProperty('HG_TOKEN');
  if (!expected || expected.length < 32) {
    return {status: "error", code: "TOKEN_NOT_SET", message: "這個 GAS 還沒設定存取密碼：請在 Apps Script 編輯器執行 setupAccessToken，再把執行記錄裡的密碼貼到網站設定。"};
  }
  var given = String((para && para.token) || '');
  if (!sameToken(given, expected)) {
    return {status: "error", code: "UNAUTHORIZED", message: "GAS 存取密碼不正確，請到網站設定的「GAS 雲端同步」重新貼上存取密碼。"};
  }
  return null;
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function getHeaders(sheet) {
  if (sheet.getLastColumn() < 1 || sheet.getLastRow() < 1) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function updateHeaders(sheet, data) {
  var headers = getHeaders(sheet);
  var keys = safeHeaderKeys(Object.keys(data));
  var newHeaders = headers.slice();
  var headerChanged = false;
  
  keys.forEach(function(k) {
    if (headers.indexOf(k) === -1) {
      newHeaders.push(k);
      headerChanged = true;
    }
  });
  
  if (headerChanged) {
    if (sheet.getLastRow() == 0) {
       sheet.appendRow(newHeaders);
    } else {
       sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    }
  }
  return newHeaders;
}

function appendData(sheet, data) {
  var headers = updateHeaders(sheet, data);
  var newRow = [];
  headers.forEach(function(h) {
    var val = data[h];
    if (val && (typeof val === 'object' || Array.isArray(val))) {
      val = JSON.stringify(val);
    }
    if (val === undefined || val === null) {
      val = '';
    }
    // 強制轉字串避免 Google Sheet 科學記號問題
    newRow.push("'" + val); 
  });
  sheet.appendRow(newRow);
}

function deleteMealRows(sheet, id) {
  var rows=sheet.getDataRange().getValues();
  if(rows.length<2)return;
  var idIndex=rows[0].indexOf('id'), timeIndex=rows[0].indexOf('timestamp');
  for(var i=rows.length-1;i>=1;i--){
    var key=idIndex>=0?rows[i][idIndex]:'';
    if(!key && timeIndex>=0)key=rows[i][timeIndex];
    key=String(key || '').replace(/^'/,'');
    if(key===String(id))sheet.deleteRow(i+1);
  }
}

function deleteById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  var headers = data[0];
  var idIdx = headers.indexOf('id');
  var target = String(id == null ? '' : id).replace(/^'/,'');
  if (!target) return;
  if (idIdx > -1) {
    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idIdx]).replace(/^'/,'') === target) {
        sheet.deleteRow(i + 1);
        return; 
      }
    }
  }
}

function readSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  
  var headers = rows[0];
  var result = [];
  
  for (var i = 1; i < rows.length; i++) {
    var obj = {};
    var row = rows[i];
    var hasData = false;
    
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (typeof val === 'string' && val.startsWith("'")) {
        val = val.substring(1);
      }
      try {
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
             var parsed = JSON.parse(val);
             obj[headers[j]] = parsed;
        } else {
             obj[headers[j]] = val;
        }
      } catch(e) {
        obj[headers[j]] = val;
      }
      if (val !== '') hasData = true;
    }
    if (hasData) result.push(obj);
  }
  return result;
}

function readProfile(ss) {
  var list = readSheet(ss, 'Profile');
  if (list.length === 0) return {};

  // 改進：從最後一筆往回找，找到第一筆有 'name' 的有效資料
  // 這樣可以避免讀取到只有 timestamp 或空白的無效行
  for (var i = list.length - 1; i >= 0; i--) {
    var p = list[i];
    if (p.name && p.name.toString().trim() !== "") {
      return p;
    }
  }
  
  // 如果都沒找到名字，回傳最後一筆 (fallback)
  return list[list.length - 1];
}