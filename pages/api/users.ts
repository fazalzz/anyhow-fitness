export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      // Return current user info
      const mockUser = { 
        id: 'user_123',
        displayName: 'Fitness User',
        phoneNumber: '12345678',
        email: 'user@example.com',
        avatar: null,
        isPrivate: false,
        createdAt: new Date().toISOString()
      };
      res.status(200).json(mockUser);
      
    } else if (req.method === 'POST') {
      const { displayName, phoneNumber, email } = req.body;
      
      if (!displayName || !phoneNumber) {
        return res.status(400).json({ error: 'Display name and phone number are required' });
      }
      
      const newUser = {
        id: `user_${Date.now()}`,
        displayName,
        phoneNumber,
        email: email || '',
        avatar: null,
        isPrivate: false,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json(newUser);
      
    } else if (req.method === 'PUT') {
      const { id, ...updateData } = req.body;
      
      const updatedUser = {
        id: id || 'user_123',
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      res.status(200).json(updatedUser);
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}