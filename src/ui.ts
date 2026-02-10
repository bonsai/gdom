import { runAutoPilot } from "./main";

export function onOpen() {
  DocumentApp.getUi()
    .createMenu("Grant AutoPilot")
    .addItem("Auto Fill", "runAutoPilot")
    .addItem("Export PDF", "exportPDFUI")
    .addToUi();
}