import type { NextApiRequest, NextApiResponse } from 'next'

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'chicago123'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  if (!password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Password is required' 
    })
  }

  if (password === AUTH_PASSWORD) {
    return res.status(200).json({ 
      success: true, 
      message: 'Authentication successful' 
    })
  } else {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid password' 
    })
  }
} 