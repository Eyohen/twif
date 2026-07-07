import { motion } from 'framer-motion';

const Hero = () => {
  return (
    <section id="home" className="relative pt-40 md:pt-44 pb-8 text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.15] tracking-tight text-white mb-6">
          Your Next Big Advantage Is One Connection Away.
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Built for clarity, credibility, and connections that truly move your business forward.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="px-8 py-3.5 bg-accent hover:bg-accent-dark text-white font-semibold rounded-lg text-base transition-colors shadow-lg shadow-accent/20"
        >
          Start Networking
        </motion.button>
      </motion.div>
    </section>
  );
};

export default Hero;
