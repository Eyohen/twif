import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const plans = [
  {
    name: 'Free Plan',
    tagline: 'Start Twifg - No Cost, No Commitment',
    price: '$0',
    description: 'Perfect for individuals and small businesses who want to test-drive the platform and begin discovering relevant business opportunities.',
    cta: 'Get Started Free',
    ctaStyle: 'bg-navy-900 text-white hover:bg-navy-800',
    featured: false,
    includes: 'What You Get:',
    features: [
      'Create a complete business profile',
      'Discover recommended business matches',
      'Respond to connection requests',
      'Access Opportunity Board (limited)',
      'Browse Knowledge Hub',
      'Join public collaboration hubs',
      'Attend free webinars and events',
      'Send and receive basic messages',
    ],
    bestFor: 'Small businesses, early-stage startups, solo professionals',
  },
  {
    name: 'Premium Plan',
    tagline: 'Unlock Full Access & Build High-Value Relationships',
    price: '$200',
    description: 'Designed for businesses that want deeper visibility, priority matches, and more opportunities to collaborate, pitch, and grow.',
    cta: 'Upgrade to Premium',
    ctaStyle: 'border border-accent text-accent hover:bg-accent hover:text-white',
    featured: true,
    includes: 'Everything in Free, plus:',
    features: [
      'Full access to Opportunity Board',
      'Advanced matching filters',
      'Priority visibility to investors & partners',
      'Create and manage collaboration hubs',
      'Post unlimited opportunities',
      'Direct message any user',
      'Access premium webinars & workshops',
      'Profile boost on search',
      'Monthly growth insights',
    ],
    bestFor: 'Growth-focused SMEs, consultants, startups ready to scale, service providers',
  },
  {
    name: 'Enterprise Plan',
    tagline: 'For Organizations That Need Verified Partners & Teams',
    price: '$500',
    description: 'Built for corporates, associations, accelerators, and large teams that need structured networking and managed collaboration spaces.',
    cta: 'Request a Demo',
    ctaStyle: 'border border-gray-300 text-gray-900 hover:bg-gray-100',
    featured: false,
    includes: 'Everything in Premium, plus:',
    features: [
      'Dedicated team workspace',
      'Internal collaboration hub',
      'Verified badge for organization',
      'Host events & programs',
      'Priority onboarding for all staff',
      'Custom matchmaking',
      'Dedicated account manager',
      'Monthly business reports',
      'Early access to new features',
      'API integrations',
    ],
    bestFor: 'Corporates, consulting firms, trade associations, accelerators, government agencies',
  },
];

const comparisonFeatures = [
  { feature: 'Business Profile', free: true, premium: true, enterprise: true },
  { feature: 'Recommended Matches', free: 'Basic', premium: 'Enhanced filters', enterprise: 'Custom matching' },
  { feature: 'Opportunity Board', free: 'Limited', premium: 'Unlimited', enterprise: 'Unlimited + priority' },
  { feature: 'Messaging', free: 'Basic', premium: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Collaboration Hubs', free: 'Join Only', premium: 'Create & Manage', enterprise: 'Private Team Hub' },
  { feature: 'Events & Webinars', free: 'Free Events', premium: 'Premium Events', enterprise: 'Host Events' },
  { feature: 'Knowledge Hub', free: 'Basic Access', premium: 'Full Access', enterprise: 'Full + custom' },
  { feature: 'Visibility Boost', free: false, premium: true, enterprise: 'Priority level' },
  { feature: 'Growth Insights', free: false, premium: 'Monthly', enterprise: 'Full analytics' },
  { feature: 'Verification Badge', free: false, premium: 'Optional', enterprise: 'Included' },
  { feature: 'Team Management', free: false, premium: false, enterprise: true },
  { feature: 'Account Manager', free: false, premium: false, enterprise: true },
  { feature: 'API Integrations', free: false, premium: false, enterprise: 'Available' },
];

const testimonials = [
  {
    quote: 'ConnectIn helped us close 2 new partnerships in our first month.',
    author: 'Early Beta User',
  },
  {
    quote: "The platform's intuitive interface allowed us to streamline our onboarding process significantly.",
    author: 'Product Manager',
  },
  {
    quote: "With ConnectIn, we've seen a 30% increase in user engagement within the first quarter.",
    author: 'Marketing Director',
  },
];

const CheckIcon = () => (
  <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CellValue = ({ value }) => {
  if (value === true) return <CheckIcon />;
  if (value === false) return <XIcon />;
  return <span className="text-sm text-gray-600">{value}</span>;
};

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 md:pt-40 pb-12 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4">
            Built for growth. Designed for real business connections.
          </h1>
          <p className="text-gray-400 text-base mb-4">
            Choose the Plan That Helps Your Business Connect, Collaborate, and Grow
          </p>
          <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Whether you&apos;re a startup, SME, or enterprise team, ConnectIn gives you the tools to discover meaningful partnerships, showcase your value, and build strategic relationships that actually move your business forward.
          </p>
        </motion.div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl p-7 md:p-8 ${
                plan.featured
                  ? 'bg-navy-900 text-white md:-mt-4 md:mb-0 md:pb-10 z-10 shadow-xl border-2 border-accent'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 right-6 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Popular
                </span>
              )}

              <h3 className={`text-lg font-bold mb-1 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-5 ${plan.featured ? 'text-accent' : 'text-gray-500'}`}>
                {plan.tagline}
              </p>

              <div className="mb-4">
                <span className={`text-4xl font-bold ${plan.featured ? 'text-accent' : 'text-gray-900'}`}>
                  {plan.price}
                </span>
                <span className={`text-sm ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>/month</span>
              </div>

              <p className={`text-sm leading-relaxed mb-6 ${plan.featured ? 'text-accent/80' : 'text-gray-500'}`}>
                {plan.description}
              </p>

              <button className={`w-full py-3 rounded-lg text-sm font-semibold transition-all mb-6 ${plan.ctaStyle}`}>
                {plan.cta}
              </button>

              <p className={`text-sm font-semibold mb-4 ${plan.featured ? 'text-white' : 'text-gray-900'}`}>
                {plan.includes}
              </p>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.featured ? 'text-accent' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className={`text-sm ${plan.featured ? 'text-gray-300' : 'text-gray-600'}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className={`pt-4 border-t ${plan.featured ? 'border-white/10' : 'border-gray-100'}`}>
                <p className={`text-sm font-semibold mb-1 ${plan.featured ? 'text-accent' : 'text-gray-900'}`}>Best For:</p>
                <p className={`text-sm ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>{plan.bestFor}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 pr-4 text-sm font-bold text-gray-900 w-1/4">Feature</th>
                <th className="text-center py-4 px-4 text-sm font-bold text-gray-900 w-1/4">Free</th>
                <th className="text-center py-4 px-4 text-sm font-bold text-gray-900 w-1/4">Premium</th>
                <th className="text-center py-4 px-4 text-sm font-bold text-gray-900 w-1/4">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row) => (
                <tr key={row.feature} className="border-b border-gray-100">
                  <td className="py-4 pr-4 text-sm text-gray-900 font-medium">{row.feature}</td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center"><CellValue value={row.free} /></div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center"><CellValue value={row.premium} /></div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex justify-center"><CellValue value={row.enterprise} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Testimonials */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.author} className="bg-white rounded-xl p-6 border border-gray-200">
              <p className="text-gray-900 text-sm font-medium leading-relaxed mb-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <p className="text-gray-400 text-sm">— {t.author}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
