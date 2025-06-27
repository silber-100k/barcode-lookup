import type { NextApiRequest, NextApiResponse } from 'next'
import ExcelJS from 'exceljs'
import axios from 'axios'

interface ExcelDataRow {
  [key: string]: string | undefined
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data, headers } = req.body as {
      data: ExcelDataRow[]
      headers: string[]
    }

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Enhanced Products')

    // Set up headers
    const excelHeaders = [...headers, 'ProductImage', 'RetailPrice', 'ProductTitle', 'Status', 'ErrorMessage']
    
    // Add headers to first row
    worksheet.addRow(excelHeaders)
    
    // Style the header row
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '366092' }
    }

    // Set column widths
    excelHeaders.forEach((header, index) => {
      const column = worksheet.getColumn(index + 1)
      if (header === 'ProductImage') {
        column.width = 20 // Wider for images
      } else if (header === 'ProductTitle') {
        column.width = 30 // Wider for titles
      } else {
        column.width = 15
      }
    })

    // Add data rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowIndex = i + 2 // +2 because Excel is 1-indexed and we have header row

      // Prepare row data
      const rowData: any[] = []
      headers.forEach(header => {
        rowData.push(row[header] || '')
      })
      
      // Add the extra columns
      rowData.push('') // ProductImage placeholder
      rowData.push(row.RetailPrice || '')
      rowData.push(row.ProductTitle || '')
      rowData.push(row.Status || '')
      rowData.push(row.ErrorMessage || '')

      // Add the row
      worksheet.addRow(rowData)

      // Set row height for images
      const excelRow = worksheet.getRow(rowIndex)
      excelRow.height = 60 // Height for images

      // Add image if available
      if (row.ProductImage && row.ProductImage !== '') {
        try {
          console.log(`Downloading image for row ${i + 1}: ${row.ProductImage}`)
          
          // Download image
          const imageResponse = await axios.get(row.ProductImage, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
              'User-Agent': 'Barcode-Lookup-Tool/1.0'
            }
          })

          // Get image extension from URL or content type
          let imageExtension: 'jpeg' | 'png' | 'gif' = 'jpeg'
          const contentType = imageResponse.headers['content-type']
          if (contentType?.includes('png')) imageExtension = 'png'
          else if (contentType?.includes('gif')) imageExtension = 'gif'
          else if (contentType?.includes('webp')) imageExtension = 'jpeg' // Use jpeg for webp
          else if (contentType?.includes('jpg') || contentType?.includes('jpeg')) imageExtension = 'jpeg'

          // Add image to workbook
          const imageId = workbook.addImage({
            buffer: imageResponse.data,
            extension: imageExtension
          })

          // Find the ProductImage column index
          const imageColumnIndex = headers.length + 1 // ProductImage is first additional column

          // Add image to cell
          worksheet.addImage(imageId, {
            tl: { col: imageColumnIndex - 1 + 0.1, row: rowIndex - 1 + 0.1 },
            ext: { width: 80, height: 50 },
            editAs: 'oneCell'
          })

        } catch (imageError) {
          console.error(`Failed to download image for row ${i + 1}:`, imageError)
          // If image download fails, put the URL as text
          const imageCell = worksheet.getCell(rowIndex, headers.length + 1)
          imageCell.value = row.ProductImage
          imageCell.font = { color: { argb: '0066CC' } }
        }
      }

      // Style status cells
      const statusColumnIndex = headers.length + 4 // Status column
      const statusCell = worksheet.getCell(rowIndex, statusColumnIndex)
      
      if (row.Status === 'success') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'D4EDDA' }
        }
        statusCell.font = { color: { argb: '155724' } }
      } else if (row.Status === 'error') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8D7DA' }
        }
        statusCell.font = { color: { argb: '721C24' } }
      }
    }

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Set response headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="enhanced_products_${Date.now()}.xlsx"`)

    // Send the Excel file
    res.status(200).send(buffer)

  } catch (error: any) {
    console.error('Excel generation error:', error)
    res.status(500).json({ 
      error: 'Failed to generate Excel file',
      details: error.message 
    })
  }
} 