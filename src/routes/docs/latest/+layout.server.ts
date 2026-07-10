import { getNavigation, getManifest } from "$lib/server/content";

export function load() {
  return {
    navigation: getNavigation(),
    manifest: getManifest()
  };
}
