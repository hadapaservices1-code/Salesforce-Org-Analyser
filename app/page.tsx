import { redirect } from 'next/navigation';
import { getSalesforceAuth } from '@/lib/session';

export default async function Home() {
  const auth = await getSalesforceAuth();
  
  if (auth) {
    redirect('/dashboard');
  }
  
  redirect('/connect');
}
