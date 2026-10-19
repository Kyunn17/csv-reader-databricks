const HOST = (process.env.DATABRICKS_HOST ?? "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

// Ambil warehouse id dari env khusus, atau dari SQL path (/sql/1.0/warehouses/<id>)
const WAREHOUSE_ID =
  process.env.DATABRICKS_WAREHOUSE_ID ??
  process.env.DATABRICKS_SQL_PATH?.split("/").pop();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runSql(statement: string) {
  const base = `https://${HOST}/api/2.0/sql/statements`;
  const headers = {
    Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}`,
    "Content-Type": "application/json",
  };

  let res = await fetch(base, {
    method: "POST",
    headers,
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      statement,
      wait_timeout: "50s",
      on_wait_timeout: "CONTINUE",
    }),
  });
  let data = await res.json();

  if (!res.ok) {
    throw new Error(data.message ?? `Databricks error ${res.status}`);
  }

  // Polling kalau warehouse masih start / query belum selesai
  let attempts = 0;
  while (
    (data.status.state === "PENDING" || data.status.state === "RUNNING") &&
    attempts < 20
  ) {
    await sleep(2000);
    res = await fetch(`${base}/${data.statement_id}`, { headers });
    data = await res.json();
    attempts++;
  }

  if (data.status.state !== "SUCCEEDED") {
    throw new Error(data.status.error?.message ?? `Status: ${data.status.state}`);
  }

  return data;
}