// /api/jwtToken.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCORS } from './cors'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { cardSlug } = req.query

  console.log(`cardSlug: ${cardSlug}`)

  const myHeaders = new Headers()
  myHeaders.append('x-stl-key', `${process.env.X_STL_KEY}`)
  myHeaders.append('Content-Type', 'application/json')
  if (process.env.BEARER_TOKEN) {
    myHeaders.append('Authorization', `Bearer ${process.env.BEARER_TOKEN}`)
  }

  //fetch card slug using /merchant-logins/get-data/<cardSlug>
  const cardData = await fetch(
    `${process.env.WALLET_PASS_URL}/merchant-logins/get-data/${cardSlug}`,
    {
      method: 'GET',
      headers: myHeaders,
    }
  )

  const data = await cardData.json()
  res.status(200).json(data)
}

export default withCORS(handler)
