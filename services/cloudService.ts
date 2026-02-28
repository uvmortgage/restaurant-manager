
import { AppState, CloudConfig } from '../types';

export const cloudService = {
  /**
   * Pushes local data to the Google Sheet
   */
  sync: async (config: CloudConfig, data: Partial<AppState>) => {
    try {
      const response = await fetch(config.syncUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sync',
          key: config.apiKey,
          payload: data,
        }),
      });
      
      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Cloud Sync (Push) Error:', error);
      return false;
    }
  },

  /**
   * Pulls latest data from the Google Sheet
   */
  fetchLatest: async (config: CloudConfig): Promise<Partial<AppState> | null> => {
    try {
      const response = await fetch(config.syncUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'fetch',
          key: config.apiKey
        }),
      });
      const result = await response.json();
      return result.status === 'success' ? result.payload : null;
    } catch (error) {
      console.error('Cloud Sync (Pull) Error:', error);
      return null;
    }
  },

  /**
   * Tests if the URL and Key are valid
   */
  testConnection: async (url: string, key: string): Promise<{success: boolean, message: string}> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping', key: key }),
      });
      const result = await response.json();
      if (result.status === 'success') return { success: true, message: 'Connected to RestoHub Cloud!' };
      return { success: false, message: result.error || 'Invalid API Key' };
    } catch (error) {
      return { success: false, message: 'Check URL or Internet Connection' };
    }
  },

  getAppsScriptTemplate: () => {
    return `/**
 * RestoHub Cloud Sync Bridge v9.0
 * Implementation: Nested Folder Structure
 */

const SECRET_KEY = "B@mboo2025"; 
const MEDIA_ROOT_NAME = "RestoHub_Media";

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    
    // --- AUTHENTICATION ---
    if (request.key !== SECRET_KEY) {
      return response({status: 'error', error: 'Unauthorized'}, 401);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (request.action === 'ping') return response({status: 'success', message: 'OK'});
    
    if (request.action === 'fetch') {
      return response({
        status: 'success',
        payload: {
          users: getSheetData(ss, 'Users'),
          transactions: getSheetData(ss, 'Transactions'),
          receipts: getSheetData(ss, 'Receipts'),
          cateringEvents: getSheetData(ss, 'Catering')
        }
      });
    }
    
    if (request.action === 'sync') {
      const rootFolder = getOrCreateFolder(MEDIA_ROOT_NAME);
      const payload = request.payload;
      
      if (payload.users) updateSheet(ss, 'Users', payload.users, rootFolder);
      if (payload.transactions) updateSheet(ss, 'Transactions', payload.transactions, rootFolder);
      if (payload.receipts) updateSheet(ss, 'Receipts', payload.receipts, rootFolder);
      if (payload.cateringEvents) updateSheet(ss, 'Catering', payload.cateringEvents, rootFolder);
      
      return response({status: 'success', message: 'Synced'});
    }
    
    return response({status: 'error', error: 'Unknown Action'}, 400);
  } catch (err) {
    return response({status: 'error', error: err.toString()}, 500);
  }
}

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[h] = val;
    });
    return obj;
  });
}

function updateSheet(ss, name, data, rootFolder) {
  if (!data || !Array.isArray(data)) return;
  let sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  sheet.appendRow(headers);

  // Determine Sheet-specific subfolder (e.g., Receipts, Catering)
  const sheetMediaFolder = getOrCreateSubFolder(rootFolder, name);

  const rows = data.map(item => headers.map(h => {
    let val = item[h];
    if (typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('data:application/pdf'))) {
      // Determine nested subfolder
      // For Receipts: use Category
      // For Catering: use Ordering Person
      const nestedFolderName = item.category || item.ordering_person_name || item.trans_type || 'General';
      val = saveToDrive(val, \`\${name}_\${item.id || 'file'}_\${h}\`, sheetMediaFolder, nestedFolderName);
    }
    return typeof val === 'object' ? JSON.stringify(val) : val;
  }));
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
}

function saveToDrive(base64Data, filename, parentFolder, subfolderName) {
  try {
    const targetFolder = getOrCreateSubFolder(parentFolder, subfolderName);
    const split = base64Data.split(',');
    const contentType = split[0].match(/:(.*?);/)[1];
    const bytes = Utilities.base64Decode(split[1]);
    const extension = contentType.split('/')[1];
    const fullFilename = filename.includes('.') ? filename : \`\${filename}.\${extension}\`;
    
    const blob = Utilities.newBlob(bytes, contentType, fullFilename);
    const file = targetFolder.createFile(blob);
    file.setSharing(SpreadsheetApp.GroupRestriction.NONE, SpreadsheetApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "Error: " + e.toString(); }
}

function getOrCreateSubFolder(parent, name) {
  const cleanName = name.toString().replace(/[/\\\\?%*:|"<>]/g, '-').trim() || "General";
  const folders = parent.getFoldersByName(cleanName);
  if (folders.hasNext()) return folders.next();
  return parent.createFolder(cleanName);
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`;
  }
};
