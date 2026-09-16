import { defineConfig } from 'astro/config';

// Fully static site — one page, client-side hash routing (#/room/slug),
// no server-rendered routes and no adapter needed.
export default defineConfig({
  output: 'static',
});
