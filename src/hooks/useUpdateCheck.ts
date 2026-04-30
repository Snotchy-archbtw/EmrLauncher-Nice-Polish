import { useState, useEffect, useCallback } from "react";
declare const __BUILD_DATE__: string;
const LATEST_URL = "https://api.github.com/repos/LCE-Hub/LCE-Emerald-Launcher/releases/latest";
const NIGHTLY_URL = "https://api.github.com/repos/LCE-Hub/LCE-Emerald-Launcher/releases/tags/nightly";
export function useUpdateCheck() {
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateUrl, setUpdateUrl] = useState<string | null>(null);
  const checkUpdates = useCallback(async () => {
    try {
      const buildDate = new Date(__BUILD_DATE__);
      let isNightly = false;
      let latestData = null;
      let latestDate = new Date(0);
      try {
        const latestResponse = await fetch(LATEST_URL);
        if (latestResponse.ok) {
          latestData = await latestResponse.json();
          latestDate = new Date(latestData.published_at);
          if (buildDate > latestDate) {
            isNightly = true;
          }
        } else {
          isNightly = true;
        }
      } catch (e) {
        isNightly = true;
      }

      if (isNightly) {
        const nightlyResponse = await fetch(NIGHTLY_URL);
        if (!nightlyResponse.ok) return;
        const nightlyData = await nightlyResponse.json();
        let releaseDate = new Date(nightlyData.published_at || nightlyData.updated_at);
        if (nightlyData.assets && nightlyData.assets.length > 0) {
          const assetDate = new Date(nightlyData.assets[0].updated_at);
          if (assetDate > releaseDate) releaseDate = assetDate;
        }

        if (releaseDate > buildDate) {
          setUpdateMessage(`A new Nightly build is available!`);
          setUpdateUrl("https://github.com/LCE-Hub/LCE-Emerald-Launcher/releases/tag/nightly");
        }
      } else {
        if (latestDate > buildDate && latestData) {
          setUpdateMessage(`Version ${latestData.tag_name} is now available!`);
          setUpdateUrl(latestData.html_url || LATEST_URL);
        }
      }
    } catch (e) {
      console.error("Failed to check for updates:", e);
    }
  }, []);

  useEffect(() => {
    checkUpdates();
  }, [checkUpdates]);

  return {
    updateMessage,
    updateUrl,
    clearUpdateMessage: () => setUpdateMessage(null),
  };
}
