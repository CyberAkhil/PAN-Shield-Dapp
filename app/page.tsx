'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { 
  ShieldCheckIcon, 
  DocumentCheckIcon, 
  ExclamationTriangleIcon, 
  UserGroupIcon,
  CubeTransparentIcon,
  SparklesIcon,
  XMarkIcon,
  CheckCircleIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  PhoneIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { FormEvent, ChangeEvent } from '../types/global';
import { registerPAN, verifyAddress, reportSuspiciousAddress } from '../utils/contract';
import FeedbackModal from '../components/FeedbackModal';
import VerifiedAddresses from '../components/VerifiedAddresses';

type Step = 'REGISTER' | 'VERIFY' | 'REPORT';

type ReportEvidence = {
  reason: string;
  transactionHash: string;
  description: string;
  contactInfo: string;
  images: File[];
};

type HelpTopic = {
  question: string;
  answer: string;
};

const helpTopics: HelpTopic[] = [
  {
    question: "How do I register my PAN?",
    answer: "To register your PAN, go to the Register tab, enter your PAN number, complete the verification steps, and click Register. Make sure your wallet is connected first."
  },
  {
    question: "How do I verify an address?",
    answer: "To verify an address, go to the Verify tab, enter the Ethereum address you want to check, and click Verify. The system will tell you if the address is safe or blacklisted."
  },
  {
    question: "How do I report a suspicious address?",
    answer: "To report a suspicious address, go to the Report tab, enter the suspicious Ethereum address, provide proof and details about the suspicious activity, and submit the report."
  },
  {
    question: "What happens after I register my PAN?",
    answer: "After registration, your PAN is securely hashed and stored on the blockchain. You can use your registered address for verification purposes, and others can check if your address is safe."
  },
  {
    question: "Is my PAN number secure?",
    answer: "Yes, your PAN number is never stored directly on the blockchain. We only store a secure hash of your PAN, which cannot be reversed to reveal your actual PAN number."
  }
];

