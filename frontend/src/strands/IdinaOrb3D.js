import React from 'react';
import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';

const IdinaOrb3D = ({ active }) => {
  return (
    <div className="relative h-72 w-full rounded-2xl bg-slate-900/70 border border-cyan-400/20 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(124,58,237,0.18),transparent_44%)]" />
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode" />
      </div>

      <motion.div
        animate={{ opacity: active ? [0.2, 0.5, 0.2] : [0.12, 0.2, 0.12] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(34,211,238,0.45),transparent_50%)]"
      />
    </div>
  );
};

export default IdinaOrb3D;
