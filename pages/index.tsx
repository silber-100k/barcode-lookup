import React, { useState, useCallback } from 'react'
import Head from 'next/head'
import Papa from 'papaparse'
import axios from 'axios'

interface CSVRow {
  UPC?: string
  Brand?: string
  Manufacturer?: string
  Title?: string
  PartNumbers?: string
  ModelNumbers?: string
  TotalQuantity?: string
  [key: string]: string | undefined
}

interface EnhancedCSVRow extends CSVRow {
  ProductImage?: string
  RetailPrice?: string
  ProductTitle?: string
  Status?: 'pending' | 'success' | 'error'
  ErrorMessage?: string
}

interface ApiLimits {
  remaining_calls_per_month: string
  remaining_calls_per_minute: string
  allowed_calls_per_month: string
  allowed_calls_per_minute: string
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [csvData, setCsvData] = useState<EnhancedCSVRow[]>([])
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [apiLimits, setApiLimits] = useState<ApiLimits | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    
    try {
      const response = await axios.post('/api/auth', { password })
      
      if (response.data.success) {
        setIsAuthenticated(true)
        setPassword('')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Authentication failed'
      setPasswordError(errorMessage)
      setPassword('')
    }
  }

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    Papa.parse(file, {
      complete: (results) => {
        const headers = results.meta.fields || []
        setOriginalHeaders(headers)
        
        const data = results.data as CSVRow[]
        const enhancedData: EnhancedCSVRow[] = data.map(row => ({
          ...row,
          Status: 'pending'
        }))
        
        setCsvData(enhancedData)
        console.log('CSV uploaded:', enhancedData.length, 'rows')
      },
      header: true,
      skipEmptyLines: true,
      error: (error) => {
        console.error('CSV parsing error:', error)
        alert('Error parsing CSV file')
      }
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const fetchApiLimits = async () => {
    try {
      const response = await axios.get('/api/rate-limits')
      setApiLimits(response.data)
    } catch (error) {
      console.error('Error fetching API limits:', error)
    }
  }

  const processBarcodeLookup = async () => {
    if (csvData.length === 0) {
      alert('Please upload a CSV file first')
      return
    }

    // Check API limits before starting
    await fetchApiLimits()

    setIsProcessing(true)
    setProgress(0)

    const updatedData = [...csvData]
    let processedCount = 0

    for (let i = 0; i < updatedData.length; i++) {
      const row = updatedData[i]
      const upc = row.UPC

      if (!upc) {
        row.Status = 'error'
        row.ErrorMessage = 'No UPC found'
        processedCount++
        setProgress((processedCount / updatedData.length) * 100)
        setCsvData([...updatedData])
        continue
      }

      try {
        const response = await axios.post('/api/barcode-lookup', { upc })
        const productData = response.data

        if (productData.success && productData.data) {
          const product = productData.data
          row.ProductImage = product.image
          row.RetailPrice = product.price
          row.ProductTitle = product.title
          row.Status = 'success'
        } else {
          row.Status = 'error'
          row.ErrorMessage = productData.error || 'Product not found'
        }
      } catch (error: any) {
        row.Status = 'error'
        row.ErrorMessage = error.response?.data?.error || 'API request failed'
        console.error(`Error processing UPC ${upc}:`, error)
      }

      processedCount++
      setProgress((processedCount / updatedData.length) * 100)
      setCsvData([...updatedData])

      // Small delay to respect rate limits
      if (processedCount < updatedData.length) {
        await new Promise(resolve => setTimeout(resolve, 600)) // ~100 requests per minute
      }
    }

    setIsProcessing(false)
    alert('Barcode lookup completed!')
  }

  const downloadEnhancedExcel = async () => {
    if (csvData.length === 0) {
      alert('No data to download')
      return
    }

    try {
      setIsProcessing(true)
      
      const response = await axios.post('/api/generate-excel', {
        data: csvData,
        headers: originalHeaders
      }, {
        responseType: 'blob',
        timeout: 60000 // 60 seconds for image downloads
      })

      // Create download link
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `enhanced_products_${Date.now()}.xlsx`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      alert('Excel file with embedded images downloaded successfully!')
    } catch (error) {
      console.error('Excel download error:', error)
      alert('Failed to generate Excel file. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadEnhancedCSV = () => {
    if (csvData.length === 0) {
      alert('No data to download')
      return
    }

    // Create headers including new columns
    const enhancedHeaders = [
      ...originalHeaders,
      'ProductImage',
      'RetailPrice',
      'ProductTitle',
      'Status',
      'ErrorMessage'
    ]

    // Convert data to CSV format
    const csvContent = Papa.unparse({
      fields: enhancedHeaders,
      data: csvData.map(row => {
        const newRow: any = {}
        enhancedHeaders.forEach(header => {
          newRow[header] = row[header] || ''
        })
        return newRow
      })
    })

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `enhanced_products_${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <span className="status-badge status-success">Success</span>
      case 'error':
        return <span className="status-badge status-error">Error</span>
      case 'pending':
        return <span className="status-badge status-pending">Pending</span>
      default:
        return <span className="status-badge status-pending">Pending</span>
    }
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container">
        <Head>
          <title>Login - Barcode Lookup Tool</title>
          <meta name="description" content="Secure access to barcode lookup tool" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main>
          <div className="login-container">
            <div className="login-form">
              <h1>🔒 Secure Access Required</h1>
              <p>Please enter the password to access the Barcode Lookup Tool</p>
              
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="password-input"
                    autoFocus
                  />
                </div>
                
                {passwordError && (
                  <div className="error-message">{passwordError}</div>
                )}
                
                <button type="submit" className="btn btn-primary login-btn">
                  Access Application
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="container">
      <Head>
        <title>Barcode Lookup Tool</title>
        <meta name="description" content="Upload CSV and enhance with product images and prices" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2.5rem' }}>
          Barcode Lookup Tool
        </h1>

        {/* API Limits Display */}
        {apiLimits && (
          <div className="alert alert-info">
            <strong>API Limits:</strong> {apiLimits.remaining_calls_per_month} calls remaining this month, {apiLimits.remaining_calls_per_minute} calls remaining this minute
          </div>
        )}

        {/* File Upload Area */}
        <div 
          className={`upload-area ${isDragOver ? 'dragover' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <div>
            <h3>Upload CSV File</h3>
            <p>Drag and drop your CSV file here, or click to select</p>
            <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '10px' }}>
              CSV should contain a "UPC" column with barcode numbers
            </p>
          </div>
          <input
            id="fileInput"
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
            style={{ display: 'none' }}
          />
        </div>

        {/* Control Buttons */}
        {csvData.length > 0 && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <button
              className="btn btn-primary"
              onClick={processBarcodeLookup}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="loading"></span>
                  Processing... ({Math.round(progress)}%)
                </>
              ) : (
                'Fetch Product Data'
              )}
            </button>
            
            <button
              className="btn btn-success"
              onClick={downloadEnhancedExcel}
              disabled={isProcessing}
            >
              📊 Download Excel with Images
            </button>
            
            <button
              className="btn btn-secondary"
              onClick={downloadEnhancedCSV}
              disabled={isProcessing}
            >
              📄 Download CSV (Links Only)
            </button>

            <button
              className="btn btn-secondary"
              onClick={fetchApiLimits}
              disabled={isProcessing}
              style={{ marginLeft: '10px' }}
            >
              🔍 Check API Limits
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {isProcessing && (
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        {/* Data Table */}
        {csvData.length > 0 && (
          <div className="table-container">
            <h3>CSV Data ({csvData.length} rows)</h3>
            <table className="data-table">
              <thead>
                <tr>
                  {originalHeaders.map(header => (
                    <th key={header}>{header}</th>
                  ))}
                  <th>Product Image</th>
                  <th>Retail Price</th>
                  <th>Product Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 50).map((row, index) => (
                  <tr key={index}>
                    {originalHeaders.map(header => (
                      <td key={header}>{row[header] || ''}</td>
                    ))}
                    <td>
                      {row.ProductImage ? (
                        <img 
                          src={row.ProductImage} 
                          alt={row.ProductTitle || 'Product'} 
                          className="product-image"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik0yNSAxNUMyMC4wMyAxNSAxNiAxOS4wMyAxNiAyNEMxNiAyOC45NyAyMC4wMyAzMyAyNSAzM0MyOS45NyAzMyAzNCAyOC45NyAzNCAyNEMzNCAyMC42IDMyIDEwIDI1IDE1WiIgZmlsbD0iIzk5OTk5OSIvPgo8L3N2Zz4K'
                            target.alt = 'No image'
                          }}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (row.ProductImage) {
                              window.open(row.ProductImage, '_blank')
                            }
                          }}
                        />
                      ) : (
                        <div className="no-image">No Image</div>
                      )}
                    </td>
                    <td>{row.RetailPrice || '-'}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.ProductTitle || '-'}
                    </td>
                    <td>
                      {getStatusBadge(row.Status)}
                      {row.ErrorMessage && (
                        <div style={{ fontSize: '0.8rem', color: '#dc3545', marginTop: '4px' }}>
                          {row.ErrorMessage}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {csvData.length > 50 && (
              <p style={{ textAlign: 'center', margin: '10px', color: '#666' }}>
                Showing first 50 rows. All {csvData.length} rows will be processed and downloaded.
              </p>
            )}
          </div>
        )}

        {csvData.length === 0 && (
          <div className="alert alert-info">
            <h4>Welcome to the Barcode Lookup Tool!</h4>
            <p>This tool helps you enhance your product CSV files with images and retail prices.</p>
            <ol>
              <li>Upload a CSV file containing UPC codes</li>
              <li>Click "Fetch Product Data" to get images and prices</li>
              <li>Download the enhanced CSV with all the new data</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  )
} 