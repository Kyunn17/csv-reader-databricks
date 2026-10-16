import React from 'react'
import CsvUploader from '@/components/CsvUploader'

export default function page() {
  return (
    

<main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      
      {/* Komponen uploader lu ditaruh di sini */}
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Upload Data CSV
        </h1>
        <CsvUploader />
      </div>

    </main>
  )
}
