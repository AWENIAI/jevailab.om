import { readdir, readFile, writeFile } from 'node:fs/promises';

const MESSAGE_FILES = (await readdir('project.inlang/messages'))
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => `project.inlang/messages/${file}`);

async function sortMessages(file: string) {
  const raw = await readFile(file, 'utf8');
  const messages = JSON.parse(raw) as Record<string, string>;
  const sortedMessages = Object.fromEntries(
    Object.entries(messages).sort(([a], [b]) => a.localeCompare(b, 'en'))
  );

  await writeFile(file, `${JSON.stringify(sortedMessages, null, 2)}\n`);
}

await Promise.all(MESSAGE_FILES.map(sortMessages));

console.log(`Locale keys sorted (${MESSAGE_FILES.length} files)`);
