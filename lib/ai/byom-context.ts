import { AsyncLocalStorage } from "node:async_hooks";

import type { ByomRoute } from "@/lib/ai/byom";

const byomRouteStorage = new AsyncLocalStorage<ByomRoute>();

/** Bind a route for the current synchronous turn. Concurrent requests stay isolated. */
export const bindByomRoute = (route: ByomRoute): void => {
  byomRouteStorage.enterWith(route);
};

export const getActiveByomRoute = (): ByomRoute | undefined =>
  byomRouteStorage.getStore();
