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
    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, i) => {
        const isComplete = currentStep > step.id;
        const isActive = currentStep >= step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors duration-200
                  ${isComplete
                    ? 'bg-accent-600 border-accent-600 text-white'
                    : isActive
                      ? 'bg-white border-accent-600 text-accent-700'
                      : 'bg-white border-ink-200 text-ink-300'
                  }`}
              >
                {isComplete ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <div className="hidden sm:block">
                <p className={`text-xs font-medium ${isActive ? 'text-ink-800' : 'text-ink-400'}`}>
                  {step.label}
                </p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="relative flex-1 h-px min-w-[20px]">
                <div className="absolute inset-0 bg-ink-100" />
                {isComplete && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-accent-600"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.4 }}
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
              <BlockchainStorage encryptedData={encryptedData} encryptionKey={encryptionKey} />
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
      className={`card p-6 transition-colors duration-200
        ${complete
          ? 'border-l-[3px] border-l-accent-600'
          : active
            ? 'border-ink-200'
            : 'opacity-50 pointer-events-none'
        }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border
            ${complete
              ? 'bg-accent-600 text-white border-accent-600'
              : 'bg-white text-accent-700 border-accent-600'
            }`}
        >
          {complete ? <Check className="w-3.5 h-3.5" /> : stepNum}
        </div>
        <h3 className="font-display font-semibold text-ink-900 text-sm">{title}</h3>
        {complete && <span className="badge-emerald ml-auto">Complete</span>}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
