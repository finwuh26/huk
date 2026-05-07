import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, ChevronRight } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

import { useNavigate, Link, useLocation } from 'react-router-dom';

export function CookieBanner() {
  const [accepted, setAccepted] = React.useState(true);

  React.useEffect(() => {
    if (localStorage.getItem('huk_cookies_accepted') !== 'true') {
      setAccepted(false);
    }
  }, []);

  if (accepted) return null;

  return (
    <div className="bg-gray-100 border-b-4 border-govuk-blue shadow-sm pb-4 pt-4 px-4 sticky top-0 z-[1002]">
      <div className="govuk-width-container flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 className="text-xl font-bold mb-2">Cookies on HUK.GOV</h2>
          <p className="text-sm">We use some essential cookies to make this service work. We'd also like to use analytics cookies so we can understand how you use the service and make improvements.</p>
        </div>
        <div className="flex space-x-2 shrink-0">
          <button 
            onClick={() => {
              localStorage.setItem('huk_cookies_accepted', 'true');
              setAccepted(true);
            }} 
            className="bg-govuk-green text-white px-4 py-2 font-bold hover:bg-govuk-green-hover transition-colors shadow-sm"
          >
            Accept cookies
          </button>
          <button 
            onClick={() => {
              localStorage.setItem('huk_cookies_accepted', 'true');
              setAccepted(true);
            }} 
            className="bg-white border-2 border-black px-4 py-2 font-bold hover:bg-gray-50 transition-colors shadow-sm"
          >
            Reject analytics cookies
          </button>
        </div>
      </div>
    </div>
  );
}

export const CrownIcon = ({ className = "mr-2", width = "30", height = "32" }: { className?: string, width?: string | number, height?: string | number }) => (
  <img 
    src="https://imgs.search.brave.com/f1xmXIsVsNucoVXHA7KurMkOsPZK2lyMQoH_XT2sLsQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/YnJhbmRmZXRjaC5p/by9pZFByZEQxTnlB/L3RoZW1lL2xpZ2h0/L3N5bWJvbC5zdmc_/Yz0xYnhpZDY0TXVw/N2FjemV3U0FZTVgm/dD0xNzEzODg0OTY0/NTM5" 
    alt="UK Gov Logo"
    width={width}
    height={height}
    className={`${className} object-contain brightness-0 invert`}
  />
);

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, categories, loading } = useAuth();
  
  const isHomeOffice = useMemo(() => {
    return location.pathname.includes('/home-office') || 
           (location.pathname.includes('/page/') && 
            categories.some(c => c.id === 'home-office' && location.pathname.includes(c.id)));
  }, [location.pathname, categories]);
  
  const handleAuth = async () => {
    if (user) {
      await signOut(auth);
      navigate('/');
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      {isHomeOffice && (
        <div className="h-1 bg-ho-purple brightness-75" aria-hidden="true" />
      )}
      <header className={`text-white px-8 py-2 flex items-center shrink-0 min-h-[50px] transition-colors duration-300 ${isHomeOffice ? 'bg-ho-purple' : 'bg-govuk-black'}`} role="banner">
        <div className="govuk-width-container w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link to="/" className="flex items-center no-underline text-white focus:bg-govuk-focus focus:text-govuk-black p-1 -m-1">
              <CrownIcon />
              <div className="flex flex-col flex-1 whitespace-nowrap">
                <span className="text-2xl font-bold tracking-tight">HUK.GOV</span>
                {isHomeOffice && <span className="text-xs uppercase tracking-widest font-bold opacity-80">Home Office</span>}
              </div>
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            <Link to="/petitions" className="text-sm font-bold text-white hover:underline focus:bg-govuk-focus focus:text-govuk-black px-2 py-1">
              Petitions
            </Link>
            {user && (
              <Link to="/profile" className="text-sm font-bold text-white hover:underline focus:bg-govuk-focus focus:text-govuk-black px-2 py-1">
                Profile
              </Link>
            )}
            {(role && role !== 'user' || user?.email?.toLowerCase() === 'jimstke@gmail.com') && (
              <Link to="/admin" className="text-sm font-bold text-white hover:underline focus:bg-govuk-focus focus:text-govuk-black px-2 py-1">
                Admin
              </Link>
            )}
            <button 
              onClick={handleAuth}
              disabled={loading}
              className="text-sm font-bold text-white hover:underline focus:bg-govuk-focus focus:text-govuk-black px-2 py-1 disabled:opacity-50"
            >
              {loading ? '...' : (user ? 'Sign out' : 'Sign in')}
            </button>
          </nav>
        </div>
      </header>
      <div className={`h-[10px] shrink-0 transition-colors duration-300 ${isHomeOffice ? 'bg-ho-purple brightness-90' : 'bg-govuk-blue'}`}></div>
    </>
  );
}

export function Footer() {
  return (
    <footer className="bg-govuk-grey-light border-t border-govuk-border mt-auto py-8 sm:py-12" role="contentinfo">
      <div className="govuk-width-container">
        <div className="flex flex-col space-y-6">
          <p className="text-sm text-govuk-text-secondary italic">
            This is a satirical parody website. It is not affiliated with any official government body and all content is for satirical purposes only.
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-govuk-text-secondary">
            <Link to="/accessibility" className="underline decoration-govuk-text-secondary hover:text-govuk-blue">Accessibility statement</Link>
            <Link to="/privacy" className="underline decoration-govuk-text-secondary hover:text-govuk-blue">Cookies</Link>
            <Link to="/privacy" className="underline decoration-govuk-text-secondary hover:text-govuk-blue">Privacy</Link>
            <Link to="/terms" className="underline decoration-govuk-text-secondary hover:text-govuk-blue">Terms and conditions</Link>
          </nav>
          <div className="flex items-center justify-between mt-4">
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PhaseBanner() {
  return (
    <div className="py-2 mb-8 border-b border-govuk-border">
      <div className="govuk-width-container">
        <p className="text-sm">
          <strong className="bg-govuk-blue text-white px-1 mr-2 font-bold py-0.5 text-xs">BETA</strong>
          This is a new service – your <Link to="/feedback" className="text-govuk-blue underline">feedback</Link> will help us to improve it.
        </p>
      </div>
    </div>
  );
}

export function StartButton({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ backgroundColor: className.includes('bg-ho-purple') ? '#6d1b83' : '#005a30' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-govuk-green text-white text-[24px] font-bold px-8 py-3 border-b-4 border-govuk-green-dark flex items-center group transition-colors focus:outline-none focus:ring-4 focus:ring-govuk-focus shadow-lg shadow-black/5 ${className}`}
    >
      <span>{children}</span>
      <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-4 group-hover:translate-x-1 transition-transform">
        <path d="M0 0L17 9.5L0 19V0Z" fill="white"/>
      </svg>
    </motion.button>
  );
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: (string | BreadcrumbItem)[] }) {
  return (
    <nav className="mb-8" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm border-b border-govuk-border pb-4">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const label = typeof item === 'string' ? item : item.label;
          const href = typeof item === 'string' ? null : item.href;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && <span className="mx-2 text-govuk-text-secondary">/</span>}
              {isLast || !href ? (
                <span className="text-govuk-text-secondary">{label}</span>
              ) : (
                <Link to={href} className="underline decoration-1 underline-offset-4 hover:text-govuk-blue-hover text-govuk-blue">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
