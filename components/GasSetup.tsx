import React, { useState } from 'react';
import { Database, Link, AlertCircle, Loader2, ArrowRight, HelpCircle, ChevronDown, ChevronUp, User, Code, Copy, Check } from 'lucide-react';
import { dbService, setGasUrl } from '../services/dbService';

interface Props {
  onConnect: () => void;
}

// Export the GAS Code so it can be used in HealthManagement too
export const GAS_CODE = `/**
 * HealthGuardian Backend v3.0 (Verified snapshots and conflict safety)
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
        var sheet = getOrCreateSheet(ss, para.type);
        var data = para.data;
        
        // Meals: retain stable ID, ignore older retries, preserve deletion tombstones.
        if (para.type === 'FoodLogs') return createJSONOutput({status:'error',message:'請更新網站以使用安全餐點同步 v3。'});
        // Profile: 追加模式 (Append Mode)
        if (para.type === 'Profile') {
           if (sheet.getLastRow() === 0) {
               var initialHeaders = Object.keys(data);
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
  var keys = Object.keys(data);
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
  
  if (idIdx > -1) {
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][idIdx] == id) {
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
}`;

const GasSetup: React.FC<Props> = ({ onConnect }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(GAS_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert("程式碼已複製！請確保清空 GAS 編輯器後再貼上。");
  };

  const handleConnect = async () => {
    setError(null);
    const cleanUrl = url.trim();
    // const cleanName = name.trim(); // 這裡不再強制需要名字，因為我們不寫入

    if (!cleanUrl) {
        setError("請輸入 Google Apps Script 網址");
        return;
    }

    if (!cleanUrl.includes('script.google.com')) {
        setError("這看起來不像是 Google Apps Script 網址 (應該包含 script.google.com)");
        return;
    }

    setLoading(true);
    try {
      const isConnected = await dbService.testConnection(cleanUrl);
      if (isConnected) {
        setGasUrl(cleanUrl);
        // 修正：連線時不再自動儲存 Profile，避免產生空白資料
        // 如果使用者是第一次使用，他們稍後可以在個人資料頁面儲存
        onConnect();
      } else {
        setError("驗證失敗：伺服器回傳內容不正確。請確認部署設定。");
      }
    } catch (err: any) {
      setError(err.message || "發生錯誤，請檢查網路連線或網址。");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans">
      {/* Sidebar / Info Panel */}
      <div className="md:w-1/3 bg-gray-50 p-8 border-r border-gray-100 flex flex-col justify-between">
         <div>
            <div className="flex items-center gap-2 mb-6">
                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                    <Database className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">資料庫設定</h1>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
               HealthGuardian 使用 Google Sheets 作為您的私人資料庫。這確保了資料完全由您掌控，且完全免費。
            </p>
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" /> 為什麼需要這個？
                </h3>
                <ul className="text-xs text-blue-700 space-y-1.5 list-disc pl-4">
                    <li>您的健康資料只會存在您的 Google Drive</li>
                    <li>APP 重新整理後資料不會消失</li>
                    <li>可以隨時在 Excel/Sheets 中查看或備份</li>
                </ul>
            </div>
         </div>
         <div className="hidden md:block text-xs text-gray-400 mt-8">
            Privacy First Architecture
         </div>
      </div>

      {/* Main Form */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto">
         <div className="max-w-xl mx-auto space-y-8">
            
            {/* Step 1: User Info (Optional now) */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    您的基本資料
                </h2>
                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">您的稱呼 (選填)</label>
                   <div className="relative">
                       <User className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                       <input 
                         type="text" 
                         value={name}
                         onChange={(e) => setName(e.target.value)}
                         placeholder="例如: Alex"
                         className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                       />
                   </div>
                   <p className="text-[10px] text-gray-400 mt-1 pl-1">您稍後可以在「健康管理」頁面完整設定</p>
                </div>
            </div>

            {/* Step 2: GAS Setup */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    連結 Google Sheets
                </h2>
                
                {/* Accordion for GAS Code */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <button 
                        onClick={() => setShowHelp(!showHelp)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <span className="font-medium text-gray-700 text-sm flex items-center gap-2">
                           <Code className="w-4 h-4" /> 如何建立 API 網址？(首次使用者請點此)
                        </span>
                        {showHelp ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </button>
                    
                    {showHelp && (
                        <div className="p-4 bg-white text-sm text-gray-600 space-y-4">
                            <ol className="list-decimal pl-5 space-y-2">
                                <li>
                                    <a href="https://script.google.com/home/start" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold flex items-center gap-1 inline-flex">
                                        建立新的 Google Apps Script 專案 <ArrowRight className="w-3 h-3" />
                                    </a>
                                </li>
                                <li>
                                    複製下方的程式碼，並<strong>完全覆蓋</strong>編輯器中的內容 (刪除原本的 myFunction)。
                                    <div className="mt-2 relative">
                                        <button 
                                            onClick={copyCode}
                                            className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-700 transition-colors"
                                        >
                                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            {copied ? "已複製" : "複製程式碼"}
                                        </button>
                                        <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto text-xs font-mono border border-gray-200 h-32">
                                            {GAS_CODE}
                                        </pre>
                                        <button 
                                            onClick={() => setShowCode(!showCode)} 
                                            className="text-xs text-blue-500 mt-1 hover:underline"
                                        >
                                            {showCode ? "隱藏完整程式碼" : "展開查看完整程式碼"}
                                        </button>
                                        {showCode && (
                                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                                <div className="bg-white rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
                                                    <div className="p-4 border-b flex justify-between items-center">
                                                        <h3 className="font-bold">完整 Apps Script 程式碼</h3>
                                                        <button onClick={() => setShowCode(false)} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
                                                    </div>
                                                    <div className="flex-1 overflow-auto p-4">
                                                        <pre className="text-xs font-mono whitespace-pre-wrap">{GAS_CODE}</pre>
                                                    </div>
                                                    <div className="p-4 border-t flex justify-end">
                                                        <button onClick={copyCode} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 複製
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </li>
                                <li>點擊右上角的「部署」 (Deploy) {'>'} 「新增部署」 (New deployment)。</li>
                                <li>點擊齒輪圖示 {'>'} 選擇「網頁應用程式」 (Web app)。</li>
                                <li>
                                    <span className="text-red-600 font-bold">關鍵步驟：</span>
                                    <ul className="list-disc pl-5 mt-1 text-gray-500">
                                        <li>執行身分 (Execute as): <strong>我 (Me)</strong></li>
                                        <li>誰可以存取 (Who has access): <strong>任何人 (Anyone)</strong></li>
                                    </ul>
                                </li>
                                <li>點擊「部署」，授權存取，然後複製產生的「網頁應用程式網址」 (Web app URL)。</li>
                            </ol>
                        </div>
                    )}
                </div>

                <div>
                   <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Web App URL</label>
                   <div className="relative">
                       <Link className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                       <input 
                         type="text" 
                         value={url}
                         onChange={(e) => setUrl(e.target.value)}
                         placeholder="https://script.google.com/macros/s/..."
                         className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                       />
                   </div>
                   <p className="text-xs text-gray-400 mt-1 pl-1">請貼上部署後取得的網址</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <button 
                onClick={handleConnect}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-200 active:scale-95 disabled:opacity-70 disabled:scale-100"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {loading ? "正在連線資料庫..." : "驗證並連線"}
            </button>
         </div>
      </div>
    </div>
  );
};

export default GasSetup;