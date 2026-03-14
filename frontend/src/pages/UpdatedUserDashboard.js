import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';
import IdinaVoiceAgent from '../components/IdinaVoiceAgent';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';
const getMockStoreKey = (userId) => `identipi_mock_dashboard_${userId}`;

const LoadingSpinner = () => (
  <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
);

const UpdatedUserDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [vcRequests, setVcRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: "Hi! I'm Idina, your identity assistant. How can I help you today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vcRequestForm, setVcRequestForm] = useState({
    credentialType: 'Degree Verification',
    documentUrl: '',
    supportingNotes: '',
  });
  const [vcDocumentFile, setVcDocumentFile] = useState(null);
  const [lastDocumentAnalysis, setLastDocumentAnalysis] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [showZkpFlowModal, setShowZkpFlowModal] = useState(false);
  const [zkpFlowStep, setZkpFlowStep] = useState(0);
  const [zkpFlowCompleted, setZkpFlowCompleted] = useState(false);
  const [persistingApproval, setPersistingApproval] = useState(false);
  const [activeIncomingRequest, setActiveIncomingRequest] = useState(null);
  const [incomingUiStatusById, setIncomingUiStatusById] = useState({});
  const zkpFlowTimerRef = useRef(null);
  const zkpPersistedRequestRef = useRef(null);
  const vcDocumentInputRef = useRef(null);
  const didQrCanvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('identipi_user');
    if (!userData) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadUserData(parsedUser.id, parsedUser.did, parsedUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const persistMockData = useCallback((userId, patch) => {
    if (!userId) return;
    const key = getMockStoreKey(userId);
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    const merged = {
      documents: [],
      credentials: [],
      vcRequests: [],
      incomingRequests: [],
      ...existing,
      ...patch,
    };
    localStorage.setItem(key, JSON.stringify(merged));
  }, []);

  const getEffectiveIncomingStatus = (request) => {
    if (!request?.id) return request?.status || 'pending';
    return incomingUiStatusById[request.id] || request.status || 'pending';
  };

  const loadUserData = useCallback(async (userId, userDid, fallbackUser = user) => {
    try {
      const userRes = await axios.get(`${BACKEND_URL}/api/users/${userId}`);
      setUser(userRes.data);
      localStorage.setItem('identipi_user', JSON.stringify(userRes.data));
      const effectiveDid = String(userRes.data?.did || userDid || '').replace(/\s+/g, '');

      const docsRes = await axios.get(`${BACKEND_URL}/api/documents/user/${userId}`);
      setDocuments(docsRes.data.documents);

      const credsRes = await axios.get(`${BACKEND_URL}/api/credentials/user/${userId}`);
      setCredentials(credsRes.data.credentials);

      const reqsRes = await axios.get(`${BACKEND_URL}/api/verification-requests/user/${userId}`);
      setVcRequests(reqsRes.data.requests);

      let incomingData = [];
      if (userId) {
        try {
          const incomingRes = await axios.get(`${BACKEND_URL}/api/incoming-requests/user/${userId}`);
          incomingData = incomingRes.data.requests || [];
        } catch (incomingError) {
          console.error('Incoming request sync by user failed:', incomingError);
          if (effectiveDid) {
            try {
              const encodedDid = encodeURIComponent(effectiveDid);
              const didIncomingRes = await axios.get(`${BACKEND_URL}/api/incoming-requests/user-did/${encodedDid}`);
              incomingData = didIncomingRes.data.requests || [];
            } catch (didIncomingError) {
              console.error('Incoming request sync by DID failed:', didIncomingError);
              incomingData = [];
            }
          }
        }
      }
      setIncomingRequests(incomingData);

      persistMockData(userId, {
        user: userRes.data,
        documents: docsRes.data.documents,
        credentials: credsRes.data.credentials,
        vcRequests: reqsRes.data.requests,
        incomingRequests: incomingData,
      });
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      console.error('Error loading user data:', error);

      const mockData = JSON.parse(localStorage.getItem(getMockStoreKey(userId)) || '{}');
      const resolvedUser = mockData.user || fallbackUser;

      if (resolvedUser) {
        setUser(resolvedUser);
        localStorage.setItem('identipi_user', JSON.stringify(resolvedUser));
      }

      setDocuments(mockData.documents || []);
      setCredentials(mockData.credentials || []);
      setVcRequests(mockData.vcRequests || []);

      const fallbackDid = String(resolvedUser?.did || userDid || '').replace(/\s+/g, '');
      if (BACKEND_URL && userId) {
        try {
          const incomingRes = await axios.get(`${BACKEND_URL}/api/incoming-requests/user/${userId}`);
          const incomingData = incomingRes.data.requests || [];
          setIncomingRequests(incomingData);
          persistMockData(userId, { incomingRequests: incomingData });
          return;
        } catch (incomingError) {
          console.error('Incoming request fallback sync by user failed:', incomingError);
        }
      }

      if (BACKEND_URL && fallbackDid) {
        try {
          const encodedDid = encodeURIComponent(fallbackDid);
          const incomingRes = await axios.get(`${BACKEND_URL}/api/incoming-requests/user-did/${encodedDid}`);
          const incomingData = incomingRes.data.requests || [];
          setIncomingRequests(incomingData);
          persistMockData(userId, { incomingRequests: incomingData });
          return;
        } catch (incomingError) {
          console.error('Incoming request fallback sync by DID failed:', incomingError);
        }
      }

      setIncomingRequests(mockData.incomingRequests || []);
    }
  }, [persistMockData, user]);

  useEffect(() => {
    if (!user?.id || !BACKEND_URL) return undefined;

    const timer = setInterval(() => {
      loadUserData(user.id, user.did, user);
    }, 8000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.did]);

  const handleLogout = () => {
    localStorage.removeItem('identipi_user');
    navigate('/');
  };

  const generateDID = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/users/${user.id}/generate-did`);
      if (res.data.success) {
        toast.success('DID generated successfully.');
        loadUserData(user.id, res.data.did);
      }
    } catch (error) {
      const mockDid = `did:identipi:mock:${Date.now().toString(16)}`;
      const updatedUser = {
        ...user,
        did: mockDid,
        didCreatedAt: new Date().toISOString(),
        identityScore: Math.max(user?.identityScore || 0, 40),
      };

      setUser(updatedUser);
      localStorage.setItem('identipi_user', JSON.stringify(updatedUser));
      persistMockData(user.id, { user: updatedUser });
      toast.success('DID generated in demo mode.');
    } finally {
      setLoading(false);
    }
  };

  const deleteDID = async () => {
    setLoading(true);
    try {
      const res = await axios.delete(`${BACKEND_URL}/api/users/${user.id}/did`);
      if (res.data.success) {
        toast.success('DID and related credentials deleted successfully.');
        setShowDeleteModal(false);
        loadUserData(user.id, null);
      }
    } catch (error) {
      const updatedUser = {
        ...user,
        did: null,
        didCreatedAt: null,
        identityScore: 0,
      };

      setUser(updatedUser);
      setCredentials([]);
      setVcRequests([]);
      setIncomingRequests([]);
      localStorage.setItem('identipi_user', JSON.stringify(updatedUser));
      persistMockData(user.id, {
        user: updatedUser,
        credentials: [],
        vcRequests: [],
        incomingRequests: [],
      });
      setShowDeleteModal(false);
      toast.success('DID deleted in demo mode.');
    } finally {
      setLoading(false);
    }
  };

  const submitVCRequest = async (e) => {
    e.preventDefault();
    if (!user.did) {
      toast.error('Please create a DID first.');
      return;
    }

    if (!vcDocumentFile) {
      toast.error('Please upload a PDF before submitting.');
      return;
    }

    if (!String(vcDocumentFile.type || '').includes('pdf')) {
      toast.error('Only PDF is supported for verification pipeline.');
      return;
    }
    
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append('requesterId', user.id);
      payload.append('requesterName', user.name);
      payload.append('userDid', user.did);
      payload.append('credentialRequested', vcRequestForm.credentialType);
      payload.append('supportingNotes', vcRequestForm.supportingNotes || '');
      payload.append('document', vcDocumentFile);

      const res = await axios.post(`${BACKEND_URL}/api/verification-requests/create-with-document`, payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (res.data.success) {
        setLastDocumentAnalysis(res.data.analysis || null);
        toast.success('Document analyzed and VC request sent to verifier.');
        setVcRequestForm({ credentialType: 'Degree Verification', documentUrl: '', supportingNotes: '' });
        setVcDocumentFile(null);
        loadUserData(user.id, user.did);
      }
    } catch (error) {
      if (BACKEND_URL) {
        toast.error('Failed to submit VC request to verifier network. Please try again.');
        return;
      }

      const mockRequest = {
        id: `mock-vc-${Date.now()}`,
        requesterId: user.id,
        requesterName: user.name,
        userDid: user.did,
        credentialRequested: vcRequestForm.credentialType,
        documentSummary: {
          fileName: vcDocumentFile.name,
          fileType: vcDocumentFile.type,
          fileSizeBytes: vcDocumentFile.size,
        },
        analysis: {
          extractedFields: {
            fileName: vcDocumentFile.name,
            fileType: vcDocumentFile.type,
            extractedTextPreview: null,
          },
          flags: ['offline_demo_mode'],
          qualityScore: 70,
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const updatedRequests = [mockRequest, ...vcRequests];
      setVcRequests(updatedRequests);
      persistMockData(user.id, { vcRequests: updatedRequests });
      setVcRequestForm({ credentialType: 'Degree Verification', documentUrl: '', supportingNotes: '' });
      setLastDocumentAnalysis(mockRequest.analysis);
      setVcDocumentFile(null);
      toast.success('VC request submitted in demo mode.');
    } finally {
      setLoading(false);
    }
  };

  const respondIncomingRequest = async (incomingId, approved) => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/incoming-requests/${incomingId}/respond`, {
        approved,
      });

      if (res.data.success) {
        toast.success(approved ? 'Approved. ZKP generated and sent to verifier.' : 'Request rejected.');
        loadUserData(user.id, user.did);
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to respond to incoming request.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const openZkpApprovalFlow = (incomingRequest) => {
    if (zkpFlowTimerRef.current) {
      clearInterval(zkpFlowTimerRef.current);
      zkpFlowTimerRef.current = null;
    }
    setActiveIncomingRequest(incomingRequest);
    setZkpFlowStep(0);
    setZkpFlowCompleted(false);
    setPersistingApproval(false);
    zkpPersistedRequestRef.current = null;
    setShowZkpFlowModal(true);
  };

  const closeZkpApprovalFlow = () => {
    if (zkpFlowTimerRef.current) {
      clearInterval(zkpFlowTimerRef.current);
      zkpFlowTimerRef.current = null;
    }
    setShowZkpFlowModal(false);
    setZkpFlowStep(0);
    setZkpFlowCompleted(false);
    setPersistingApproval(false);
    zkpPersistedRequestRef.current = null;
    setActiveIncomingRequest(null);
  };

  const downloadDidQr = () => {
    const canvas = didQrCanvasRef.current?.querySelector('canvas');
    if (!canvas || !user?.did) {
      toast.error('DID QR is not ready yet.');
      return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `identipi-did-${user.id || 'user'}.png`;
    link.click();
    toast.success('DID QR downloaded as PNG.');
  };

  const copyDidValue = async () => {
    if (!user?.did) {
      toast.error('No DID available to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(user.did);
      toast.success('DID copied.');
    } catch (_error) {
      toast.error('Could not copy DID.');
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { type: 'user', text: chatInput };
    setChatMessages([...chatMessages, userMessage]);

    // Mock AI responses
    setTimeout(() => {
      let aiResponse = '';
      const input = chatInput.toLowerCase();

      if (input.includes('create') && input.includes('identity')) {
        aiResponse = user.did
          ? `You already have a DID: ${user.did.slice(0, 30)}...`
          : "I can help you create your DID! Click the 'Create DID' button in the Dashboard section.";
      } else if (input.includes('score')) {
        aiResponse = `Your current Identity Score is ${user.identityScore}/100. You can improve it by getting more credentials verified!`;
      } else if (input.includes('request') && input.includes('verification')) {
        aiResponse = "To request verification, go to the Transactions section and submit a VC request with your document type.";
      } else if (input.includes('approve')) {
        aiResponse = incomingRequests.length > 0
          ? `You have ${incomingRequests.length} pending verification request(s). Check your incoming requests in the Dashboard!`
          : "You don't have any pending verification requests at the moment.";
      } else {
        aiResponse = "I can help you with:\n- Creating your identity\n- Checking your score\n- Requesting verifications\n- Managing credentials";
      }

      setChatMessages(prev => [...prev, { type: 'ai', text: aiResponse }]);
    }, 1000);

    setChatInput('');
  };

  const sidebarItems = [
    { id: 'dashboard', name: 'Dashboard', icon: 'DB' },
    { id: 'transactions', name: 'Transactions', icon: 'TX' },
    { id: 'idina', name: 'Idina', icon: 'AI' },
  ];

  const scorePercentage = user?.identityScore || 0;
  const cibilEligible = Number(user?.identityScore || 0) > 60;
  const zkpFlowSteps = [
    {
      title: 'Checking VC details',
      description: `Reviewing the verification request for ${activeIncomingRequest?.credentialType || 'requested credential'}.`,
    },
    {
      title: 'Validating CIBIL score',
      description: cibilEligible
        ? `CIBIL score ${user?.identityScore || 0}/100 is above 60. Eligibility check passed.`
        : `CIBIL score ${user?.identityScore || 0}/100 is not above 60. Showing demo flow for UX preview.`,
    },
    {
      title: 'Generating ZKP locally',
      description: 'Creating zero-knowledge proof on the device (UI simulation).',
    },
    {
      title: 'ZKP sent',
      description: 'The proof is marked as sent to verifier in this UI flow simulation.',
    },
  ];
  const didMethod = String(user?.did || '').split(':')[1] || 'n/a';
  const userDidQrPayload = JSON.stringify({
    type: 'identipi-user-did',
    userId: user?.id || null,
    did: user?.did || null,
  });
  const incomingZkpRequests = incomingRequests.filter((req) => {
    const normalizedType = String(req?.type || '').toLowerCase();
    return normalizedType === 'zkp' || String(req?.relatedRequestId || '').startsWith('zkpr-');
  });
  const pendingIncomingCount = incomingRequests.filter((req) => getEffectiveIncomingStatus(req) === 'pending').length;
  const showIncomingDebug = process.env.NODE_ENV !== 'production';

  // Combine all transactions
  const allTransactions = [
    ...vcRequests.map(req => ({
      type: 'VC Request',
      credential: req.credentialRequested,
      verifier: 'Pending Assignment',
      status: req.status,
      timestamp: req.createdAt
    })),
    ...credentials.map(cred => ({
      type: 'VC Issued',
      credential: cred.credentialType,
      verifier: cred.issuer,
      status: 'Completed',
      timestamp: cred.issueDate
    })),
    ...incomingRequests.map(req => ({
      type: 'Verification Request',
      credential: req.credentialType,
      verifier: req.verifierName,
      status: getEffectiveIncomingStatus(req),
      timestamp: req.createdAt
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  useEffect(() => {
    if (!showZkpFlowModal) return undefined;

    if (zkpFlowTimerRef.current) {
      clearInterval(zkpFlowTimerRef.current);
      zkpFlowTimerRef.current = null;
    }

    zkpFlowTimerRef.current = setInterval(() => {
      setZkpFlowStep((prev) => {
        if (prev >= zkpFlowSteps.length - 1) {
          if (zkpFlowTimerRef.current) {
            clearInterval(zkpFlowTimerRef.current);
            zkpFlowTimerRef.current = null;
          }
          return prev;
        }
        return prev + 1;
      });
    }, 1200);

    return () => {
      if (zkpFlowTimerRef.current) {
        clearInterval(zkpFlowTimerRef.current);
        zkpFlowTimerRef.current = null;
      }
    };
  }, [showZkpFlowModal, zkpFlowSteps.length]);

  useEffect(() => {
    if (!showZkpFlowModal) return;
    if (zkpFlowStep < zkpFlowSteps.length - 1) return;
    if (zkpFlowCompleted) return;

    setZkpFlowCompleted(true);
    if (activeIncomingRequest?.id) {
      setIncomingUiStatusById((prev) => ({
        ...prev,
        [activeIncomingRequest.id]: 'syncing_approval',
      }));

      if (zkpPersistedRequestRef.current !== activeIncomingRequest.id) {
        const requestToPersist = activeIncomingRequest;
        const userId = user?.id;
        const userDid = user?.did;
        const userSnapshot = user;
        zkpPersistedRequestRef.current = activeIncomingRequest.id;

        (async () => {
          if (!requestToPersist?.id || !userId) {
            setPersistingApproval(false);
            return;
          }

          setPersistingApproval(true);
          try {
            const res = await axios.post(`${BACKEND_URL}/api/incoming-requests/${requestToPersist.id}/respond`, {
              approved: true,
            });

            if (res.data.success) {
              setIncomingUiStatusById((prev) => ({
                ...prev,
                [requestToPersist.id]: 'approved',
              }));
              await loadUserData(userId, userDid, userSnapshot);
              toast.success('ZKP approved and synced to verifier dashboard.');
            }
          } catch (error) {
            setIncomingUiStatusById((prev) => ({
              ...prev,
              [requestToPersist.id]: 'approved_ui',
            }));
            const message = error?.response?.data?.message || 'Could not sync approval to backend. UI state only.';
            toast.error(message);
          } finally {
            setPersistingApproval(false);
          }
        })();
      }
    }
  }, [activeIncomingRequest, showZkpFlowModal, zkpFlowCompleted, zkpFlowStep, zkpFlowSteps.length, user, loadUserData]);

  if (!user) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="text-white">Loading...</div></div>;

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
              <span className="ml-2 px-3 py-1 bg-purple-500/20 text-white rounded-full text-xs font-semibold">
                USER
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Welcome</p>
                <p className="text-white font-semibold">{user.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30"
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
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4 sticky top-24">
              <div className="space-y-2">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                      activeSection === item.id
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-md'
                        : 'text-white hover:text-white hover:bg-slate-700/40'
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
            {/* DASHBOARD SECTION */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
                  <p className="text-gray-400">
                    Your identity hub
                    {lastSyncedAt ? ` • Synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : ''}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* DID Status Card */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                        <span>ID</span> DID Status
                      </h3>
                      {!user.did ? (
                        <div>
                          <p className="text-gray-400 text-sm mb-4">No DID created yet</p>
                          <button
                            onClick={generateDID}
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-semibold rounded-lg hover:shadow-lg hover:bg-gradient-to-r from-[#7C3AED] to-[#6D28D9]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? <LoadingSpinner /> : null}
                            {loading ? 'Creating DID...' : 'Create DID'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="bg-green-100 border border-green-300 rounded-lg p-3 mb-3">
                            <p className="text-green-700 text-sm font-semibold mb-1">Active</p>
                            <p className="text-black font-mono text-xs break-all">{user.did}</p>
                          </div>
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Created:</span>
                              <span className="text-white">
                                {user.didCreatedAt ? new Date(user.didCreatedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Method:</span>
                              <span className="text-cyan-300 font-mono">{didMethod}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Credentials:</span>
                              <span className="text-white font-bold">{credentials.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Incoming Requests:</span>
                              <span className="text-yellow-300 font-bold">{pendingIncomingCount}</span>
                            </div>
                          </div>
                          <div className="bg-slate-900/60 border border-cyan-400/20 rounded-lg p-3 mb-3 text-xs text-gray-300">
                            Keep this DID private except when sharing proof requests with trusted verifiers.
                          </div>
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-all border border-red-300"
                          >
                            Delete DID
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* QR Code Card */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <span>QR</span> Share QR Code
                    </h3>
                    {user.did ? (
                      <div className="flex flex-col items-center">
                        <div
                          ref={didQrCanvasRef}
                          className="bg-white p-4 rounded-xl mb-3 border border-cyan-400/20 shadow-lg shadow-cyan-950/20"
                        >
                          <QRCodeCanvas
                            value={userDidQrPayload}
                            size={260}
                            bgColor="#FFFFFF"
                            fgColor="#000000"
                            includeMargin
                            level="H"
                          />
                        </div>
                        <p className="text-[#22D3EE] text-sm text-center font-medium">Share this QR with verifiers</p>
                        <p className="text-gray-400 text-xs text-center mt-2 break-all max-w-[240px]">{user.did}</p>
                        <div className="flex gap-3 mt-4">
                          <button
                            type="button"
                            onClick={downloadDidQr}
                            className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors"
                          >
                            Download QR PNG
                          </button>
                          <button
                            type="button"
                            onClick={copyDidValue}
                            className="px-4 py-2 bg-slate-700/60 border border-slate-500/40 text-white rounded-lg hover:bg-slate-700 transition-colors"
                          >
                            Copy DID
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">Create a DID first</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Identity Score */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6"
                  >
                    <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <span>*</span> Identity CIBIL Score
                    </h3>
                    <div className="flex items-center justify-center">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-cyan-400/30"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - scorePercentage / 100)}`}
                            className="transition-all duration-1000"
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#22D3EE" />
                              <stop offset="100%" stopColor="#7C3AED" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-white">{user.identityScore}</span>
                          <span className="text-gray-400 text-sm">/ 100</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm text-center mt-3">
                      Score increases with verified credentials
                    </p>
                  </motion.div>

                  {/* Credential Overview */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
                  >
                    <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <span>VC</span> Credential Overview
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Issued VCs</span>
                        <span className="text-white font-bold text-2xl">{credentials.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Pending Requests</span>
                        <span className="text-yellow-400 font-bold text-2xl">
                          {vcRequests.filter(r => r.status === 'pending').length}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Incoming ZKP Requests */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 md:col-span-2"
                  >
                    <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <span>ZKP</span> Incoming ZKP Requests
                    </h3>

                    <div className="mb-4 p-4 rounded-lg border border-purple-500/20 bg-slate-900/40">
                      <p className="text-gray-300 text-sm">
                        Requests appear here automatically after a verifier creates a request and binds your DID.
                      </p>
                      {showIncomingDebug && (
                        <p className="text-[11px] text-cyan-300 mt-2 break-all">
                          debug: did={String(user?.did || 'none')} | totalIncoming={incomingRequests.length} | zkpVisible={incomingZkpRequests.length} | api={BACKEND_URL}
                        </p>
                      )}
                    </div>

                    {incomingZkpRequests.length === 0 ? (
                      <p className="text-gray-400 text-sm">No incoming ZKP requests yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {incomingZkpRequests.map((req) => (
                          <div key={req.id} className="bg-slate-900/50 border border-cyan-400/20 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-white font-semibold">{req.credentialType || 'ZKP Request'}</p>
                                <p className="text-gray-400 text-xs">Verifier: {req.verifierName || 'Verifier'}</p>
                                <p className="text-gray-500 text-xs">Status: {getEffectiveIncomingStatus(req)}</p>
                              </div>
                              {getEffectiveIncomingStatus(req) === 'pending' ? (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openZkpApprovalFlow(req)}
                                    disabled={loading || showZkpFlowModal}
                                    className="px-3 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {showZkpFlowModal ? <LoadingSpinner /> : null}
                                    {showZkpFlowModal ? 'Running Flow...' : 'Approve'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => respondIncomingRequest(req.id, false)}
                                    disabled={loading}
                                    className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {loading ? <LoadingSpinner /> : null}
                                    {loading ? 'Processing...' : 'Reject'}
                                  </button>
                                </div>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300">
                                  {getEffectiveIncomingStatus(req)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {/* VC Request Form */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 md:col-span-2"
                  >
                    <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                      <span>REQ</span> Request Verification
                    </h3>
                    <form onSubmit={submitVCRequest} className="space-y-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Credential Type</label>
                        <select
                          value={vcRequestForm.credentialType}
                          onChange={(e) => setVcRequestForm({...vcRequestForm, credentialType: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                        >
                          <option value="Degree Verification">Degree Verification</option>
                          <option value="Address Verification">Address Verification</option>
                          <option value="Aadhaar Verification">Aadhaar Verification</option>
                          <option value="PAN Verification">PAN Verification</option>
                          <option value="Employment Verification">Employment Verification</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Upload Supporting Document</label>
                        <div className="w-full bg-slate-900/50 border border-cyan-400/30 rounded-lg p-4">
                          <p className="text-gray-300 text-sm mb-3">Upload the PDF that verifier should review</p>
                          <input
                            ref={vcDocumentInputRef}
                            type="file"
                            onChange={(e) => setVcDocumentFile(e.target.files?.[0] || null)}
                            accept="application/pdf,.pdf"
                            className="hidden"
                          />
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => vcDocumentInputRef.current?.click()}
                              className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors"
                            >
                              Choose PDF
                            </button>
                            <span className="text-xs text-gray-400">Only .pdf files are accepted</span>
                          </div>
                          {vcDocumentFile && (
                            <p className="mt-3 text-xs text-cyan-300 break-all">
                              Selected: {vcDocumentFile.name} ({Math.round(vcDocumentFile.size / 1024)} KB)
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Notes for Verifier (Optional)</label>
                        <textarea
                          value={vcRequestForm.supportingNotes}
                          onChange={(e) => setVcRequestForm({ ...vcRequestForm, supportingNotes: e.target.value })}
                          rows={3}
                          placeholder="Add context for verifier: document issuer, graduation year, etc."
                          className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || !user.did || !vcDocumentFile}
                        className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? <LoadingSpinner /> : null}
                        {loading ? 'Uploading + Analyzing...' : 'Submit Request'}
                      </button>
                      {!user.did && (
                        <p className="text-yellow-400 text-sm text-center">Create a DID first to request verification</p>
                      )}
                      {user.did && !vcDocumentFile && (
                        <p className="text-yellow-400 text-sm text-center">Upload one document to continue</p>
                      )}
                    </form>
                  </motion.div>

                  {lastDocumentAnalysis && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 md:col-span-2"
                    >
                      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                        <span>SCAN</span> Latest Analysis Sent To Verifier
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-cyan-400/20">
                          <p className="text-gray-400 mb-1">Proof Type</p>
                          <p className="text-white font-semibold">{lastDocumentAnalysis.proofType || 'age-over-18'}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-cyan-400/20">
                          <p className="text-gray-400 mb-1">Quality Score</p>
                          <p className="text-white font-semibold">{lastDocumentAnalysis.qualityScore || 0}</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3 border border-cyan-400/20 md:col-span-2">
                          <p className="text-gray-400 mb-1">Extracted Fields</p>
                          <p className="text-white">
                            {lastDocumentAnalysis.extractedFields?.fileName || 'N/A'}
                            {lastDocumentAnalysis.extractedFields?.idHint ? ` • ID hint: ${lastDocumentAnalysis.extractedFields.idHint}` : ''}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Credentials List */}
                  {credentials.length > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 md:col-span-2"
                    >
                      <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                        <span>OK</span> My Credentials
                      </h3>
                      <div className="space-y-3">
                        {credentials.map((cred, idx) => (
                          <div key={idx} className="bg-slate-700/40 rounded-lg p-4 border border-purple-400/30">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-white font-semibold">{cred.credentialType}</p>
                                <p className="text-gray-400 text-sm">Issued by: {cred.issuer}</p>
                              </div>
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full border border-green-300">
                                Verified
                              </span>
                            </div>
                            <p className="text-gray-400 text-xs">
                              Issue Date: {new Date(cred.issueDate).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* TRANSACTIONS SECTION */}
            {activeSection === 'transactions' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Transactions</h2>
                  <p className="text-gray-400">All identity-related activities</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  {allTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">TX</div>
                      <p className="text-gray-400">No transactions yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-cyan-400/20">
                            <th className="text-left py-3 px-4 text-white font-medium">Type</th>
                            <th className="text-left py-3 px-4 text-white font-medium">Credential</th>
                            <th className="text-left py-3 px-4 text-white font-medium">Verifier</th>
                            <th className="text-left py-3 px-4 text-white font-medium">Status</th>
                            <th className="text-left py-3 px-4 text-white font-medium">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTransactions.map((tx, idx) => (
                            <tr key={idx} className="border-b border-cyan-400/10 hover:bg-slate-700/30 transition-colors">
                              <td className="py-4 px-4">
                                <span className="text-white font-medium">{tx.type}</span>
                              </td>
                              <td className="py-4 px-4 text-gray-300">{tx.credential}</td>
                              <td className="py-4 px-4 text-gray-300">{tx.verifier}</td>
                              <td className="py-4 px-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    tx.status === 'Completed' || tx.status === 'approved'
                                      ? 'bg-green-100 text-green-700 border border-green-300'
                                      : tx.status === 'rejected'
                                      ? 'bg-red-100 text-red-700 border border-red-300'
                                      : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                  }`}
                                >
                                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-gray-400 text-sm">
                                {new Date(tx.timestamp).toLocaleString()}
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

            {/* IDINA SECTION */}
            {activeSection === 'idina' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <span>AI</span> Idina
                  </h2>
                  <p className="text-gray-400">Talk to a single orb-based voice assistant</p>
                </div>
                <IdinaVoiceAgent user={user} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete DID Confirmation Modal */}
      <AnimatePresence>
        {showZkpFlowModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={closeZkpApprovalFlow}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl mx-4 rounded-2xl border border-cyan-400/30 bg-slate-900 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-white mb-2">ZKP Approval Flow</h3>
              <p className="text-gray-300 text-sm mb-5">
                Clear UI-only walkthrough after clicking Approve. No backend processing is triggered here.
              </p>

              <div className="space-y-3 mb-6">
                {zkpFlowSteps.map((step, index) => {
                  const isDone = index < zkpFlowStep;
                  const isActive = index === zkpFlowStep && !zkpFlowCompleted;
                  const isFinalDone = index === zkpFlowStep && zkpFlowCompleted;

                  return (
                    <div
                      key={step.title}
                      className={`rounded-xl border p-3 transition-colors ${
                        isDone || isFinalDone
                          ? 'border-green-400/40 bg-green-500/10'
                          : isActive
                            ? 'border-cyan-400/50 bg-cyan-500/10'
                            : 'border-slate-700 bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-white font-semibold">{step.title}</p>
                        <span className="text-xs px-2 py-1 rounded-full border border-slate-600 text-gray-300">
                          {isDone || isFinalDone ? 'Done' : isActive ? 'In progress' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{step.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={closeZkpApprovalFlow}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-gray-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={closeZkpApprovalFlow}
                  disabled={!zkpFlowCompleted || persistingApproval}
                  className="px-5 py-2 rounded-lg border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {persistingApproval ? 'Syncing...' : zkpFlowCompleted ? 'OK' : 'Auto-running...'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md mx-4 border border-red-300 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">WARNING</div>
                <h3 className="text-2xl font-bold text-white mb-2">Delete DID?</h3>
                <p className="text-gray-400">
                  This will permanently delete your DID and all associated credentials. This action cannot be undone.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={deleteDID}
                  disabled={loading}
                  className="w-full py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <LoadingSpinner /> : null}
                  {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-3 bg-slate-700/70 text-white font-semibold rounded-lg hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UpdatedUserDashboard;

