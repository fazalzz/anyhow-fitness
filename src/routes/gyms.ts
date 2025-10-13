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
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching gyms:', error);
    res.status(500).json({ error: 'Failed to fetch gyms' });
  }
});

export default router;