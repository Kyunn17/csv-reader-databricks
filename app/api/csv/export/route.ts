import { DBSQLClient } from "@databricks/sql";
import ExcelJS from "exceljs";
import { NextResponse,connection } from "next/server";
import { toTableName } from "../../../lib/tableName";



function toExcelValue(value: unknown): ExcelJS.CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : value.toString();
  }
  if (value instanceof Date) return value;
  if (typeof value === "object") return JSON.stringify(value);
  return value as ExcelJS.CellValue;
}

export async function GET(request: Request) {
    // Opt this route into request-time rendering, outside any try/catch
      await connection();
  const client = new DBSQLClient();

  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    if (
      !fileName ||
      fileName.includes("/") ||
      fileName.includes("\\") ||
      !fileName.toLowerCase().endsWith(".csv")
    ) {
      return NextResponse.json(
        { success: false, message: "Nama file CSV tidak valid" },
        { status: 400 }
      );
    }

    const fullTableName = `workspace.default.${toTableName(fileName)}`;

    await client.connect({
      host: process.env.DATABRICKS_HOST!,
      path: process.env.DATABRICKS_SQL_PATH!,
      token: process.env.DATABRICKS_TOKEN!,
    });

    const session = await client.openSession();
    const result = await session.executeStatement(
      `SELECT * FROM ${fullTableName}`
    );
    const rows = (await result.fetchAll()) as Record<string, unknown>[];
    await session.close();

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Tabel kosong, tidak ada yang diekspor" },
        { status: 404 }
      );
    }

    // Sembunyikan _rescued_data kalau semuanya kosong (sama seperti di tabel web)
    const columns = Object.keys(rows[0]).filter(
      (col) => col !== "_rescued_data" || rows.some((r) => r[col] != null)
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data");

    sheet.columns = columns.map((c) => ({
      header: c,
      key: c,
      width: Math.min(Math.max(c.length + 2, 10), 40),
    }));

    rows.forEach((r) => sheet.addRow(columns.map((c) => toExcelValue(r[c]))));

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();

    const baseName = fileName
      .replace(/\.csv$/i, "")
      .replace(/[^A-Za-z0-9._-]/g, "_");

    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}_bersih.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengekspor ke Excel",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    try {
      await client.close();
    } catch {}
  }
}