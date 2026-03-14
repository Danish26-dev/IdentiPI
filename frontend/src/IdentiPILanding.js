import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";

const IdentiPILanding = () => {
  const { scrollYProgress } = useScroll();
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Floating particles animation
  const Particles = () => {
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 3 + Math.random() * 5,
    }));

    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 bg-purple-500 rounded-full opacity-30"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  };

  // Navbar Component
  const Navbar = () => (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-primary/80 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.05 }}
            data-testid="navbar-logo"
          >
            <img 
              src="https://customer-assets.emergentagent.com/job_simple-hi-251/artifacts/p0rn82e9_identipI_-removebg-preview.png"
              alt="IdentiPI Logo"
              className="h-10 w-auto"
            />
            <span className="text-2xl font-bold text-textLight">IdentiPI</span>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#problem"
              className="text-gray-300 hover:text-accent transition-colors"
            >
              Problem
            </a>
            <a
              href="#why"
              className="text-gray-300 hover:text-accent transition-colors"
            >
              Why It Matters
            </a>
            <a
              href="#solution"
              className="text-gray-300 hover:text-accent transition-colors"
            >
              Solution
            </a>
            <a
              href="#features"
              className="text-gray-300 hover:text-accent transition-colors"
            >
              Features
            </a>
          </div>

          {/* CTA Button */}
          <motion.button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-semibold rounded-full shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="navbar-cta-button"
          >
            Get Started
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );

  // Hero Section
  const HeroSection = () => (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
      data-testid="hero-section"
    >
      <div className="absolute inset-0 bg-gradient-dark"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={heroInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-left"
          >
            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent"
              data-testid="hero-title"
            >
              IdentiPI
            </motion.h1>
            <motion.h2
              className="text-2xl md:text-4xl font-semibold text-textLight mb-4"
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.8 }}
              data-testid="hero-subtitle"
            >
              The UPI of Digital Identity
            </motion.h2>
            <motion.p
              className="text-lg md:text-xl text-gray-400 mb-8 max-w-xl"
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.4, duration: 0.8 }}
              data-testid="hero-description"
            >
              Unify your identity documents into verifiable credentials. Prove
              facts without sharing documents. Build trust with an Identity
              Reliability Score.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <motion.button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-semibold rounded-full text-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="hero-cta-button"
              >
                Get Started
              </motion.button>
              <motion.button
                onClick={() => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 border-2 border-[#22D3EE] text-[#22D3EE] font-semibold rounded-full text-lg hover:bg-[#22D3EE]/10 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="hero-secondary-button"
              >
                Learn More
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right 3D Professional Object */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={heroInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block h-[600px]"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Professional Floating Layers - Identity Stack */}
              <div className="relative w-[450px] h-[450px]">
                
                {/* Layer 1 - Bottom (Storage/Blockchain) */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    y: [0, -8, 0],
                    rotateX: [5, 0, 5],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="w-full h-[120px] bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-xl rounded-2xl border border-cyan-400/20 shadow-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-400/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-purple-400 font-semibold">Storage Layer</p>
                        <p className="text-[10px] text-gray-400">IPFS • Blockchain</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full"
                    />
                  </div>
                </motion.div>

                {/* Layer 2 - Middle (Credentials) */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    y: [-80, -88, -80],
                    rotateX: [5, 0, 5],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2,
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="w-full h-[120px] bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-xl rounded-2xl border border-cyan-400/30 shadow-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-amber-400 font-semibold">Credentials</p>
                        <p className="text-[10px] text-gray-400">Verifiable • Signed</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-6 rounded-full bg-cyan-400/30"
                          animate={{ height: ["24px", "32px", "24px"] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Layer 3 - Top (Identity/DID) */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    y: [-160, -168, -160],
                    rotateX: [5, 0, 5],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.4,
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="w-full h-[120px] bg-gradient-to-r from-slate-800 to-slate-700 backdrop-blur-xl rounded-2xl border border-cyan-400/40 shadow-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-amber-500/30 border border-purple-400/40 flex items-center justify-center">
                        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-purple-400 font-semibold">Digital Identity</p>
                        <p className="text-[10px] text-gray-400">DID • Decentralized</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-3 h-3 rounded-full bg-green-400 shadow-lg shadow-green-400/50"
                    />
                  </div>
                </motion.div>

                {/* Verification Shield Overlay */}
                <motion.div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, 0, -5, 0],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformStyle: "preserve-3d", zIndex: 10 }}
                >
                  <div className="w-32 h-32 flex items-center justify-center">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 w-32 h-32"
                      >
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="url(#gradient-ring)"
                            strokeWidth="2"
                            strokeDasharray="10 5"
                            opacity="0.3"
                          />
                          <defs>
                            <linearGradient id="gradient-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#3B82F6" />
                              <stop offset="100%" stopColor="#22D3EE" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </motion.div>
                      
                      <div className="relative w-24 h-24 bg-gradient-to-br from-[#7C3AED] to-[#F59E0B] rounded-2xl shadow-2xl flex items-center justify-center border-2 border-purple-500/50">
                        <motion.svg
                          className="w-12 h-12 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </motion.svg>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating particles around the stack */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 360) / 12;
                  const radius = 200;
                  return (
                    <motion.div
                      key={`particle-${i}`}
                      className="absolute w-2 h-2 rounded-full bg-cyan-400"
                      style={{
                        left: `calc(50% + ${Math.cos((angle * Math.PI) / 180) * radius}px)`,
                        top: `calc(50% + ${Math.sin((angle * Math.PI) / 180) * radius}px)`,
                      }}
                      animate={{
                        opacity: [0.2, 0.6, 0.2],
                        scale: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  );
                })}

                {/* Connection lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                  {[60, 140, 220].map((y, i) => (
                    <motion.line
                      key={`line-${i}`}
                      x1="50%"
                      y1={y}
                      x2="50%"
                      y2={y + 60}
                      stroke="#22D3EE"
                      strokeWidth="1"
                      strokeDasharray="5 5"
                      opacity="0.3"
                      animate={{ strokeDashoffset: [0, -10] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  ))}
                </svg>
              </div>
              
              {/* Professional glow effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#7C3AED]/5 via-[#F59E0B]/5 to-purple-500/5 rounded-full blur-3xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-accent rounded-full flex justify-center">
          <motion.div
            className="w-1 h-3 bg-accent rounded-full mt-2"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );

  // Problem Section - What is the Problem?
  const ProblemSection = () => {
    return (
      <section id="problem" className="py-24 px-4 relative" data-testid="problem-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <img
                src="https://images.unsplash.com/photo-1667453466805-75bbf36e8707"
                alt="Fragmented Identity"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 to-orange-500/20 rounded-2xl blur-2xl -z-10" />
            </motion.div>

            {/* Right - Content */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                className="text-accent text-sm font-semibold uppercase tracking-wider"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                What is the Problem?
              </motion.span>
              <motion.h2
                className="text-4xl md:text-5xl font-bold text-textLight mt-4 mb-6"
                data-testid="problem-section-title"
              >
                Fragmented Digital Identity
              </motion.h2>
              <motion.p
                className="text-lg text-gray-400 mb-8"
              >
                Today identity documents like Aadhaar, PAN, and degree
                certificates exist as disconnected files across different
                platforms. Every service requires users to upload the same
                documents repeatedly for verification.
              </motion.p>

              {/* Key Points */}
              <div className="space-y-4">
                {[
                  "Documents are scattered across systems",
                  "Users repeatedly upload the same identity proofs",
                  "Verification is slow and inconsistent",
                  "Small mismatches across documents cause rejections",
                ].map((point, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    data-testid={`problem-point-${index}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-red-400 text-sm">✕</span>
                    </div>
                    <p className="text-gray-300">{point}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  };

  // Why It Matters Section
  const WhyItMattersSection = () => {
    return (
      <section id="why" className="py-24 px-4 relative bg-primary/20" data-testid="why-matters-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                className="text-accent text-sm font-semibold uppercase tracking-wider"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                Why It Matters
              </motion.span>
              <motion.h2
                className="text-4xl md:text-5xl font-bold text-textLight mt-4 mb-6"
                data-testid="why-matters-title"
              >
                Identity Verification is Everywhere
              </motion.h2>
              <motion.p
                className="text-lg text-gray-400 mb-8"
              >
                Banking, job applications, exams, housing, and government
                services all require identity verification.
              </motion.p>
              <motion.p
                className="text-lg text-gray-400 mb-8"
              >
                However, most services only need to verify a simple fact — such
                as age, degree, or address — yet users must share full documents
                each time, exposing unnecessary personal data.
              </motion.p>

              {/* Key Points */}
              <div className="space-y-4">
                {[
                  "Identity checks happen everywhere",
                  "Users reveal more data than required",
                  "Centralized storage increases privacy risks",
                ].map((point, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    data-testid={`why-point-${index}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-accent text-sm">→</span>
                    </div>
                    <p className="text-gray-300">{point}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right - Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <img
                src="https://images.unsplash.com/photo-1614064745490-83abb17303e1"
                alt="Identity Verification"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-secondary/20 rounded-2xl blur-2xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>
    );
  };

  // Our Solution Section - How We Solve It
  const OurSolutionSection = () => {
    return (
      <section id="solution" className="py-24 px-4 relative" data-testid="solution-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Image */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <img
                src="https://images.unsplash.com/photo-1675044794037-9262cedb6d5d"
                alt="Unified Identity"
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-success/20 to-accent/20 rounded-2xl blur-2xl -z-10" />
            </motion.div>

            {/* Right - Content */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.span
                className="text-accent text-sm font-semibold uppercase tracking-wider"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                How We Solve It
              </motion.span>
              <motion.h2
                className="text-4xl md:text-5xl font-bold text-textLight mt-4 mb-6"
                data-testid="solution-title"
              >
                Unifying Identity with Verifiable Credentials
              </motion.h2>
              <motion.p
                className="text-lg text-gray-400 mb-8"
              >
                IdentiPI connects identity documents to a decentralized identity
                (DID) and converts them into verifiable credentials.
              </motion.p>
              <motion.p
                className="text-lg text-gray-400 mb-8"
              >
                A CIBIL-like Identity Reliability Score evaluates the consistency
                of credentials, while Zero Knowledge Proofs allow users to prove
                facts without sharing documents.
              </motion.p>

              {/* Key Points */}
              <div className="space-y-4">
                {[
                  {
                    title: "Documents become Verifiable Credentials",
                    icon: "✓",
                  },
                  {
                    title: "Identity is unified under a DID",
                    icon: "✓",
                  },
                  {
                    title: "Identity Reliability Score builds trust",
                    icon: "✓",
                  },
                  {
                    title: "ZK proofs enable private verification",
                    icon: "✓",
                  },
                ].map((point, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    data-testid={`solution-point-${index}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-success text-sm">{point.icon}</span>
                    </div>
                    <p className="text-gray-300">{point.title}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  };

  // Features Section
  const FeaturesSection = () => {
    const features = [
      {
        title: "Decentralized Identity",
        description: "Own and control your digital identity with DIDs. No central authority.",
        icon: "🌐",
        gradient: "from-purple-500/20 to-pink-500/20",
      },
      {
        title: "Verifiable Credentials",
        description: "Convert documents into cryptographically signed credentials.",
        icon: "📜",
        gradient: "from-pink-500/20 to-red-500/20",
      },
      {
        title: "Privacy-Preserving ZK Proofs",
        description: "Prove facts without revealing underlying sensitive data.",
        icon: "🛡️",
        gradient: "from-red-500/20 to-orange-500/20",
      },
      {
        title: "Identity Reliability Score",
        description: "CIBIL-like score based on credential consistency and verification history.",
        icon: "⭐",
        gradient: "from-orange-500/20 to-yellow-500/20",
      },
      {
        title: "Instant Verification",
        description: "Skip manual document checks. Verify credentials in seconds.",
        icon: "⚡",
        gradient: "from-yellow-500/20 to-green-500/20",
      },
      {
        title: "Cross-Platform Support",
        description: "Use your identity across web, mobile, and blockchain platforms.",
        icon: "📱",
        gradient: "from-green-500/20 to-blue-500/20",
      },
    ];

    return (
      <section id="features" className="py-24 px-4 relative bg-primary/10" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">
              Features
            </span>
            <h2
              className="text-4xl md:text-5xl font-bold text-textLight mt-4"
              data-testid="features-title"
            >
              Everything You Need
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className={`relative p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 hover:border-accent/50 transition-all bg-gradient-to-br ${feature.gradient}`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -10 }}
                data-testid={`feature-card-${index}`}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-semibold text-textLight mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  // Final CTA Section
  const FinalCTASection = () => (
    <section className="py-32 px-4 relative" data-testid="final-cta-section">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-accent via-secondary to-accent bg-clip-text text-transparent"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          data-testid="final-cta-title"
        >
          Ready to Take Control?
        </motion.h2>
        <motion.p
          className="text-xl text-gray-400 mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Join the future of digital identity. Secure, private, and truly yours.
        </motion.p>
        <motion.button
          onClick={() => navigate('/login')}
          className="relative px-12 py-6 bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white font-bold rounded-full text-xl shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/80 transition-all duration-300 overflow-hidden group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          data-testid="final-cta-button"
        >
          <span className="relative z-10">Create Your Identity</span>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#22D3EE] to-[#3B82F6]"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.5 }}
          />
        </motion.button>
      </div>
    </section>
  );

  return (
    <div className="bg-gradient-dark min-h-screen text-textLight overflow-hidden">
      <Particles />
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <WhyItMattersSection />
      <OurSolutionSection />
      <FeaturesSection />
      <FinalCTASection />
    </div>
  );
};

export default IdentiPILanding;
