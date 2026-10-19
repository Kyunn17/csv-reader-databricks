import { detectDelimiter, parseCsv } from "./parse";
import { applyColumnOverrides, normalizeHeaders } from "./headers";
import { toCsv } from "./serialize";

export type PrepareOptions = {
  headerRow?: number; // 1 = baris pertama (dihitung setelah baris kosong dibuang)
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

  // 4. Pilih baris header
  const headerRowNumber = options.headerRow ?? 1;
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

  if (skippedRows.length > 0) {
    warnings.push(`${skippedRows.length} baris di atas header dibuang.`);
  } else if (
    headerRow.every((c) => c.trim() === "" || /^(x|col|column|v|field|y)_?\d*$/i.test(c.trim()))
  ) {
    warnings.push(
      "Header terlihat seperti placeholder (X1, X2, ...). Coba set Baris header ke 2."
    );
  }

  // 5. Kalau ada baris lebih panjang dari header, tambah kolom (tidak ada data hilang)
  const maxCols = dataRows.reduce(
    (max, r) => Math.max(max, r.length),
    headerRow.length
  );
  if (maxCols > headerRow.length) {
    warnings.push(
      `Ada baris dengan ${maxCols} kolom, header hanya ${headerRow.length}. Kolom tambahan dibuat otomatis.`
    );
  }
  const paddedHeader = [
    ...headerRow,
    ...Array(maxCols - headerRow.length).fill(""),
  ];

  // 6. Ganti nama kolom manual (opsional), lalu rapikan
  const overridden = applyColumnOverrides(
    paddedHeader,
    options.columnOverrides ?? ""
  );
  warnings.push(...overridden.warnings);
  const columns = normalizeHeaders(overridden.header);

  // 7. Samakan jumlah kolom tiap baris (nilai asli tetap)
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
    warnings,
  };
}