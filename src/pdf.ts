export function exportPDF(docId: string, folderId: string) {
  const file = DriveApp.getFileById(docId);
  const blob = file.getAs("application/pdf");
  DriveApp.getFolderById(folderId).createFile(blob);
}