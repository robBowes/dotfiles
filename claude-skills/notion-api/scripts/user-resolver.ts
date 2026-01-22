import { Client } from '@notionhq/client';

const userCache = new Map<string, string>(); // id -> name
let cachePopulated = false;

export async function populateUserCache(notion: Client): Promise<void> {
  if (cachePopulated) return;
  let cursor: string | undefined;
  do {
    const response = await notion.users.list({ start_cursor: cursor, page_size: 100 });
    for (const user of response.results as any[]) {
      if (user.id && user.name) {
        userCache.set(user.id, user.name);
      }
    }
    cursor = response.has_more ? response.next_cursor! : undefined;
  } while (cursor);
  cachePopulated = true;
}

export function resolveUser(user: any): string {
  if (user?.name) return user.name;
  if (user?.id) return userCache.get(user.id) || user.id;
  return '(unknown)';
}
