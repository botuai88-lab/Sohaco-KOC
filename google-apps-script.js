// =========================================================================================
// HƯỚNG DẪN TRIỂN KHAI:
// 1. Mở Google Sheet của bạn.
// 2. Vào "Tiện ích mở rộng" (Extensions) > "Apps Script".
// 3. Xóa mã mặc định và DÁN TOÀN BỘ NỘI DUNG của file này vào.
// 4. Thay đổi `SHEET_ID` và `SHEET_NAME` bên dưới cho đúng với Sheet của bạn.
// 5. Lưu dự án (biểu tượng đĩa mềm).
// 6. Nhấp vào "Triển khai" (Deploy) > "Triển khai mới" (New deployment).
// 7. Chọn loại là "Ứng dụng web" (Web app).
// 8. Trong phần "Ai có quyền truy cập" (Who has access), chọn "Bất kỳ ai" (Anyone).
// 9. Nhấp vào "Triển khai" (Deploy). Cấp quyền nếu được yêu cầu.
// 10. Sao chép URL ứng dụng web và dán vào file `services/googleSheetService.ts` trong frontend.
// =========================================================================================

var SHEET_ID = '1Ls0ycwJ7GHKTNeuLZpQuR641HKMR9979M3JCcTjWjzA';
var SHEET_NAME = 'KOCs'; // Tên trang tính chứa dữ liệu

var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

function doGet(e) {
  try {
    if (!sheet) {
      throw new Error("Sheet '" + SHEET_NAME + "' not found. Please check SHEET_NAME in the script.");
    }
    var action = e.parameter.action;
    if (action == 'GET_ALL') {
      var data = sheet.getDataRange().getValues();
      data.shift(); // Remove header row
      return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
    }
    throw new Error("Invalid or missing 'action' parameter for GET request.");
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    if (!sheet) {
      throw new Error("Sheet '" + SHEET_NAME + "' not found. Please check SHEET_NAME in the script.");
    }
    var request = JSON.parse(e.postData.contents);
    var action = request.action;
    
    switch(action) {
      case 'CREATE':
        return handleCreate(request.data);
      case 'UPDATE':
        return handleUpdate(request.rowId, request.data);
      case 'DELETE':
        return handleDelete(request.rowIds);
      case 'BATCH_CREATE':
        return handleBatchCreate(request.data);
      default:
        throw new Error("Invalid action specified in POST request: " + action);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleCreate(rowData) {
  var lastRow = sheet.getLastRow();
  var stt = lastRow; // STT is the new row number (since header is row 1)
  var kocId = 'KOC' + String(stt).padStart(3, '0');
  
  rowData[0] = stt;
  rowData[1] = kocId;

  sheet.appendRow(rowData);
  var newRowId = lastRow + 1;
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    rowId: newRowId,
    data: rowData
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleBatchCreate(rowsData) {
    var lastRow = sheet.getLastRow();
    var startRow = lastRow + 1;
    
    var formattedRows = rowsData.map(function(rowData, index) {
        var stt = lastRow + 1 + index;
        var kocId = 'KOC' + String(stt).padStart(3, '0');
        rowData[0] = stt;
        rowData[1] = kocId;
        return rowData;
    });

    sheet.getRange(startRow, 1, formattedRows.length, formattedRows[0].length).setValues(formattedRows);

    return ContentService.createTextOutput(JSON.stringify({
        success: true,
        startRow: startRow,
        data: formattedRows
    })).setMimeType(ContentService.MimeType.JSON);
}


function handleUpdate(rowId, rowData) {
  if (!rowId || rowId < 2) {
      throw new Error("Invalid rowId for update operation.");
  }
  sheet.getRange(rowId, 1, 1, rowData.length).setValues([rowData]);
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    rowId: rowId,
    data: rowData
  })).setMimeType(ContentService.MimeType.JSON);
}

function handleDelete(rowIds) {
  // Sort IDs in descending order to avoid shifting rows during deletion
  rowIds.sort(function(a, b) { return b - a; });
  
  rowIds.forEach(function(rowId) {
    if (rowId && rowId > 1) { // Ensure rowId is valid and not the header
        sheet.deleteRow(rowId);
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, deleted: rowIds })).setMimeType(ContentService.MimeType.JSON);
}