import { NextResponse } from "next/server";
import { prepareCsv } from "../../../lib/csv/prepare";

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

    const headerRaw = String(formData.get("headerRow") ?? "").trim();

    const result = prepareCsv(await file.text(), {
    headerRow: headerRaw === "" ? "auto" : Number(headerRaw),
    columnOverrides: String(formData.get("columnOverrides") ?? ""),
    });
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_") || "upload.csv";

    return NextResponse.json({ ...result, fileName: safeName });
  } catch (error) {
    console.error("Prepare error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi error saat mempersiapkan CSV",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}