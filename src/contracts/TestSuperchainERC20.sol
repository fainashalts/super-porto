// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {SuperchainERC20} from "./SuperchainERC20.sol";

contract TestSuperchainERC20 is SuperchainERC20 {
    constructor() {
        _mint(msg.sender, 1000000 * 10**18); // Mint 1M tokens
    }
    
    function name() public pure override returns (string memory) {
        return "Test Superchain Token";
    }
    
    function symbol() public pure override returns (string memory) {
        return "TST";
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}