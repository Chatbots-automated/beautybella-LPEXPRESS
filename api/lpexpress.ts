import type { VercelRequest, VercelResponse } from '@vercel/node'

const API_BASE = 'https://api-manosiuntos.post.lt'
const USERNAME = 'info@beautybyella.lt'
const PASSWORD = 'Benukas1'

async function getAccessToken() {
  const tokenRes = await fetch(`${API_BASE}/oauth/token?grant_type=password&username=${USERNAME}&password=${PASSWORD}&scope=read%2Bwrite%2BAPI_CLIENT`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  const tokenJson = await tokenRes.json()
  return tokenJson.access_token
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const token = await getAccessToken()
    if (!token) return res.status(500).json({ error: 'Failed to get access token' })

    if (req.method === 'GET') {
      const terminalsRes = await fetch(`${API_BASE}/api/v2/terminal?receiverCountryCode=LT`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!terminalsRes.ok) {
        const error = await terminalsRes.text()
        console.error('Terminal fetch failed:', error)
        return res.status(500).json({ error: 'Failed to fetch terminals' })
      }
      const terminals = await terminalsRes.json()
      return res.status(200).json(terminals)
    }

    if (req.method === 'POST') {
      const body = req.body

      if (body.action === 'createParcel') {
        const parcelRes = await fetch(`${API_BASE}/api/v2/parcel`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idRef: body.idRef,
            plan: body.plan,
            parcel: body.parcel,
            receiver: body.receiver,
            senderAddressId: body.senderAddressId,
          }),
        })

        const result = await parcelRes.json()
        return res.status(parcelRes.status).json(result)
      }

      if (body.action === 'initiateShipping') {
        const shipRes = await fetch(`${API_BASE}/api/v2/shipping/initiate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idRefs: [body.orderId] }),
        })

        const result = await shipRes.json()
        return res.status(shipRes.status).json(result)
      }

      if (body.action === 'getShippingLabel') {
        const labelRes = await fetch(`${API_BASE}/api/v2/sticker/pdf?idRefs=${body.orderId}&layout=LAYOUT_10x15`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!labelRes.ok) {
          const errorText = await labelRes.text()
          console.error('Label fetch failed:', labelRes.status, errorText)
          return res.status(500).json({ error: 'Failed to fetch shipping label' })
        }

        const buffer = await labelRes.arrayBuffer()
        res.setHeader('Content-Type', 'application/pdf')
        return res.status(200).send(Buffer.from(buffer))
      }

      return res.status(400).json({ error: 'Unknown action' })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (err: any) {
    console.error('API error:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
