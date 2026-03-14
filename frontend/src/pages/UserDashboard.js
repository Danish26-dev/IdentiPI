import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Document upload state
  const [documentType, setDocumentType] = useState('');
  const [documentMetadata, setDocumentMetadata] = useState({ name: '', number: '' });

  // VC Request state
  const [vcType, setVcType] = useState('');

  // ZK Proof state
  const [selectedCredential, setSelectedCredential] = useState('');
  const [proofType, setProofType] = useState('');
  const [zkProof, setZkProof] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('identipi_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadUserData(parsedUser.id);
  }, [navigate]);

  const loadUserData = async (userId) => {
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

      // Load verification requests
      const reqsRes = await axios.get(`${BACKEND_URL}/api/verification-requests/user/${userId}`);
      setRequests(reqsRes.data.requests);
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
        alert(`DID Generated!\n\nDID: ${res.data.did}\n\nPublic Key: ${res.data.publicKey}\n\nNote: Store your private key securely!`);
        loadUserData(user.id);
      }
    } catch (error) {
      console.error('Error generating DID:', error);
      alert('Failed to generate DID');
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async () => {
    if (!documentType || !documentMetadata.name) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/documents/upload`, {
        userId: user.id,
        documentType,
        metadata: documentMetadata
      });

      if (res.data.success) {
        alert('Document uploaded successfully! Awaiting verification.');
        setDocumentType('');
        setDocumentMetadata({ name: '', number: '' });
        loadUserData(user.id);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    } finally {
      setLoading(false);
    }
  };

  const requestVC = async () => {
    if (!vcType || !user.did) {
      alert('Please generate a DID first and select credential type');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/verification-requests/create`, {
        requesterId: user.id,
        requesterName: user.name,
        userDid: user.did,
        credentialRequested: vcType
      });

      if (res.data.success) {
        alert('Verification request submitted! Awaiting verifier approval.');
        setVcType('');
        loadUserData(user.id);
      }
    } catch (error) {
      console.error('Error requesting VC:', error);
      alert('Failed to request credential');
    } finally {
      setLoading(false);
    }
  };

  const generateZKProof = async () => {
    if (!selectedCredential || !proofType) {
      alert('Please select credential and proof type');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/zk-proof/generate`, {
        credentialId: selectedCredential,
        proofType,
        userId: user.id
      });

      if (res.data.success) {
        setZkProof(res.data.proof);
      }
    } catch (error) {
      console.error('Error generating ZK proof:', error);
      alert('Failed to generate proof');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="text-white">Loading...</div></div>;

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'did', name: 'Create DID', icon: '🆔' },
    { id: 'documents', name: 'Documents', icon: '📄' },
    { id: 'vc-request', name: 'Request VC', icon: '✉️' },
    { id: 'credentials', name: 'Credentials', icon: '🎫' },
    { id: 'zk-proof', name: 'ZK Proof', icon: '🔐' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#1E1B4B]">
      {/* Navbar */}
      <nav className="bg-slate-800/50 backdrop-blur-xl border-b border-cyan-400/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img
                src="https://customer-assets.emergentagent.com/job_simple-hi-251/artifacts/p0rn82e9_identipI_-removebg-preview.png"
                alt="IdentiPI"
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-white">IdentiPI</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Logged in as</p>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-4">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Identity Overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <div className="text-cyan-400 text-3xl mb-2">🆔</div>
                    <p className="text-gray-400 text-sm mb-1">Your DID</p>
                    <p className="text-white font-mono text-xs break-all">
                      {user.did || 'Not generated'}
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <div className="text-green-400 text-3xl mb-2">⭐</div>
                    <p className="text-gray-400 text-sm mb-1">Identity Score</p>
                    <p className="text-white text-3xl font-bold">{user.identityScore}</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <div className="text-purple-400 text-3xl mb-2">👛</div>
                    <p className="text-gray-400 text-sm mb-1">Wallet Status</p>
                    <p className="text-white text-sm">
                      {user.walletAddress ? 'Connected' : 'Not Connected'}
                    </p>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">📄 Documents</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total</span>
                        <span className="text-white font-semibold">{documents.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Verified</span>
                        <span className="text-green-400 font-semibold">
                          {documents.filter(d => d.verificationStatus === 'approved').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pending</span>
                        <span className="text-yellow-400 font-semibold">
                          {documents.filter(d => d.verificationStatus === 'pending').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">🎫 Credentials</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Issued</span>
                        <span className="text-white font-semibold">{credentials.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active</span>
                        <span className="text-green-400 font-semibold">{credentials.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Create DID */}
            {activeTab === 'did' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Create Decentralized Identity</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <div className="mb-6">
                    <p className="text-gray-300 mb-4">
                      Generate your unique Decentralized Identifier (DID) to start using IdentiPI.
                      Your DID will be your universal identity across all verifiable credentials.
                    </p>
                    
                    {user.did ? (
                      <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                        <p className="text-green-400 font-semibold mb-2">✓ DID Already Generated</p>
                        <p className="text-white font-mono text-sm break-all">{user.did}</p>
                      </div>
                    ) : (
                      <button
                        onClick={generateDID}
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-400/50 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Generating...' : 'Generate DID'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-white font-semibold">What is a DID?</h4>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li>• A unique identifier that belongs to you</li>
                      <li>• No central authority can revoke it</li>
                      <li>• Links all your verifiable credentials</li>
                      <li>• Enables privacy-preserving verification</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Documents */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Upload Documents</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Upload New Document</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Document Type
                      </label>
                      <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">Select type</option>
                        <option value="Aadhaar">Aadhaar Card</option>
                        <option value="PAN">PAN Card</option>
                        <option value="Degree">Degree Certificate</option>
                        <option value="Passport">Passport</option>
                        <option value="DrivingLicense">Driving License</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Document Name
                      </label>
                      <input
                        type="text"
                        value={documentMetadata.name}
                        onChange={(e) => setDocumentMetadata({...documentMetadata, name: e.target.value})}
                        placeholder="e.g., John Doe"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Document Number
                      </label>
                      <input
                        type="text"
                        value={documentMetadata.number}
                        onChange={(e) => setDocumentMetadata({...documentMetadata, number: e.target.value})}
                        placeholder="e.g., 1234-5678-9012"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <button
                      onClick={uploadDocument}
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-400/50 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Uploading...' : 'Upload Document'}
                    </button>
                  </div>
                </div>

                {/* Documents List */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Your Documents</h3>
                  
                  {documents.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No documents uploaded yet</p>
                  ) : (
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-slate-900/50 border border-cyan-400/20 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-semibold">{doc.documentType}</p>
                              <p className="text-gray-400 text-sm">{doc.metadata.name}</p>
                              <p className="text-gray-500 text-xs font-mono mt-1">IPFS: {doc.ipfsHash.slice(0, 20)}...</p>
                            </div>
                            <div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  doc.verificationStatus === 'approved'
                                    ? 'bg-green-500/20 text-green-400'
                                    : doc.verificationStatus === 'rejected'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {doc.verificationStatus}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Request VC */}
            {activeTab === 'vc-request' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Request Verifiable Credential</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  {!user.did ? (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
                      <p className="text-yellow-400">⚠️ Please generate a DID first before requesting credentials</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold text-white mb-4">Request New Credential</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Credential Type
                          </label>
                          <select
                            value={vcType}
                            onChange={(e) => setVcType(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                          >
                            <option value="">Select credential type</option>
                            <option value="Identity Verification">Identity Verification</option>
                            <option value="Age Verification">Age Verification</option>
                            <option value="Address Verification">Address Verification</option>
                            <option value="Education Verification">Education Verification</option>
                            <option value="Employment Verification">Employment Verification</option>
                          </select>
                        </div>

                        <button
                          onClick={requestVC}
                          disabled={loading}
                          className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-400/50 transition-all disabled:opacity-50"
                        >
                          {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Requests List */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Your Requests</h3>
                  
                  {requests.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No requests yet</p>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((req) => (
                        <div
                          key={req.id}
                          className="bg-slate-900/50 border border-cyan-400/20 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-semibold">{req.credentialRequested}</p>
                              <p className="text-gray-400 text-sm">
                                Requested: {new Date(req.createdAt).toLocaleDateString()}
                              </p>
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credentials Wallet */}
            {activeTab === 'credentials' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Credentials Wallet</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Your Verifiable Credentials</h3>
                  
                  {credentials.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎫</div>
                      <p className="text-gray-400">No credentials issued yet</p>
                      <p className="text-gray-500 text-sm mt-2">Request credentials from verifiers to see them here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {credentials.map((cred) => (
                        <motion.div
                          key={cred.id}
                          whileHover={{ scale: 1.02 }}
                          className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-400/30 rounded-xl p-6 relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-2xl -translate-y-16 translate-x-16" />
                          
                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] flex items-center justify-center">
                                <span className="text-white text-xl">✓</span>
                              </div>
                              <span className="text-xs text-green-400 font-semibold">VERIFIED</span>
                            </div>
                            
                            <p className="text-white font-semibold text-lg mb-2">{cred.credentialType}</p>
                            <p className="text-gray-400 text-sm mb-1">Issuer: {cred.issuer}</p>
                            <p className="text-gray-500 text-xs">
                              Issued: {new Date(cred.issueDate).toLocaleDateString()}
                            </p>
                            
                            <div className="mt-4 pt-4 border-t border-cyan-400/20">
                              <p className="text-gray-500 text-xs font-mono break-all">
                                Proof: {cred.proofHash.slice(0, 32)}...
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ZK Proof */}
            {activeTab === 'zk-proof' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Generate Zero-Knowledge Proof</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Create Privacy-Preserving Proof</h3>
                  
                  {credentials.length === 0 ? (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4">
                      <p className="text-yellow-400">⚠️ You need credentials before generating ZK proofs</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Select Credential
                        </label>
                        <select
                          value={selectedCredential}
                          onChange={(e) => setSelectedCredential(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">Choose credential</option>
                          {credentials.map((cred) => (
                            <option key={cred.id} value={cred.id}>
                              {cred.credentialType}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Proof Type
                        </label>
                        <select
                          value={proofType}
                          onChange={(e) => setProofType(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                        >
                          <option value="">Select proof type</option>
                          <option value="Age > 18">Proof: Age over 18</option>
                          <option value="Degree Verified">Proof: Degree verified</option>
                          <option value="Address Verified">Proof: Address verified</option>
                          <option value="Identity Verified">Proof: Identity verified</option>
                        </select>
                      </div>

                      <button
                        onClick={generateZKProof}
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-400/50 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Generating Proof...' : 'Generate ZK Proof'}
                      </button>

                      {zkProof && (
                        <div className="mt-6 bg-green-500/10 border border-green-400/30 rounded-lg p-6">
                          <h4 className="text-green-400 font-semibold mb-4 flex items-center gap-2">
                            <span>✓</span> Proof Generated Successfully
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Proof Type:</span>
                              <span className="text-white">{zkProof.proofType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Verified:</span>
                              <span className="text-green-400">{zkProof.verified ? 'Yes' : 'No'}</span>
                            </div>
                            <div className="mt-4">
                              <p className="text-gray-400 text-xs mb-1">Proof Hash:</p>
                              <p className="text-white font-mono text-xs break-all bg-slate-900/50 p-2 rounded">
                                {zkProof.proof}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h4 className="text-white font-semibold mb-3">What are Zero-Knowledge Proofs?</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Prove facts without revealing underlying data</li>
                    <li>• Example: Prove you're over 18 without showing your birth date</li>
                    <li>• Cryptographically secure and verifiable</li>
                    <li>• Essential for privacy-preserving identity</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
