// app/api/databricks/upload/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Nangkep kiriman file CSV (FormData) dari frontend lu
    const formData = await request.formData();
    const file = formData.get("csvFile") as File;

    if (!file) {
      return NextResponse.json({ error: "File CSV-nya kagak kebawa, cuy!" }, { status: 400 });
    }

    // 2. Karena ini di server (backend), kita ubah file-nya jadi format data mentah (Buffer)
    // Biar gampang dilempar ke API Databricks nanti
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Cuma buat mastiin di terminal lu kalau file-nya nyampe
    console.log(`[BACKEND] Nerima file: ${file.name}, Ukuran: ${buffer.length} bytes`);

    // ====================================================================
    // ZONA DATABRICKS (Nanti kita coding koneksinya di sini)
    // ====================================================================
    // A. Upload si 'buffer' ini ke Databricks Volumes
    // B. Tembak query SQL "COPY INTO" ke Databricks
    // ====================================================================

    // 3. Ngasih balasan ke frontend kalau prosesnya sukses
    return NextResponse.json({ 
      message: `File ${file.name} udah berhasil nyampe di backend Next.js lu!` 
    });

  } catch (error) {
    console.error("[BACKEND] Waduh error:", error);
    return NextResponse.json({ error: "Backend lu error pas nerima file" }, { status: 500 });
  }
}