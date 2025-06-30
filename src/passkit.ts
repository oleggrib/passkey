import fs from 'node:fs'
import path from 'node:path'
import { PKPass } from 'passkit-generator'
import { VercelResponse } from '@vercel/node'

export interface PassDetails {
  ethAddress: string
  cardId: string
  campaign: string
}

export function parseSerialNumber(
  serialNumber: string,
  campaign: string
): PassDetails {
  const ethAddress = serialNumber.split('-')[1]
  const cardId = serialNumber.split('-')[0]

  console.log('ethAddress:', ethAddress)
  console.log('cardId:', cardId)
  console.log('campaign:', campaign)

  return { ethAddress, cardId, campaign }
}

export async function copyPassAssetsToTmp(tempDir: string) {
  const assetFiles = [
    'icon.png',
    'logo.png',
    'icon@2x.png',
    'icon@3x.png',
    'logo@2x.png',
    'logo@3x.png',
  ]
  console.log('process.cwd():', __dirname)
  const srcDir = path.join(__dirname, 'pass-assets')
  console.log('Looking for assets in:', srcDir)
  console.log('Directory exists:', fs.existsSync(srcDir))
  if (fs.existsSync(srcDir)) {
    console.log('Files in asset dir:', fs.readdirSync(srcDir))
  }

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  for (const file of assetFiles) {
    const src = path.join(srcDir, file)
    const dest = path.join(tempDir, file)
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest)
    } else {
      throw new Error(`Missing asset: ${src}`)
    }
  }
}

export async function createApplePass(
  campaign: string,
  ethAddress: string,
  cardId: string,
  tempDir: string,
  balance: string
): Promise<string> {
  const passJsonPath = `${tempDir}/pass.json`

  // Ensure the temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }

  await copyPassAssetsToTmp(tempDir)

  //create UID for serial number
  const uid = `${cardId}-${ethAddress}`

  const pass = {
    description: `Loyalty card for ${campaign}`,
    formatVersion: 1,
    organizationName: `${campaign}`,
    passTypeIdentifier: 'pass.com.stl-example.coffee-loyalty-1',
    serialNumber: uid,
    webServiceURL: 'https://openpasskeywallet-ckb-demo.vercel.app/api/passes/',
    authenticationToken: process.env.APPLE_UID_TOKEN,
    teamIdentifier: 'LRAW5PL536',
    storeCard: {
      primaryFields: [
        {
          key: 'points',
          label: 'Points',
          value: balance,
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
    backgroundColor: 'rgb(225, 173, 1)',
    logoText: `${campaign}`,
  }

  console.log('pass:', pass)

  //now store the json to /temp directory
  fs.writeFileSync(passJsonPath, JSON.stringify(pass, null, 2))

  const wwdr = Buffer.from(process.env.APPLE_WWDR_PEM || '', 'utf8')
  const signerCert = Buffer.from(
    process.env.APPLE_SIGNER_CERT_PEM || '',
    'utf8'
  )
  const signerKey = Buffer.from(process.env.APPLE_SIGNER_KEY_PEM || '', 'utf8')

  // Now generate the pass
  const passFull = await PKPass.from(
    {
      model: tempDir,
      certificates: {
        wwdr: wwdr,
        signerCert: signerCert,
        signerKey: signerKey,
      },
    },
    {
      // keys to be added or overridden
      serialNumber: uid,
    }
  )

  passFull.setBarcodes({
    message: `${uid}`,
    format: 'PKBarcodeFormatQR',
  })

  // Save the .pkpass file
  const outPath = `/tmp/${uid}.pkpass`
  const stream = passFull.getAsStream()
  const outStream = stream.pipe(fs.createWriteStream(outPath))
  stream.pipe(outStream)

  await new Promise((resolve, reject) => {
    outStream.on('finish', resolve)
    outStream.on('error', reject)
  })

  console.log(`Pass saved to ${outPath}`)
  return outPath
}

export async function servePass(
  pkpassPath: string,
  tempDir: string,
  res: VercelResponse
) {
  // Read the .pkpass file as a buffer
  const pkpassBuffer = fs.readFileSync(pkpassPath)

  console.log('PKPass buffer length:', pkpassBuffer.length)

  // Set headers for file download
  res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
  res.setHeader('Content-Disposition', 'attachment; filename="card.pkpass"')

  // Cleanup the served object after response is sent
  res.on('finish', async () => {
    try {
      //cleanup temp dir, remove temp dir and all files in it
      await fs.promises.rm(tempDir, { recursive: true, force: true })
      await fs.promises.rm(pkpassPath, { force: true })
      console.log('Cleanup complete')
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  })

  res.status(200).send(pkpassBuffer)
}
