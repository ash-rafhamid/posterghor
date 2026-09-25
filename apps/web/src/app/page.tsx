import { BanglaProof } from "@/components/marketing/BanglaProof";
import { Features, FinalCta } from "@/components/marketing/Features";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Occasions } from "@/components/marketing/Occasions";
import { Showcase } from "@/components/marketing/Showcase";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Occasions />
      <HowItWorks />
      <BanglaProof />
      <Showcase />
      <Features />
      <FinalCta />
    </>
  );
}
