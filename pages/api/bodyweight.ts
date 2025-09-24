export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      // Return mock bodyweight data
      const mockData = [
        { id: 1, weight: 70.5, date: new Date().toISOString(), userId: 'user_123' },
        { id: 2, weight: 71.0, date: new Date(Date.now() - 86400000).toISOString(), userId: 'user_123' }
      ];
      res.status(200).json(mockData);
      
    } else if (req.method === 'POST') {
      const { weight, userId } = req.body;
      
      if (!weight) {
        return res.status(400).json({ error: 'Weight is required' });
      }
      
      const newEntry = { 
        id: Date.now(), 
        weight: parseFloat(weight), 
        date: new Date().toISOString(),
        userId: userId || 'user_123'
      };
      
      res.status(201).json(newEntry);
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Bodyweight API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}