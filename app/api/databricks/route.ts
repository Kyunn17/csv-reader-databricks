import { DBSQLClient } from "@databricks/sql";
import { NextResponse, connection } from "next/server";
import { toTableName } from "../../lib/tableName";

export async function GET(request: Request) {
  // Opt this route into request-time rendering, outside any try/catch
  await connection();

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("file");

  if (!fileName) {
    return NextResponse.json(
      { success: false, message: "Nama file CSV belum diberikan" },
      { status: 400 }
    );
  }

  if (
    fileName.includes("/") ||
    fileName.includes("\\") ||
    !fileName.toLowerCase().endsWith(".csv")
  ) {
    return NextResponse.json(
      { success: false, message: "Nama file CSV tidak valid" },
      { status: 400 }
    );
  }

  const tableName = toTableName(fileName);
  const fullTableName = `workspace.default.${tableName}`;

  const client = new DBSQLClient();

  try {
    await client.connect({
      host: process.env.DATABRICKS_HOST!,
      path: process.env.DATABRICKS_SQL_PATH!,
      token: process.env.DATABRICKS_TOKEN!,
    });

    const session = await client.openSession();
    const result = await session.executeStatement(
      `SELECT * FROM ${fullTableName}`
    );
    const rows = await result.fetchAll();

    await session.close();
    await client.close();

    return NextResponse.json({
      success: true,
      fileName,
      tableName: fullTableName,
      rowCount: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Databricks error:", error);

    try {
      await client.close();
    } catch {}

    return NextResponse.json(
      {
        success: false,
        message: "Failed to read table from Databricks",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}