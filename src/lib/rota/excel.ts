// Excel (.xlsx) import/export. Reuses the shared row layout from csv.ts so the
// CSV and Excel formats stay perfectly in sync.

import * as XLSX from "xlsx";
import {
  buildRotaRows,
  parseRotaRows,
  type ExportInput,
  type ImportResult,
} from "./csv";

const SHEET_NAME = "Rota";

/** Build an .xlsx workbook for the rota and return it as a byte array. */
export function exportToXlsx(input: ExportInput): Uint8Array {
  const rows = buildRotaRows(input);
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" });
}

/** Parse an .xlsx file (as an ArrayBuffer) into people and rota days. */
export function importFromXlsx(data: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { people: [], days: [], startDate: "", endDate: "", byngStartDate: "", byngEndDate: "" };
  }
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  return parseRotaRows(rows.map((row) => row.map((cell) => String(cell ?? ""))));
}
