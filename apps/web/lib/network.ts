import 'server-only';
import type { Network } from '@harness/schema';
import { cookies } from 'next/headers';
import { networkFromCookies } from './network-cookie';

export const getRequestNetwork = async (): Promise<Network> => networkFromCookies(await cookies());
