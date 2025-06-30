import { createSignal, onMount } from 'solid-js'

export default function MerchantRedemption() {
  const [redemptionData, setRedemptionData] = createSignal('')
  const [projectName, setProjectName] = createSignal('')
  const [cardColor, setCardColor] = createSignal('#E1AD01')
  const [cardSlug, setCardSlug] = createSignal('')
  const [qrCodeUrl, setQrCodeUrl] = createSignal('')
  const [campaignLink, setCampaignLink] = createSignal('')
  const [isGeneratingQR, setIsGeneratingQR] = createSignal(false)

  onMount(() => {
    if (typeof window !== 'undefined') {
      const project = localStorage.getItem('merchantProjectName')
      const color = localStorage.getItem('merchantCardColor')
      console.log('Reading from localStorage:', { project, color })

      setProjectName(project || '1')
      setCardColor(color || '#E1AD01')
    }
  })

  const generateQRCode = (url: string) => {
    // Using a simple QR code service - you can replace with a more sophisticated library
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
  }

  const handleSave = async (e: Event) => {
    e.preventDefault()

    const username = localStorage.getItem('merchantUsername')
    if (!username) {
      alert('Error: Not logged in. Cannot get username.')
      return
    }

    setIsGeneratingQR(true)

    const res = await fetch('/api/merchant-project-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: projectName(),
        username: username,
        cardColor: cardColor(),
      }),
    })

    const data = await res.json()

    if (data.success) {
      console.log('Project and Issuer created successfully:', data)

      // Extract cardSlug from the response
      if (data.cardSlug) {
        setCardSlug(data.cardSlug)

        // Create the campaign link
        const link = `${process.env.ROOT_URL}?card_id=${data.cardSlug}`
        setCampaignLink(link)

        // Generate QR code for the link
        const qrCode = generateQRCode(link)
        setQrCodeUrl(qrCode)

        alert(
          `Project created! Issuer ID: ${data.issuerId}, Collector ID: ${data.collectorId}, Card Slug: ${data.cardSlug}`
        )
      } else {
        alert(
          `Project created! Issuer ID: ${data.issuerId}, Collector ID: ${data.collectorId}`
        )
      }
    } else {
      console.error('Failed to create project:', data.message)
      alert(`Error: ${data.message}`)
    }

    setIsGeneratingQR(false)
  }

  return (
    <div class="flex flex-col items-center mt-16">
      <h2 class="text-2xl mb-4">Redemption Data</h2>

      <form class="flex flex-col items-center mb-8" onSubmit={handleSave}>
        <div class="mb-2">
          Project Name: <span class="font-bold">{projectName()}</span>
        </div>
        <div class="mb-4 flex items-center">
          Card Colour:{' '}
          <span
            class="inline-block w-6 h-6 rounded ml-2"
            style={{ 'background-color': cardColor() }}></span>{' '}
          <span class="ml-2">{cardColor()}</span>
        </div>
        <textarea
          class="textarea textarea-bordered mb-4"
          placeholder="Enter redemption instructions or data (optional)"
          value={redemptionData()}
          onInput={(e) => setRedemptionData(e.currentTarget.value)}
        />
        <button class="btn btn-primary" type="submit">
          Create
        </button>
      </form>

      {/* Display QR Code and Link after successful creation */}
      {cardSlug() && (
        <div class="flex flex-col items-center space-y-4">
          <h3 class="text-xl font-semibold">Campaign Link & QR Code</h3>

          <div class="text-center">
            <p class="mb-2 font-medium">Campaign Link:</p>
            <a
              href={campaignLink()}
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 underline break-all">
              {campaignLink()}
            </a>
          </div>

          {qrCodeUrl() && (
            <div class="text-center">
              <p class="mb-2 font-medium">QR Code:</p>
              <img
                src={qrCodeUrl()}
                alt="Campaign QR Code"
                class="border border-gray-300 rounded"
              />
            </div>
          )}

          {isGeneratingQR() && !qrCodeUrl() && (
            <div class="text-center">
              <p class="mb-2 font-medium">QR Code:</p>
              <div class="flex justify-center items-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              </div>
              <p class="text-sm text-gray-500 mt-2">Generating QR Code...</p>
            </div>
          )}

          <div class="text-sm text-gray-600 mt-4">
            <p>
              Card Slug: <span class="font-mono">{cardSlug()}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
