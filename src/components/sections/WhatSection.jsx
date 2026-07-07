import { motion } from 'framer-motion';

const features = [
  { label: 'Find a partner', icon: '🔍' },
  { label: 'Verify credentials', icon: '✓' },
  { label: 'Collaborate & grow', icon: '📈' },
];

const WhatSection = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-28 px-4 bg-white scroll-mt-28">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-accent font-bold tracking-widest text-sm mb-4 uppercase">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              What Twif Is
            </h2>
            <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-4">
              Twif is a smart B2B networking platform designed to help businesses find
              qualified partners, service providers, investors, collaborators, and growth
              opportunities — all in one place.
            </p>
            <p className="text-gray-600 text-base md:text-lg leading-relaxed mb-4">
              We help you discover brands and companies that matter to your work, your goals,
              and your next phase of growth.
            </p>
            <p className="text-gray-900 font-semibold text-base md:text-lg">
              This is strategic, data-driven, verified business matchmaking.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100"
          >
            <img
              src="/businessleaders.png"
              alt="African business leaders in a planning session"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>

        {/* Platform Preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16"
        >
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 md:p-10">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center justify-center">
              {features.map((feature, i) => (
                <div key={feature.label} className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xl shadow-sm">
                      {feature.icon}
                    </div>
                    <span className="text-gray-700 font-medium">{feature.label}</span>
                  </div>
                  {i < features.length - 1 && (
                    <div className="hidden md:block w-16 h-px bg-gray-300" />
                  )}
                </div>
              ))}
            </div>

            {/* Mock dashboard UI */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Smart Discovery</h4>
                <p className="text-xs text-gray-500">AI-powered matching finds the right businesses for you.</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                  <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Verified Profiles</h4>
                <p className="text-xs text-gray-500">Every business is verified for trust and credibility.</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Real Connections</h4>
                <p className="text-xs text-gray-500">Connect, collaborate, and grow with the right people.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhatSection;
