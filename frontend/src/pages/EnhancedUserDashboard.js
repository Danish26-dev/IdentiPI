import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const EnhancedUserDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [vcRequests, setVcRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Document upload state
  const [documentType, setDocumentType] = useState('');
  const [documentFile, setDocumentFile] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('identipi_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadUserData(parsedUser.id, parsedUser.did);
  }, [navigate]);

  const loadUserData = async (userId, userDid) => {
    try {
      // Load user info
      const userRes = await axios.get(`${BACKEND_URL}/api/users/${userId}`);
      setUser(userRes.data);
      localStorage.setItem('identipi_user', JSON.stringify(userRes.data));

      // Load documents
      const docsRes = await axios.get(`${BACKEND_URL}/api/documents/user/${userId}`);
      setDocuments(docsRes.data.documents);

      // Load credentials
      const credsRes = await axios.get(`${BACKEND_URL}/api/credentials/user/${userId}`);
      setCredentials(credsRes.data.credentials);

      // Load VC requests
      const reqsRes = await axios.get(`${BACKEND_URL}/api/verification-requests/user/${userId}`);
      setVcRequests(reqsRes.data.requests);

      // Load incoming verification requests if DID exists
      if (userDid) {
        const incomingRes = await axios.get(`${BACKEND_URL}/api/incoming-requests/user-did/${userDid}`);
        setIncomingRequests(incomingRes.data.requests);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('identipi_user');
    navigate('/');
  };

  const generateDID = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/users/${user.id}/generate-did`);
      if (res.data.success) {
        alert(`DID Generated Successfully!\n\nYour DID: ${res.data.did}\n\nPublic Key: ${res.data.publicKey}\n\n⚠️ Important: Store your private key securely!`);
        loadUserData(user.id, res.data.did);
      }
    } catch (error) {
      console.error('Error generating DID:', error);
      alert('Failed to generate DID');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async () => {
    if (!documentType) {
      alert('Please select document type');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/documents/upload`, {
        userId: user.id,
        documentType,
        metadata: { name: user.name, uploadedAt: new Date().toISOString() }
      });

      if (res.data.success) {
        alert('Document uploaded successfully! Awaiting verification.');
        setDocumentType('');
        setDocumentFile(null);
        loadUserData(user.id, user.did);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const requestVC = async (credType) => {
    if (!user.did) {
      alert('Please generate a DID first');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/verification-requests/create`, {
        requesterId: user.id,
        requesterName: user.name,
        userDid: user.did,
        credentialRequested: credType
      });

      if (res.data.success) {
        alert('Verification request submitted successfully!');
        loadUserData(user.id, user.did);
      }
    } catch (error) {
      console.error('Error requesting VC:', error);
      alert('Failed to request credential');
    } finally {
      setLoading(false);
    }
  };

  const respondToIncomingRequest = async (requestId, approve) => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/incoming-requests/${requestId}/respond?approved=${approve}`);
      
      if (res.data.success) {
        if (approve && res.data.zkProof) {
          alert(`Verification Approved!\n\nZK Proof Generated:\n${res.data.zkProof.credentialType}: VERIFIED\n\nProof: ${res.data.zkProof.proof}`);
        } else {
          alert('Request rejected successfully');
        }
        loadUserData(user.id, user.did);
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Failed to respond to request');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="text-white">Loading...</div></div>;

  const sidebarItems = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'did', name: 'DID Management', icon: '🆔' },
    { id: 'vc-requests', name: 'VC Requests', icon: '✉️' },
    { id: 'identity-score', name: 'Identity Score', icon: '⭐' },
    { id: 'incoming', name: 'Incoming Requests', icon: '📥' },
  ];

  // Calculate identity score percentage
  const scorePercentage = user.identityScore || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#1E1B4B]">
      {/* Navbar */}
      <nav className="bg-slate-800/50 backdrop-blur-xl border-b border-cyan-400/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src="https://customer-assets.emergentagent.com/job_simple-hi-251/artifacts/p0rn82e9_identipI_-removebg-preview.png"
                alt="IdentiPI"
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-white">IdentiPI</span>
              <span className="ml-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
                USER
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Welcome back</p>
                <p className="text-white font-semibold">{user.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-4 sticky top-24">
              <div className="space-y-2">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                      activeSection === item.id
                        ? 'bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white shadow-lg shadow-cyan-400/30'
                        : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-4">
            {/* Dashboard Section */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
                  <p className="text-gray-400">Your Web3 Identity Hub</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/30 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-cyan-400 text-4xl mb-3">🆔</div>
                      <p className="text-gray-400 text-sm mb-2">Your DID Status</p>
                      <p className="text-white text-lg font-semibold">
                        {user.did ? 'Active' : 'Not Created'}
                      </p>
                      {user.did && (
                        <p className="text-gray-500 text-xs mt-2 font-mono break-all">
                          {user.did.slice(0, 20)}...
                        </p>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-green-400/30 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-green-400 text-4xl mb-3">⭐</div>
                      <p className="text-gray-400 text-sm mb-2">Identity Score</p>
                      <p className="text-white text-3xl font-bold">{user.identityScore}</p>
                      <p className="text-gray-500 text-xs mt-1">out of 100</p>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-400/30 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-purple-400 text-4xl mb-3">🎫</div>
                      <p className="text-gray-400 text-sm mb-2">Credentials</p>
                      <p className="text-white text-3xl font-bold">{credentials.length}</p>
                      <p className="text-gray-500 text-xs mt-1">Verified</p>
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <span>📄</span> Document Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Total Uploaded</span>
                        <span className="text-white font-semibold text-lg">{documents.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Verified</span>
                        <span className="text-green-400 font-semibold text-lg">
                          {documents.filter(d => d.verificationStatus === 'approved').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Pending</span>
                        <span className="text-yellow-400 font-semibold text-lg">
                          {documents.filter(d => d.verificationStatus === 'pending').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <span>📥</span> Activity
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="text-gray-300">{vcRequests.length} VC requests sent</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                        <span className="text-gray-300">{incomingRequests.length} incoming verifications</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span className="text-gray-300">Score: {user.identityScore}/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DID Management Section */}
            {activeSection === 'did' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Decentralized Identity (DID)</h2>
                  <p className="text-gray-400">Manage your Web3 identity</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-8">
                  {!user.did ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-6">🆔</div>
                      <h3 className="text-2xl font-semibold text-white mb-4">Create Your DID</h3>
                      <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                        Generate your unique Decentralized Identifier to start using IdentiPI.
                        Your DID will be your universal identity across all verifiable credentials.
                      </p>
                      <button
                        onClick={generateDID}
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-full text-lg shadow-lg hover:shadow-cyan-400/50 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Generating...' : 'Create DID'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-green-400/20 flex items-center justify-center">
                            <span className="text-green-400 text-2xl">✓</span>
                          </div>
                          <div>
                            <p className="text-green-400 font-semibold text-lg">DID Created Successfully</p>
                            <p className="text-gray-400 text-sm">Your identity is active on the blockchain</p>
                          </div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-gray-400 text-sm mb-2">Your DID:</p>
                          <p className="text-white font-mono break-all">{user.did}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/50 rounded-xl p-6 border border-cyan-400/20">
                          <h4 className="text-white font-semibold mb-4">DID Status</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Status</span>
                              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Active</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Wallet Linked</span>
                              <span className="text-white">{user.walletAddress ? 'Yes' : 'Not Connected'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Created</span>
                              <span className="text-white">Today</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-xl p-6 border border-cyan-400/20">
                          <h4 className="text-white font-semibold mb-4">Share Your Identity</h4>
                          <div className="flex flex-col items-center">
                            <div className="bg-white p-4 rounded-lg mb-3">
                              <QRCodeSVG value={user.did} size={150} />
                            </div>
                            <p className="text-cyan-400 text-sm text-center">
                              Scan this QR code for verification
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/50 rounded-xl p-6 border border-cyan-400/20">
                        <h4 className="text-white font-semibold mb-3">What is a DID?</h4>
                        <ul className="space-y-2 text-gray-300 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span>A unique identifier that belongs to you forever</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span>No central authority can revoke or control it</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span>Links all your verifiable credentials</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span>Enables privacy-preserving verification</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VC Requests Section */}
            {activeSection === 'vc-requests' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Request Verifiable Credential</h2>
                  <p className="text-gray-400">Upload documents and request verification</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Upload Document</h3>
                  
                  {!user.did ? (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
                      <p className="text-yellow-400">⚠️ Please generate a DID first before uploading documents</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Select Credential Type
                        </label>
                        <select
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">Choose document type</option>
                          <option value="Aadhaar">Aadhaar Card</option>
                          <option value="PAN">PAN Card</option>
                          <option value="Degree">Degree Certificate</option>
                          <option value="Address Proof">Address Proof</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Upload Document (Mock)
                        </label>
                        <div className="border-2 border-dashed border-cyan-400/30 rounded-lg p-8 text-center hover:border-cyan-400/50 transition-colors cursor-pointer">
                          <div className="text-4xl mb-2">📄</div>
                          <p className="text-gray-400">Click to select document</p>
                          <p className="text-gray-500 text-xs mt-1">Mock upload - no file actually uploaded</p>
                        </div>
                      </div>

                      <button
                        onClick={uploadDocument}
                        disabled={loading || !documentType}
                        className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-400/50 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Uploading...' : 'Submit VC Request'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Request History */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Request History</h3>
                  
                  {vcRequests.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No requests yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-cyan-400/20">
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Credential Type</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Requested</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vcRequests.map((req) => (
                            <tr key={req.id} className="border-b border-cyan-400/10">
                              <td className="py-4 px-4 text-white">{req.credentialRequested}</td>
                              <td className="py-4 px-4 text-gray-400">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    req.status === 'approved'
                                      ? 'bg-green-500/20 text-green-400'
                                      : req.status === 'rejected'
                                      ? 'bg-red-500/20 text-red-400'
                                      : req.status === 'Under Verification'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}
                                >
                                  {req.status === 'pending' ? 'Pending' : req.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Identity Score Section */}
            {activeSection === 'identity-score' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Identity Reliability Score</h2>
                  <p className="text-gray-400">Your trust score in the IdentiPI ecosystem</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-8">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Score Circle */}
                    <div className="relative w-64 h-64">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="128"
                          cy="128"
                          r="120"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-slate-700"
                        />
                        <circle
                          cx="128"
                          cy="128"
                          r="120"
                          stroke="url(#gradient)"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 120}`}
                          strokeDashoffset={`${2 * Math.PI * 120 * (1 - scorePercentage / 100)}`}
                          className="transition-all duration-1000 ease-out"
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#22D3EE" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-6xl font-bold text-white">{user.identityScore}</span>
                        <span className="text-gray-400 text-lg">/ 100</span>
                      </div>
                    </div>

                    {/* Score Info */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-white mb-6">Score Breakdown</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-300">Verified Credentials</span>
                            <span className="text-cyan-400 font-semibold">
                              {credentials.length * 15} pts
                            </span>
                          </div>
                          <div className="w-full bg-slate-700/50 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((credentials.length * 15 / 60) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-300">Document Verification</span>
                            <span className="text-cyan-400 font-semibold">
                              {documents.filter(d => d.verificationStatus === 'approved').length * 10} pts
                            </span>
                          </div>
                          <div className="w-full bg-slate-700/50 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((documents.filter(d => d.verificationStatus === 'approved').length * 10 / 30) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-300">DID Creation</span>
                            <span className="text-cyan-400 font-semibold">
                              {user.did ? '10' : '0'} pts
                            </span>
                          </div>
                          <div className="w-full bg-slate-700/50 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] h-2 rounded-full transition-all duration-500"
                              style={{ width: user.did ? '100%' : '0%' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 bg-slate-900/50 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-2">How to improve your score</h4>
                        <ul className="space-y-1 text-gray-400 text-sm">
                          <li>• Get more credentials verified (+15 pts each)</li>
                          <li>• Upload and verify documents (+10 pts each)</li>
                          <li>• Maintain consistency across verifications (+5 pts)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Incoming Requests Section */}
            {activeSection === 'incoming' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Verification Requests</h2>
                  <p className="text-gray-400">Approve or reject incoming verification requests</p>
                </div>

                {!user.did ? (
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-8">
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🆔</div>
                      <p className="text-gray-400">Generate a DID to receive verification requests</p>
                    </div>
                  </div>
                ) : incomingRequests.length === 0 ? (
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-8">
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📥</div>
                      <p className="text-gray-400">No incoming verification requests</p>
                      <p className="text-gray-500 text-sm mt-2">
                        Share your QR code for verifiers to scan
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incomingRequests.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] flex items-center justify-center text-2xl">
                              👤
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-lg">{req.verifierName}</h3>
                              <p className="text-gray-400 text-sm">Verifier</p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              req.status === 'approved'
                                ? 'bg-green-500/20 text-green-400'
                                : req.status === 'rejected'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-400 mb-1">Credential Requested:</p>
                              <p className="text-white font-semibold">{req.credentialType}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-1">Timestamp:</p>
                              <p className="text-white">
                                {new Date(req.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {req.status === 'pending' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => respondToIncomingRequest(req.id, true)}
                              disabled={loading}
                              className="flex-1 py-3 bg-green-500/20 text-green-400 font-semibold rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                              ✓ Approve & Share ZK Proof
                            </button>
                            <button
                              onClick={() => respondToIncomingRequest(req.id, false)}
                              disabled={loading}
                              className="flex-1 py-3 bg-red-500/20 text-red-400 font-semibold rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedUserDashboard;
