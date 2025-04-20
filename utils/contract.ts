import { ethers } from 'ethers';

// Contract address on Arbitrum
const CONTRACT_ADDRESS = '0x9f6543054dD6a11cf9fCe5A453Ec8630F8A34900';

// TODO: Replace with actual ABI after contract compilation
const CONTRACT_ABI = [
  'function registerPAN(bytes32 panHash) public returns (bool)',
  'function verify_address(address addr) public view returns (bool)',
  'function report_suspicious(address suspicious_address) public returns (bool)',
  'function is_address_blacklisted(address addr) public view returns (bool)',
];

export const getContract = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('Please install MetaMask!');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};

export const registerPAN = async (panHash: string) => {
  const contract = await getContract();
  const tx = await contract.registerPAN(panHash);
  await tx.wait();
  return true;
};

export const verifyAddress = async (address: string) => {
  const contract = await getContract();
  return await contract.verify_address(address);
};

export const reportSuspiciousAddress = async (address: string) => {
  const contract = await getContract();
  const tx = await contract.report_suspicious(address);
  await tx.wait();
  return true;
}; 