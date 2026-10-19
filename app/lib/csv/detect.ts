export const PLACEHOLDER = /^(x|col|column|v|var|field|y)_?\d*$/i;

const isNumeric = (s: string) => /^-?\d+([.,]\d+)?$/.test(s.trim());

function rowStats(row: string[]) {
  const total = row.length || 1;
  const nonEmpty = row.map((c) => c.trim()).filter(Boolean);
  return {
    textRatio: nonEmpty.filter((c) => !isNumeric(c)).length / total,
    placeholderRatio: nonEmpty.filter((c) => PLACEHOLDER.test(c)).length / total,
  };
}

// Mengembalikan nomor baris header (mulai dari 1).
// Header = baris yang hampir semuanya teks DAN bukan baris placeholder (X1, X2, ...).
export function detectHeaderRow(rows: string[][], maxScan = 10): number {
  const limit = Math.min(maxScan, rows.length);

  for (let i = 0; i < limit; i++) {
    const { textRatio, placeholderRatio } = rowStats(rows[i]);
    if (textRatio >= 0.8 && placeholderRatio < 0.5) return i + 1;
  }

  return 1; // tidak yakin -> pakai baris pertama
}

// Nama kolom yang muncul berulang sebagai ISI kolomnya sendiri kemungkinan
// bukan nama kolom, tapi nilai data (contoh: "North Carolina" di kolom state).
export function fixSuspiciousHeaders(
  header: string[],
  dataRows: string[][],
  aboveRows: string[][],
  sampleSize = 5000
): { header: string[]; warnings: string[] } {
  const sample = dataRows.slice(0, sampleSize);
  const result = [...header];
  const warnings: string[] = [];

  header.forEach((raw, j) => {
    const cell = raw.trim();
    if (!cell) return;

    const count = sample.reduce((n, r) => (r[j]?.trim() === cell ? n + 1 : n), 0);
    if (count < 2 || count / Math.max(sample.length, 1) < 0.01) return;

    // Cari nama pengganti dari baris di atas header (paling dekat dulu)
    let replacement = "";
    for (let k = aboveRows.length - 1; k >= 0; k--) {
      const candidate = aboveRows[k][j]?.trim() ?? "";
      if (candidate && !PLACEHOLDER.test(candidate)) {
        replacement = candidate;
        break;
      }
    }

    result[j] = replacement;
    warnings.push(
      replacement
        ? `Kolom ${j + 1}: "${cell}" terdeteksi sebagai nilai data, bukan nama kolom. Nama kolom diambil dari baris di atas: "${replacement}".`
        : `Kolom ${j + 1}: "${cell}" terdeteksi sebagai nilai data, bukan nama kolom. Diberi nama otomatis.`
    );
  });

  return { header: result, warnings };
}