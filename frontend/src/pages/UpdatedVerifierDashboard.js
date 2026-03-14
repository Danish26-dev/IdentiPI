import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

const LoadingSpinner = () => (
  <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
);

const UpdatedVerifierDashboard = () => {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [pendingDocs, setPendingDocs] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allCredentials, setAllCredentials] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [zkpRequests, setZkpRequests] = useState([]);
  const [zkpForm, setZkpForm] = useState({
    statement: 'Degree Verification',
    proofType: 'degree',
  });
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedBindingRequestId, setSelectedBindingRequestId] = useState(null);
  const [lastBoundDid, setLastBoundDid] = useState('');
  const [manualDid, setManualDid] = useState('');
  const html5QrRef = useRef(null);
  const didQrUploadRef = useRef(null);
  const selectedBindingRequestRef = useRef(null);
  const navigate = useNavigate();
  const scannerElementId = 'verifier-user-did-scanner';

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

  useEffect(() => {
    if (!user?.id || !BACKEND_URL) return undefined;

    const timer = setInterval(() => {
      loadVerifierData();
    }, 8000);

    return () => clearInterval(timer);
  }, [user?.id]);

  const mapCredentialToProofType = (credentialName) => {
    const value = String(credentialName || '').toLowerCase();
    if (value.includes('degree')) return 'degree';
    if (value.includes('address')) return 'address';
    if (value.includes('age')) return 'age';
    return 'age';
  };

  const loadVerifierData = async () => {
    try {
      const docsRes = await axios.get(`${BACKEND_URL}/api/documents/pending`);
      setPendingDocs(docsRes.data.documents);

      const reqsRes = await axios.get(`${BACKEND_URL}/api/verification-requests/pending`);
      setPendingRequests(reqsRes.data.requests);

      const credsRes = await axios.get(`${BACKEND_URL}/api/credentials/all`);
      setAllCredentials(credsRes.data.credentials);

      const statsRes = await axios.get(`${BACKEND_URL}/api/stats/dashboard`);
      setStats(statsRes.data);

      const zkpRes = await axios.get(`${BACKEND_URL}/api/zkp/requests/pending`);
      setZkpRequests(
        (zkpRes.data.requests || []).map((req) => ({
          id: req.id,
          userDid: req.userDid,
          credential: req.statement,
          timestamp: req.createdAt,
          status: req.status,
          kycStatus: req.kycStatus,
          proofType: req.proofType,
          proofHash: req?.proof?.proofHash,
          result: req?.verification?.verified,
          verifierName: req?.verifierName,
        })),
      );
    } catch (error) {
      console.error('Error loading verifier data:', error);
    }
  };

  const createZkpRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/zkp/requests/create`, {
        statement: zkpForm.statement,
        proofType: zkpForm.proofType,
        verifierId: user?.id || null,
        verifierName: user?.name || 'Verifier',
      });

      if (res.data.success) {
        const createdRequestId = res.data.request?.id || null;
        selectedBindingRequestRef.current = createdRequestId;
        setSelectedBindingRequestId(createdRequestId);
        toast.success('ZKP request created. Scan or upload the user DID QR next.');
        loadVerifierData();
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to generate ZKP request.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const stopDidScanner = async () => {
    try {
      if (html5QrRef.current) {
        await html5QrRef.current.stop();
        await html5QrRef.current.clear();
        html5QrRef.current = null;
      }
    } catch (_error) {
      html5QrRef.current = null;
    }
  };

  const extractDidPayloadFromQr = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!value) return null;
    if (value.startsWith('did:')) {
      return { did: value, userId: null };
    }

    try {
      const parsed = JSON.parse(value);
      if (parsed?.did && String(parsed.did).startsWith('did:')) {
        return {
          did: String(parsed.did),
          userId: parsed?.userId ? String(parsed.userId) : null,
        };
      }

      if (parsed?.userDid && String(parsed.userDid).startsWith('did:')) {
        return {
          did: String(parsed.userDid),
          userId: parsed?.userId ? String(parsed.userId) : null,
        };
      }

      if (parsed?.requestId) return null;
    } catch (_error) {
      return null;
    }

    return null;
  };

  const startDidScanner = async () => {
    const requestId = selectedBindingRequestRef.current || selectedBindingRequestId;
    if (html5QrRef.current || !requestId) return;

    const scanner = new Html5Qrcode(scannerElementId);
    html5QrRef.current = scanner;

    const onScanSuccess = async (decodedText) => {
      const payload = extractDidPayloadFromQr(decodedText);
      if (!payload?.did) {
        toast.error('This QR does not contain a DID.');
        return;
      }

      await bindUserDidToRequest(requestId, payload.did, payload.userId);
      setScannerOpen(false);
      await stopDidScanner();
    };

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        onScanSuccess,
        () => {},
      );
    } catch (_error) {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) {
          throw new Error('No camera devices found');
        }

        await scanner.start(
          cameras[0].id,
          { fps: 10, qrbox: 220 },
          onScanSuccess,
          () => {},
        );
      } catch (__error) {
        toast.error('Could not start camera scanner. Check camera permission and retry.');
        await stopDidScanner();
        setScannerOpen(false);
      }
    }
  };

  const bindUserDidToRequest = async (requestId, did, userId = null) => {
    const normalizedDid = String(did || '').replace(/\s+/g, '');

    if (!requestId || !normalizedDid) {
      toast.error('Request and DID are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/zkp/requests/${requestId}/bind-user`, {
        userDid: normalizedDid,
        userId: userId || null,
      });

      if (res.data.success) {
        const resolvedDid = res.data?.didResolution?.boundDid || normalizedDid;
        setLastBoundDid(resolvedDid);
        setManualDid(resolvedDid);
        toast.success(`User DID linked: ${resolvedDid.slice(0, 26)}... Request should now appear on user dashboard.`);
        loadVerifierData();
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to bind DID to request.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const openScannerForRequest = (requestId) => {
    selectedBindingRequestRef.current = requestId;
    setSelectedBindingRequestId(requestId);
    setScannerOpen(true);
  };

  const openUploadForRequest = (requestId) => {
    selectedBindingRequestRef.current = requestId;
    setSelectedBindingRequestId(requestId);
    if (didQrUploadRef.current) {
      didQrUploadRef.current.value = '';
      didQrUploadRef.current.click();
    }
  };

  const submitManualDid = async () => {
    const requestId = selectedBindingRequestRef.current || selectedBindingRequestId;
    const did = String(manualDid || '').trim();

    if (!requestId) {
      toast.error('Select or create a request first.');
      return;
    }

    if (!did.startsWith('did:')) {
      toast.error('Enter a valid DID starting with did:.');
      return;
    }

    await bindUserDidToRequest(requestId, did);
  };

  const decodeDidFromImageFile = async (file) => {
    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = objectUrl;
      });

      const createVariant = ({ cropRatio = 1, scale = 1, threshold = null }) => {
        const sourceWidth = image.naturalWidth || image.width;
        const sourceHeight = image.naturalHeight || image.height;
        const cropWidth = Math.floor(sourceWidth * cropRatio);
        const cropHeight = Math.floor(sourceHeight * cropRatio);
        const sourceX = Math.floor((sourceWidth - cropWidth) / 2);
        const sourceY = Math.floor((sourceHeight - cropHeight) / 2);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return null;

        canvas.width = Math.max(1, Math.floor(cropWidth * scale));
        canvas.height = Math.max(1, Math.floor(cropHeight * scale));
        context.imageSmoothingEnabled = false;
        context.drawImage(
          image,
          sourceX,
          sourceY,
          cropWidth,
          cropHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        if (threshold !== null) {
          for (let index = 0; index < imageData.data.length; index += 4) {
            const average = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
            const color = average >= threshold ? 255 : 0;
            imageData.data[index] = color;
            imageData.data[index + 1] = color;
            imageData.data[index + 2] = color;
          }
          context.putImageData(imageData, 0, 0);
        }

        return imageData;
      };

      const variants = [
        { cropRatio: 1, scale: 1, threshold: null },
        { cropRatio: 1, scale: 2, threshold: null },
        { cropRatio: 1, scale: 3, threshold: null },
        { cropRatio: 0.9, scale: 2, threshold: null },
        { cropRatio: 0.8, scale: 3, threshold: null },
        { cropRatio: 1, scale: 2, threshold: 180 },
        { cropRatio: 0.9, scale: 3, threshold: 180 },
        { cropRatio: 0.8, scale: 3, threshold: 200 },
      ];

      for (const variant of variants) {
        const imageData = createVariant(variant);
        if (!imageData) continue;

        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (decoded?.data) {
          return decoded.data;
        }
      }

      return null;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleDidQrUpload = async (event) => {
    const file = event.target.files?.[0];
    const requestId = selectedBindingRequestRef.current || selectedBindingRequestId;
    if (!file || !requestId) return;

    await stopDidScanner();

    const scanner = new Html5Qrcode(scannerElementId);
    try {
      let decodedText = null;

      try {
        decodedText = await scanner.scanFile(file, false);
      } catch (_scanError) {
        decodedText = await decodeDidFromImageFile(file);
      }

      const payload = extractDidPayloadFromQr(decodedText);

      if (!payload?.did) {
        toast.error('Uploaded screenshot could not be decoded. Try a clearer crop around only the QR code.');
        return;
      }

      await bindUserDidToRequest(requestId, payload.did, payload.userId);
    } catch (_error) {
      toast.error('Could not read DID QR from uploaded image.');
    } finally {
      try {
        await scanner.clear();
      } catch (_error) {
        // no-op
      }
    }
  };

  useEffect(() => {
    if (scannerOpen) {
      startDidScanner();
    } else {
      stopDidScanner();
    }

    return () => {
      stopDidScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen, selectedBindingRequestId]);

  const handleLogout = () => {
    localStorage.removeItem('identipi_user');
    navigate('/');
  };

  const verifyDocument = async (docId, status) => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/documents/${docId}/verify?status=${status}`);
      toast.success(`Document ${status}.`);
      loadVerifierData();
    } catch (error) {
      toast.error('Failed to verify document.');
    } finally {
      setLoading(false);
    }
  };

  const approveVCRequest = async (request) => {
    setLoading(true);
    try {
      // Backend now handles credential creation and score update automatically
      const res = await axios.post(`${BACKEND_URL}/api/verification-requests/${request.id}/update?status=approved`);
      
      if (res.data.success) {
        toast.success('Credential approved and issued successfully.');
        loadVerifierData();
      }
    } catch (error) {
      toast.error('Failed to approve request.');
    } finally {
      setLoading(false);
    }
  };

  const rejectVCRequest = async (reqId) => {
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/verification-requests/${reqId}/update?status=rejected`);
      toast.success('Request rejected.');
      loadVerifierData();
    } catch (error) {
      toast.error('Failed to reject request.');
    } finally {
      setLoading(false);
    }
  };

  const verifyZKP = async (request) => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/zkp/requests/${request.id}/verify`, {
        proofType: request.proofType || mapCredentialToProofType(request.credential),
        proofHash: request.proofHash,
      });

      if (res.data.success) {
        toast.success(`ZK proof verified for ${request.credential}.`);
      } else {
        toast.error(`ZK proof verification failed for ${request.credential}.`);
      }

      loadVerifierData();
    } catch (error) {
      toast.error('Failed to verify ZK proof.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><div className="text-white">Loading...</div></div>;

  const sidebarItems = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'vc-approval', name: 'VC Approval', icon: '✅' },
    { id: 'zkp-requests', name: 'ZKP Requests', icon: '🔐' },
  ];

  // Recent activity
  const recentActivity = [
    ...pendingRequests.slice(0, 5).map(req => ({
      userDid: req.userDid,
      type: 'VC Request',
      status: 'Pending',
      timestamp: req.createdAt
    })),
    ...allCredentials.slice(0, 5).map(cred => ({
      userDid: cred.did,
      type: 'VC Issued',
      status: 'Completed',
      timestamp: cred.issueDate
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#1E1B4B]">
      {/* Navbar */}
      <nav className="bg-slate-800/50 backdrop-blur-xl border-b border-purple-500/20 sticky top-0 z-50">
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
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-lg shadow-purple-500/30'
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
            {/* DASHBOARD SECTION */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Verifier Dashboard</h2>
                  <p className="text-gray-400">System overview</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-blue-400 text-3xl mb-2">👥</div>
                      <p className="text-gray-400 text-sm mb-1">Total Users Verified</p>
                      <p className="text-white text-3xl font-bold">{stats.totalUsers || 0}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-yellow-400 text-3xl mb-2">⏳</div>
                      <p className="text-gray-400 text-sm mb-1">Pending VC Requests</p>
                      <p className="text-white text-3xl font-bold">{pendingRequests.length}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-green-400 text-3xl mb-2">✓</div>
                      <p className="text-gray-400 text-sm mb-1">Approved Credentials</p>
                      <p className="text-white text-3xl font-bold">{allCredentials.length}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl" />
                    <div className="relative">
                      <div className="text-purple-400 text-3xl mb-2">🔐</div>
                      <p className="text-gray-400 text-sm mb-1">ZKP Requests Today</p>
                      <p className="text-white text-3xl font-bold">{zkpRequests.length}</p>
                    </div>
                  </motion.div>
                </div>

                {/* Recent Activity Table */}
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
                  
                  {recentActivity.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No recent activity</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-cyan-400/20">
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">User DID</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Request Type</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentActivity.map((activity, idx) => (
                            <tr key={idx} className="border-b border-cyan-400/10 hover:bg-slate-700/30 transition-colors">
                              <td className="py-4 px-4 text-white font-mono text-sm">
                                {activity.userDid ? activity.userDid.slice(0, 20) + '...' : 'N/A'}
                              </td>
                              <td className="py-4 px-4 text-gray-300">{activity.type}</td>
                              <td className="py-4 px-4">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    activity.status === 'Completed'
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}
                                >
                                  {activity.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-gray-400 text-sm">
                                {new Date(activity.timestamp).toLocaleString()}
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

            {/* VC APPROVAL SECTION */}
            {activeSection === 'vc-approval' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">VC Approval</h2>
                  <p className="text-gray-400">Review and approve credential requests</p>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-8">
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">✅</div>
                      <p className="text-gray-400">No pending requests</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#F59E0B] flex items-center justify-center text-2xl">
                              👤
                            </div>
                            <div>
                              <h3 className="text-white font-semibold text-lg">{req.requesterName}</h3>
                              <p className="text-gray-400 text-sm font-mono">{req.userDid}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                            Pending Review
                          </span>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Credential Type:</p>
                              <p className="text-white font-semibold">{req.credentialRequested}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Requested:</p>
                              <p className="text-white">{new Date(req.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          
                          {/* Uploaded document preview */}
                          <div className="mt-4 p-3 bg-slate-800/50 border border-purple-500/20 rounded-lg">
                            <p className="text-gray-400 text-xs mb-2">Document:</p>
                            <div className="flex items-center gap-2">
                              <div className="text-2xl">📄</div>
                              <div>
                                <p className="text-white text-sm font-medium">{req?.documentSummary?.fileName || `${req.credentialRequested}.pdf`}</p>
                                <p className="text-gray-500 text-xs">
                                  {(req?.documentSummary?.fileType || 'unknown type')}
                                  {req?.documentSummary?.storageMode ? ` • ${req.documentSummary.storageMode} storage` : ''}
                                </p>
                              </div>
                            </div>
                          </div>

                          {req.analysis && (
                            <div className="mt-4 p-3 bg-slate-800/50 border border-cyan-400/20 rounded-lg">
                              <p className="text-gray-400 text-xs mb-2">AI Document Analysis:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <p className="text-white">Proof Type: <span className="text-cyan-300">{req.analysis.proofType || 'age-over-18'}</span></p>
                                <p className="text-white">Quality Score: <span className="text-cyan-300">{req.analysis.qualityScore || 0}</span></p>
                                <p className="text-white md:col-span-2">
                                  Extracted: {req.analysis?.extractedFields?.fileName || 'N/A'}
                                  {req.analysis?.extractedFields?.idHint ? ` • ID hint ${req.analysis.extractedFields.idHint}` : ''}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => approveVCRequest(req)}
                            disabled={loading}
                            className="flex-1 py-3 bg-green-500/20 text-green-400 font-semibold rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? <LoadingSpinner /> : null}
                            {loading ? 'Processing...' : '✓ Approve & Issue VC'}
                          </button>
                          <button
                            onClick={() => rejectVCRequest(req.id)}
                            disabled={loading}
                            className="flex-1 py-3 bg-red-500/20 text-red-400 font-semibold rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? <LoadingSpinner /> : null}
                            {loading ? 'Processing...' : '✕ Reject'}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ZKP REQUESTS SECTION */}
            {activeSection === 'zkp-requests' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">ZKP Requests</h2>
                  <p className="text-gray-400">Create a request, bind a user DID, then wait for approval</p>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Scan QR (Verifier Camera)</h3>
                  <p className="text-gray-400 text-sm mb-4">Create a request first, then scan or upload the user's DID QR from this verifier dashboard.</p>
                  <button
                    type="button"
                    onClick={() => setScannerOpen((prev) => !prev)}
                    disabled={!selectedBindingRequestId}
                    className="px-4 py-2 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors"
                  >
                    {scannerOpen ? 'Stop DID Scanner' : 'Scan User DID QR'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openUploadForRequest(selectedBindingRequestId)}
                    disabled={!selectedBindingRequestId}
                    className="ml-3 px-4 py-2 bg-violet-500/20 border border-violet-400/40 text-violet-300 rounded-lg hover:bg-violet-500/30 transition-colors disabled:opacity-50"
                  >
                    Upload DID QR
                  </button>
                  <input
                    ref={didQrUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDidQrUpload}
                    className="hidden"
                  />
                  <div className="bg-black rounded-lg p-2 border border-cyan-400/20 mt-4">
                    <div id={scannerElementId} className={scannerOpen ? 'min-h-[260px]' : 'hidden h-0 overflow-hidden'} />
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    Selected request: {selectedBindingRequestId || 'Create or choose a request below first'}
                  </p>
                  <p className="text-xs text-cyan-300 break-all mt-3">
                    Last bound DID: {lastBoundDid || 'Not bound yet'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-cyan-400/10">
                    <label className="block text-gray-400 text-sm mb-2">Manual DID Fallback</label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <input
                        type="text"
                        value={manualDid}
                        onChange={(e) => setManualDid(e.target.value)}
                        placeholder="Paste user DID here if scan or upload fails"
                        className="flex-1 px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                      />
                      <button
                        type="button"
                        onClick={submitManualDid}
                        disabled={loading || !selectedBindingRequestId}
                        className="px-4 py-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {loading ? <LoadingSpinner /> : null}
                        {loading ? 'Binding...' : 'Bind DID'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-6">
                  <h3 className="text-xl font-semibold text-white mb-4">Generate ZKP Request</h3>
                  <form onSubmit={createZkpRequest} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Flow</label>
                      <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-4 space-y-3">
                        <p className="text-sm text-gray-300">
                          1. Create the request with the proof requirement.
                        </p>
                        <p className="text-sm text-gray-300">
                          2. Scan or upload the user's DID QR from this verifier dashboard.
                        </p>
                        <p className="text-sm text-gray-300">
                          3. The user receives the request automatically and approves or rejects it.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Statement</label>
                        <select
                          value={zkpForm.statement}
                          onChange={(e) => setZkpForm({ ...zkpForm, statement: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                        >
                          <option value="Degree Verification">Degree Verification</option>
                          <option value="Address Verification">Address Verification</option>
                          <option value="Age >= 18">Age &gt;= 18</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Proof Type</label>
                        <select
                          value={zkpForm.proofType}
                          onChange={(e) => setZkpForm({ ...zkpForm, proofType: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                        >
                          <option value="degree">degree</option>
                          <option value="address">address</option>
                          <option value="age">age</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-3 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <LoadingSpinner /> : null}
                      {loading ? 'Creating...' : 'Create Request'}
                    </button>
                  </form>
                </div>

                {zkpRequests.length === 0 ? (
                  <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-cyan-400/20 p-8">
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔐</div>
                      <p className="text-gray-400">No ZKP requests</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {zkpRequests.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-white font-semibold text-lg mb-2">{req.credential}</h3>
                            <p className="text-gray-400 text-sm font-mono">{req.userDid || 'Awaiting DID binding...'}</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              req.status === 'verified' || req.status === 'proof_generated'
                                ? req.result
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {req.status === 'awaiting_user_binding' && 'Awaiting DID Binding'}
                            {req.status === 'pending_user_approval' && 'Awaiting User Approval'}
                            {req.status === 'proof_generated' && 'Proof Generated'}
                            {req.status === 'verified' && (req.result ? 'TRUE ✓' : 'FALSE ✗')}
                            {req.status !== 'awaiting_user_binding' && req.status !== 'pending_user_approval' && req.status !== 'proof_generated' && req.status !== 'verified' && req.status}
                          </span>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                          <p className="text-gray-400 text-sm mb-1">Timestamp:</p>
                          <p className="text-white">{new Date(req.timestamp).toLocaleString()}</p>
                        </div>

                        {req.status === 'awaiting_user_binding' && (
                          <div className="flex flex-wrap gap-3 mb-4">
                            <button
                              type="button"
                              onClick={() => openScannerForRequest(req.id)}
                              disabled={loading}
                              className="px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {loading ? <LoadingSpinner /> : null}
                              {loading ? 'Loading...' : 'Scan DID QR'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openUploadForRequest(req.id)}
                              disabled={loading}
                              className="px-4 py-2 bg-violet-500/20 text-violet-300 rounded-lg hover:bg-violet-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {loading ? <LoadingSpinner /> : null}
                              {loading ? 'Loading...' : 'Upload DID QR'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                selectedBindingRequestRef.current = req.id;
                                setSelectedBindingRequestId(req.id);
                              }}
                              disabled={loading}
                              className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {loading ? <LoadingSpinner /> : null}
                              {loading ? 'Loading...' : 'Use Manual DID'}
                            </button>
                          </div>
                        )}

                        {req.status === 'proof_generated' && (
                          <button
                            onClick={() => verifyZKP(req)}
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-cyan-400/30 transition-all flex items-center justify-center gap-2"
                          >
                            {loading ? <LoadingSpinner /> : null}
                            {loading ? 'Verifying...' : '🔐 Final Verify & Close KYC'}
                          </button>
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

export default UpdatedVerifierDashboard;
