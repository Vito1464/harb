export default async function handler(req, res) {
  const { db } = req.query;
  
  const blobInfo = {
    actors: '019d65f5-d5d9-7686-8d37-cc3fa0442e58',
    campaign: '019d65f8-2afe-72f2-a3fa-e6d5b48bf0d0'
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
