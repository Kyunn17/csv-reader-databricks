// "Data Siswa 2026.csv" -> "data_siswa_2026"
export function toTableName(fileName: string): string {
  let name = fileName
    .replace(/\.csv$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_");

  if (!name || /^[0-9]/.test(name)) name = `t_${name}`;
  return name;
}