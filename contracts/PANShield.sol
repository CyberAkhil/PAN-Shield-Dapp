// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import OpenZeppelin contracts with specific versions
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.0/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.0/contracts/security/ReentrancyGuard.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.3.0/contracts/utils/Counters.sol";

contract PANShield is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Registration fee in wei
    uint256 public registrationFee = 0.01 ether;
    
    // Maximum number of addresses per PAN
    uint256 public constant MAX_ADDRESSES_PER_PAN = 5;
    
    // Gas limit for refund operations
    uint256 public constant REFUND_GAS_LIMIT = 2300;
    
    // Mapping to store PAN hashes and their associated addresses
    mapping(bytes32 => address[]) public panToAddresses;
    
    // Mapping to track verified addresses
    mapping(address => bool) public isVerified;
    
    // Mapping to track blacklisted addresses
    mapping(address => bool) public isBlacklisted;
    
    // Mapping to track used nonces for anti-replay
    mapping(address => mapping(uint256 => bool)) public usedNonces;
    
    // Mapping to track suspicious reports per address
    mapping(address => uint256) public suspiciousReports;
    
    // Threshold for automatic blacklisting
    uint256 public constant SUSPICIOUS_REPORTS_THRESHOLD = 3;
    
    // Counter for nonces
    Counters.Counter private _nonceCounter;
    
    // Events
    event PANRegistered(bytes32 indexed panHash, address indexed wallet, uint256 fee);
    event AddressVerified(address indexed wallet);
    event AddressReported(address indexed suspiciousAddress, address indexed reporter);
    event RegistrationFeeUpdated(uint256 newFee);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event AddressBlacklisted(address indexed addr, string reason);
    
    // Modifier to check if address is not blacklisted
    modifier notBlacklisted(address _addr) {
        require(!isBlacklisted[_addr], "Address is blacklisted");
        _;
    }
    
    // Modifier to check if nonce is valid
    modifier validNonce(uint256 _nonce) {
        require(!usedNonces[msg.sender][_nonce], "Nonce already used");
        _;
        usedNonces[msg.sender][_nonce] = true;
    }
    
    // Modifier to check if payment is sufficient
    modifier sufficientPayment() {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        _;
    }
    
    constructor() Ownable() ReentrancyGuard() {
        // Initialize nonce counter
        _nonceCounter.increment();
    }
    
    // Function to update registration fee (only owner)
    function setRegistrationFee(uint256 _newFee) external onlyOwner {
        require(_newFee > 0, "Fee must be greater than 0");
        registrationFee = _newFee;
        emit RegistrationFeeUpdated(_newFee);
    }
    
    // Function to withdraw collected fees (only owner)
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), balance);
    }
    
    // Register a PAN and associate it with the sender's address
    function registerPAN(bytes32 _panHash, uint256 _nonce) 
        public 
        payable 
        notBlacklisted(msg.sender) 
        validNonce(_nonce)
        sufficientPayment
        nonReentrant
        returns (bool) 
    {
        // Check if PAN is already registered
        require(panToAddresses[_panHash].length == 0, "PAN already registered");
        
        // Add sender's address to the PAN's address list
        panToAddresses[_panHash].push(msg.sender);
        
        // Mark address as verified
        isVerified[msg.sender] = true;
        
        // Refund excess payment with gas limit
        if (msg.value > registrationFee) {
            uint256 refundAmount = msg.value - registrationFee;
            (bool success, ) = msg.sender.call{gas: REFUND_GAS_LIMIT, value: refundAmount}("");
            if (!success) {
                // If refund fails, keep the excess in the contract
                emit AddressBlacklisted(msg.sender, "Refund failed");
            }
        }
        
        emit PANRegistered(_panHash, msg.sender, registrationFee);
        return true;
    }
    
    // Add a new address to an existing PAN
    function addAddressToPAN(bytes32 _panHash, uint256 _nonce) 
        public 
        payable 
        notBlacklisted(msg.sender) 
        validNonce(_nonce)
        sufficientPayment
        nonReentrant
        returns (bool) 
    {
        // Check if PAN exists
        require(panToAddresses[_panHash].length > 0, "PAN not registered");
        
        // Check if address limit is reached
        require(panToAddresses[_panHash].length < MAX_ADDRESSES_PER_PAN, "Maximum addresses reached");
        
        // Check if address is already associated
        for(uint i = 0; i < panToAddresses[_panHash].length; i++) {
            require(panToAddresses[_panHash][i] != msg.sender, "Address already associated");
        }
        
        // Add new address
        panToAddresses[_panHash].push(msg.sender);
        isVerified[msg.sender] = true;
        
        // Refund excess payment with gas limit
        if (msg.value > registrationFee) {
            uint256 refundAmount = msg.value - registrationFee;
            (bool success, ) = msg.sender.call{gas: REFUND_GAS_LIMIT, value: refundAmount}("");
            if (!success) {
                // If refund fails, keep the excess in the contract
                emit AddressBlacklisted(msg.sender, "Refund failed");
            }
        }
        
        return true;
    }
    
    // Get all addresses associated with a PAN
    function getAddressesForPAN(bytes32 _panHash) public view returns (address[] memory) {
        return panToAddresses[_panHash];
    }
    
    // Check if an address is verified
    function checkVerification(address _addr) public view returns (bool) {
        return isVerified[_addr];
    }
    
    // Verify an address (for internal use)
    function verify_address(address _addr) public view returns (bool) {
        return isVerified[_addr] && !isBlacklisted[_addr];
    }
    
    // Report a suspicious address
    function report_suspicious(address _suspiciousAddress) 
        public 
        notBlacklisted(msg.sender) 
        nonReentrant
        returns (bool) 
    {
        require(_suspiciousAddress != msg.sender, "Cannot report your own address");
        require(!isBlacklisted[_suspiciousAddress], "Address already blacklisted");
        require(_suspiciousAddress != address(0), "Invalid address");
        
        // Increment suspicious reports counter
        suspiciousReports[_suspiciousAddress]++;
        
        // Check if threshold is reached
        if (suspiciousReports[_suspiciousAddress] >= SUSPICIOUS_REPORTS_THRESHOLD) {
            isBlacklisted[_suspiciousAddress] = true;
            isVerified[_suspiciousAddress] = false;
            emit AddressBlacklisted(_suspiciousAddress, "Multiple suspicious reports");
        }
        
        emit AddressReported(_suspiciousAddress, msg.sender);
        return true;
    }
    
    // Check if an address is blacklisted
    function is_address_blacklisted(address _addr) public view returns (bool) {
        return isBlacklisted[_addr];
    }
    
    // Get current nonce for an address
    function getCurrentNonce() public view returns (uint256) {
        return _nonceCounter.current();
    }
    
    // Get number of suspicious reports for an address
    function getSuspiciousReports(address _addr) public view returns (uint256) {
        return suspiciousReports[_addr];
    }
} 