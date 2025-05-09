import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  try {
    // Get access token
    const tokenRes = await fetch('https://api-manosiuntos.post.lt/oauth/token?grant_type=password&username=info@beautybyella.lt&password=Benukas1&scope=read%2Bwrite%2BAPI_CLIENT', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const tokenJson = await tokenRes.json()
    const token = tokenJson.access_token

    if (!token) {
      console.error('Token fetch failed:', tokenJson)
      return res.status(500).json({ error: 'Failed to get access token' })
    }

    // Fetch LP EXPRESS terminals
    const terminalsRes = await fetch('https://api-manosiuntos.post.lt/api/v2/terminal?receiverCountryCode=LT', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!terminalsRes.ok) {
      const errorText = await terminalsRes.text()
      console.error('Terminal fetch failed:', terminalsRes.status, errorText)
      return res.status(500).json({ error: 'Failed to fetch terminals' })
    }

    const terminals = await terminalsRes.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(terminals)
  } catch (err: any) {
    console.error('Error fetching terminals:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
