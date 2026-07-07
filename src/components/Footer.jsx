import { Link } from 'react-router-dom';

const quickLinks = [
  { name: 'Home', href: '/' },
  { name: 'How it Works', href: '/how-it-works' },
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
];

const companyLinks = [
  { name: 'Solutions', href: '/solutions' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

const Footer = () => {
  return (
    <footer className="bg-navy-900 border-t border-white/5 pt-14 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <span className="text-white font-extrabold text-lg tracking-wider">TWIF</span>
            <p className="text-gray-500 text-sm mt-3 max-w-sm leading-relaxed">
              A smart B2B networking platform designed to help businesses find qualified partners, service providers, investors, collaborators, and growth opportunities.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-gray-500 hover:text-white text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-gray-500 hover:text-white text-sm transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-600 text-xs">
            &copy; 2025 ConnectIn. All rights reserved.
          </p>
          <a href="#" className="text-gray-600 hover:text-gray-400 text-xs transition-colors">
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
