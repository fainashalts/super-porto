// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IL2ToL2CrossDomainMessenger {
    function sendMessage(uint256 _chainId, address _target, bytes calldata _message) external;
}

interface ISuperchainTokenBridge {
    function sendERC20(address _token, address _to, uint256 _amount, uint256 _chainId) external;
}

contract PortoCrossChainAccount {
    // Superchain system contracts
    address constant L2_TO_L2_MESSENGER = 0x4200000000000000000000000000000000000023;
    address constant SUPERCHAIN_TOKEN_BRIDGE = 0x4200000000000000000000000000000000000028;
    
    // Session key management
    mapping(address => SessionKey) public sessionKeys;
    
    struct SessionKey {
        uint256 expiry;
        bool canBridge;
        bool canExecute;
        uint256 spendLimit;
        uint256 spent;
    }
    
    // Events
    event CrossChainCallInitiated(uint256 indexed destinationChain, address target, bytes data);
    event SessionKeyAuthorized(address indexed key, uint256 expiry, uint256 spendLimit);
    
    modifier onlyOwnerOrSession() {
        require(
            msg.sender == address(this) || 
            (sessionKeys[msg.sender].expiry > block.timestamp && sessionKeys[msg.sender].canExecute),
            "Unauthorized"
        );
        _;
    }
    
    // Authorize a session key
    function authorizeSessionKey(
        address _key,
        uint256 _expiry,
        bool _canBridge,
        bool _canExecute,
        uint256 _spendLimit
    ) external {
        require(msg.sender == address(this), "Only owner");
        
        sessionKeys[_key] = SessionKey({
            expiry: _expiry,
            canBridge: _canBridge,
            canExecute: _canExecute,
            spendLimit: _spendLimit,
            spent: 0
        });
        
        emit SessionKeyAuthorized(_key, _expiry, _spendLimit);
    }
    
    // Execute local calls
    function execute(address target, uint256 value, bytes calldata data) 
        external 
        onlyOwnerOrSession 
        returns (bytes memory) 
    {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Execution failed");
        return result;
    }
    
    // Execute batch of local calls
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwnerOrSession returns (bytes[] memory) {
        require(targets.length == values.length && values.length == datas.length, "Length mismatch");
        
        bytes[] memory results = new bytes[](targets.length);
        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call{value: values[i]}(datas[i]);
            require(success, "Batch execution failed");
            results[i] = result;
        }
        
        return results;
    }
    
    // Initiate cross-chain call
    function crossChainExecute(
        uint256 destinationChainId,
        address target,
        bytes calldata data
    ) external onlyOwnerOrSession {
        // Send message via L2ToL2CrossDomainMessenger
        IL2ToL2CrossDomainMessenger(L2_TO_L2_MESSENGER).sendMessage(
            destinationChainId,
            address(this), // Same address on destination chain
            abi.encodeWithSignature("executeCrossChainCall(address,bytes)", target, data)
        );
        
        emit CrossChainCallInitiated(destinationChainId, target, data);
    }
    
    // Receive and execute cross-chain call
    function executeCrossChainCall(address target, bytes calldata data) external {
        // Only accept calls from L2ToL2CrossDomainMessenger
        require(msg.sender == L2_TO_L2_MESSENGER, "Invalid sender");
        
        (bool success,) = target.call(data);
        require(success, "Cross-chain execution failed");
    }
    
    // Bridge tokens cross-chain
    function bridgeERC20(
        address token,
        uint256 amount,
        uint256 destinationChainId
    ) external onlyOwnerOrSession {
        require(
            msg.sender == address(this) || sessionKeys[msg.sender].canBridge,
            "Not authorized to bridge"
        );
        
        // Check spend limit for session keys
        if (msg.sender != address(this)) {
            require(sessionKeys[msg.sender].spent + amount <= sessionKeys[msg.sender].spendLimit, "Spend limit exceeded");
            sessionKeys[msg.sender].spent += amount;
        }
        
        // Approve and bridge via SuperchainTokenBridge
        (bool success,) = token.call(
            abi.encodeWithSignature("approve(address,uint256)", SUPERCHAIN_TOKEN_BRIDGE, amount)
        );
        require(success, "Approval failed");
        
        ISuperchainTokenBridge(SUPERCHAIN_TOKEN_BRIDGE).sendERC20(
            token,
            address(this), // Same address on destination
            amount,
            destinationChainId
        );
    }
    
    // Receive ETH
    receive() external payable {}
}