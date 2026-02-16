import React from 'react';
import { motion } from 'framer-motion';
import { Key, Upload, Lock, Database, Check } from 'lucide-react';
import KeyManagement from '../KeyManagement';
import FileUpload from '../FileUpload';
import EncryptionModule from '../EncryptionModule';
import BlockchainStorage from '../BlockchainStorage';

const STEPS = [
  { id: 1, label: 'Encryption Key', icon: Key, desc: 'Generate or import your encryption key' },
  { id: 2, label: 'Select File', icon: Upload, desc: 'Choose a document to encrypt' },
  { id: 3, label: 'Encrypt', icon: Lock, desc: 'Encrypt your document client-side' },
  { id: 4, label: 'Store', icon: Database, desc: 'Upload to IPFS and record on blockchain' },
];

function Stepper({ currentStep }) {
  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, i) => {
        const isComplete = currentStep > step.id;
        const isActive = currentStep >= step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2.5 shrink-0">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${isComplete
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : isActive
                      ? 'bg-accent-500/20 border border-accent-500/30 text-accent-400 shadow-glow-sm animate-pulse-glow'
                      : 'bg-white/[0.04] border border-white/[0.08] text-slate-500'
                  }`}
              >
                {isComplete ? <Check className="w-3.5 h-3.5" /> : step.id}
              </motion.div>
              <div className="hidden sm:block">
                <p className={`text-xs font-medium ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                  {step.label}
                </p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="relative flex-1 h-[2px] min-w-[20px]">
                {/* Background track */}
                <div className="absolute inset-0 bg-white/[0.06] rounded-full" />
                {/* Filled progress */}
                {isComplete && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-emerald-500/40 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  />
                )}
                {/* Animated traveling dot for the active connection */}
                {isActive && !isComplete && (
                  <motion.div
                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-400 shadow-glow-sm"
                    animate={{ left: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function UploadFlow({
  selectedFile,
  encryptionKey,
  encryptedData,
  onFileSelect,
  onKeyGenerated,
  onEncrypted,
}) {
  const currentStep = encryptedData ? 4 : selectedFile ? (encryptionKey ? 3 : 2) : (encryptionKey ? 2 : 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white mb-1">Upload Document</h1>
        <p className="text-sm text-slate-400">Encrypt and store your document securely on the blockchain.</p>
      </div>

      <Stepper currentStep={currentStep} />

      <div className="space-y-6">
        {/* Step 1: Key Management */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <StepCard stepNum={1} title="Encryption Key" active={true} complete={!!encryptionKey}>
            <KeyManagement onKeyGenerated={onKeyGenerated} />
          </StepCard>
        </motion.div>

        {/* Step 2: File Upload */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StepCard stepNum={2} title="Select Document" active={!!encryptionKey} complete={!!selectedFile}>
            <FileUpload onFileSelect={onFileSelect} />
          </StepCard>
        </motion.div>

        {/* Step 3: Encryption */}
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <StepCard stepNum={3} title="Encrypt File" active={!!selectedFile} complete={!!encryptedData}>
              <EncryptionModule
                file={selectedFile}
                encryptionKey={encryptionKey}
                onEncrypted={onEncrypted}
              />
            </StepCard>
          </motion.div>
        )}

        {/* Step 4: Blockchain Storage */}
        {encryptedData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StepCard stepNum={4} title="Store on Blockchain" active={!!encryptedData}>
              <BlockchainStorage encryptedData={encryptedData} />
            </StepCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function StepCard({ stepNum, title, active, complete, children }) {
  return (
    <div
      className={`card card-tilt p-6 transition-all duration-500 relative overflow-hidden
        ${complete
          ? 'border-emerald-500/20'
          : active
            ? 'border-accent-500/15 animate-border-glow'
            : 'opacity-50 pointer-events-none'
        }`}
    >
      {/* Active step glow overlay */}
      {active && !complete && (
        <div className="absolute inset-0 bg-gradient-to-br from-accent-500/[0.03] to-transparent pointer-events-none" />
      )}
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
            ${complete
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
            }`}
        >
          {complete ? <Check className="w-3.5 h-3.5" /> : stepNum}
        </div>
        <h3 className="font-display font-semibold text-white text-sm">{title}</h3>
        {complete && <span className="badge-emerald ml-auto">Complete</span>}
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
