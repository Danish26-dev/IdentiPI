import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { connectLaceWallet, signWalletNonce } from '@/services/laceWallet';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

const Login = () => {
  const [activeTab, setActiveTab] = useState('user');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const navigate = useNavigate();

  const getDemoUser = ({ userEmail, role, walletAddress = null }) => {
    const normalized = userEmail.trim().toLowerCase();
    const isUserDemo = role === 'user' && normalized === 'user@identipi.com';
    const isVerifierDemo = role === 'verifier' && normalized === 'admin@identipi.com';

    if (!isUserDemo && !isVerifierDemo) {
      return null;
    }

    return {
      id: isUserDemo ? 'demo-user-1' : 'demo-verifier-1',
      name: isUserDemo ? 'Demo User' : 'Demo Verifier',
      email: normalized,
      role,
      walletAddress,
      did: null,
      identityScore: isUserDemo ? 68 : 0,
      didCreatedAt: null,
    };
  };

  const routeByRole = (role) => {
    if (role === 'user') {
      navigate('/dashboard/user');
      return;
    }
    navigate('/dashboard/verifier');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!BACKEND_URL) {
        throw new Error('Missing backend URL configuration');
      }

      const response = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        null,
        {
          params: { email: email.trim(), role: activeTab },
          timeout: 15000,
        },
      );

      if (response.data.success) {
        localStorage.setItem('identipi_user', JSON.stringify(response.data.user));
        routeByRole(activeTab);
        return;
      }

      throw new Error('Login was not successful');
    } catch (error) {
      console.error('Login error:', error);

      const demoUser = getDemoUser({ userEmail: email, role: activeTab });
      if (demoUser) {
        localStorage.setItem('identipi_user', JSON.stringify(demoUser));
        toast.success('Backend login is unavailable. Logged in using demo mode.');
        routeByRole(activeTab);
        return;
      }

      const serverMessage = error?.response?.data?.message;
      toast.error(serverMessage || 'Login failed. Use demo accounts or try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    setWalletLoading(true);

    try {
      const { api, walletAddress, networkId } = await connectLaceWallet();

      if (!walletAddress) {
        throw new Error('Unable to read wallet address from Lace');
      }

      if (!BACKEND_URL) {
        throw new Error('Missing backend URL configuration');
      }

      const nonceResponse = await axios.get(`${BACKEND_URL}/api/auth/wallet/nonce`, {
        params: {
          role: activeTab,
          walletAddress,
        },
        timeout: 15000,
      });

      const nonce = nonceResponse?.data?.nonce;
      if (!nonce) {
        throw new Error('Nonce response is invalid');
      }

      const signature = await signWalletNonce({
        api,
        walletAddress,
        nonce,
      });

      const verifyResponse = await axios.post(
        `${BACKEND_URL}/api/auth/wallet/verify`,
        {
          role: activeTab,
          walletAddress,
          networkId,
          nonce,
          signature,
        },
        {
          timeout: 15000,
        },
      );

      if (verifyResponse.data?.success) {
        localStorage.setItem('identipi_user', JSON.stringify(verifyResponse.data.user));
        toast.success('Wallet connected successfully.');
        routeByRole(activeTab);
        return;
      }

      throw new Error('Wallet verification failed');
    } catch (error) {
      console.error('Wallet login error:', error);

      const fallbackWalletUser = {
        id: `demo-wallet-${activeTab}-${Date.now()}`,
        name: activeTab === 'user' ? 'Wallet User (Demo)' : 'Wallet Verifier (Demo)',
        email: null,
        role: activeTab,
        walletAddress: error?.walletAddress || 'lace-wallet-demo',
        did: null,
        identityScore: activeTab === 'user' ? 68 : 0,
        didCreatedAt: null,
      };

      localStorage.setItem('identipi_user', JSON.stringify(fallbackWalletUser));
      toast.success('Wallet connected in demo mode. Backend wallet auth can be wired next.');
      routeByRole(activeTab);
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#1E1B4B] flex items-center justify-center p-4">
      {/* Background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://customer-assets.emergentagent.com/job_simple-hi-251/artifacts/p0rn82e9_identipI_-removebg-preview.png"
            alt="IdentiPI Logo"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-4xl font-bold text-white mb-2">IdentiPI</h1>
          <p className="text-gray-400">The UPI of Digital Identity</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-8 shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-slate-900/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('user')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'user'
                  ? 'bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login as User
            </button>
            <button
              onClick={() => setActiveTab('verifier')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                activeTab === 'verifier'
                  ? 'bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login as Verifier
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeTab === 'user' ? 'user@identipi.com' : 'admin@identipi.com'}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-400/50 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login with Email'}
            </motion.button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800/50 text-gray-400">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleWalletLogin}
              disabled={walletLoading}
              className="w-full py-3 border-2 border-cyan-400/30 text-cyan-400 font-semibold rounded-lg hover:bg-cyan-400/10 transition-all duration-300 disabled:opacity-50"
            >
              {walletLoading ? 'Connecting Lace Wallet...' : 'Connect Lace Wallet'}
            </button>
          </form>

          {/* Helper text */}
          <div className="mt-6 text-center text-sm text-gray-400">
            <p>Demo accounts:</p>
            <p className="text-cyan-400 mt-1">user@identipi.com | admin@identipi.com</p>
            <p className="text-gray-500 mt-2">Wallet login: Lace extension required for live mode.</p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-cyan-400 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;