import { motion } from 'framer-motion';

const tags = [
  'Industry reports', 'Case studies',
  'White papers', 'Market insights',
];

const KnowledgeHubSection = () => {
  return (
    <section className="py-20 md:py-28 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-start gap-8 md:gap-14"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-navy-900 flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>

          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Knowledge Hub
            </h2>

            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-gray-400 text-sm italic">
              Stay informed. Stay ahead.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default KnowledgeHubSection;
