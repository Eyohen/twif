import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const featureGroups = [
  { title: 'Smart discovery', description: 'Find people, teams, and businesses by fit instead of cold guessing.', image: '/teams.png' },
  { title: 'Verified profiles', description: 'Work with more confidence through profile data, trust signals, and stronger identity context.', image: '/serviceprofessional.png' },
  { title: 'Messaging and meetings', description: 'Move from interest to conversation with direct chat and booking flows.', image: '/industrymeetups.png' },
  { title: 'Opportunity visibility', description: 'See openings for partnerships, contracts, projects, and strategic growth.', image: '/boards.png' },
];

const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      <section className="pt-32 md:pt-40 pb-16 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl mx-auto">
          <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">Features</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
            The tools that keep business networking useful.
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed">
            Twif combines discovery, trust, messaging, and opportunity access in one place so business conversations do not lose momentum.
          </p>
        </motion.div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {featureGroups.map((item, index) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.08 }} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h2>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white border border-gray-200 rounded-2xl p-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Need more depth?</h2>
            <p className="text-gray-600">See how pricing unlocks wider access, visibility, and collaboration tools.</p>
          </div>
          <Link to="/pricing" className="inline-flex px-6 py-3 bg-navy-900 text-white font-semibold rounded-lg hover:bg-navy-800 transition-colors">
            View Pricing
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesPage;
