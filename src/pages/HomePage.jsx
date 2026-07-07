import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Globe from '../components/Globe';
import IntroSection from '../components/sections/IntroSection';
import WhatSection from '../components/sections/WhatSection';
import WhoSection from '../components/sections/WhoSection';
import ValuePropsSection from '../components/sections/ValuePropsSection';
import AIMatchmakingSection from '../components/sections/AIMatchmakingSection';
import TrustSection from '../components/sections/TrustSection';
import OpportunityBoardSection from '../components/sections/OpportunityBoardSection';
import EventsSection from '../components/sections/EventsSection';
import KnowledgeHubSection from '../components/sections/KnowledgeHubSection';
import WhyChooseSection from '../components/sections/WhyChooseSection';
import CTASection from '../components/sections/CTASection';
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-navy-900">
      <Navbar />
      <main>
        <Hero />
        <Globe />
        <IntroSection />
        <WhatSection />
        <WhoSection />
        <ValuePropsSection />
        <AIMatchmakingSection />
        <TrustSection />
        <OpportunityBoardSection />
        <EventsSection />
        <KnowledgeHubSection />
        <WhyChooseSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
