import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const VerifierDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allCredentials, setAllCredentials] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Issue Credential State
  const [issueForm, setIssueForm] = useState({
    userId: '',
    did: '',
    credentialType: '',
    data: {}
  });

  useEffect(() => {
    const userData = localStorage.getItem('identipi_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'verifier') {
      navigate('/dashboard/user');
      return;
    }
    setUser(parsedUser);
    loadVerifierData();
  }, [navigate]);

  const loadVerifierData = async () => {
    try {
      // Load pending documents
      const docsRes = await axios.get(`${BACKEND_URL}/api/documents/pending`);
      setPendingDocs(docsRes.data.documents);

      // Load pending verification requests
      const reqsRes = await axios.get(`${BACKEND_URL}/api/verification-requests/pending`);
      setPendingRequests(reqsRes.data.requests);

      // Load all credentials
      const credsRes = await axios.get(`${BACKEND_URL}/api/credentials/all`);
      setAllCredentials(credsRes.data.credentials);

      // Load stats
      const statsRes = await axios.get(`${BACKEND_URL}/api/stats/dashboard`);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading verifier data:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('identipi_user');
    navigate('/');
  };

  const verifyDocument = async (docId, status) => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/documents/${docId}/verify?status=${status}`);
      alert(`Document ${status}!`);
      loadVerifierData();
    } catch (error) {
      console.error('Error verifying document:', error);
      alert('Failed to verify document');
    } finally {
      setLoading(false);
    }
  };

  const approveVCRequest = async (request) => {
    setLoading(true);
    try {
      // First approve the request
      await axios.post(`${BACKEND_URL}/api/verification-requests/${request.id}/update?status=approved`);

      // Then issue the credential
      const credData = {
        userId: request.requesterId,
        did: request.userDid,
        credentialType: request.credentialRequested,
        issuer: user.name,
        data: {
          requestId: request.id,
          approvedBy: user.name,
          approvedAt: new Date().toISOString()
        }
      };

      await axios.post(`${BACKEND_URL}/api/credentials/issue`, credData);
      alert('Credential issued successfully!');
      loadVerifierData();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request');
    } finally {
      setLoading(false);
    }
  };

  const rejectVCRequest = async (reqId) => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/verification-requests/${reqId}/update?status=rejected`);
      alert('Request rejected');
      loadVerifierData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const issueCredential = async () => {
    if (!issueForm.userId || !issueForm.did || !issueForm.credentialType) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/credentials/issue`, {
        ...issueForm,
        issuer: user.name
      });
      alert('Credential issued successfully!');
      setIssueForm({ userId: '', did: '', credentialType: '', data: {} });
      loadVerifierData();
    } catch (error) {
      console.error('Error issuing credential:', error);
      alert('Failed to issue credential');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="text-white">Loading...</div></div>;

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'documents', name: 'Document Review', icon: '📄' },
    { id: 'requests', name: 'VC Requests', icon: '✉️' },
    { id: 'issue', name: 'Issue Credential', icon: '🎫' },
    { id: 'credentials', name: 'All Credentials', icon: '🗂️' },
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
              <span className="ml-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-semibold">
                VERIFIER
              </span>
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
                <h2 className="text-3xl font-bold text-white">Verifier Dashboard</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <div className="text-blue-400 text-3xl mb-2">👥</div>
                    <p className="text-gray-400 text-sm mb-1">Total Users</p>
                    <p className="text-white text-3xl font-bold">{stats.totalUsers || 0}</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <div className="text-purple-400 text-3xl mb-2">📄</div>
                    <p className="text-gray-400 text-sm mb-1">Documents</p>
                    <p className="text-white text-3xl font-bold">{stats.totalDocuments || 0}</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <div className="text-green-400 text-3xl mb-2">🎫</div>
                    <p className="text-gray-400 text-sm mb-1">Credentials</p>
                    <p className="text-white text-3xl font-bold">{stats.totalCredentials || 0}</p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <div className="text-yellow-400 text-3xl mb-2">⏳</div>
                    <p className="text-gray-400 text-sm mb-1">Pending</p>
                    <p className="text-white text-3xl font-bold">{stats.pendingRequests || 0}</p>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                        <span className="text-gray-300">
                          {pendingDocs.length} documents pending review
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                        <span className="text-gray-300">
                          {pendingRequests.length} verification requests
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                        <span className="text-gray-300">
                          {allCredentials.length} total credentials issued
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('documents')}
                        className="w-full text-left px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-gray-300 text-sm transition-colors"
                      >
                        Review Documents →
                      </button>
                      <button
                        onClick={() => setActiveTab('requests')}
                        className="w-full text-left px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-gray-300 text-sm transition-colors"
                      >
                        Process Requests →
                      </button>
                      <button
                        onClick={() => setActiveTab('issue')}
                        className="w-full text-left px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-gray-300 text-sm transition-colors"
                      >
                        Issue Credential →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Review */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Document Review</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Pending Documents</h3>
                  
                  {pendingDocs.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No pending documents</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-slate-900/50 border border-cyan-400/20 rounded-lg p-6"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-white font-semibold text-lg">{doc.documentType}</p>
                              <p className="text-gray-400 text-sm">User ID: {doc.userId}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                Uploaded: {new Date(doc.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                              Pending Review
                            </span>
                          </div>

                          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                            <p className="text-gray-400 text-sm mb-2">Document Details:</p>
                            <div className="space-y-1 text-sm">
                              <p className="text-white">Name: {doc.metadata.name}</p>
                              <p className="text-white">Number: {doc.metadata.number}</p>
                              <p className="text-gray-500 font-mono text-xs">
                                IPFS: {doc.ipfsHash}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => verifyDocument(doc.id, 'approved')}
                              disabled={loading}
                              className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => verifyDocument(doc.id, 'rejected')}
                              disabled={loading}
                              className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VC Requests */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Verification Requests</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Pending VC Requests</h3>
                  
                  {pendingRequests.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No pending requests</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="bg-slate-900/50 border border-cyan-400/20 rounded-lg p-6"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-white font-semibold text-lg">
                                {req.credentialRequested}
                              </p>
                              <p className="text-gray-400 text-sm">From: {req.requesterName}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                Requested: {new Date(req.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                              Pending
                            </span>
                          </div>

                          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                            <p className="text-gray-400 text-sm mb-2">Request Details:</p>
                            <div className="space-y-1 text-sm">
                              <p className="text-white">User DID: {req.userDid}</p>
                              <p className="text-white">Requester ID: {req.requesterId}</p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={() => approveVCRequest(req)}
                              disabled={loading}
                              className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                              ✓ Approve & Issue Credential
                            </button>
                            <button
                              onClick={() => rejectVCRequest(req.id)}
                              disabled={loading}
                              className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Issue Credential */}
            {activeTab === 'issue' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">Issue Verifiable Credential</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Issue New Credential</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        User ID
                      </label>
                      <input
                        type="text"
                        value={issueForm.userId}
                        onChange={(e) => setIssueForm({...issueForm, userId: e.target.value})}
                        placeholder="Enter user ID"
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        User DID
                      </label>
                      <input
                        type="text"
                        value={issueForm.did}
                        onChange={(e) => setIssueForm({...issueForm, did: e.target.value})}
                        placeholder="did:identipi:..."
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Credential Type
                      </label>
                      <select
                        value={issueForm.credentialType}
                        onChange={(e) => setIssueForm({...issueForm, credentialType: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-400/30 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">Select type</option>
                        <option value="Identity Verification">Identity Verification</option>
                        <option value="Age Verification">Age Verification</option>
                        <option value="Address Verification">Address Verification</option>
                        <option value="Education Verification">Education Verification</option>
                        <option value="Employment Verification">Employment Verification</option>
                      </select>
                    </div>

                    <button
                      onClick={issueCredential}
                      disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-400/50 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Issuing...' : 'Issue Credential'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h4 className="text-white font-semibold mb-3">Issuing Credentials</h4>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Credentials are cryptographically signed</li>
                    <li>• Attached to user's DID permanently</li>
                    <li>• Can be used for ZK proof generation</li>
                    <li>• Increases user's identity score</li>
                  </ul>
                </div>
              </div>
            )}

            {/* All Credentials */}
            {activeTab === 'credentials' && (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white">All Issued Credentials</h2>
                
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Credential Registry ({allCredentials.length})
                  </h3>
                  
                  {allCredentials.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No credentials issued yet</p>
                  ) : (
                    <div className="space-y-4">
                      {allCredentials.map((cred) => (
                        <div
                          key={cred.id}
                          className="bg-slate-900/50 border border-cyan-400/20 rounded-lg p-6"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-white font-semibold text-lg">
                                {cred.credentialType}
                              </p>
                              <p className="text-gray-400 text-sm">Issued by: {cred.issuer}</p>
                              <p className="text-gray-500 text-xs mt-1">
                                Date: {new Date(cred.issueDate).toLocaleString()}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                              Active
                            </span>
                          </div>

                          <div className="bg-slate-800/50 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-400 mb-1">DID:</p>
                                <p className="text-white font-mono text-xs break-all">{cred.did}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-1">Proof Hash:</p>
                                <p className="text-white font-mono text-xs break-all">
                                  {cred.proofHash.slice(0, 32)}...
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;
