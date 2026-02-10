/**
 * UI Integration for Google Docs
 * Adds custom menu items for Grant AutoPilot functionality
 */

import { runEmbedAndInject } from "./main";
import { exportPDF } from "./pdf";
import { validateConfig } from "./config";

/**
 * Create custom menu when document opens
 */
function onOpen(): void {
  DocumentApp.getUi()
    .createMenu("Grant AutoPilot")
    .addItem("自動入力", "runAutoPilot")
    .addItem("PDF出力", "exportPDFUI")
    .addSeparator()
    .addItem("設定を確認", "checkConfig")
    .addToUi();
}

/**
 * Run auto-fill process
 */
function runAutoPilot(): void {
  try {
    const validation = validateConfig();
    if (!validation.valid) {
      const ui = DocumentApp.getUi();
      ui.alert(
        '設定エラー',
        `以下の設定が不足しています:\n${validation.missing.join('\n')}\n\n` +
        'ファイル > プロジェクト設定 > スクリプトプロパティで設定してください。',
        ui.ButtonSet.OK
      );
      return;
    }
    
    runEmbedAndInject();
    
    const ui = DocumentApp.getUi();
    ui.alert('完了', '自動入力が完了しました。', ui.ButtonSet.OK);
  } catch (error) {
    const ui = DocumentApp.getUi();
    ui.alert('エラー', `処理中にエラーが発生しました:\n${error}`, ui.ButtonSet.OK);
    Logger.log(`Error in runAutoPilot: ${error}`);
  }
}

/**
 * Export current document as PDF
 */
function exportPDFUI(): void {
  try {
    const validation = validateConfig();
    if (!validation.valid) {
      const ui = DocumentApp.getUi();
      ui.alert(
        '設定エラー',
        `OUTPUT_FOLDER_IDが設定されていません。\n\n` +
        'ファイル > プロジェクト設定 > スクリプトプロパティで設定してください。',
        ui.ButtonSet.OK
      );
      return;
    }
    
    const doc = DocumentApp.getActiveDocument();
    const docId = doc.getId();
    
    // Use the configured output folder
    const props = PropertiesService.getScriptProperties();
    const folderId = props.getProperty('OUTPUT_FOLDER_ID');
    
    if (!folderId) {
      throw new Error('OUTPUT_FOLDER_ID not configured');
    }
    
    exportPDF(docId, folderId);
    
    const ui = DocumentApp.getUi();
    ui.alert('完了', 'PDFを出力しました。', ui.ButtonSet.OK);
  } catch (error) {
    const ui = DocumentApp.getUi();
    ui.alert('エラー', `PDF出力中にエラーが発生しました:\n${error}`, ui.ButtonSet.OK);
    Logger.log(`Error in exportPDFUI: ${error}`);
  }
}

/**
 * Check and display configuration status
 */
function checkConfig(): void {
  const validation = validateConfig();
  const ui = DocumentApp.getUi();
  
  if (validation.valid) {
    ui.alert(
      '設定確認',
      '全ての必須設定が完了しています。',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '設定確認',
      `以下の設定が不足しています:\n${validation.missing.join('\n')}\n\n` +
      'ファイル > プロジェクト設定 > スクリプトプロパティで設定してください。',
      ui.ButtonSet.OK
    );
  }
}

export { onOpen, runAutoPilot, exportPDFUI, checkConfig };
