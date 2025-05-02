"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const fast_glob_1 = __importDefault(require("fast-glob"));
const path_1 = __importDefault(require("path"));
(async () => {
    const dtoFiles = await (0, fast_glob_1.default)(['src/**/*.dto.ts']);
    const entries = dtoFiles
        .map(f => {
        const rel = './' + path_1.default
            .relative('src', f)
            .replace(/\\/g, '/')
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
    (0, fs_1.writeFileSync)('src/metadata.ts', content);
})();
