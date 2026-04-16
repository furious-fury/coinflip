// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MonadCoinFlip} from "../src/MonadCoinFlip.sol";

contract MonadCoinFlipTest is Test {
    MonadCoinFlip internal c;
    address internal alice = makeAddr("alice");

    function setUp() public {
        c = new MonadCoinFlip(0.01 ether, 0.001 ether);
        vm.deal(alice, 100 ether);
    }

    function test_DepositWithdraw() public {
        vm.prank(alice);
        c.deposit{value: 0.01 ether}();
        assertEq(c.balanceOf(alice), 0.01 ether);

        vm.prank(alice);
        c.withdraw(0.005 ether);
        assertEq(c.balanceOf(alice), 0.005 ether);
        assertEq(alice.balance, 100 ether - 0.01 ether + 0.005 ether);
    }

    function test_OpenSessionTossCashOut_RoundTrip() public {
        vm.prank(alice);
        c.deposit{value: 1 ether}();

        bytes32 seed = keccak256("client-seed");
        vm.prank(alice);
        c.openSession(MonadCoinFlip.RiskMode.NORMAL, 0.1 ether, seed);

        MonadCoinFlip.SessionView memory s0 = c.getSession(alice);
        assertTrue(s0.active);
        assertEq(s0.sessionBalanceWei, 0.1 ether);
        assertEq(c.balanceOf(alice), 0.9 ether);

        vm.prevrandao(bytes32(uint256(12345)));
        vm.prank(alice);
        c.toss();

        MonadCoinFlip.SessionView memory s1 = c.getSession(alice);
        assertTrue(s1.active);
        assertEq(s1.tossCount, 1);

        vm.prank(alice);
        c.cashOut();

        assertFalse(c.getSession(alice).active);
        assertEq(c.balanceOf(alice), 0.9 ether + s1.sessionBalanceWei);
    }

    function test_RecoverExcess_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(MonadCoinFlip.Unauthorized.selector);
        c.recoverExcess(payable(alice));
    }

    function test_RecoverExcess_NothingWhenNoSurplus() public {
        vm.prank(alice);
        c.deposit{value: 0.01 ether}();
        assertEq(c.totalOwed(), 0.01 ether);
        vm.expectRevert(MonadCoinFlip.NothingToRecover.selector);
        c.recoverExcess(payable(alice));
    }

    function test_RecoverExcess_SweepsArtificialSurplus() public {
        vm.prank(alice);
        c.deposit{value: 0.01 ether}();
        assertEq(c.totalOwed(), 0.01 ether);
        // Foundry: extra balance without increasing liabilities (e.g. selfdestruct on mainnet).
        vm.deal(address(c), address(c).balance + 0.5 ether);

        uint256 aliceBefore = alice.balance;
        c.recoverExcess(payable(alice));
        assertEq(address(c).balance, 0.01 ether);
        assertEq(alice.balance, aliceBefore + 0.5 ether);
    }

    function test_PreviewOutcome_MatchesToss() public {
        vm.prank(alice);
        c.deposit{value: 1 ether}();
        bytes32 seed = keccak256("xyz");
        vm.prank(alice);
        c.openSession(MonadCoinFlip.RiskMode.NORMAL, 0.05 ether, seed);

        uint256 pr = uint256(keccak256("pre"));
        vm.prevrandao(bytes32(pr));
        uint256 bn = block.number;

        (uint256 rawWord, bool heads) = c.previewOutcome(pr, bn, alice, seed, 0);
        assertEq(
            rawWord,
            uint256(keccak256(abi.encodePacked(pr, bn, alice, seed, uint256(0))))
        );
        assertEq(heads, (rawWord & 1) == 0);

        vm.prank(alice);
        c.toss();
        MonadCoinFlip.SessionView memory sv = c.getSession(alice);
        assertEq(sv.tossCount, 1);
    }
}
