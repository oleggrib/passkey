import type { VercelRequest, VercelResponse } from '@vercel/node'

export function enableCORS(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-stl-key'
    )
    res.setHeader('Access-Control-Max-Age', '86400')
    return true // Indicates this was a preflight request
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  )
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-stl-key'
  )

  return false // Indicates this was not a preflight request
}

export function withCORS(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const isPreflight = enableCORS(req, res)

    if (isPreflight) {
      return res.status(200).end()
    }

    return handler(req, res)
  }
}
