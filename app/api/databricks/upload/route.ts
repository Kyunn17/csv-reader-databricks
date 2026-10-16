import { NextResponse } from "next/server";
import { DBSQLClient } from '@databricks/sql';

export async function GET() {
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;
  const sqlPath = process.env.DATABRICKS_SQL_PATH;

  if (!host || !token || !sqlPath) {
    return NextResponse.json({ error: "Env lu masih kosong cuy!" }, { status: 400 });
  }

  const client = new DBSQLClient();

  try {
    console.log("Otw ngetuk pintu Databricks...");
    
    await client.connect({ 
      host: host.replace('https://', ''), // Databricks driver gak suka ada https://
      path: sqlPath, 
      token: token 
    });
    
    const session = await client.openSession();
    
    // Kita suruh Databricks ngetes ngomong doang
    const queryOperation = await session.executeStatement("SELECT 'Halo dari Databricks, koneksi lu aman!' AS pesan", { runAsync: true });
    const result = await queryOperation.fetchAll();
    
    await session.close();
    await client.close();

    return NextResponse.json({ 
      status: "SUKSES NYAMBUNG!", 
      data: result 
    });

  } catch (error: any) {
    console.error("Gagal nyambung:", error);
    return NextResponse.json({ status: "GAGAL", error: error.message }, { status: 500 });
  }
}