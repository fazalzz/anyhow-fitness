import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

const router = Router();

// Get all gyms and branches accessible to the user
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const query = `
      SELECT 
        g.id as gym_id,
        g.name as gym_name,
        g.is_system_gym,
        gb.id as branch_id,
        gb.name as branch_name,
        gb.full_name as branch_full_name,
        gb.address
      FROM gyms g
      INNER JOIN gym_branches gb ON g.id = gb.gym_id
      LEFT JOIN user_gym_access uga ON g.id = uga.gym_id AND uga.user_id = $1
      WHERE g.is_system_gym = TRUE OR uga.user_id = $1
      ORDER BY g.is_system_gym DESC, g.name ASC, gb.name ASC
    `;
    
    const result = await db.query(query, [userId]);
    
    // Group branches by gym
    const gymsMap = new Map();
    result.rows.forEach((row: any) => {
      if (!gymsMap.has(row.gym_id)) {
        gymsMap.set(row.gym_id, {
          id: row.gym_id,
          name: row.gym_name,
          isSystemGym: row.is_system_gym,
          branches: []
        });
      }
      
      gymsMap.get(row.gym_id).branches.push({
        id: row.branch_id,
        name: row.branch_name,
        fullName: row.branch_full_name,
        address: row.address
      });
    });
    
    const gyms = Array.from(gymsMap.values());
    res.json(gyms);
  } catch (error) {
    console.error('Error fetching gyms:', error);
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

// Create a new gym
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name } = req.body;
    
    console.log('Creating gym with userId:', userId, 'name:', name);
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Gym name is required' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found in token' });
    }
    
    const gymResult = await db.query(
      'INSERT INTO gyms (name, created_by) VALUES ($1, $2) RETURNING *',
      [name.trim(), userId]
    );
    
    const gym = gymResult.rows[0];
    console.log('Gym created:', gym);
    
    // Grant access to the creator
    await db.query(
      'INSERT INTO user_gym_access (user_id, gym_id) VALUES ($1, $2)',
      [userId, gym.id]
    );
    
    const response = {
      id: gym.id,
      name: gym.name,
      isSystemGym: gym.is_system_gym,
      branches: []
    };
    
    console.log('Sending gym response:', response);
    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating gym:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to create gym', details: error.message });
  }
});

// Add a branch to a gym
router.post('/:gymId/branches', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { gymId } = req.params;
    const { name, address } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Branch name is required' });
    }
    
    // Check if user has access to this gym
    const accessCheck = await db.query(
      `SELECT g.name as gym_name FROM gyms g 
       LEFT JOIN user_gym_access uga ON g.id = uga.gym_id AND uga.user_id = $1
       WHERE g.id = $2 AND (g.is_system_gym = TRUE OR uga.user_id = $1)`,
      [userId, gymId]
    );
    
    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Gym not found or access denied' });
    }
    
    const gymName = accessCheck.rows[0].gym_name;
    const fullName = `${gymName} - ${name.trim()}`;
    
    const branchResult = await db.query(
      'INSERT INTO gym_branches (gym_id, name, full_name, address, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [gymId, name.trim(), fullName, address?.trim() || null, userId]
    );
    
    const branch = branchResult.rows[0];
    
    res.status(201).json({
      id: branch.id,
      name: branch.name,
      fullName: branch.full_name,
      address: branch.address
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// Get all branch options for dropdowns (flattened list)
router.get('/branches', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const query = `
      SELECT 
        gb.id,
        gb.full_name as name,
        g.name as gym_name,
        gb.address
      FROM gym_branches gb
      INNER JOIN gyms g ON gb.gym_id = g.id
      LEFT JOIN user_gym_access uga ON g.id = uga.gym_id AND uga.user_id = $1
      WHERE g.is_system_gym = TRUE OR uga.user_id = $1
      ORDER BY g.is_system_gym DESC, gb.full_name ASC
    `;
    
    const result = await db.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching gym branches:', error);
    res.status(500).json({ error: 'Failed to fetch gym branches' });
  }
});

export default router;
