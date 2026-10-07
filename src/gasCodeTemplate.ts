/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const GAS_CODE_SNIPPET = `/**
 * 校園二手書交易平台 - Google Apps Script (Code.gs)
 * 將此代碼貼上到 Google 試算表 > 擴充功能 > Apps Script 中
 * 部署為「網頁應用程式 (Web App)」，存取權限設為「所有人 (Anyone)」
 */

// 1. 處理 GET 請求：回傳目前所有上架書籍
function doGet(e) {
  try {
    var sheet = getOrCreateBooksSheet();
    var data = sheet.getDataRange().getValues();
    var books = [];

    // 若試算表只有標題或沒有資料，回傳空陣列
    if (data && data.length > 1) {
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        if (!row || !row[0]) continue; // 跳過空行
        books.push({
          id: String(row[0] || i),
          title: String(row[1] || ''),
          price: Number(row[2] || 0),
          notes: String(row[3] || ''),
          meetupInfo: String(row[4] || ''),
          sellerContact: String(row[5] || ''),
          status: String(row[6] || 'available'),
          createdAt: String(row[7] || '')
        });
      }
    }

    // 按照時間倒序排序（最新在最前面）
    books.reverse();

    // 支援 JSONP (若前端帶有 callback 參數)
    if (e && e.parameter && e.parameter.callback) {
      return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(books) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(JSON.stringify(books))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // 即使發生異常也確保回傳 JSON，防止產生 Google HTML 錯誤頁面導致跨域 Failed to fetch
    var errorObj = {
      status: 'error',
      message: 'GAS 試算表執行錯誤: ' + (err.message || err.toString()),
      books: []
    };
    if (e && e.parameter && e.parameter.callback) {
      return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(errorObj) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(errorObj))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// 2. 處理 POST 請求：書籍上架 (list)、登記購買 (order) 或 刪除 (delete)
function doPost(e) {
  try {
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || 'list';

    if (action === 'list') {
      // 學長姊上架書籍
      var sheet = getOrCreateBooksSheet();
      var id = payload.id || ('B_' + new Date().getTime());
      var now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
      
      sheet.appendRow([
        id,
        payload.title || '',
        Number(payload.price || 0),
        payload.notes || '',
        payload.meetupInfo || '',
        payload.sellerContact || '',
        'available',
        now
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: '書籍上架成功',
        bookId: id
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'order') {
      // 學弟妹登記購買
      var orderSheet = getOrCreateOrdersSheet();
      var orderId = 'ORD_' + new Date().getTime();
      var orderTime = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

      orderSheet.appendRow([
        orderId,
        payload.bookId || '',
        payload.bookTitle || '',
        payload.buyerName || '',
        payload.buyerContact || '',
        payload.tradeTime || '',
        payload.note || '',
        orderTime
      ]);

      // 同時更新書籍狀態為 reserved (已被預訂)
      updateBookStatus(payload.bookId, 'reserved');

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: '購買登記已記錄',
        orderId: orderId
      })).setMimeType(ContentService.MimeType.JSON);
    }
    else if (action === 'delete') {
      // 刪除書籍：根據書籍 ID 找到對應的列並刪除
      var sheet = getOrCreateBooksSheet();
      var data = sheet.getDataRange().getValues();
      var targetId = String(payload.id || payload.bookId || '');
      var deleted = false;

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === targetId) {
          sheet.deleteRow(i + 1); // 試算表列數從 1 開始計算
          deleted = true;
          break;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: deleted ? 'success' : 'not_found',
        message: deleted ? '書籍已成功自試算表刪除' : '找不到對應的書籍編號'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: '未知的操作類型'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 取得或建立「書籍清單」工作表（具備多重安全備援）
function getOrCreateBooksSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    // 獨立專案防護：嘗試開啟帳號下現有試算表或新建
    var allFiles = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
    if (allFiles.hasNext()) {
      ss = SpreadsheetApp.open(allFiles.next());
    } else {
      ss = SpreadsheetApp.create('校園二手書交易平台資料庫');
    }
  }

  var sheet = ss.getSheetByName('書籍清單');
  if (!sheet) {
    var sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() <= 1) {
      sheet = sheets[0];
      sheet.setName('書籍清單');
    } else {
      sheet = ss.insertSheet('書籍清單');
    }
  }

  // 若工作表全空，自動補齊標題列
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '書籍編號 (id)',
      '書名 (title)',
      '價格 (price)',
      '備註/老師 (notes)',
      '約定時間/代交 (meetupInfo)',
      '賣家聯絡 (sellerContact)',
      '狀態 (status)',
      '上架時間 (createdAt)'
    ]);
  }
  return sheet;
}

// 取得或建立「購買登記」工作表
function getOrCreateOrdersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var allFiles = DriveApp.getFilesByType(MimeType.GOOGLE_SHEETS);
    if (allFiles.hasNext()) {
      ss = SpreadsheetApp.open(allFiles.next());
    } else {
      ss = SpreadsheetApp.create('校園二手書交易平台資料庫');
    }
  }

  var sheet = ss.getSheetByName('購買登記');
  if (!sheet) {
    sheet = ss.insertSheet('購買登記');
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '訂單編號 (orderId)',
      '書籍編號 (bookId)',
      '書名 (bookTitle)',
      '買家姓名 (buyerName)',
      '聯絡方式 (buyerContact)',
      '期望交易時間 (tradeTime)',
      '備註 (note)',
      '登記時間 (orderTime)'
    ]);
  }
  return sheet;
}

// 更新書籍狀態
function updateBookStatus(bookId, newStatus) {
  var sheet = getOrCreateBooksSheet();
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(bookId)) {
      sheet.getRange(i + 1, 7).setValue(newStatus);
      break;
    }
  }
}
`;
