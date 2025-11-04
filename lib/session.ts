import { getIronSession, IronSessionData } from 'iron-session';
import { cookies } from 'next/headers';
import { SalesforceAuth } from './types';

declare module 'iron-session' {
  interface IronSessionData {
    salesforce?: SalesforceAuth;
    userId?: string;
  }
}

const SESSION_PASSWORD = process.env.SESSION_PASSWORD;
if (!SESSION_PASSWORD || SESSION_PASSWORD.length < 32) {
  throw new Error('SESSION_PASSWORD must be at least 32 characters');
}

const sessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: 'org-analyzer-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<IronSessionData>(cookieStore, sessionOptions);
}

export async function setSalesforceAuth(auth: SalesforceAuth) {
  const session = await getSession();
  session.salesforce = auth;
  await session.save();
}

export async function getSalesforceAuth(): Promise<SalesforceAuth | null> {
  const session = await getSession();
  return session.salesforce || null;
}

export async function clearSession() {
  const session = await getSession();
  session.destroy();
}
