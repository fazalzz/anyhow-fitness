import { Request, Response } from 'express';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getUserCustomExercises = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT id, name, muscle_group, created_at FROM custom_exercises WHERE user_id = $1 ORDER BY name',
      [userId]
    );
    
    // Transform field names for frontend
    const transformedExercises = result.rows.map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscle_group,
      createdAt: exercise.created_at
    }));
    
    res.json(transformedExercises);
  } catch (error) {
    console.error('Get custom exercises error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCustomExercise = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, muscleGroup } = req.body;
    
    if (!name || !muscleGroup) {
      return res.status(400).json({ error: 'Name and muscle group are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO custom_exercises (user_id, name, muscle_group) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, muscle_group, created_at`,
      [userId, name.trim(), muscleGroup]
    );
    
    const exercise = result.rows[0];
    
    // Transform field names for frontend
    const transformedExercise = {
      id: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscle_group,
      createdAt: exercise.created_at
    };
    
    res.status(201).json(transformedExercise);
  } catch (error: any) {
    console.error('Create custom exercise error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Exercise with this name already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCustomExercise = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const { exerciseId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM custom_exercises WHERE id = $1 AND user_id = $2 RETURNING id',
      [exerciseId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom exercise not found' });
    }
    
    res.json({ message: 'Custom exercise deleted successfully' });
  } catch (error) {
    console.error('Delete custom exercise error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};