import { Request, Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { hasAccessToUserData } from '../utils/authorization';

// Types for database results
interface DatabaseWorkout {
  id: string;
  user_id: string;
  date: string;
  branch: string;
  exercises: DatabaseExercise[] | null;
}

interface DatabaseExercise {
  id: string;
  exercise_id: string;
  variation: string;
  brand: string;
  sets: DatabaseSet[] | null;
}

interface DatabaseSet {
  id: string;
  weight: number;
  reps: number;
  pin_weight: number | null;
  is_pr: boolean;
}

// Types for request body
interface RequestExercise {
  exerciseId: string;
  variation: string;
  brand: string;
  sets: RequestSet[];
}

interface RequestSet {
  weight: number;
  reps: number;
  pinWeight?: number;
  isPR: boolean;
}

export const getUserWorkouts = async (req: AuthRequest, res: Response) => {
  try {
    const requesterId = req.user.id;
    const targetUserId = req.params.userId;

    // Check if requester has access to target user's data
    const hasAccess = await hasAccessToUserData(requesterId, targetUserId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT w.*, 
              json_agg(
                DISTINCT jsonb_build_object(
                  'id', le.id,
                  'exercise_id', le.exercise_id,
                  'variation', le.variation,
                  'brand', le.brand,
                  'sets', (
                    SELECT json_agg(
                      jsonb_build_object(
                        'id', es.id,
                        'weight', es.weight,
                        'reps', es.reps,
                        'pin_weight', es.pin_weight,
                        'is_pr', es.is_pr
                      )
                    )
                    FROM exercise_sets es
                    WHERE es.logged_exercise_id = le.id
                  )
                )
              ) as exercises
       FROM workouts w
       LEFT JOIN logged_exercises le ON w.id = le.workout_id
       WHERE w.user_id = $1
       GROUP BY w.id
       ORDER BY w.date DESC`,
      [targetUserId]
    );

    // Transform snake_case to camelCase for frontend
    const transformedWorkouts = result.rows.map((workout: DatabaseWorkout) => ({
      id: workout.id,
      userId: workout.user_id,
      date: workout.date,
      branch: workout.branch,
      exercises: workout.exercises?.filter((ex: DatabaseExercise) => ex.id).map((exercise: DatabaseExercise) => ({
        id: exercise.id,
        exerciseId: exercise.exercise_id,
        variation: exercise.variation,
        brand: exercise.brand,
        sets: exercise.sets?.map((set: DatabaseSet) => ({
          id: set.id,
          weight: set.weight,
          reps: set.reps,
          pinWeight: set.pin_weight,
          isPR: set.is_pr
        })) || []
      })) || []
    }));

    res.json(transformedWorkouts);
  } catch (error) {
    console.error('Get user workouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createWorkout = async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const userId = req.user.id;
    const { date, branch, exercises }: { date: string; branch: string; exercises: RequestExercise[] } = req.body;

    // Insert workout
    const workoutResult = await client.query(
      'INSERT INTO workouts (user_id, date, branch) VALUES ($1, $2, $3) RETURNING *',
      [userId, date, branch]
    );
    const workout = workoutResult.rows[0];

    // Insert exercises and sets
    for (const exercise of exercises) {
      const exerciseResult = await client.query(
        `INSERT INTO logged_exercises (workout_id, exercise_id, variation, brand) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [workout.id, exercise.exerciseId, exercise.variation, exercise.brand]
      );
      const loggedExercise = exerciseResult.rows[0];

      for (const set of exercise.sets) {
        await client.query(
          `INSERT INTO exercise_sets (logged_exercise_id, weight, reps, pin_weight, is_pr) 
           VALUES ($1, $2, $3, $4, $5)`,
          [loggedExercise.id, set.weight, set.reps, set.pinWeight, set.isPR]
        );
      }
    }

    await client.query('COMMIT');
    
    // Return the workout in the same format as getUserWorkouts
    const transformedWorkout = {
      id: workout.id,
      userId: workout.user_id,
      date: workout.date,
      branch: workout.branch,
      exercises: exercises.map((exercise: RequestExercise) => ({
        id: `${Date.now()}-${Math.random()}`, // Generate a temporary ID for the logged exercise
        exerciseId: exercise.exerciseId,
        variation: exercise.variation,
        brand: exercise.brand,
        sets: exercise.sets.map((set: RequestSet) => ({
          id: `${Date.now()}-${Math.random()}`, // Generate a temporary ID for the set
          weight: set.weight,
          reps: set.reps,
          pinWeight: set.pinWeight,
          isPR: set.isPR
        }))
      }))
    };
    
    res.status(201).json(transformedWorkout);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create workout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};
