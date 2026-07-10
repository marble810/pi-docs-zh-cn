import { getSyncMetadata } from "$lib/server/content";

export function load() {
  return {
    meta: getSyncMetadata()
  };
}