const Home = () => {
  const [currentStep, setCurrentStep] = useState<Step>('REGISTER');
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [panNumber, setPanNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPhotoVerified, setIsPhotoVerified] = useState(false);
  const [addressToCheck, setAddressToCheck] = useState('');
  const [addressToReport, setAddressToReport] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [reportEvidence, setReportEvidence] = useState<ReportEvidence>({
    reason: '',
    transactionHash: '',
    description: '',
    contactInfo: '',
    images: []
  });
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const supportRef = useRef<HTMLDivElement>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [registeredPanHash, setRegisteredPanHash] = useState<string | null>(null);

  useEffect(() => {
    setShowAnimation(true);
  }, []);

  // Close support menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supportRef.current && !supportRef.current.contains(event.target as Node)) {
        setIsSupportOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStepChange = (newStep: Step) => {
    setIsAnimating(true);
    setSlideDirection(getSlideDirection(currentStep, newStep));
    setTimeout(() => {
      setCurrentStep(newStep);
      setIsAnimating(false);
    }, 300);
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        }) as string[];
        setAccount(accounts[0]);
        setIsConnected(true);
        toast.success('Wallet connected successfully!');
      } else {
        toast.error('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const isPANValid = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    return panRegex.test(pan);
  };

  const handlePANChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setPanNumber(value);
    console.log('PAN Number changed:', value);
  };

  // Function to send OTP
  const sendOTP = async () => {
    if (!mobileNumber || !email) {
      toast.error('Please enter both mobile number and email');
      return;
    }
    // Here you would integrate with actual SMS/Email service
    toast.success('OTP sent to your mobile and email');
    setIsOtpSent(true);
  };

  // Function to verify OTP
  const verifyOTP = () => {
    if (!otp) {
      toast.error('Please enter OTP');
      return;
    }
    // Here you would verify with actual OTP
    setIsOtpVerified(true);
    toast.success('OTP verified successfully');
  };

  // Function to handle face verification
  const handleFaceVerification = async () => {
    setIsCameraOpen(true);
    // Here you would integrate with face verification API
    // For demo, we'll just simulate success
    setTimeout(() => {
      setIsPhotoVerified(true);
      setIsCameraOpen(false);
      toast.success('Face verification successful');
    }, 3000);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: null, message: '' });
    }, 5000);
  };

  const handleRegisterPAN = async (e: FormEvent) => {
    e.preventDefault();
    console.log('Attempting to register PAN:', panNumber);

    if (!panNumber) {
      showNotification('error', 'Please enter a PAN number');
      return;
    }

    if (!isPANValid(panNumber)) {
      showNotification('error', 'Please enter a valid PAN number');
      return;
    }

    if (!isConnected) {
      showNotification('error', 'Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Creating PAN hash...');
      const panHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(panNumber));
      console.log('PAN hash created:', panHash);
      setRegisteredPanHash(panHash);

      console.log('Calling registerPAN function...');
      const result = await registerPAN(panHash);
      
      if (result) {
        console.log('Registration successful');
        showNotification('success', 'PAN registered successfully! 🎉');
        setPanNumber('');
      }
    } catch (error: any) {
      console.error('Error registering PAN:', error);
      
      if (error?.message?.includes('PAN already registered')) {
        showNotification('error', 'This PAN number is already registered in the system');
      } else if (error?.message?.includes('user rejected')) {
        showNotification('error', 'Transaction was rejected by user');
      } else if (error?.message?.includes('insufficient funds')) {
        showNotification('error', 'Insufficient funds to complete transaction');
      } else {
        showNotification('error', 'Failed to register PAN. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAddress = async (e: FormEvent) => {
    e.preventDefault();
    console.log('Attempting to verify address:', addressToCheck);

    if (!addressToCheck) {
      showNotification('error', 'Please enter an address to verify');
      return;
    }

    if (!ethers.utils.isAddress(addressToCheck)) {
      showNotification('error', 'Please enter a valid Ethereum address');
      return;
    }

    if (!isConnected) {
      showNotification('error', 'Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Calling verifyAddress function...');
      const result = await verifyAddress(addressToCheck);
      console.log('Verification result:', result);

      if (result === true) {
        showNotification('success', '✅ Address is verified and safe to use');
      } else {
        showNotification('error', '⚠️ Address is not verified');
      }
      setAddressToCheck('');
    } catch (error: any) {
      console.error('Error verifying address:', error);
      if (error.message.includes('blacklisted')) {
        showNotification('error', '⚠️ This address has been blacklisted');
      } else {
        showNotification('error', 'Failed to verify address. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      showNotification('error', 'Maximum 5 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/');
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit
      if (!isValid) {
        showNotification('error', `${file.name} is not an image file`);
      }
      if (!isValidSize) {
        showNotification('error', `${file.name} exceeds 5MB limit`);
      }
      return isValid && isValidSize;
    });

    setReportEvidence(prev => ({
      ...prev,
      images: [...prev.images, ...validFiles]
    }));

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setReportEvidence(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleReportAddress = async (e: FormEvent) => {
    e.preventDefault();
    console.log('Attempting to report address:', addressToReport);

    if (!addressToReport) {
      showNotification('error', 'Please enter an address to report');
      return;
    }

    if (!ethers.utils.isAddress(addressToReport)) {
      showNotification('error', 'Please enter a valid Ethereum address');
      return;
    }

    if (!reportEvidence.reason) {
      showNotification('error', 'Please select a reason for reporting');
      return;
    }

    if (!reportEvidence.transactionHash) {
      showNotification('error', 'Please provide the suspicious transaction hash');
      return;
    }

    if (!reportEvidence.description) {
      showNotification('error', 'Please provide a detailed description');
      return;
    }

    if (!reportEvidence.contactInfo) {
      showNotification('error', 'Please provide your contact information');
      return;
    }

    if (reportEvidence.images.length === 0) {
      showNotification('error', 'Please provide at least one screenshot/image as proof');
      return;
    }

    if (!isConnected) {
      showNotification('error', 'Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Submitting report with evidence:', { 
        addressToReport, 
        reportEvidence,
        imageCount: reportEvidence.images.length 
      });

      // Here you would typically:
      // 1. Upload images to IPFS or your storage service
      // 2. Get the image URLs/hashes
      // 3. Submit the report with image references

      const result = await reportSuspiciousAddress(addressToReport);
      showNotification('success', '✅ Report submitted successfully. Our team will review the evidence.');
      
      // Clear form
      setAddressToReport('');
      setReportEvidence({
        reason: '',
        transactionHash: '',
        description: '',
        contactInfo: '',
        images: []
      });
      setImagePreviews([]);
    } catch (error: any) {
      console.error('Error reporting address:', error);
      showNotification('error', 'Failed to submit report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSlideDirection = (current: Step, next: Step) => {
    const steps: Step[] = ['REGISTER', 'VERIFY', 'REPORT'];
    const currentIndex = steps.indexOf(current);
    const nextIndex = steps.indexOf(next);
    return nextIndex > currentIndex ? 'right' : 'left';
  };

  const getButtonStyle = (step: string) => {
    switch(step) {
      case 'REGISTER':
        return currentStep === step 
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
          : 'text-gray-400 hover:text-white hover:bg-white/10';
      case 'VERIFY':
        return currentStep === step 
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
          : 'text-gray-400 hover:text-white hover:bg-white/10';
      case 'REPORT':
        return currentStep === step 
          ? 'bg-gradient-to-r from-[#FF0000] to-[#CC0000] text-white shadow-lg shadow-red-700/50'
          : 'text-gray-400 hover:text-white hover:bg-red-900/30';
      default:
        return 'text-gray-400 hover:text-white hover:bg-white/10';
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#0f1729] to-black overflow-hidden relative">
      {/* Notification Banner */}
      {notification.type && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md`}>
          <div
            className={`flex items-center justify-between px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success'
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                : 'bg-gradient-to-r from-red-600 to-red-700 text-white'
            }`}
          >
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircleIcon className="h-6 w-6 mr-2" />
              ) : (
                <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
              )}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification({ type: null, message: '' })}
              className="ml-4 text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] -top-40 -left-40 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] -bottom-40 -right-40 bg-indigo-500/30 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Initial View Container */}
        <div className={`flex flex-col justify-center items-center ${!isConnected ? 'min-h-screen' : 'pt-8'}`}>
          {/* Enhanced Header */}
          <div className={`text-center transition-all duration-1000 transform ${showAnimation ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'} ${isConnected ? 'mb-4' : 'mb-12'}`}>
            <div className={`flex justify-center ${isConnected ? 'mb-4' : 'mb-6'}`}>
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-3 rounded-2xl transform transition-all duration-300 hover:scale-110 hover:rotate-12 shadow-xl hover:shadow-indigo-500/50">
                <ShieldCheckIcon className={`text-white ${isConnected ? 'h-12 w-12' : 'h-16 w-16'}`} />
              </div>
            </div>
            <h1 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 mb-4 ${isConnected ? 'text-4xl' : 'text-6xl'}`}>
              PAN Shield
            </h1>
            {!isConnected && (
              <>
                <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                  Secure PAN Card Verification System on Arbitrum
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <SparklesIcon className="h-6 w-6 text-indigo-400 animate-spin-slow" />
                  <span className="text-indigo-400">Powered by Blockchain Technology</span>
                </div>
              </>
            )}
          </div>

          {/* Connect Wallet Button */}
          {!isConnected && (
            <div className="relative group mb-12">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="relative px-7 py-4 bg-black rounded-lg leading-none flex items-center divide-x divide-gray-600"
              >
                <span className="flex items-center space-x-5">
                  <CubeTransparentIcon className="h-6 w-6 text-pink-600 animate-pulse" />
                  <span className="pr-6 text-gray-100">Connect Wallet</span>
                </span>
                <span className="pl-6 text-indigo-400 group-hover:text-gray-100 transition duration-200">
                  Get Started →
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Content after wallet connection */}
        <div className={isConnected ? 'mt-0' : 'py-16'}>
          {/* Main Content with Enhanced Styling */}
          {!isConnected ? (
            <div className="flex flex-col items-center space-y-12">
              {/* FAQ Section - Always visible */}
              <div className="max-w-4xl mx-auto mt-16 backdrop-blur-lg bg-black/30 rounded-2xl p-8 border border-gray-800/50">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                    Frequently Asked Questions
                  </h2>
                  <p className="mt-2 text-gray-400">Everything you need to know about PAN Shield</p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {helpTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="p-6 rounded-xl bg-gray-900/50 border border-gray-800/50 backdrop-blur-sm transition-all duration-300 hover:bg-gray-900/70 hover:border-indigo-500/30 group"
                    >
                      <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-3 group-hover:from-indigo-300 group-hover:to-purple-300">
                        {topic.question}
                      </h3>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {topic.answer}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Quick Links */}
                <div className="mt-8 flex justify-center gap-4">
                  <a
                    href="mailto:support@panshield.com"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/30 transition-all duration-300"
                  >
                    <EnvelopeIcon className="h-5 w-5 mr-2" />
                    Contact Support
        </a>
        <a
                    href="tel:+911234567890"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-all duration-300"
                  >
                    <PhoneIcon className="h-5 w-5 mr-2" />
                    Helpline
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto backdrop-blur-lg bg-black/50 rounded-2xl p-8 shadow-2xl border border-gray-800">
              {/* Navigation Tabs with Glass Effect */}
              <div className="flex justify-between items-center mb-8 bg-black/30 p-2 rounded-xl backdrop-blur-md">
                {['REGISTER', 'VERIFY', 'REPORT'].map((step) => (
                  <button
                    key={step}
                    onClick={() => setCurrentStep(step as Step)}
                    className={`px-6 py-3 rounded-lg transition-all duration-300 ${getButtonStyle(step)}`}
                  >
                    {step.charAt(0) + step.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Content Area */}
              <div className="bg-black/40 rounded-xl p-6 backdrop-blur-lg border border-gray-800/50">
                {currentStep === 'REGISTER' && (
                  <div>
                    <div className="flex items-center mb-6">
                      <DocumentCheckIcon className="h-8 w-8 text-indigo-500 mr-3" />
                      <h2 className="text-2xl font-semibold text-white">Register PAN</h2>
                    </div>
                    
                    {/* Info Box */}
                    <div className="mb-6 p-4 rounded-lg bg-indigo-900/30 border border-indigo-800/50">
                      <p className="text-indigo-300 text-sm">
                        ℹ️ Each PAN number can only be registered once. If your PAN is already registered, 
                        you will receive a notification.
                      </p>
                    </div>

                    <form onSubmit={handleRegisterPAN} className="space-y-4">
                      <div>
                        <label htmlFor="pan" className="block text-sm font-medium text-gray-300 mb-2">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          id="pan"
                          value={panNumber}
                          onChange={handlePANChange}
                          maxLength={10}
                          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                          required
                          disabled={isLoading || !isConnected}
                          placeholder="ABCDE1234F"
                          pattern="[A-Z]{5}[0-9]{4}[A-Z]"
                        />
                        <p className="mt-1 text-xs text-gray-400">Format: ABCDE1234F</p>
                        {!isConnected && (
                          <p className="mt-2 text-sm text-yellow-500">
                            ⚠️ Please connect your wallet first
                          </p>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading || !panNumber || !isPANValid(panNumber) || !isConnected}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50 disabled:opacity-50 disabled:hover:scale-100 relative group"
                      >
                        <div className="relative flex items-center justify-center">
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                              <span>Registering...</span>
                            </>
                          ) : (
                            <>
                              <DocumentCheckIcon className="h-5 w-5 mr-2" />
                              <span>Register PAN</span>
                            </>
                          )}
                        </div>
                      </button>
                    </form>
                  </div>
                )}

                {currentStep === 'VERIFY' && (
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="relative">
                        <UserGroupIcon className="h-8 w-8 text-green-500 mr-3" />
                        <div className="absolute inset-0 h-8 w-8 bg-green-500 blur-lg opacity-50"></div>
                      </div>
                      <h2 className="text-2xl font-semibold text-white">Verify Address</h2>
                    </div>

                    <div className="mb-6 p-4 rounded-lg bg-green-900/30 border border-green-800/50">
                      <p className="text-green-300 text-sm">
                        ℹ️ Check if an Ethereum address has been reported as suspicious. This helps maintain
                        the security of the network.
                      </p>
                    </div>

                    <form onSubmit={handleCheckAddress} className="space-y-4">
                      <div>
                        <label htmlFor="addressCheck" className="block text-sm font-medium text-gray-300 mb-2">
                          Wallet Address
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="addressCheck"
                            value={addressToCheck}
                            onChange={(e) => setAddressToCheck(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            required
                            disabled={isLoading || !isConnected}
                            placeholder="0x..."
                          />
                          <div className="absolute inset-0 rounded-lg bg-green-500/5 pointer-events-none"></div>
                        </div>
                        {!isConnected && (
                          <p className="mt-2 text-sm text-yellow-500">
                            ⚠️ Please connect your wallet first
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !addressToCheck || !isConnected}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:hover:scale-100 relative group"
                      >
                        <div className="relative flex items-center justify-center">
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <UserGroupIcon className="h-5 w-5 mr-2" />
                              <span>Verify Address</span>
                            </>
                          )}
                        </div>
                      </button>
                    </form>
                  </div>
                )}

                {currentStep === 'REPORT' && (
                  <div>
                    <div className="flex items-center mb-6">
                      <div className="relative">
                        <ExclamationTriangleIcon className="h-8 w-8 text-[#FF0000] animate-pulse mr-3" />
                        <div className="absolute inset-0 h-8 w-8 bg-red-500 blur-lg opacity-50 animate-pulse"></div>
                      </div>
                      <h2 className="text-2xl font-semibold text-white flex items-center">
                        Report Suspicious Address
                        <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 border border-red-500/50">
                          Requires Proof
                        </span>
                      </h2>
                    </div>

                    <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/50 mb-6">
                      <p className="text-red-400 text-sm">
                        ⚠️ False reporting is a serious offense. Please provide valid evidence to support your report.
                        Our team will review the evidence before taking any action.
                      </p>
                    </div>

                    <form onSubmit={handleReportAddress} className="space-y-6">
                      <div>
                        <label htmlFor="addressReport" className="block text-sm font-medium text-gray-300 mb-2">
                          Suspicious Address
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="addressReport"
                            value={addressToReport}
                            onChange={(e) => setAddressToReport(e.target.value)}
                            className="w-full bg-red-950/20 border border-red-900/50 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FF0000] focus:border-transparent"
                            required
                            disabled={isLoading || !isConnected}
                            placeholder="0x..."
                          />
                          <div className="absolute inset-0 rounded-lg bg-red-500/5 pointer-events-none"></div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Reason for Reporting
                        </label>
                        <select
                          value={reportEvidence.reason}
                          onChange={(e) => setReportEvidence({ ...reportEvidence, reason: e.target.value })}
                          className="w-full bg-red-950/20 border border-red-900/50 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FF0000] focus:border-transparent"
                          required
                        >
                          <option value="">Select a reason</option>
                          <option value="scam">Scam Activity</option>
                          <option value="fraud">Fraudulent Transaction</option>
                          <option value="phishing">Phishing Attempt</option>
                          <option value="impersonation">Identity Impersonation</option>
                          <option value="other">Other (Specify in Description)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Transaction Hash
                        </label>
                        <input
                          type="text"
                          value={reportEvidence.transactionHash}
                          onChange={(e) => setReportEvidence({ ...reportEvidence, transactionHash: e.target.value })}
                          className="w-full bg-red-950/20 border border-red-900/50 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FF0000] focus:border-transparent"
                          placeholder="0x..."
                          required
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Provide the transaction hash that shows suspicious activity
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Detailed Description
                        </label>
                        <textarea
                          value={reportEvidence.description}
                          onChange={(e) => setReportEvidence({ ...reportEvidence, description: e.target.value })}
                          className="w-full bg-red-950/20 border border-red-900/50 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FF0000] focus:border-transparent"
                          rows={4}
                          placeholder="Please provide a detailed description of the suspicious activity. Include any relevant information that can help our team investigate."
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Your Contact Information
                        </label>
                        <input
                          type="text"
                          value={reportEvidence.contactInfo}
                          onChange={(e) => setReportEvidence({ ...reportEvidence, contactInfo: e.target.value })}
                          className="w-full bg-red-950/20 border border-red-900/50 text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#FF0000] focus:border-transparent"
                          placeholder="Email or Telegram username for follow-up"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          We may need to contact you for additional information
                        </p>
                      </div>

                      {/* Image Upload Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Evidence Screenshots/Images
                        </label>
                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-red-900/50 px-6 py-10 bg-red-950/20">
                          <div className="text-center">
                            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-4 flex flex-col items-center text-sm leading-6 text-gray-400">
                              <span>Upload up to 5 images</span>
                              <span className="text-xs">(Max 5MB each)</span>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 flex items-center text-red-400 hover:text-red-300"
                              >
                                <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                                Upload files
                              </button>
                            </div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*"
                              multiple
                              className="hidden"
                            />
                          </div>
                        </div>

                        {/* Image Previews */}
                        {imagePreviews.length > 0 && (
                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {imagePreviews.map((preview, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={preview}
                                  alt={`Evidence ${index + 1}`}
                                  className="h-24 w-full object-cover rounded-lg border border-red-900/50"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <XMarkIcon className="h-4 w-4 text-white" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                          Upload screenshots of suspicious transactions, communications, or any other relevant evidence
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading || !addressToReport || !isConnected}
                        className="w-full bg-gradient-to-r from-[#FF0000] to-[#CC0000] hover:from-[#CC0000] hover:to-[#990000] text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-700/50 disabled:opacity-50 disabled:hover:scale-100 relative group"
                      >
                        <div className="absolute inset-0 rounded-lg bg-red-500 blur-sm opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
                        <div className="relative flex items-center justify-center">
                          {isLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                              <span>Submitting Report...</span>
                            </>
                          ) : (
                            <>
                              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                              <span>Submit Report</span>
                            </>
                          )}
                        </div>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connected Account Info with Enhanced Style */}
          {isConnected && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-black/30 border border-gray-700 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2"></div>
                <p className="text-gray-400">
                  Connected: 
                  <span className="text-indigo-400 font-mono ml-2">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Enhanced Creator Section */}
          <div className="mt-16 text-center">
            <div className="flex justify-center items-center mb-4">
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <div className="relative px-8 py-4 bg-black rounded-xl leading-none flex items-center space-x-6">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl transform -rotate-6 group-hover:rotate-6 transition-transform duration-300"></div>
                      <CubeTransparentIcon className="h-12 w-12 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-indigo-400 text-sm font-medium">Developed by</p>
                    <p className="text-3xl font-bold">
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                        GUMASTA JI
                      </span>
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <SparklesIcon className="h-4 w-4" />
                      <span>Blockchain Innovation</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Feedback Button */}
          <div className="fixed bottom-8 left-8 z-50">
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="group relative bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
            >
              <div className="absolute inset-0 rounded-full bg-purple-600 blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <StarIcon className="h-6 w-6 text-white relative z-10" />
            </button>
          </div>

          {/* Feedback Modal */}
          <FeedbackModal 
            isOpen={isFeedbackOpen}
            onClose={() => setIsFeedbackOpen(false)}
          />

          {registeredPanHash && (
            <div className="mt-8">
              <VerifiedAddresses panHash={registeredPanHash} />
            </div>
          )}
        </div>
    </div>
    </main>
  );
};

export default Home;
