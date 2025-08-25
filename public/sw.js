import { defaultCache } from "@ducanh2912/next-pwa/sw";
import { precacheAndRoute } from "workbox-precaching";

// To self-host, change the import path to point to the built-in Workbox modules.
import {
  ExpirationPlugin,
  CacheableResponsePlugin,
} from "workbox-expiration";
import { registerRoute, setCatchHandler, setDefaultHandler } from "workbox-routing";
import {
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  NetworkOnly,
} from "workbox-strategies";

// The precacheAndRoute() method efficiently caches and responds to
// requests for URLs in the manifest.
// See https://goo.gl/S9QRab
precacheAndRoute(self.__WB_MANIFEST);

// defaultCache is a an array of cache entries to be used by the default handler.
// Since we have a custom handler for every kind of request, we don't need it.
// see https://github.com/DuCanh2912/next-pwa/blob/master/packages/next-pwa/src/sw.ts#L34-L57
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  }),
  "GET"
);

registerRoute(
  ({ request }) =>
    request.destination === "style" || request.destination === "script",
  new StaleWhileRevalidate({
    cacheName: "static-resources",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  }),
  "GET"
);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200],
      }),
      // Don't cache more than 50 items, and expire them after 30 days
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
      }),
    ],
  }),
  "GET"
);
