export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      // Return mock posts data
      const mockPosts = [
        {
          id: 1,
          title: 'Welcome to Anyhow Fitness',
          content: 'Getting started with your fitness journey',
          author: 'Admin',
          createdAt: new Date().toISOString(),
          likes: 5
        }
      ];
      res.status(200).json(mockPosts);
      
    } else if (req.method === 'POST') {
      const { title, content, author } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
      
      const newPost = { 
        id: Date.now(), 
        title,
        content,
        author: author || 'Anonymous',
        createdAt: new Date().toISOString(),
        likes: 0
      };
      
      res.status(201).json(newPost);
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Posts API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}