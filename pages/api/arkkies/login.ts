export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    console.log('Arkkies login attempt:', email);

    // Mock successful login response - in production this would call the real Arkkies API
    const mockResponse = {
      success: true,
      sessionCookie: `ark_session=mock_session_${Date.now()}`,
      user: {
        id: `user_${Date.now()}`,
        email: email,
        name: 'Arkkies User'
      },
      message: 'Successfully logged into Arkkies'
    };

    console.log('Arkkies login successful');
    res.status(200).json(mockResponse);

  } catch (error) {
    console.error('Arkkies login error:', error);
    res.status(500).json({ 
      error: 'Failed to login to Arkkies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}