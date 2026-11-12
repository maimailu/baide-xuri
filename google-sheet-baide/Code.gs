/**
 * ============================================================
 *  柏德序日官網「預約賞屋」表單 → Google 試算表
 * ============================================================
 *
 *  【這份程式要貼在哪裡】（不是貼在網站裡！）
 *   1. 新建一份 Google 試算表，取名例如「柏德序日官網預約」
 *   2. 上方選單：擴充功能 → Apps Script
 *   3. 把編輯器裡原本的程式碼全部刪掉
 *   4. 把這個檔案「從第一行到最後一行」全部複製，貼進去，按存檔（磁碟片圖示）
 *   5. 右上角：部署 → 新增部署作業 → 類型選「網頁應用程式」
 *        執行身分：我
 *        誰可以存取：任何人
 *      按「部署」並授權
 *   6. 複製畫面上以 /exec 結尾的網址
 *
 *  【網址要貼回哪裡】
 *   網站資料夾 baide-xuri/app.js，找到這一行：
 *        const googleScriptUrl = "";
 *   把網址貼在引號中間。留空的話，表單只寄信，不寫入試算表。
 *
 *  【以後改過這份程式】要重新部署：
 *   部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選「新版本」→ 部署（網址不會變）
 *
 *  【資料表怎麼分】一年一個分頁，分頁名稱是年份（台北時間），例如「2026」，跨年自動新增。
 *  【欄位】送出時間／姓名／性別／聯絡電話／電子信箱／縣市／鄉鎮市區／個資聲明／處理狀態／備註
 *        （網站有改欄位時，改下面 HEADERS 與 doPost 裡 appendRow 那一段，兩邊順序要一致）
 */

// ---------- 可自行調整的設定 ----------
function sheetName_() {
  return Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy');
}
var HEADERS = ['送出時間', '姓名', '性別', '聯絡電話', '電子信箱', '縣市', '鄉鎮市區', '個資聲明', '處理狀態', '備註'];
var LIMITS = { name: 60, gender: 10, phone: 30, email: 120, city: 20, town: 20 };

// ---------- 主程式：網站表單送出時會呼叫這裡，把資料新增成試算表的一列 ----------
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    var name = clean_(data.name, LIMITS.name);
    var phone = clean_(data.phone, LIMITS.phone);
    if (!name || !phone) { // 姓名、電話為必填
      return json_({ ok: false, error: 'invalid' });
    }

    var sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      name,
      clean_(data.gender, LIMITS.gender),
      phone,
      clean_(data.email, LIMITS.email),
      clean_(data.city, LIMITS.city),
      clean_(data.town, LIMITS.town),
      data.privacyConsent ? '本人已悉知' : '未勾選',
      '未處理',
      ''
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// ---------- 測試用：用瀏覽器直接開 /exec 網址，看到 form endpoint ready 代表部署成功 ----------
function doGet() {
  return json_({ ok: true, message: 'form endpoint ready' });
}

// ---------- 取得「今年」的分頁；沒有就自動建立（含表頭、凍結第一列、處理狀態下拉選單）----------
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = sheetName_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name, 0); // 新分頁放在最左邊，最新一年排最前面
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#eeeeee');
    sheet.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm');
    sheet.getRange('D:D').setNumberFormat('@'); // 電話欄用文字格式，避免開頭的 0 被吃掉
    sheet.setColumnWidths(1, 1, 130);
    // 「處理狀態」下拉選單（第 9 欄 = I）
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['未處理', '處理中', '已回覆'], true).build();
    sheet.getRange('I2:I').setDataValidation(rule);
  }
  return sheet;
}

// 去頭尾空白、限制長度，並避免以 = + - @ 開頭被試算表當成公式
function clean_(v, max) {
  var s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
