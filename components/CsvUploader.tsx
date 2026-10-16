'use client'
import { useState } from "react"
import React from 'react'
import Papa from 'papaparse';

type CsvRowValue = string | number | boolean | null;
type CsvRow = Record<string, CsvRowValue>;

export default function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  
  const [data, setData] = useState<CsvRow[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const sanitizeData = (rawData: unknown[]) => {
    const parsedData = rawData as Record<string, unknown>[];

    return parsedData
      .map((row) => {
        const cleanRow: CsvRow = {};
        
        for (const key in row) {
          const cleanKey = key.trim(); 
          const value = row[key];
          
          // Kalau dia teks, di-trim. Kalau bukan (kayak angka/boolean hasil dynamicTyping), biarin aja.
          cleanRow[cleanKey] = typeof value === 'string' ? value.trim() : (value as CsvRowValue);
        }
        return cleanRow;
      })
      .filter((row) => {
        const hasValue = Object.values(row).some((val) => val !== "" && val !== null && val !== undefined);
        return hasValue;
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]; 
    
    // FIX MASALAH SELECTEDFILE ERROR: Kalau user batal milih file, berhentiin prosesnya
    if (!selectedFile) return;

    // FIX MASALAH SETFILE GAK KEPAKE: Simpen file-nya ke state biar nama file muncul di UI!
    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true, 
      dynamicTyping: true,
      skipEmptyLines: true, 
      complete: (results) => {
        const cleanedData = sanitizeData(results.data);
        
        console.log("Data setelah dibersihin:", cleanedData);
        
        // CUKUP SATU AJA SETDATA-NYA, PAKE YANG UDAH DIBERSIHIN!
        setData(cleanedData); 
      },
    });
  };

  const handleExportToDatabricks = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    alert(`Mantap cuy! Berhasil pura-pura ngirim ${data.length} baris data ke Databricks.`);
    setIsExporting(false);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-2xl mx-auto mt-10">
      
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-64 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h3a3 3 0 0 0 0-6h-.025a5.56 5.56 0 0 0 .025-.5A5.5 5.5 0 0 0 7.207 9.021C7.137 9.017 7.071 9 7 9a4 4 0 1 0 0 8h2.167M12 19v-9m0 0-2 2m2-2 2 2"/>
            </svg>
            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-500">File berekstensi .CSV (Max 10MB)</p>
          </div>
          
          <input 
            id="dropzone-file" 
            type="file" 
            className="hidden" 
            accept=".csv" 
            onChange={handleFileChange} 
          />
        </label>
      </div> 

      {/* Kotak ijo ini sekarang bakal muncul karena setFile udah kepanggil! */}
      {file && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg w-full text-center">
          File siap di-parse: <strong>{file.name}</strong>
        </div>
      )}

      {data.length > 0 && (
        <div className="w-full mt-8 overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs uppercase bg-gray-100 text-gray-700">
              <tr>
                {Object.keys(data[0]).map((headerName, index) => (
                  <th key={index} className="px-6 py-3 border-b">
                    {headerName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50 border-b">
                  {Object.keys(data[0]).map((headerName, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                      {/* Kalau boolean (true/false) gak bisa dirender langsung di HTML, jadi diubah ke text */}
                      {typeof row[headerName] === 'boolean' 
                        ? (row[headerName] ? 'TRUE' : 'FALSE') 
                        : row[headerName]} 
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end p-4 border-t">
            <button 
              onClick={handleExportToDatabricks}
              disabled={isExporting}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? "Memproses Export..." : "Export to Databricks"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}