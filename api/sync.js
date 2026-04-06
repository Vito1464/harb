export default async function handler(req, res) {
  const { db } = req.query;
  
  const blobInfo = {
    actors: '019d6038-22d0-771f-a49c-9956b8edd9f4',
    campaign: '019d6038-2a7a-732c-b8ee-50e5800a8e94'
  };
  
  const id = blobInfo[db];
  if (!id) return res.status(400).json({ error: 'invalid db param' });

  if (req.method === 'GET') {
    try {
      const response = await fetch(`https://jsonblob.com/api/jsonBlob/${id}`);
      const data = await response.json();
      return res.status(200).json(data);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  } 
  
  if (req.method === 'POST') {
    try {
      const response = await fetch(`https://jsonblob.com/api/jsonBlob/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
