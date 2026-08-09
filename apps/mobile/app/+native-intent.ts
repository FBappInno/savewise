import {
  getShareExtensionKey,
} from "expo-share-intent";

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    /*
     * Die iOS Share Extension startet SaveWise
     * mit einer internen URL wie:
     *
     * savewise-beta://dataUrl=savewise-betaShareKey
     *
     * Diese URL ist KEINE echte Expo-Router-Route.
     * Deshalb fangen wir sie hier ab, bevor Expo
     * Router "Unmatched Route" anzeigen kann.
     */
    if (
      path.includes(
        `dataUrl=${getShareExtensionKey()}`,
      )
    ) {
      return "/(tabs)";
    }

    return path;
  } catch {
    return "/(tabs)";
  }
}
