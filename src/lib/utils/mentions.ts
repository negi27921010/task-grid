import type { User } from '../types';

/**
 * Parse @mentions from text content. Returns user IDs of mentioned users.
 * Matches @FullName patterns against known users (longest match first).
 */
export function parseMentions(content: string, users: User[]): string[] {
  if (!content.includes('@')) return [];

  // Sort by name length descending to match longest names first
  const sorted = [...users].sort(
    (a, b) => b.full_name.length - a.full_name.length,
  );

  const mentionedIds: string[] = [];
  const lower = content.toLowerCase();

  for (const user of sorted) {
    const pattern = `@${user.full_name.toLowerCase()}`;
    if (lower.includes(pattern) && !mentionedIds.includes(user.id)) {
      mentionedIds.push(user.id);
    }
  }

  return mentionedIds;
}

/**
 * Extract the current @mention query from text at cursor position.
 * Returns null if cursor is not in a mention context.
 */
export function extractMentionQuery(
  text: string,
  cursorPos: number,
): string | null {
  // Walk backwards from cursor to find @
  const beforeCursor = text.slice(0, cursorPos);
  const atIdx = beforeCursor.lastIndexOf('@');
  if (atIdx === -1) return null;

  // @ must be at start of text or preceded by whitespace
  if (atIdx > 0 && !/\s/.test(beforeCursor[atIdx - 1])) return null;

  const query = beforeCursor.slice(atIdx + 1);

  // If query contains a newline, we've gone past the mention
  if (query.includes('\n')) return null;

  return query;
}

/**
 * Insert a mention into text at the current @ position.
 */
export function insertMention(
  text: string,
  cursorPos: number,
  userName: string,
): { newText: string; newCursorPos: number } {
  const beforeCursor = text.slice(0, cursorPos);
  const afterCursor = text.slice(cursorPos);
  const atIdx = beforeCursor.lastIndexOf('@');

  if (atIdx === -1) return { newText: text, newCursorPos: cursorPos };

  const before = text.slice(0, atIdx);
  const mention = `@${userName} `;
  const newText = before + mention + afterCursor;
  const newCursorPos = before.length + mention.length;

  return { newText, newCursorPos };
}
