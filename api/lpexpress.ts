import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  try {
    // Step 1: Get access token
    const tokenResponse = await fetch('https://api-manosiuntos.post.lt/oauth/token?grant_type=password&username=beautybyella.lt&password=Benukas1&scope=read%2Bwrite%2BAPI_CLIENT', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const tokenData = await tokenResponse.json()
    const token = tokenData.access_token

    // Step 2: Fetch terminal list
    const terminalsResponse = await fetch('https://api-manosiuntos.post.lt/api/v2/reference/parcel-terminal', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const terminals = await terminalsResponse.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    return res.status(200).json(terminals)
  } catch (err: any) {
    console.error('Error fetching terminals:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
