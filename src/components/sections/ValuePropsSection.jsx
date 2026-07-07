import { motion } from 'framer-motion';

const valueProps = [
  {
    title: 'Find the Right People Faster',
    description: 'No more guessing, cold outreach, or random events. Our AI-powered engine analyzes your business needs and connects you with the right partners, service providers, and collaborators.',
    icon: (
      <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    title: 'Verified Businesses You Can Trust',
    description: 'Every company profile is verified through a trust and credibility system — so you know who you\'re doing business with. No fakes, no guesswork, no uncertainty.',
    icon: (
      <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Collaborate Seamlessly',
    description: 'From first connection to active partnership, Twif gives you the tools to communicate, manage projects, share documents, and track progress — all in one place.',
    icon: (
      <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    title: 'B2B Growth Made Simple',
    description: 'Whether you\'re looking for investors, vendors, or strategic collaborators, Twif simplifies B2B networking and accelerates growth — opportunity by opportunity.',
    icon: (
      <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
];

const ValuePropsSection = () => {
  return (
    <section id="features" className="py-20 md:py-28 px-4 bg-white scroll-mt-28">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-[0.85fr_1fr] gap-8 md:gap-12 items-center mb-14"
        >
          <div className="overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
            <img
              src="/teams.png"
              alt="African business team reviewing growth opportunities"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Core Value Propositions
            </h2>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {valueProps.map((prop, i) => (
            <motion.div
              key={prop.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-gray-50 rounded-2xl p-6 md:p-8 border border-gray-100"
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-5">
                {prop.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{prop.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{prop.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValuePropsSection;
