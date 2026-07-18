'use client'

import { Download } from 'lucide-react'

interface ExportButtonProps {
  data: any[]
  filename: string
  headers: { key: string; label: string }[]
}

export default function ExportButton({ data, filename, headers }: ExportButtonProps) {
  const exportToCSV = () => {
    if (!data || data.length === 0) {
      alert('No data to export')
      return
    }

    // Create CSV header row
    const headerRow = headers.map(h => h.label).join(',')
    
    // Create CSV data rows
    const dataRows = data.map(item => {
      return headers.map(h => {
        const value = item[h.key] || ''
        // Handle strings with commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value
      }).join(',')
    })

    const csv = [headerRow, ...dataRows].join('\n')
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={exportToCSV}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  )
}