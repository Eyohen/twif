import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const pillars = [
  { title: 'Credibility', description: 'Profiles should help businesses understand who they are talking to and why the connection matters.' },
  { title: 'Relevance', description: 'Every discovery flow should point users toward stronger business fit, not empty volume.' },
  { title: 'Momentum', description: 'Once two parties connect, the platform should make conversation and follow-up easier.' },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      <section className="pt-32 md:pt-40 pb-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.9fr_1fr] gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">About us</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
              Twif is built for real business relationships.
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              The goal is simple: help businesses across African markets find credible people, meaningful opportunities, and stronger paths to collaboration.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="overflow-hidden rounded-2xl aspect-[4/3] bg-white">
            <img src="/smes.jpeg" alt="African entrepreneurs in discussion" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 md:p-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-5">What we believe</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Business networking should feel focused, informed, and worth the time. Twif exists to replace scattered outreach with stronger discovery, better context, and more productive follow-through.
          </p>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{pillar.title}</h2>
              <p className="text-gray-600 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutPage;
