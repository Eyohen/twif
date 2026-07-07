import { motion } from 'framer-motion';

const tags = [
  'Partnerships', 'Contracts', 'Joint ventures',
  'Vendor sourcing', 'Project collaborations', 'Investment opportunities',
];

const OpportunityBoardSection = () => {
  return (
    <section id="solutions" className="py-20 md:py-28 px-4 bg-white scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">Solutions</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Opportunity Board: Where Businesses Find Each Other
            </h2>
            <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-6">
              Post opportunities, discover partnerships, and find the right collaborators
              for your next big project. The Opportunity Board is where business needs
              meet business solutions.
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
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
              Your next growth opportunity may already be on the board.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100"
          >
            <img
              src="/boards.png"
              alt="Business collaboration"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OpportunityBoardSection;
