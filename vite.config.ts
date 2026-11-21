import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
const headers = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp', 'Permissions-Policy':'camera=(self), microphone=(), geolocation=()' };
export default defineConfig({plugins:[react()],resolve:{alias:{'@cube/core':fileURLToPath(new URL('./vendor/core/src/index.ts',import.meta.url)),'@cube/solver-contracts':fileURLToPath(new URL('./vendor/contracts/src/index.ts',import.meta.url)),'@cube/solver-ts':fileURLToPath(new URL('./vendor/solver/src/index.ts',import.meta.url))}},server:{headers},preview:{headers},worker:{format:'es'},build:{chunkSizeWarningLimit:1100},test:{include:['src/**/*.test.ts','vendor/core/src/moves.test.ts','vendor/core/src/facelets.test.ts','vendor/solver/src/optimal.test.ts'],testTimeout:120000}});
