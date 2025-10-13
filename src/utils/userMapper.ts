export type RawUserRow = {
  id: number | string;
  display_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  is_private?: boolean | null;
  avatar?: string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
  username?: string | null;
};

const normalizeDate = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export const mapUserToResponse = (user: RawUserRow) => {
  const displayName = (user.display_name ?? '').toString();
  const isPrivate = Boolean(user.is_private);

  return {
    id: user.id != null ? String(user.id) : '',
    name: displayName,
    displayName,
    username: user.username ? String(user.username) : displayName,
    email: user.email ?? '',
    avatar: user.avatar ?? '',
    isPrivate,
    is_private: isPrivate,
    createdAt: normalizeDate(user.created_at),
    updatedAt: normalizeDate(user.updated_at),
  };
};
