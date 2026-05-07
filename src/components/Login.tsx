import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, UserPlus } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(isRegistering ? 'Failed to create account. Please try again.' : 'Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setShowForgot(false);
    } catch (err: any) {
      console.error(err);
      setError('Failed to send reset email. Ensure the email is correct.');
    } finally {
      setLoading(false);
    }
  };

  const bgImage = "https://media.discordapp.net/attachments/1500540230749392977/1500896351989403821/Discord_XSiaLSsnOM.png?ex=69fa1a27&is=69f8c8a7&hm=b966aa462b9ac2802e1b7da981eb4cae3b733a25989178a2ff70c45b2262afdd&=&format=webp&quality=lossless&width=1856&height=1121";

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-cover bg-center z-[1000]"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-white w-full max-w-[440px] p-10 shadow-2xl"
      >
        <div className="mb-6">
          <div className="flex items-center mb-8 w-full">
            <svg
              width="32"
              height="30"
              viewBox="0 0 32 30"
              fill="currentColor"
              className="mr-3 text-black shrink-0"
              aria-hidden="true"
            >
              <path d="M12 6h-2v2h2V6zm4 0h-2v2h2V6zm4 0h-2v2h2V6zm-8 4h-2v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4h-2v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-12 4h16v2H4v-2zm0 4h16v2H4v-2z" />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-black whitespace-nowrap overflow-visible">HUK.GOV</span>
          </div>
          
          <h1 className="text-3xl font-semibold text-[#1b1b1b] mb-2">
            {showForgot ? 'Reset password' : (isRegistering ? 'Create account' : 'Sign in')}
          </h1>
          <p className="text-[#1b1b1b] text-base mb-6">
            {showForgot ? 'Enter your email to receive recovery instructions' : 'to continue to Government Services'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm border-l-4 border-red-500">
            {error}
          </div>
        )}

        {resetSent && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm border-l-4 border-green-500">
            Reset email sent! Please check your inbox.
          </div>
        )}

        <form onSubmit={showForgot ? handleResetPassword : handleAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full border-b border-gray-400 py-2 text-base focus:outline-none focus:border-[#0067b8] transition-colors"
          />
          {!showForgot && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full border-b border-gray-400 py-2 text-base focus:outline-none focus:border-[#0067b8] transition-colors"
            />
          )}

          <div className="py-2">
            <p className="text-sm text-[#1b1b1b]">
              {isRegistering 
                ? 'Accounts are for public users. Staff permissions must be granted by administrators.' 
                : 'No account? Users can create a public account to sign petitions.'}
            </p>
          </div>

          <div className="flex justify-between items-center pt-2">
            {!showForgot ? (
              <div className="flex flex-col space-y-1">
                <button 
                  type="button" 
                  onClick={() => setShowForgot(true)}
                  className="text-xs text-[#0067b8] hover:underline text-left"
                >
                  Forgot password?
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-xs text-[#0067b8] hover:underline text-left"
                >
                  {isRegistering ? 'Already have an account? Sign in' : 'No account? Create one'}
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => setShowForgot(false)}
                className="text-sm text-[#0067b8] hover:underline"
              >
                Back to sign in
              </button>
            )}
            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={() => navigate('/')}
                className="text-sm bg-[#cccccc] text-black px-6 py-1.5 hover:bg-[#bbbbbb] transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="text-sm bg-[#0067b8] text-white px-10 py-1.5 hover:bg-[#005da6] transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : (showForgot ? 'Send' : 'Next')}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-12 text-xs text-[#1b1b1b] flex flex-wrap gap-x-4">
          <Link to="/terms" className="hover:underline">Terms of use</Link>
          <Link to="/privacy" className="hover:underline">Privacy & cookies</Link>
          <span className="ml-auto">...</span>
        </div>
      </motion.div>

      <div className="fixed bottom-0 right-0 p-4 text-xs text-white/80 hidden sm:block">
        © 2026 HUK.GOV. All rights reserved.
      </div>
    </div>
  );
}
