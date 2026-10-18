import { DBSQLClient } from "@databricks/sql";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const client = new DBSQLClient();

  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    if (!fileName) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama file CSV belum diberikan",
        },
        { status: 400 }
      );
    }

    if (
      fileName.includes("/") ||
      fileName.includes("\\") ||
      !fileName.toLowerCase().endsWith(".csv")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama file CSV tidak valid",
        },
        { status: 400 }
      );
    }

    const filePath = `/Volumes/workspace/default/latihan/${fileName}`;

    console.log("=================================");
    console.log("FILE NAME:", fileName);
    console.log("FILE PATH:", filePath);
    console.log("=================================");

    await client.connect({
      host: process.env.DATABRICKS_HOST!,
      path: process.env.DATABRICKS_SQL_PATH!,
      token: process.env.DATABRICKS_TOKEN!,
    });

    const session = await client.openSession();

    const result = await session.executeStatement(`
      SELECT *
      FROM read_files(
        '${filePath}',
        format => 'csv',
        header => true,
        inferSchema => true
      )
    `);

    const rows = await result.fetchAll();

    console.log("ROWS:", rows);
    console.log("ROW COUNT:", rows.length);

    await session.close();
    await client.close();

    return NextResponse.json({
      success: true,
      fileName,
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
        message: "Failed to read CSV from Databricks",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}