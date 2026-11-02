import * as XLSX from "xlsx";
import { BUSINESS_SHEET, MEDIA_SHEET, type SheetName, type SourceRow } from "./types";

export interface WorkbookRows {
  businessRows: SourceRow[];
  mediaRows: SourceRow[];
}

export function readWorkbook(fileContents: Buffer): WorkbookRows {
  const workbook = XLSX.read(fileContents, { type: "buffer" });
  return {
    businessRows: readSheet(workbook, BUSINESS_SHEET),
    mediaRows: readSheet(workbook, MEDIA_SHEET),
  };
}

function readSheet(workbook: XLSX.WorkBook, sheetName: SheetName): SourceRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Workbook has no sheet named ${sheetName}`);
  }

  // Rows are read as arrays with blanks kept, so an array index always maps to
  // the row number a person sees in Excel. The issue log depends on that.
  const [headers, ...dataRows] = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
  if (!headers) {
    throw new Error(`Sheet ${sheetName} is empty`);
  }

  const sourceRows: SourceRow[] = [];
  dataRows.forEach((cells, index) => {
    if (cells.every((cell) => cell === null)) {
      return;
    }
    const values = Object.fromEntries(
      headers.map((header, column) => [String(header), cells[column]]),
    );
    sourceRows.push({ rowNumber: index + 2, values });
  });
  return sourceRows;
}
