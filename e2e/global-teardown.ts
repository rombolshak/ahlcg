import { stopAppHost } from './apphost';

export default async function globalTeardown(): Promise<void> {
  await stopAppHost();
}
