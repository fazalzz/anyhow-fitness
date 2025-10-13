-- Production optimization for the fitness app database

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_workout_id ON posts(workout_id);
CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_date ON posts(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_body_weight_entries_user_id ON body_weight_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_body_weight_entries_date ON body_weight_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_body_weight_entries_user_date ON body_weight_entries(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_logged_exercises_workout_id ON logged_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_exercise_sets_logged_exercise_id ON exercise_sets(logged_exercise_id);

CREATE INDEX IF NOT EXISTS idx_friendships_requester_id ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_receiver_id ON friendships(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Add performance constraints and data validation (only for new data)
ALTER TABLE body_weight_entries 
ADD CONSTRAINT check_weight_positive 
CHECK (weight > 0 AND weight < 1000);

ALTER TABLE exercise_sets 
ADD CONSTRAINT check_weight_positive_sets 
CHECK (weight >= 0 AND weight < 1000);

ALTER TABLE exercise_sets 
ADD CONSTRAINT check_reps_positive 
CHECK (reps > 0 AND reps <= 1000);

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE workouts;
ANALYZE posts;
ANALYZE body_weight_entries;
ANALYZE logged_exercises;
ANALYZE exercise_sets;
ANALYZE friendships;
ANALYZE custom_exercises;