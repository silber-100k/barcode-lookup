import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

const API_KEY = process.env.BARCODE_API_KEY || 'xxxx'
const API_BASE_URL = 'https://api.barcodelookup.com/v3/products'

interface BarcodeApiResponse {
  products: Array<{
    barcode_number: string
    title: string
    images: string[]
    stores: Array<{
      name: string
      price: string
      currency_symbol: string
      sale_price?: string
    }>
  }>
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { upc } = req.body

  if (!upc) {
    return res.status(400).json({ error: 'UPC is required' })
  }

  try {
    const apiUrl = `${API_BASE_URL}?barcode=${upc}&formatted=y&key=${API_KEY}`
    
    console.log(`Making API request for UPC: ${upc}`)
    
    const response = await axios.get<BarcodeApiResponse>(apiUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Barcode-Lookup-Tool/1.0'
      }
    })

    if (!response.data.products || response.data.products.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      })
    }

    const product = response.data.products[0]
    
    // Extract the first image
    const image = product.images && product.images.length > 0 
      ? product.images[0] 
      : null

    // Find the best price from stores
    let bestPrice: number | null = null
    let priceDisplay = 'N/A'
    
    if (product.stores && product.stores.length > 0) {
      // Look for the lowest price
      const prices = product.stores
        .map(store => {
          const price = store.sale_price || store.price
          return price ? parseFloat(price) : null
        })
        .filter((price): price is number => price !== null && !isNaN(price))

      if (prices.length > 0) {
        bestPrice = Math.min(...prices)
        const bestStore = product.stores.find(store => {
          const price = store.sale_price || store.price
          return price && parseFloat(price) === bestPrice
        })
        
        if (bestStore) {
          priceDisplay = `${bestStore.currency_symbol}${bestPrice.toFixed(2)}`
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        upc: product.barcode_number,
        title: product.title,
        image: image,
        price: priceDisplay,
        rawData: {
          stores: product.stores?.slice(0, 3), // Include top 3 stores for reference
          totalStores: product.stores?.length || 0
        }
      }
    })

  } catch (error: any) {
    console.error('Barcode API Error:', error.message)
    
    if (error.response) {
      // The request was made and server responded with error status
      const status = error.response.status
      const message = error.response.data?.message || error.response.statusText
      
      if (status === 429) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please wait before making more requests.'
        })
      } else if (status === 401) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API key'
        })
      } else {
        return res.status(status).json({
          success: false,
          error: `API Error: ${message}`
        })
      }
    } else if (error.request) {
      // Request was made but no response received
      return res.status(500).json({
        success: false,
        error: 'Network error - unable to reach barcode API'
      })
    } else {
      // Something else happened
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
} 