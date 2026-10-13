import prisma from "@/lib/db";
import { AdConfiguration, AdUnit, SPONSORED_ADS } from "./types";

export type { AdConfiguration, AdUnit };
export { SPONSORED_ADS };

export async function getAdConfiguration(): Promise<AdConfiguration> {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "global" },
  });

  return {
    bannerTopEnabled: true,
    bannerBottomEnabled: true,
    interstitialEnabled: true,
    interstitialIntervalHours: settings?.interstitialIntervalHours ?? 12,
    adGateEnabled: settings?.adGateEnabled ?? true,
    adGateDurationSec: settings?.adGateDurationSec ?? 5,
  };
}
