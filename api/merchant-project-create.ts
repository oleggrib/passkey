import type { VercelRequest, VercelResponse } from '@vercel/node'
import { storeMerchantApiKey } from '../src/db'
import { withCORS } from './cors'

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { projectName, username, cardColor } = req.body
  if (!projectName || !username) {
    return res.status(400).json({ error: 'Missing projectName or username' })
  }

  try {
    const headers = new Headers()
    headers.append('Content-Type', 'application/json')
    if (process.env.BEARER_TOKEN) {
      headers.append('Authorization', `Bearer ${process.env.BEARER_TOKEN}`)
    }

    // Step 1: Create the project to get an API key
    const projectResponse = await fetch(
      `${process.env.WALLET_PASS_URL}/projects`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ project: projectName }),
      }
    )

    const projectData = await projectResponse.json()

    if (!projectResponse.ok) {
      return res.status(projectResponse.status).json({
        success: false,
        message: projectData.message || 'Error creating project',
      })
    }

    // Step 1.5: Store the API key
    if (projectData.apiKey) {
      await storeMerchantApiKey(username, projectData.apiKey)
    }

    console.log(`projectData: ${JSON.stringify(projectData)}`)

    // Step 2: Create the issuer
    const issuerResponse = await fetch(
      `${process.env.WALLET_PASS_URL}/merchant-logins/create-issuer`,
      {
        method: 'POST',
        headers: headers, // Re-using the same headers
        body: JSON.stringify({
          username: username,
          cardName: projectName,
          projectId: projectData.id,
        }),
      }
    )

    const issuerData = await issuerResponse.json()

    if (!issuerResponse.ok) {
      return res.status(issuerResponse.status).json({
        success: false,
        message: issuerData.message || 'Error creating issuer',
      })
    }

    // return response: issuerId, collectorId, cardSlug

    const cardSlug = issuerData.cardSlug
    const iconUrl =
      'https://pub-17883891749c4dd484fccf6780697b62.r2.dev/metadataemp/passkey-modified.png'

    // step 3: generate the pass for the issuer
    // args: cardSlug
    const passGenerateResponse = await fetch(
      `${process.env.WALLET_PASS_URL}/merchant-logins/register-card`,
      {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          cardSlug: cardSlug,
          cardIcon: iconUrl,
          cardColor: cardColor,
        }),
      }
    )

    const passGenerateData = await passGenerateResponse.json()

    if (!passGenerateResponse.ok) {
      return res.status(passGenerateResponse.status).json({
        success: false,
        message: passGenerateData.message || 'Error generating pass',
      })
    }

    // Return the successful response from the second call
    return res
      .status(200)
      .json({ success: true, ...issuerData, ...passGenerateData })
  } catch (error: any) {
    console.error('Project creation process error:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' })
  }
}

export default withCORS(handler)
