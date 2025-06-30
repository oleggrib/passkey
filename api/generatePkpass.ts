// /api/jwtToken.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { withCORS } from './cors'
//import { GoogleAuth } from 'google-auth-library';
//import jwt from 'jsonwebtoken'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // this function now just calls an API service to create a pass
  // the remote API will call the wallet-pass-callback API to store the pass
  const { campaign, ethAddress, cardId, templateId } = req.body

  //need a database of cardId to templateId
  //const templateId = 'fa19039a-7e3e-45ed-af60-c1b319b054cb'
  const useTemplateId = templateId || 'fa19039a-7e3e-45ed-af60-c1b319b054cb'

  const passPayload = {
    id: `${cardId}-${ethAddress}`,
    callbackUrl: `${process.env.ROOT_URL}/api/wallet-pass-callback`,
    params: {
      templateId: useTemplateId,
      platform: 'apple',
      externalId: `${cardId}-${ethAddress}`,
      pass: {
        description: `${campaign}`,
        backFields: [
          {
            key: 'website',
            label: 'Link',
            attributedValue: 'Website',
            value: `${process.env.ROOT_URL}/home?card_id=${cardId}`,
          },
        ],
        secondaryFields: [
          {
            key: 'points',
            textAlignment: 'PKTextAlignmentLeft',
            label: 'Points',
            value: '0',
          },
        ],
        auxiliaryFields: [
          {
            key: 'tier',
            label: 'Tier',
            value: 'Appreciator',
          },
          {
            key: 'userAddr',
            label: 'Member Address',
            value: `${ethAddress}`,
          },
        ],
      },
    },
  }

  /*const passPayload = {
    id: `${cardId}-${ethAddress}`,
    callbackUrl: `${process.env.ROOT_URL}/api/wallet-pass-callback`,
    params: {
      templateId: templateId,
      platform: 'apple',
      barcode: {
        redirect: {
          url: `${process.env.ROOT_URL}`,
        },
        altText: `${campaign}`,
      },
      externalId: `${cardId}-${ethAddress}`,
      pass: {
        description: `${campaign} Demo`,
        backFields: [
          {
            key: 'website',
            label: 'Link',
            attributedValue: 'Website',
            value: `${process.env.ROOT_URL}/home?campaign=${campaign}&card_id=${cardId}`,
          },
        ],
        secondaryFields: [
          {
            key: 'points',
            textAlignment: 'PKTextAlignmentLeft',
            label: 'Points',
            value: '0',
          },
        ],
        auxiliaryFields: [
          {
            key: 'tier',
            label: 'Tier',
            value: 'Appreciator',
          },
          {
            key: 'userAddr',
            label: 'Member Address',
            value: `${ethAddress}`,
          },
        ],
      },
    },
  }*/

  console.log(`Pass Payload: ${JSON.stringify(passPayload)}`)

  const myHeaders = new Headers()
  myHeaders.append('x-stl-key', `${process.env.X_STL_KEY}`)
  myHeaders.append('Content-Type', 'application/json')
  if (process.env.BEARER_TOKEN) {
    myHeaders.append('Authorization', `Bearer ${process.env.BEARER_TOKEN}`)
  }

  const response = await fetch(`${process.env.WALLET_PASS_URL}/wallet-passes`, {
    method: 'POST',
    body: JSON.stringify(passPayload),
    headers: myHeaders,
    redirect: 'follow',
  })

  let data
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text() // fallback to text
    //now parse to JSON
    try {
      data = JSON.parse(data)
    } catch (e) {
      console.error('Error parsing JSON:', e)
    }
  }

  console.log(`Response: ${JSON.stringify(data)}`)

  if (!response.ok) {
    // Optionally log or throw a more descriptive error
    console.error('API error:', data)
    return res.status(response.status).json({ error: data })
  }

  res.status(200).json(data)
}

export default withCORS(handler)
