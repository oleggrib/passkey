import {
  type Component,
  Show,
  onMount,
  createSignal,
  createMemo,
} from 'solid-js'
import { writeClipboard } from '@solid-primitives/clipboard'
import { Navigate, useLocation } from '@solidjs/router'
import toast from 'solid-toast'
import { useAuthData } from '../hooks/localStorage'
import { truncateMiddle } from '../utils'
import { useSearchParams } from '@solidjs/router'
import { passkeyWalletAddress, setPasskeyWalletAddress } from '../passkey/store'
import { cardId, updateCardId } from '../card/store'

// Dont need that, QR code can be read by the user. QR code contains card_id and campaign

// import { createQuery } from '@tanstack/solid-query'
// import { formatEther } from 'ethers/lib/utils'
// import { useProvider } from '../hooks/provider'
// import { Chains } from '../chains'
// import { produce } from 'solid-js/store'
// import { type connectCallback } from '@joyid/evm'

//construct a pass JSON

// Add a signal for pass loading spinner
const [isLoadingPass, setIsLoadingPass] = createSignal(false)

function generatePass(
  campaign: string,
  ethAddress: string,
  cardId: string,
  platform: string
) {
  return async () => {
    setIsLoadingPass(true)
    try {
      const externalId = `${cardId}-${ethAddress}`
      let sseResolved = false

      // Promise that resolves when SSE returns fileURL
      const ssePromise = new Promise((resolve, reject) => {
        const evtSource = new EventSource(
          `/api/wallet-pass-callback?id=${externalId}`
        )

        evtSource.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.fileURL) {
              sseResolved = true
              evtSource.close()
              resolve(data.fileURL)
            }
          } catch (err) {
            evtSource.close()
            reject(err)
          }
        })

        evtSource.addEventListener('error', (event) => {
          if (!sseResolved) {
            evtSource.close()
            reject(new Error('SSE error or timeout'))
          }
        })
      })

      // Timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for pass')), 10_000)
      )

      const url =
        (import.meta.env.VITE_PUBLIC_BACKEND_ROOT ||
          'https://openpasskeywallet-ckb-demo.vercel.app') +
        (platform === 'google' ? '/api/jwtToken' : '/api/generatePkpass')

      // Trigger the backend to start the pass creation process

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, ethAddress, cardId, baseUrl: window.location.origin }),
      })

      if (!res.ok) {
        toast.error('Error: ' + res.statusText, { position: 'bottom-center' })
        setIsLoadingPass(false)
        return
      }

      toast.success('Pass created successfully, please wait', {
        position: 'bottom-center',
      })

      // Wait for either SSE or timeout
      const fileURL = await Promise.race([ssePromise, timeoutPromise])
      window.location.href = fileURL as string
    } catch (err: any) {
      toast.error(err.message || 'Network error', { position: 'bottom-center' })
    } finally {
      setIsLoadingPass(false)
    }
  }
}

function getMobileOS() {
  const userAgent = window.navigator.userAgent || ''
  if (/android/i.test(userAgent)) {
    return 'android'
  }
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios'
  }
  return userAgent
}

export const Home: Component = () => {
  // Get campaign marker from navigation state (passed from root)
  const [searchParams] = useSearchParams()

  // State for fetched campaign data
  const [fetchedCampaign, setFetchedCampaign] = createSignal('')
  const [isLoadingCampaign, setIsLoadingCampaign] = createSignal(false)

  // Function to fetch campaign data from API
  const fetchCampaignData = async (cardSlug: string) => {
    if (!cardSlug) return

    setIsLoadingCampaign(true)
    try {
      const cardData = await fetch(
        `/api/cardData?cardSlug=${encodeURIComponent(cardSlug)}`
      )
      if (cardData.ok) {
        const data = await cardData.json()
        console.log('Fetched card data:', data)
        if (data.cardName) {
          setFetchedCampaign(data.cardName)
          console.log('Fetched campaign after set:', fetchedCampaign())
        } else {
          setFetchedCampaign('No campaign found')
        }
      } else {
        console.error('Failed to fetch card data:', cardData.status)
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error)
    } finally {
      setIsLoadingCampaign(false)
    }
  }

  // Fetch campaign data when cardId is available
  onMount(() => {
    updateCardId(searchParams)
    if (cardId()) {
      console.log('Fetching campaign data for cardId:', cardId())
      fetchCampaignData(cardId())
    }
  })

  // Use fetched campaign data only
  const displayCampaign = createMemo(() => {
    const campaign = fetchedCampaign()
    console.log('Computed display campaign:', campaign)
    return campaign
  })

  const getAndroidPass = generatePass(
    displayCampaign(),
    passkeyWalletAddress.address,
    cardId(),
    'google'
  )
  const getiOSPass = generatePass(
    displayCampaign(),
    passkeyWalletAddress.address,
    cardId(),
    'apple'
  )

  const handleClaim = () => {
    if (isLoadingPass()) {
      toast.error('Pass generation in progress, please wait', {
        position: 'bottom-center',
      })
      return
    }

    const os = getMobileOS()
    if (os === 'android') {
      getAndroidPass()
    } else if (os === 'ios') {
      getiOSPass()
    } else {
      toast.error(`Unsupported device: ${os}`, { position: 'bottom-center' })
    }
  }

  // Hard code to Base Sepolia (if you have a config, otherwise use EthSepolia)
  // const chain = Chains['BaseSepolia']

  return (
    <Show when={passkeyWalletAddress.address} fallback={<Navigate href="/" />}>
      <section class="flex-col flex items-center">
        <div class="stat">
          <div class="stat-title">EVM Account</div>
          <div class="stat-value">
            {truncateMiddle(passkeyWalletAddress.address)}
          </div>
          <div class="stat-actions mt-2">
            <button
              class="btn btn-xs btn-success btn-outline"
              onClick={() => {
                writeClipboard(passkeyWalletAddress.address)
                toast.success('Copied Successfully', {
                  position: 'bottom-center',
                })
              }}>
              Copy Address
            </button>
          </div>
          {displayCampaign() && (
            <div class="stat-desc mt-2 text-md">
              <span>Campaign: {displayCampaign()}</span>
              {isLoadingCampaign() && (
                <span class="ml-2 inline-block">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </span>
              )}
            </div>
          )}
        </div>
        <button
          class="btn btn-wide mt-8 btn-primary"
          onClick={handleClaim}
          disabled={isLoadingPass()}>
          {isLoadingPass() ? (
            <span class="flex items-center">
              <span class="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
              Generating Pass...
            </span>
          ) : (
            'CLAIM'
          )}
        </button>
        <button
          class="btn btn-wide btn-outline mt-8"
          onClick={() => {
            setPasskeyWalletAddress({ address: '' })
          }}>
          Disconnect Passkey
        </button>
      </section>
    </Show>
  )
}
