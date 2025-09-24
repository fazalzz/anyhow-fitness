// Supabase Client Setup
// Install: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gcurjrbuazviasegjcgi.supabase.co'
const supabaseKey = 'your-anon-key-here' // Get from Supabase dashboard

export const supabase = createClient(supabaseUrl, supabaseKey)

// Example: Replace your workout API calls
export const workoutService = {
  // Create workout
  async createWorkout(workout) {
    const { data, error } = await supabase
      .from('workouts')
      .insert([workout])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Get user workouts
  async getUserWorkouts(userId) {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        logged_exercises (
          *,
          exercise_sets (*)
        )
      `)
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Real-time workout updates
  subscribeToWorkouts(userId, callback) {
    return supabase
      .channel('workouts')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'workouts',
          filter: `user_id=eq.${userId}`
        }, 
        callback
      )
      .subscribe()
  }
}