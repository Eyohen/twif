import { motion } from 'framer-motion';

const CTASection = () => {
  return (
    <section id="contact" className="py-20 md:py-28 px-4 bg-white scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-[1fr_0.9fr] gap-10 md:gap-14 items-center"
        >
          <div>
            <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">Contact</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Ready to Grow With the Right People?
            </h2>
            <p className="text-gray-500 text-base md:text-lg mb-8">
              Join a platform built for partnership, trust, and real business connections.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-3.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-lg text-base transition-colors shadow-lg shadow-accent/20"
            >
              Get Started
            </motion.button>

            <p className="text-gray-400 text-sm mt-8 italic">
              Because your next breakthrough is one connection away.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
            <img
              src="/industrymeetups.png"
              alt="African professionals twifg at an industry meetup"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
