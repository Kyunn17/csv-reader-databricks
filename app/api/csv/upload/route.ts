import { DBSQLClient } from "@databricks/sql";
import { NextResponse } from "next/server";
import { toTableName } from "../../../lib/tableName";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "File CSV tidak ditemukan" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { success: false, message: "File harus berformat CSV" },
        { status: 400 }
      );
    }

    const filePath = `/Volumes/workspace/default/latihan/${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const response = await fetch(
      `${process.env.DATABRICKS_URL}/api/2.0/fs/files${filePath}?overwrite=true`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        body: fileBuffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Databricks upload error:", errorText);

      return NextResponse.json(
        {
          success: false,
          message: "Gagal upload file ke Databricks",
          error: errorText,
        },
        { status: response.status }
      );
    }
    // <-- if berakhir di sini. Blok tabel di bawah ada DI LUAR if.

    // ====== Buat tabel dari CSV yang baru masuk Volume ======
    const tableName = toTableName(file.name);
    const fullTableName = `workspace.default.${tableName}`;
    let tableCreated = false;
    let tableError: string | null = null;

    const client = new DBSQLClient();

    try {
      await client.connect({
        host: process.env.DATABRICKS_HOST!,
        path: process.env.DATABRICKS_SQL_PATH!,
        token: process.env.DATABRICKS_TOKEN!,
      });

      const session = await client.openSession();

      await session.executeStatement(`
        CREATE OR REPLACE TABLE ${fullTableName} AS
        SELECT *
        FROM read_files(
          '${filePath}',
          format => 'csv',
          header => true
        )
      `);

      await session.close();
      tableCreated = true;
    } catch (err) {
      console.error("Create table error:", err);
      tableError = err instanceof Error ? err.message : String(err);
    } finally {
      try {
        await client.close();
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "CSV berhasil di-upload ke Databricks",
      fileName: file.name,
      path: filePath,
      tableName: fullTableName,
      tableCreated,
      tableError,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Terjadi error saat upload",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}