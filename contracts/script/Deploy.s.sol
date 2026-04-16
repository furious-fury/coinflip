// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MonadCoinFlip} from "../src/MonadCoinFlip.sol";

contract Deploy is Script {
    function run() external {
        uint256 minDeposit = vm.envOr("MIN_DEPOSIT_WEI", uint256(10 ** 16));
        uint256 minStake = vm.envOr("MIN_STAKE_WEI", uint256(10 ** 15));
        vm.startBroadcast();
        MonadCoinFlip c = new MonadCoinFlip(minDeposit, minStake);
        console.log("MonadCoinFlip deployed:", address(c));
        vm.stopBroadcast();
    }
}
