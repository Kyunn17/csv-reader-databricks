import { detectDelimiter, parseCsv } from "./parse";
import { applyColumnOverrides, normalizeHeaders } from "./headers";
import { detectHeaderRow, fixSuspiciousHeaders, PLACEHOLDER } from "./detect";
import { toCsv } from "./serialize";

export type PrepareOptions = {
  headerRow?: number | "auto"; // "auto" / kosong = deteksi otomatis
  columnOverrides?: string; // "26=state,1=id"
};

export type PrepareResult =
  | {
      success: true;
      csv: string;
      columns: string[];
      originalColumns: string[];
      rowCount: number;
      delimiter: string;
      removedEmptyRows: number;
      skippedRowCount: number;
      headerRowUsed: number;
      autoDetected: boolean;
      warnings: string[];
    }
  | { success: false; message: string };

export function prepareCsv(
  rawText: string,
  options: PrepareOptions = {}
): PrepareResult {
  const warnings: string[] = [];

  // 1. Buang BOM
  const text = rawText.replace(/^\uFEFF/, "");

  // 2. Parse
  const delimiter = detectDelimiter(text);
  const parsed = parseCsv(text, delimiter);

  // 3. Buang baris yang benar-benar kosong (nilai TIDAK diubah)
  const nonEmpty = parsed.filter((r) => r.some((c) => c.trim() !== ""));
  const removedEmptyRows = parsed.length - nonEmpty.length;

  if (nonEmpty.length === 0) {
    return { success: false, message: "CSV kosong atau tidak punya header" };
  }

  // 4. Tentukan baris header (otomatis atau manual)
  const autoDetected =
    options.headerRow === undefined || options.headerRow === "auto";
  const headerRowNumber = autoDetected
    ? detectHeaderRow(nonEmpty)
    : (options.headerRow as number);

  if (
    !Number.isInteger(headerRowNumber) ||
    headerRowNumber < 1 ||
    headerRowNumber > nonEmpty.length
  ) {
    return {
      success: false,
      message: `Baris header harus antara 1 dan ${nonEmpty.length}`,
    };
  }

  const skippedRows = nonEmpty.slice(0, headerRowNumber - 1);
  const headerRow = nonEmpty[headerRowNumber - 1];
  const dataRows = nonEmpty.slice(headerRowNumber);

  if (autoDetected && headerRowNumber > 1) {
    warnings.push(
      `Header terdeteksi otomatis di baris ${headerRowNumber}. ${skippedRows.length} baris di atasnya dibuang.`
    );
  } else if (!autoDetected && skippedRows.length > 0) {
    warnings.push(`${skippedRows.length} baris di atas header dibuang.`);
  } else if (
    !autoDetected &&
    headerRow.every((c) => c.trim() === "" || PLACEHOLDER.test(c.trim()))
  ) {
    warnings.push(
      "Header terlihat seperti placeholder (X1, X2, ...). Coba kosongkan Baris header agar dideteksi otomatis."
    );
  }

  // 5. Nama kolom yang sebenarnya nilai data (hanya di mode otomatis)
  let workingHeader = headerRow;
  if (autoDetected) {
    const fixed = fixSuspiciousHeaders(headerRow, dataRows, skippedRows);
    workingHeader = fixed.header;
    warnings.push(...fixed.warnings);
  }

  // 6. Kalau ada baris lebih panjang dari header, tambah kolom (tidak ada data hilang)
  const maxCols = dataRows.reduce(
    (max, r) => Math.max(max, r.length),
    workingHeader.length
  );
  if (maxCols > workingHeader.length) {
    warnings.push(
      `Ada baris dengan ${maxCols} kolom, header hanya ${workingHeader.length}. Kolom tambahan dibuat otomatis.`
    );
  }
  const paddedHeader = [
    ...workingHeader,
    ...Array(maxCols - workingHeader.length).fill(""),
  ];

  // 7. Ganti nama kolom manual (opsional, menang atas otomatis), lalu rapikan
  const overridden = applyColumnOverrides(
    paddedHeader,
    options.columnOverrides ?? ""
  );
  warnings.push(...overridden.warnings);
  const columns = normalizeHeaders(overridden.header);

  // 8. Samakan jumlah kolom tiap baris (nilai asli tetap)
  let shortRows = 0;
  const normalizedRows = dataRows.map((r) => {
    if (r.length < maxCols) shortRows++;
    return [...r, ...Array(maxCols - r.length).fill("")];
  });
  if (shortRows > 0) {
    warnings.push(`${shortRows} baris kekurangan kolom dan diisi kosong.`);
  }

  return {
    success: true,
    csv: toCsv(columns, normalizedRows),
    columns,
    originalColumns: headerRow,
    rowCount: normalizedRows.length,
    delimiter,
    removedEmptyRows,
    skippedRowCount: skippedRows.length,
    headerRowUsed: headerRowNumber,
    autoDetected,
    warnings,
  };
}