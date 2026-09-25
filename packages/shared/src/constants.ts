/** Poster canvas — 3:4 portrait. Exported at 2x (2400×3200), comfortably above the 1200×1600 print minimum. */
export const POSTER_WIDTH = 1200;
export const POSTER_HEIGHT = 1600;
export const EXPORT_SCALE = 2;
export const MAX_PHOTOS = 3;
/** Most posters one bulk (CSV) request may create. */
export const BULK_MAX_ROWS = 30;
/** The per-person columns a bulk CSV may carry (everything else comes from the shared form). */
export const BULK_FIELDS = ["name", "designation", "party", "union", "thana", "district", "headline", "subheadline", "dateText", "creditLabel"] as const;
export type BulkField = (typeof BULK_FIELDS)[number];

export const OCCASION_IDS = ["victory", "tribute", "campaign", "greeting", "festival"] as const;
export type OccasionId = (typeof OCCASION_IDS)[number];

export type ToneId = "solemn" | "triumphant" | "bold" | "warm" | "festive" | "elegant";
export const TONE_IDS: ToneId[] = ["solemn", "triumphant", "bold", "warm", "festive", "elegant"];

export interface OccasionMeta {
  id: OccasionId;
  bn: string;
  en: string;
  /** one line, shown on cards */
  blurb: string;
  blurbBn: string;
  tone: ToneId;
  /** Ready-to-use Bangla headline ideas (shown as one-tap chips when the AI is unavailable) */
  headlines: string[];
  subheadlines: string[];
  defaultCreditLabel: string;
}

export const OCCASIONS: OccasionMeta[] = [
  {
    id: "victory",
    bn: "বিজয় দিবস",
    en: "Victory Day",
    blurb: "16 December wishes, martyr tributes, national pride.",
    blurbBn: "১৬ ডিসেম্বরের শুভেচ্ছা, শহীদদের প্রতি শ্রদ্ধা, জাতীয় গৌরব।",
    tone: "triumphant",
    headlines: [
      "মহান বিজয় দিবস",
      "মহান বিজয় দিবসের শুভেচ্ছা",
      "বিজয়ের চেতনায় এগিয়ে চলি",
      "বিজয় দিবসে বিনম্র শ্রদ্ধা",
    ],
    subheadlines: [
      "১৬ ডিসেম্বর ১৯৭১, লাল-সবুজের গৌরবের দিন",
      "সকল শহীদ ও বীর মুক্তিযোদ্ধাদের প্রতি বিনম্র শ্রদ্ধা",
    ],
    defaultCreditLabel: "প্রচারে",
  },
  {
    id: "tribute",
    bn: "শোক / স্মরণ",
    en: "Condolence & Tribute",
    blurb: "Dignified memorial posters for the ones we lost.",
    blurbBn: "প্রয়াতদের স্মরণে মর্যাদাপূর্ণ শোক ও শ্রদ্ধাঞ্জলি পোস্টার।",
    tone: "solemn",
    headlines: [
      "গভীর শোক ও শ্রদ্ধাঞ্জলি",
      "বিনম্র শ্রদ্ধাঞ্জলি",
      "আপনি থাকবেন আমাদের হৃদয়ে",
      "আপনার অভাব আমরা কখনো ভুলবো না",
    ],
    subheadlines: [
      "মহান আল্লাহ্‌ তাঁকে জান্নাতবাসী করুন। আমিন।",
      "ইন্না লিল্লাহি ওয়া ইন্না ইলাইহি রাজিউন",
      "তাঁর রুহের মাগফিরাত কামনা করছি",
    ],
    defaultCreditLabel: "শোকাহত",
  },
  {
    id: "campaign",
    bn: "নির্বাচনী প্রচার",
    en: "Election Campaign",
    blurb: "Bold rally-ready posters for candidates and committees.",
    blurbBn: "প্রার্থী ও কমিটির জন্য দৃষ্টিনন্দন প্রচার পোস্টার।",
    tone: "bold",
    headlines: [
      "আপনার ভোট, আপনার অধিকার",
      "উন্নয়নের অগ্রযাত্রায় আপনার পাশে",
      "জনতার সেবক, জনতার প্রার্থী",
      "সততা ও দক্ষতার অঙ্গীকার",
    ],
    subheadlines: [
      "আপনার মূল্যবান ভোট দিয়ে জয়যুক্ত করুন",
      "একসাথে গড়বো আগামীর বাংলাদেশ",
    ],
    defaultCreditLabel: "প্রচারে",
  },
  {
    id: "greeting",
    bn: "শুভেচ্ছা",
    en: "Greetings",
    blurb: "New Year, birthdays, congratulations and warm wishes.",
    blurbBn: "নববর্ষ, জন্মদিন, অভিনন্দন ও আন্তরিক শুভেচ্ছা।",
    tone: "warm",
    headlines: [
      "শুভ নববর্ষ",
      "আন্তরিক শুভেচ্ছা ও অভিনন্দন",
      "শুভ জন্মদিন",
      "শুভ হোক আপনার পথচলা",
    ],
    subheadlines: [
      "নতুন বছরে সবার জীবন হোক আনন্দময়",
      "আপনার সুস্থতা ও সাফল্য কামনা করছি",
    ],
    defaultCreditLabel: "শুভেচ্ছান্তে",
  },
  {
    id: "festival",
    bn: "ঈদ / উৎসব",
    en: "Eid & Festivals",
    blurb: "Eid, Puja and seasonal festival greetings.",
    blurbBn: "ঈদ, পূজা ও ঋতুভিত্তিক উৎসবের শুভেচ্ছা।",
    tone: "festive",
    headlines: ["ঈদ মোবারক", "ঈদুল ফিতরের শুভেচ্ছা", "ঈদুল আজহার শুভেচ্ছা", "শারদীয় শুভেচ্ছা"],
    subheadlines: [
      "ঈদের আনন্দ ছড়িয়ে পড়ুক সবার ঘরে ঘরে",
      "তাকাব্বালাল্লাহু মিন্না ওয়া মিনকুম",
    ],
    defaultCreditLabel: "শুভেচ্ছান্তে",
  },
];

export function getOccasion(id: string | undefined): OccasionMeta {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[0]!;
}

/** Credit-line labels that precede the requester's name ("প্রচারে: …") */
export const CREDIT_LABELS = ["প্রচারে", "শুভেচ্ছান্তে", "বিনীত", "নিবেদক", "শোকাহত", "প্রার্থনায়"] as const;

/** Photo arrangement */
export const PHOTO_LAYOUTS = ["auto", "1", "2", "3"] as const;
export type PhotoLayoutChoice = (typeof PHOTO_LAYOUTS)[number];

/** Photo frame shapes */
export const FRAME_STYLES = ["auto", "arch", "circle", "rounded", "hex", "fade", "polaroid"] as const;
export type FrameStyle = (typeof FRAME_STYLES)[number];

export const EXPORT_FORMATS = ["png", "jpg", "pdf"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const POSTER_STAGES = [
  "queued",
  "photos",
  "art_direction",
  "rendering",
  "saving",
  "done",
] as const;
export type PosterStage = (typeof POSTER_STAGES)[number];
