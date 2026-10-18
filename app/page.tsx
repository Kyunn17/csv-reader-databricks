"use client";

import { useState } from "react";

type CsvRow = Record<string, unknown>;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [data, setData] = useState<CsvRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentFileName, setCurrentFileName] = useState("");

  async function handleUpload() {
    if (!file) {
      setMessage("Pilih file CSV terlebih dahulu.");
      return;
    }

    setUploading(true);
    setMessage("");
    setData([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/csv/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(
          result.error ||
            result.message ||
            "Gagal upload file CSV."
        );
        return;
      }

      setCurrentFileName(result.fileName);
      setMessage(`Upload berhasil: ${result.fileName}`);

      // Ambil data dari file yang BARU saja di-upload
      await fetchData(result.fileName);
    } catch (error) {
      console.error("Upload error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi error saat upload."
      );
    } finally {
      setUploading(false);
    }
  }

  async function fetchData(fileName: string) {
    if (!fileName) {
      setMessage("Belum ada file CSV yang dipilih.");
      return;
    }

    setLoadingData(true);

    try {
      const response = await fetch(
        `/api/databricks?file=${encodeURIComponent(fileName)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      console.log("Databricks response:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Gagal mengambil data dari Databricks."
        );
      }

      setData(Array.isArray(result.data) ? result.data : []);

      setMessage(
        `Berhasil membaca ${result.data?.length ?? 0} baris dari ${fileName}`
      );
    } catch (error) {
      console.error("Fetch data error:", error);

      setData([]);

      setMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil data dari Databricks."
      );
    } finally {
      setLoadingData(false);
    }
  }

  // Ambil semua nama kolom dari seluruh data
  const columns = Array.from(
    new Set(data.flatMap((row) => Object.keys(row)))
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            CSV Reader
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Unggah file CSV untuk diproses oleh Databricks.
          </p>
        </div>

        {/* Upload Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <label
            htmlFor="csv-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
          >
            <svg
              className="mb-3 h-10 w-10 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V3m0 0L7.5 7.5M12 3l4.5 4.5M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5"
              />
            </svg>

            <span className="text-sm font-medium text-slate-700">
              Klik untuk memilih file
            </span>

            <span className="mt-1 text-xs text-slate-500">
              Hanya format .csv
            </span>

            <input
              id="csv-file"
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0] ?? null;

                setFile(selectedFile);
                setData([]);
                setMessage("");
              }}
            />
          </label>

          {/* Nama file */}
          {file && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-100 px-4 py-2.5 text-sm">
              <span className="truncate font-medium text-slate-700">
                {file.name}
              </span>

              <span className="ml-3 shrink-0 text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
          )}

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>

          {/* Status */}
          {message && (
            <p
              role="status"
              className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"
            >
              {message}
            </p>
          )}
        </div>

        {/* Data Table */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">

          {/* Table Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                CSV Data
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {currentFileName
                  ? `File: ${currentFileName}`
                  : "Belum ada file yang dibaca."}
              </p>
            </div>

            <button
              onClick={() => fetchData(currentFileName)}
              disabled={loadingData || !currentFileName}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingData ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* Loading */}
          {loadingData ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              Membaca data dari Databricks...
            </div>
          ) : data.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              Belum ada data.
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                {/* Dynamic Header */}
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-6 py-3 font-semibold text-slate-700"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Dynamic Rows */}
                <tbody className="divide-y divide-slate-200">
                  {data.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="transition hover:bg-slate-50"
                    >
                      {columns.map((column) => {
                        const value = row[column];

                        return (
                          <td
                            key={column}
                            className="whitespace-nowrap px-6 py-4 text-slate-700"
                          >
                            {value === null ||
                            value === undefined ? (
                              <span className="text-slate-400">
                                null
                              </span>
                            ) : typeof value === "object" ? (
                              <span className="text-xs text-slate-600">
                                {JSON.stringify(value)}
                              </span>
                            ) : (
                              String(value)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}