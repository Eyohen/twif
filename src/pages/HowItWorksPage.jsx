import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const steps = [
  { title: 'Build a credible profile', description: 'Show your business focus, industry, location, goals, and what you are looking for so the right people can find you.' },
  { title: 'Discover qualified matches', description: 'Browse people and businesses based on fit, business need, and shared opportunity instead of random outreach.' },
  { title: 'Connect with intention', description: 'Send connection requests only where there is a real business reason, then continue once the other side accepts.' },
  { title: 'Move the conversation forward', description: 'Use messaging, bookings, and opportunities to turn introductions into active business relationships.' },
];

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      <section className="pt-32 md:pt-40 pb-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">How it works</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
              Built to help serious businesses meet with clarity.
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">
              Twif turns business discovery into a clear path: profile, match, connect, message, and collaborate.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="overflow-hidden rounded-2xl aspect-[4/3] bg-white">
            <img src="/businessleaders.png" alt="African business leaders collaborating" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, index) => (
            <div key={step.title} className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-accent font-bold text-sm mb-3">0{index + 1}</p>
              <h2 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h2>
              <p className="text-gray-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto bg-navy-900 rounded-2xl p-8 md:p-10 text-white">
          <h2 className="text-3xl font-bold mb-4">From introduction to opportunity</h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">
            The platform is designed to reduce noise, improve trust, and make every connection more likely to lead somewhere useful.
          </p>
          <Link to="/signup" className="inline-flex px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-dark transition-colors">
            Create Your Profile
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowItWorksPage;
