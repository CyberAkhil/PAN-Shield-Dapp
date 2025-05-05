import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

interface VerifiedAddressesProps {
  panHash: string;
}

const VerifiedAddresses = ({ panHash }: VerifiedAddressesProps) => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  // Contract ABI for the new functions
  const CONTRACT_ABI = [
    'function getAddressesForPAN(bytes32 panHash) public view returns (address[])',
    'function isVerified(address addr) public view returns (bool)'
  ];

  const CONTRACT_ADDRESS = '0x9f6543054dD6a11cf9fCe5A453Ec8630F8A34900';

  const getContract = async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('Please install MetaMask!');
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  };

  const fetchAddresses = async () => {
    if (!panHash) return;

    setIsLoading(true);
    setError(null);

    try {
      const contract = await getContract();
      const addresses = await contract.getAddressesForPAN(panHash);
      setAddresses(addresses);

      // Get current wallet address
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      setCurrentAddress(accounts[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch addresses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, [panHash]);

  const isCurrentAddressVerified = async (address: string) => {
    try {
      const contract = await getContract();
      return await contract.isVerified(address);
    } catch (err) {
      console.error('Error checking verification status:', err);
      return false;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gray-900/50 rounded-xl border border-gray-800 backdrop-blur-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Verified Addresses</h2>
        <button
          onClick={fetchAddresses}
          disabled={isLoading}
          className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-800/50">
          <div className="flex items-center text-red-400">
            <ExclamationCircleIcon className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No verified addresses found for this PAN
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address}
              className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700/50"
            >
              <div className="flex items-center space-x-3">
                <div className="relative group">
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Verified by PAN Shield
                  </div>
                </div>
                <span className="font-mono text-gray-300">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
              {currentAddress === address && (
                <span className="px-3 py-1 text-xs rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  Current Wallet
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VerifiedAddresses; 