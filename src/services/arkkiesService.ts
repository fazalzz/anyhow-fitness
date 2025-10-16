import { decryptString, encryptString } from '../utils/crypto';
import {
  findCredentialsByUserId,
  upsertCredentials,
  updateSession as persistSession,
} from '../models/arkkiesCredentials';

const ARKKIES_API_BASE = 'https://api.arkkies.com/v2';
const USER_AGENT = 'AnyhowFitness/1.0 (+https://anyhowfitness.com)';

type CookieRecord = {
  value: string;
  attributes: Record<string, string>;
};

class CookieJar {
  private cookies = new Map<string, CookieRecord>();

  constructor(serialized?: string | null) {
    if (serialized) {
      serialized
        .split(';')
        .map((cookie) => cookie.trim())
        .filter(Boolean)
        .forEach((pair) => {
          const index = pair.indexOf('=');
          if (index > 0) {
            const name = pair.slice(0, index).trim();
            const value = pair.slice(index + 1).trim();
            this.cookies.set(name, { value, attributes: {} });
          }
        });
    }
  }

  addFromSetCookie(headers: string[]): void {
    headers.forEach((header) => {
      const segments = header.split(';').map((segment) => segment.trim());
      if (segments.length === 0) {
        return;
      }
      const [namePart, ...attributeParts] = segments;
      const separatorIndex = namePart.indexOf('=');
      if (separatorIndex === -1) {
        return;
      }
      const name = namePart.slice(0, separatorIndex).trim();
      const value = namePart.slice(separatorIndex + 1).trim();
      const attributes: Record<string, string> = {};
      attributeParts.forEach((part) => {
        const attrIndex = part.indexOf('=');
        if (attrIndex === -1) {
          attributes[part.toLowerCase()] = '';
        } else {
          const attrName = part.slice(0, attrIndex).toLowerCase();
          const attrValue = part.slice(attrIndex + 1);
          attributes[attrName] = attrValue;
        }
      });
      this.cookies.set(name, { value, attributes });
    });
  }

  toHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, record]) => `${name}=${record.value}`)
      .join('; ');
  }

  extractSessionExpiry(): Date | null {
    const session = this.cookies.get('ark_session');
    if (!session) {
      return null;
    }
    const expiresRaw = session.attributes['expires'];
    if (!expiresRaw) {
      return null;
    }
    const expiresDate = new Date(expiresRaw);
    if (Number.isNaN(expiresDate.getTime())) {
      return null;
    }
    return expiresDate;
  }
}

const defaultHeaders = (): Record<string, string> => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': USER_AGENT,
  DNT: '1',
});

const responseSetCookies = (response: Response): string[] => {
  const getter = (response.headers as any).getSetCookie?.bind(response.headers);
  if (getter) {
    return getter() as string[];
  }

  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
};

const joinUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${ARKKIES_API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

const fetchJson = async <T>(
  jar: CookieJar,
  path: string,
  init: RequestInit & { outletHeader?: string } = {},
): Promise<{ data: T; response: Response }> => {
  const headers: Record<string, string> = {
    ...defaultHeaders(),
    ...(init.headers as Record<string, string> | undefined),
  };

  const cookieHeader = jar.toHeader();
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  if (init.outletHeader) {
    headers['x-ark-outlet'] = init.outletHeader;
    headers['X-Ark-Outlet'] = init.outletHeader;
  }

  const response = await fetch(joinUrl(path), {
    ...init,
    headers,
  });

  jar.addFromSetCookie(responseSetCookies(response));

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Arkkies API request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as T;
  return { data, response };
};

type LoginFlowResponse = {
  id: string;
  ui?: {
    nodes?: Array<{
      attributes?: {
        name?: string;
        value?: string;
      };
    }>;
  };
};

type WhoAmIResponse = {
  identity?: {
    id?: string;
  };
  session?: {
    expires_at?: string;
  };
};

type BookingSlot = {
  id?: string;
  booking_slot_id?: string;
  time_start?: string;
  time_end?: string;
  start_time?: string;
  end_time?: string;
  start?: string;
  end?: string;
  purpose_type?: string;
};

type AvailableSlotResponse = {
  data?: Array<BookingSlot>;
  slots?: Array<BookingSlot>;
};

type ActiveItemList = {
  data?: Array<{ id?: string }>;
  items?: Array<{ id?: string }>;
  subscriptions?: Array<{ id?: string }>;
  passes?: Array<{ id?: string }>;
};

const extractCsrfToken = (flow: LoginFlowResponse): string | null => {
  const nodes = flow.ui?.nodes ?? [];
  for (const node of nodes) {
    const name = node.attributes?.name;
    const value = node.attributes?.value;
    if (name === 'csrf_token' && typeof value === 'string') {
      return value;
    }
  }
  return null;
};

const startLoginFlow = async (jar: CookieJar): Promise<{ flowId: string; csrfToken: string }> => {
  const response = await fetch(joinUrl('/auth/provider/public/self-service/login/browser?refresh=true'), {
    method: 'GET',
    headers: {
      ...defaultHeaders(),
      Cookie: jar.toHeader(),
    },
  });

  jar.addFromSetCookie(responseSetCookies(response));

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to initiate Arkkies login flow (${response.status}): ${text}`);
  }

  const flowJson = (await response.json()) as LoginFlowResponse;
  const flowId = flowJson.id;
  const csrfToken = extractCsrfToken(flowJson);

  if (!flowId || !csrfToken) {
    throw new Error('Unable to determine Arkkies login flow or CSRF token');
  }

  return { flowId, csrfToken };
};

const performLogin = async (
  email: string,
  password: string,
): Promise<{ jar: CookieJar; sessionExpiry: Date | null }> => {
  const jar = new CookieJar();
  const { flowId, csrfToken } = await startLoginFlow(jar);

  const { data: loginData } = await fetchJson<any>(jar, `/auth/provider/public/self-service/login?flow=${encodeURIComponent(flowId)}`, {
    method: 'POST',
    body: JSON.stringify({
      method: 'password',
      password_identifier: email,
      password,
      csrf_token: csrfToken,
    }),
  });

  if (loginData?.session_token && !jar.toHeader().includes(loginData.session_token)) {
    jar.addFromSetCookie([`ark_session=${loginData.session_token}`]);
  }

  const { data: whoamiData } = await fetchJson<WhoAmIResponse>(jar, '/auth/provider/public/sessions/whoami', {
    method: 'GET',
  });

  const sessionExpiry = whoamiData.session?.expires_at
    ? new Date(whoamiData.session.expires_at)
    : jar.extractSessionExpiry();

  return { jar, sessionExpiry };
};

const ensureCredentials = async (userId: number) => {
  const row = await findCredentialsByUserId(userId);
  if (!row) {
    throw new Error('Arkkies credentials not configured for this user');
  }

  return {
    email: row.email,
    password: decryptString(row.password_encrypted),
    sessionCookie: row.session_cookie,
    sessionExpiresAt: row.session_expires_at,
  };
};

const validateSession = async (jar: CookieJar): Promise<boolean> => {
  try {
    const { data } = await fetchJson<WhoAmIResponse>(jar, '/auth/provider/public/sessions/whoami');
    return Boolean(data.identity?.id);
  } catch {
    return false;
  }
};

const pickEarliestSlot = (slots: BookingSlot[]): BookingSlot | null => {
  const now = new Date();

  const normalised = slots
    .map((slot) => {
      const start =
        slot.time_start ?? slot.start_time ?? slot.start ?? null;
      const end =
        slot.time_end ?? slot.end_time ?? slot.end ?? null;
      const id = slot.booking_slot_id ?? slot.id ?? null;

      if (!start || !end || !id) {
        return null;
      }

      const startDate = new Date(start);
      if (Number.isNaN(startDate.getTime())) {
        return null;
      }

      return {
        id,
        time_start: start,
        time_end: end,
        purpose_type: slot.purpose_type ?? 'gym-time',
        startDate,
      };
    })
    .filter((slot): slot is { id: string; time_start: string; time_end: string; purpose_type: string; startDate: Date } => Boolean(slot));

  if (normalised.length === 0) {
    return null;
  }

  normalised.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const futureSlot = normalised.find((slot) => slot.startDate.getTime() >= now.getTime());
  if (futureSlot) {
    return {
      booking_slot_id: futureSlot.id,
      time_start: futureSlot.time_start,
      time_end: futureSlot.time_end,
      purpose_type: futureSlot.purpose_type,
    };
  }

  const earliest = normalised[0];
  return {
    booking_slot_id: earliest.id,
    time_start: earliest.time_start,
    time_end: earliest.time_end,
    purpose_type: earliest.purpose_type,
  };
};

const extractItemIds = (payload: ActiveItemList): string[] => {
  const ids = new Set<string>();
  const visit = (list: Array<{ id?: string }> | undefined) => {
    (list ?? []).forEach((item) => {
      if (item?.id) {
        ids.add(item.id);
      }
    });
  };

  visit(payload.data);
  visit(payload.items);
  visit(payload.subscriptions);
  visit(payload.passes);

  return Array.from(ids);
};

const ensureActiveItemIds = async (jar: CookieJar, outletId: string): Promise<string[]> => {
  const collected = new Set<string>();
  const endpoints = ['/customer/subscription/active', '/customer/pass/active'];
  const fallbackOutlets = ['AGRBGK01', 'AGROTH01', 'AGRPE01', 'AGRSIM01'];

  const outletCandidates: Array<string | null> = [
    outletId,
    null,
    ...fallbackOutlets.filter((candidate) => candidate !== outletId),
  ];

  const attempted: string[] = [];

  for (const candidate of outletCandidates) {
    const headerLabel = candidate ?? 'none';

    if (attempted.includes(headerLabel)) {
      continue;
    }
    attempted.push(headerLabel);

    console.log(`[arkkies] Resolving active items using outlet header: ${headerLabel}`);

    for (const endpoint of endpoints) {
      try {
        console.log(`[arkkies] Fetching ${endpoint} (outlet header: ${headerLabel})`);
        const { data } = await fetchJson<ActiveItemList>(jar, endpoint, {
          outletHeader: candidate ?? undefined,
        });
        const itemIds = extractItemIds(data);
        console.log(
          `[arkkies] Retrieved ${itemIds.length} active items from ${endpoint} (outlet header: ${headerLabel})`,
          itemIds,
        );
        itemIds.forEach((id) => collected.add(id));
      } catch (error) {
        console.warn(
          `[arkkies] Failed to load active items from ${endpoint} (outlet header: ${headerLabel}):`,
          (error as Error).message,
        );
      }
    }

    if (collected.size > 0) {
      break;
    }
  }

  console.log('[arkkies] Total active items detected:', Array.from(collected));

  if (collected.size === 0) {
    throw new Error(
      `No active Arkkies passes or subscriptions found for this account (home outlet: ${outletId}, attempted headers: ${attempted.join(
        ', ',
      )}). Please ensure you have an active membership for this location.`,
    );
  }

  return Array.from(collected);
};

type BookingResult = {
  booking_id?: string;
  reference_code?: string;
  time_start?: string;
  time_end?: string;
};

export const loginAndStoreCredentials = async (
  userId: number,
  email: string,
  password: string,
): Promise<{ expiresAt: Date | null }> => {
  const encryptedPassword = encryptString(password);
  const { jar, sessionExpiry } = await performLogin(email, password);

  await upsertCredentials(userId, email, encryptedPassword);
  await persistSession(userId, jar.toHeader(), sessionExpiry ?? null);

  return { expiresAt: sessionExpiry ?? null };
};

const ensureSession = async (userId: number): Promise<{ jar: CookieJar; email: string; password: string }> => {
  const credentials = await ensureCredentials(userId);
  let jar = new CookieJar(credentials.sessionCookie);

  const sessionStillValid =
    credentials.sessionCookie &&
    credentials.sessionExpiresAt &&
    credentials.sessionExpiresAt.getTime() > Date.now() &&
    (await validateSession(jar));

  if (sessionStillValid) {
    return { jar, email: credentials.email, password: credentials.password };
  }

  const { jar: freshJar, sessionExpiry } = await performLogin(credentials.email, credentials.password);
  jar = freshJar;
  await persistSession(userId, jar.toHeader(), sessionExpiry);

  return { jar, email: credentials.email, password: credentials.password };
};

export const checkSessionStatus = async (userId: number): Promise<{ valid: boolean; expiresAt: Date | null }> => {
  try {
    const credentials = await findCredentialsByUserId(userId);
    if (!credentials || !credentials.session_cookie) {
      return { valid: false, expiresAt: null };
    }

    const jar = new CookieJar(credentials.session_cookie);
    const isValid = await validateSession(jar);

    if (!isValid) {
      return { valid: false, expiresAt: null };
    }

    return {
      valid: true,
      expiresAt: credentials.session_expires_at ?? jar.extractSessionExpiry(),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Arkkies session status check failed:', error);
    return { valid: false, expiresAt: null };
  }
};

type BookAndUnlockOptions = {
  userId: number;
  homeOutletId: string;
  destinationOutletId: string;
  doorId?: string;
};

export const bookSlotAndUnlockDoor = async ({
  userId,
  homeOutletId,
  destinationOutletId,
  doorId,
}: BookAndUnlockOptions): Promise<{
  booking: BookingResult;
  doorUnlock: any;
}> => {
  const { jar } = await ensureSession(userId);

  const itemIds = await ensureActiveItemIds(jar, homeOutletId);

  const { data: slotData } = await fetchJson<AvailableSlotResponse>(
    jar,
    `/brand/outlet/booking/slot/destination/${encodeURIComponent(destinationOutletId)}/filter/access-type/type/gym-access/days/7/topic/*`,
    { outletHeader: homeOutletId },
  );

  const slots = slotData.data ?? slotData.slots ?? [];
  const slot = pickEarliestSlot(slots);

  if (!slot) {
    throw new Error('No available booking slots were found for the selected outlet');
  }

  const { data: bookingData } = await fetchJson<BookingResult>(jar, '/brand/outlet/booking', {
    method: 'POST',
    outletHeader: homeOutletId,
    body: JSON.stringify({
      time_start: slot.time_start,
      time_end: slot.time_end,
      purpose_type: slot.purpose_type ?? 'gym-time',
      booking_slot_id: slot.booking_slot_id ?? slot.id,
      corresponding_item_ids: itemIds,
    }),
  });

  const doorIdentifier = doorId ?? `${destinationOutletId}-D01`;

  const { data: unlockData } = await fetchJson<any>(jar, '/brand/outlet/door/unlock', {
    method: 'PUT',
    outletHeader: destinationOutletId,
    body: JSON.stringify({
      door_id: doorIdentifier,
    }),
  });

  await persistSession(userId, jar.toHeader(), jar.extractSessionExpiry());

  return {
    booking: bookingData,
    doorUnlock: unlockData,
  };
};

export const listSupportedOutlets = (): Array<{ id: string; name: string; region?: string }> => [
  { id: 'AGRBGK01', name: 'Ark Grit • Buangkok' },
  { id: 'AGRBSH01', name: 'Ark Grit • Bishan' },
  { id: 'AGRHUG01', name: 'Ark Grit • Hougang' },
  { id: 'AGRJUR01', name: 'Ark Grit • Jurong' },
  { id: 'AGRGEY01', name: 'Ark Grit • Geylang' },
  { id: 'AGRSRN01', name: 'Ark Grit • Serangoon North' },
  { id: 'AGRJSP01', name: 'Ark Grit • Jurong Spring CC' },
  { id: 'AGRDTE01', name: 'Ark Grit • Downtown East' },
  { id: 'AGRWLN01', name: 'Ark Grit • Woodlands' },
];




