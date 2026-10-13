export interface AdConfiguration {
  bannerTopEnabled: boolean;
  bannerBottomEnabled: boolean;
  interstitialEnabled: boolean;
  interstitialIntervalHours: number;
  adGateEnabled: boolean;
  adGateDurationSec: number;
}

export interface AdUnit {
  id: string;
  type: "BANNER_TOP" | "BANNER_BOTTOM" | "INTERSTITIAL" | "FILE_GATE";
  title: string;
  sponsor: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
  accentColor: string;
  badge: string;
}

// Sample legitimate partner ads curated for typing & productivity workflows (client-safe)
export const SPONSORED_ADS: AdUnit[] = [
  {
    id: "ad-1",
    type: "BANNER_TOP",
    title: "Keychron Mechanical Keyboards",
    sponsor: "Keychron Official",
    description: "Ultra-fast tactile typing for writers, programmers & typists. Wireless & hot-swappable.",
    ctaText: "Shop Keyboards",
    ctaUrl: "https://keychron.com",
    accentColor: "from-blue-600/30 to-indigo-600/30",
    badge: "Sponsored Partner",
  },
  {
    id: "ad-2",
    type: "BANNER_BOTTOM",
    title: "Grammarly Business Pro",
    sponsor: "Grammarly",
    description: "Write flawless reports, letters, and emails with AI-assisted clarity and grammar corrections.",
    ctaText: "Try Free",
    ctaUrl: "https://grammarly.com",
    accentColor: "from-emerald-600/30 to-teal-600/30",
    badge: "Productivity Partner",
  },
  {
    id: "ad-3",
    type: "INTERSTITIAL",
    title: "1Password for High-Trust Teams",
    sponsor: "1Password",
    description: "Secure confidential business documents, passwords, and sensitive typing credentials effortlessly.",
    ctaText: "Start 14-Day Trial",
    ctaUrl: "https://1password.com",
    accentColor: "from-blue-700/40 to-indigo-900/40",
    badge: "Security Partner",
  },
  {
    id: "ad-4",
    type: "FILE_GATE",
    title: "Adobe Acrobat Pro — Certified PDF Tools",
    sponsor: "Adobe",
    description: "Typnex verified document viewer is sponsored by Adobe Acrobat. Edit and sign PDFs in seconds.",
    ctaText: "Explore Acrobat",
    ctaUrl: "https://adobe.com/acrobat",
    accentColor: "from-rose-600/30 to-orange-600/30",
    badge: "Document Sponsor",
  },
];
