import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { name: 'Home', href: '/' },
  { name: 'How it Works', href: '/how-it-works' },
  { name: 'Features', href: '/features' },
  { name: 'Solutions', href: '/solutions' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'About Us', href: '/about' },
  { name: 'Contact', href: '/contact' },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    if (href.startsWith('/')) return location.pathname === href;
    return false;
  };

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[93%] max-w-5xl">
      <div className="flex items-center justify-between px-6 py-3 bg-navy-800/80 backdrop-blur-md border border-white/10 rounded-full">
        {/* Logo */}
        <Link to="/" className="text-white font-extrabold text-lg tracking-wider">
          TWIF
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'text-accent'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Sign In Button */}
        <Link to="/login" className="hidden lg:block px-5 py-2 text-sm font-semibold text-accent border border-accent rounded-full hover:bg-accent hover:text-white transition-all">
          Sign In
        </Link>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-white p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden mt-2 p-4 bg-navy-800/95 backdrop-blur-md border border-white/10 rounded-2xl animate-slide-down">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className={`block py-2.5 text-sm font-medium ${
                isActive(link.href) ? 'text-accent' : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <Link to="/login" className="mt-3 block w-full py-2.5 text-sm font-semibold text-accent border border-accent rounded-full hover:bg-accent hover:text-white transition-all text-center" onClick={() => setMobileOpen(false)}>
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
