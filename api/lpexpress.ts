import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE = 'https://api-manosiuntos.post.lt';
const USERNAME = 'info@beautybyella.lt';
const PASSWORD = 'Benukas1';

async function getAccessToken() {
  console.log('🔐 Fetching access token...');
  const tokenRes = await fetch(`${API_BASE}/oauth/token?grant_type=password&username=${USERNAME}&password=${PASSWORD}&scope=read%2Bwrite%2BAPI_CLIENT`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const tokenJson = await tokenRes.json();
  console.log('✅ Token response:', tokenJson);
  return tokenJson.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    console.log(`📥 Incoming ${req.method} request`);
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ Token fetch failed');
      return res.status(500).json({ error: 'Failed to get access token' });
    }

    if (req.method === 'GET') {
      const terminalsRes = await fetch(`${API_BASE}/api/v2/terminal?receiverCountryCode=LT`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const terminals = await terminalsRes.json();
      console.log(`✅ Terminals fetched (${terminals.length})`);
      return res.status(200).json(terminals);
    }

    if (req.method === 'POST') {
      const body = req.body;
      console.log('📨 POST body:', JSON.stringify(body, null, 2));

      if (body.action === 'createSenderAddress') {
        console.log('🏢 Creating sender address at:', `${API_BASE}/api/v2/address`);
        const addressRes = await fetch(`${API_BASE}/api/v2/address`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body.sender),
        });

        const addressResult = await addressRes.text(); // read raw to log errors
        console.log(`📬 Sender address response code: ${addressRes.status}`);
        console.log('📬 Sender address response body:', addressResult);

        // Try parsing if possible
        let parsedResult;
        try {
          parsedResult = JSON.parse(addressResult);
        } catch {
          parsedResult = { raw: addressResult };
        }

        return res.status(addressRes.status).json(parsedResult);
      }

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
        });

        const parcelResult = await parcelRes.json();
        if (!parcelRes.ok) {
          console.error('❌ Parcel creation failed:', parcelResult);
          return res.status(parcelRes.status).json({ error: 'Parcel creation failed', details: parcelResult });
        }

        console.log('✅ Parcel created:', parcelResult);
        return res.status(parcelRes.status).json(parcelResult);
      }

      if (body.action === 'initiateShipping') {
        const shipRes = await fetch(`${API_BASE}/api/v2/shipping/initiate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idRefs: [body.orderId] }),
        });
        const result = await shipRes.json();
        return res.status(shipRes.status).json(result);
      }

      if (body.action === 'getShippingLabel') {
        const labelRes = await fetch(`${API_BASE}/api/v2/sticker/pdf?idRefs=${body.orderId}&layout=LAYOUT_10x15`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });

        const buffer = await labelRes.arrayBuffer();
        res.setHeader('Content-Type', 'application/pdf');
        return res.status(200).send(Buffer.from(buffer));
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('🔥 API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
