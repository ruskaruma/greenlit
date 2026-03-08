"use client";

import Navbar from "./Navbar";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import HowItWorks from "./HowItWorks";
import TechStack from "./TechStack";
import Footer from "./Footer";

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <TechStack />
      <Footer />
    </main>
  );
}
