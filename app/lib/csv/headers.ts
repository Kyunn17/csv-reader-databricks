export function normalizeHeaders(rawHeaders: string[]): string[] {
  const used = new Map<string, number>();

  return rawHeaders.map((raw, index) => {
    let name = raw
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_]/gu, "")
      .toLowerCase();

    if (!name) name = `column_${index + 1}`;

    const count = (used.get(name) ?? 0) + 1;
    used.set(name, count);

    return count === 1 ? name : `${name}_${count}`;
  });
}

// Format: "26=state,1=id" (posisi mulai dari 1)
export function applyColumnOverrides(
  header: string[],
  raw: string
): { header: string[]; warnings: string[] } {
  const result = [...header];
  const warnings: string[] = [];

  raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [pos, ...rest] = pair.split("=");
      const idx = Number(pos.trim());
      const name = rest.join("=").trim();

      if (Number.isInteger(idx) && idx >= 1 && idx <= result.length && name) {
        warnings.push(
          `Kolom ${idx} diganti namanya dari "${result[idx - 1]}" menjadi "${name}".`
        );
        result[idx - 1] = name;
      } else {
        warnings.push(`Format ganti nama "${pair}" diabaikan.`);
      }
    });

  return { header: result, warnings };
}