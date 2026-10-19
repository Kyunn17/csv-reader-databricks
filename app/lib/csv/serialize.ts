export function toCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(columns: string[], rows: string[][]): string {
  return (
    [columns, ...rows].map((r) => r.map(toCsvCell).join(",")).join("\n") + "\n"
  );
}