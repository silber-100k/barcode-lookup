import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

const API_KEY = process.env.BARCODE_API_KEY || 'eyd1zzyvki79syvxkprkkp1cp72j8y'
const RATE_LIMIT_URL = 'https://api.barcodelookup.com/v3/rate-limits'

interface RateLimitResponse {
  allowed_calls_per_month: string
  remaining_calls_per_month: string
  allowed_calls_per_minute: string
  remaining_calls_per_minute: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const apiUrl = `${RATE_LIMIT_URL}?formatted=y&key=${API_KEY}`
    
    console.log('Checking API rate limits...')
    
    const response = await axios.get<RateLimitResponse>(apiUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Barcode-Lookup-Tool/1.0'
      }
    })

    return res.status(200).json(response.data)

  } catch (error: any) {
    console.error('Rate Limit API Error:', error.message)
    
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || error.response.statusText
      
      return res.status(status).json({
        error: `Rate limit API Error: ${message}`
      })
    } else if (error.request) {
      return res.status(500).json({
        error: 'Network error - unable to reach rate limit API'
      })
    } else {
      return res.status(500).json({
        error: 'Internal server error'
      })
    }
  }
} 