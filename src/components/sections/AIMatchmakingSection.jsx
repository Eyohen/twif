import { motion } from 'framer-motion';

const tags = [
  'Industry match', 'Location proximity', 'Business size',
  'Growth stage', 'Service needs', 'Past collaborations',
];

const AIMatchmakingSection = () => {
  return (
    <section className="py-20 md:py-28 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="bg-navy-900 rounded-3xl p-8 md:p-14 text-center overflow-hidden relative"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple-500/5 pointer-events-none" />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              AI-Driven Business Matchmaking
            </h2>
            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-4">
              Your next business partner isn&apos;t just a random guess — it&apos;s a calculated, data-driven match.
            </p>
            <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto mb-8">
              Our intelligent matching system analyzes your business profile, goals, industry, and preferences
              to surface the most relevant connections. The more you use Twif, the smarter your matches become.
            </p>

            {/* Tags */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Testimonial */}
            <div className="border-t border-white/10 pt-8">
              <p className="text-accent italic text-base md:text-lg mb-3">
                &ldquo;This is exactly what I&apos;ve been looking for!&rdquo;
              </p>
              <p className="text-gray-500 text-sm">— Early Beta User</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AIMatchmakingSection;
