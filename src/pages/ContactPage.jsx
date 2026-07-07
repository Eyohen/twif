import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const contactCards = [
  { title: 'General enquiries', body: 'Questions about the platform, access, or how Twif works for your business.' },
  { title: 'Partnership conversations', body: 'For ecosystem partners, programs, communities, and organizations exploring collaboration.' },
  { title: 'Support and onboarding', body: 'Help with using the platform, account flow, or getting your team started properly.' },
];

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      <section className="pt-32 md:pt-40 pb-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">Contact</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
              Let’s open the right conversation.
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Reach out if you want to explore partnerships, platform access, onboarding, or how Twif can support your business network.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="overflow-hidden rounded-2xl aspect-[4/3] bg-white">
            <img src="/industrymeetups.png" alt="African professionals networking at an event" className="w-full h-full object-cover" />
          </motion.div>
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {contactCards.map((card) => (
            <div key={card.title} className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h2>
              <p className="text-gray-600 leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto bg-navy-900 rounded-2xl p-8 md:p-10 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-300 text-lg leading-relaxed mb-8">
            Create your account, build a stronger profile, and start making business connections that have context from the beginning.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/signup" className="inline-flex px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-dark transition-colors">
              Create Account
            </Link>
            <Link to="/pricing" className="inline-flex px-6 py-3 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
