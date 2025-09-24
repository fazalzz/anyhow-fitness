import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const hasAccessToUserData = async (requesterId: string, targetUserId: string): Promise<boolean> => {
  if (requesterId === targetUserId) {
    return true;
  }

  // Check if target user is private
  const targetUserResult = await db.query(
    'SELECT is_private FROM users WHERE id = $1',
    [targetUserId]
  );

  if (targetUserResult.rows.length === 0) {
    return false;
  }

  const targetUser = targetUserResult.rows[0];
  
  // If user is not private, allow access
  if (!targetUser.is_private) {
    return true;
  }

  // Check if they are friends
  const friendshipResult = await db.query(
    `SELECT status FROM friendships 
     WHERE ((requester_id = $1 AND receiver_id = $2) 
        OR (requester_id = $2 AND receiver_id = $1))
     AND status = 'accepted'`,
    [requesterId, targetUserId]
  );

  return friendshipResult.rows.length > 0;
};
