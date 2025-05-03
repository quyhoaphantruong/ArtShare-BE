import { writeFileSync } from 'fs';
import fg from 'fast-glob';
import path from 'path';

(async () => {
  // Pick whatever glob fits your DTO layout
  const dtoFiles = await fg(['src/**/*.dto.ts']);

  const entries = dtoFiles
    .map(f => {
      const rel = './' + path
        .relative('src', f)
        .replace(/\\/g, '/')       // windows ↔ posix
        .replace(/\.ts$/, '');

      return `        ["${rel}"]: await import("${rel}"),`;
    })
    .join('\n');

  const content = `/* eslint-disable */
export default async () => {
    const t = {
${entries}
    };
    return t;
};
`;

  writeFileSync('src/metadata.ts', content);
})();
