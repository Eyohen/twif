import { motion } from 'framer-motion';

const points = [
  'Business verification (documents, KYC)',
  'Trust scores based on interactions & feedback',
  'Transparent profiles with real data',
  'Review system after completed collaborations',
];

const TrustSection = () => {
  return (
    <section className="py-20 md:py-28 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Trust, Verification & Credibility
          </h2>
          <p className="text-gray-500 text-base md:text-lg mb-8">
            Business is built on trust — and Twif takes it seriously.
          </p>

          <ul className="space-y-4 mb-8">
            {points.map((point, i) => (
              <motion.li
                key={point}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <span className="text-gray-700 text-base">{point}</span>
              </motion.li>
            ))}
          </ul>

          <p className="text-gray-500 text-sm md:text-base italic">
            You&apos;re not just meeting businesses, you&apos;re meeting verified, credible businesses.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;
