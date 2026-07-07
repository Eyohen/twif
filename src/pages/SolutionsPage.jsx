import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const solutions = [
  'Find suppliers, service providers, and specialist support faster.',
  'Surface partnership and collaboration opportunities with clearer fit.',
  'Help startups and SMEs reach more credible business counterparts.',
  'Support teams that need business discovery, introductions, and follow-through in one workflow.',
];

const SolutionsPage = () => {
  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      <section className="pt-32 md:pt-40 pb-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.95fr_1fr] gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">Solutions</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
              Practical ways businesses can use Twif.
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Whether the goal is partnerships, sourcing, expert support, or market access, Twif gives businesses a structured way to find the right people.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="overflow-hidden rounded-2xl aspect-[4/3] bg-white">
            <img src="/boards.png" alt="African business teams exploring opportunities" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {solutions.map((item) => (
            <div key={item} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-gray-700 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="overflow-hidden rounded-2xl bg-white border border-gray-200">
            <div className="aspect-[4/3] bg-gray-100">
              <img src="/startups.png" alt="African startup founders" className="w-full h-full object-cover" />
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">For startups and SMEs</h2>
              <p className="text-gray-600 leading-relaxed">Get access to relationships that help with growth, delivery, partnerships, and business credibility.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white border border-gray-200">
            <div className="aspect-[4/3] bg-gray-100">
              <img src="/industryexpert.png" alt="African industry expert" className="w-full h-full object-cover" />
            </div>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">For consultants and experts</h2>
              <p className="text-gray-600 leading-relaxed">Showcase expertise, respond to relevant business needs, and turn discovery into paid work and long-term relationships.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto bg-navy-900 rounded-2xl p-8 md:p-10 text-white">
          <h2 className="text-3xl font-bold mb-4">Start exploring the right fit</h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">Use Twif to shorten the path from business need to business relationship.</p>
          <Link to="/signup" className="inline-flex px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-dark transition-colors">
            Join Twif
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SolutionsPage;
