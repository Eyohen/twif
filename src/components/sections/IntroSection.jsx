import { motion } from 'framer-motion';

const IntroSection = () => {
  return (
    <section className="relative py-20 md:py-28 px-4 bg-navy-900">
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl mx-auto text-center text-xl md:text-2xl lg:text-3xl text-gray-300 leading-relaxed font-light"
      >
        In today&apos;s world, finding the right partners, clients, collaborations, and opportunities shouldn&apos;t be a gamble. Twif helps you meet the right businesses faster — with intelligence, trust, and purpose.
      </motion.p>
    </section>
  );
};

export default IntroSection;
