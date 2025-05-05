import { ethers } from 'ethers';

// Contract address on Arbitrum
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// TODO: Replace with actual ABI after contract compilation
const CONTRACT_ABI = [
  'function registerPAN(bytes32 panHash) public returns (bool)',
  'function verify_address(address addr) public view returns (bool)',
  'function report_suspicious(address suspicious_address) public returns (bool)',
  'function is_address_blacklisted(address addr) public view returns (bool)',
  'function getAddressesForPAN(bytes32 panHash) public view returns (address[])',
  'function isVerified(address addr) public view returns (bool)'
];

export const getContract = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Please install MetaMask!');
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

export const registerPAN = async (panHash: string) => {
  const contract = await getContract();
  const tx = await contract.registerPAN(panHash);
  await tx.wait();
  return true;
};

export const verifyAddress = async (address: string) => {
  try {
    const contract = await getContract();
    
    // First check if address is blacklisted
    const isBlacklisted = await contract.is_address_blacklisted(address);
    if (isBlacklisted) {
      throw new Error('Address is blacklisted');
    }
    
    // Then check if address is verified
    const isVerified = await contract.isVerified(address);
    return isVerified;
    
  } catch (error: any) {
    console.error('Verification error:', error);
    if (error.message.includes('blacklisted')) {
      throw new Error('Address is blacklisted');
    }
    throw error;
  }
};

export const reportSuspiciousAddress = async (address: string) => {
  const contract = await getContract();
  const tx = await contract.report_suspicious(address);
  await tx.wait();
  return true;
};

export const getAddressesForPAN = async (panHash: string) => {
  const contract = await getContract();
  return await contract.getAddressesForPAN(panHash);
};

export const isVerified = async (address: string) => {
  const contract = await getContract();
  return await contract.isVerified(address);
}; 