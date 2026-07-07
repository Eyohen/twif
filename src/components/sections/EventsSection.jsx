import { motion } from 'framer-motion';

const tags = [
  'Virtual events', 'Industry-specific webinars',
  'Networking meetups', 'Expert-led masterclasses',
];

const EventsSection = () => {
  return (
    <section className="py-20 md:py-28 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Events, Webinars & Industry Meetups
            </h2>
            <p className="text-gray-500 text-base md:text-lg leading-relaxed mb-6">
              Learn, grow, and build meaningful connections through curated virtual
              and in-person events designed for B2B professionals.
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
              Because connection is both digital and human.
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
              src="/industrymeetups.png"
              alt="Business event"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
