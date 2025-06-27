import type { NextApiRequest, NextApiResponse } from 'next'
import ExcelJS from 'exceljs'
import axios from 'axios'
import Jimp from 'jimp'

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
      excelRow.height = 90 // Height for images

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

          // Check original image size first
          const maxSizeKB = 10
          const originalBuffer = Buffer.from(imageResponse.data)
          let imageBuffer = originalBuffer
          
          console.log(`Original image size: ${Math.round(originalBuffer.length/1024)}KB`)
          
          // Only process if original image is too large
          if (originalBuffer.length > maxSizeKB * 1024) {
            console.log(`Image too large, processing...`)
            
            // First attempt: resize with high quality using Jimp
            const image = await Jimp.read(imageResponse.data)
            image.resize(120, 80).quality(95)
            imageBuffer = await image.getBufferAsync(Jimp.MIME_JPEG)

            // If still too large, compress more
            if (imageBuffer.length > maxSizeKB * 1024) {
              console.log(`Still too large (${Math.round(imageBuffer.length/1024)}KB), compressing further...`)
              const image2 = await Jimp.read(imageResponse.data)
              image2.resize(120, 80).quality(70)
              imageBuffer = await image2.getBufferAsync(Jimp.MIME_JPEG)
              
              // Final attempt: aggressive compression
              if (imageBuffer.length > maxSizeKB * 1024) {
                console.log(`Still too large (${Math.round(imageBuffer.length/1024)}KB), final compression...`)
                const image3 = await Jimp.read(imageResponse.data)
                image3.resize(100, 67).quality(50)
                imageBuffer = await image3.getBufferAsync(Jimp.MIME_JPEG)
              }
            }
          } else {
            console.log(`Using original image (small enough)`)
          }
          
          console.log(`Final image size: ${Math.round(imageBuffer.length/1024)}KB`)

          // Add compressed image to workbook
          const imageId = workbook.addImage({
            buffer: imageBuffer,
            extension: 'jpeg'
          })

          // Find the ProductImage column index
          const imageColumnIndex = headers.length + 1 // ProductImage is first additional column

                      // Add image to cell
            worksheet.addImage(imageId, {
              tl: { col: imageColumnIndex - 1 + 0.1, row: rowIndex - 1 + 0.1 },
              ext: { width: 120, height: 80 },
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