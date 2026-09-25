import type { OccasionId } from "../../constants";
import { avatarDataUri } from "../avatar";
import type { LayoutConfig, Palette, PosterContent } from "../types";

/**
 * Fictional demo content (invented names, illustrated silhouettes) for template thumbnails, the landing page and the
 * studio's empty state. No real people are depicted.
 */
export function demoContent(layout: LayoutConfig, occasion: OccasionId, opts: { photos?: number; palette?: Palette } = {}): PosterContent {
  const n = Math.max(1, Math.min(3, opts.photos ?? 3));
  const p = opts.palette ?? layout.palette;
  const captions = [
    { caption: "আলহাজ্ব করিম উদ্দিন", subcaption: "সভাপতি, জেলা কমিটি" },
    { caption: "সাবিনা ইয়াসমিন", subcaption: "সাধারণ সম্পাদক" },
    { caption: "মোঃ রফিকুল ইসলাম", subcaption: "সাংগঠনিক সম্পাদক" },
  ];
  const isTribute = occasion === "tribute";
  return {
    occasion,
    headline: layout.defaults.headline,
    subheadline: layout.defaults.subheadline,
    name: "মোঃ আবদুর রহমান",
    designation: isTribute ? "সদস্য, ইউনিয়ন পরিষদ" : "সভাপতি, ৫নং ওয়ার্ড কমিটি",
    party: isTribute ? "স্মরণে — পরিবারের পক্ষ থেকে" : "গণকল্যাণ সংঘ",
    union: "৫নং ইউনিয়ন",
    thana: "সদর থানা",
    district: "ময়মনসিংহ জেলা",
    creditLabel: layout.defaults.creditLabel,
    dateText: occasion === "victory" ? "১৬ ডিসেম্বর ২০২৬" : occasion === "tribute" ? "শ্রদ্ধাঞ্জলি" : undefined,
    photos: Array.from({ length: n }, (_, i) => ({
      src: avatarDataUri(i, p),
      caption: n > 1 || occasion === "tribute" ? captions[i]!.caption : undefined,
      subcaption: n > 1 || occasion === "tribute" ? captions[i]!.subcaption : undefined,
    })),
  };
}
