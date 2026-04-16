// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MonadCoinFlip — on-chain bankroll, session, and toss (testnet-oriented RNG; see docs/RNG.md).
contract MonadCoinFlip {
    enum RiskMode {
        SAFE,
        NORMAL,
        AGGRESSIVE
    }

    struct Session {
        bool active;
        RiskMode mode;
        uint256 stakeAmount;
        uint256 sessionBalance;
        uint32 tossCount;
        bytes32 clientSeed;
        uint32 winStreak;
        uint32 lossStreak;
        uint32 headsCount;
        uint32 tailsCount;
    }

    struct SessionView {
        bool active;
        RiskMode mode;
        uint256 stakeWei;
        uint256 sessionBalanceWei;
        uint32 tossCount;
        bytes32 clientSeed;
        uint32 winStreak;
        uint32 lossStreak;
        uint32 headsCount;
        uint32 tailsCount;
    }

    mapping(address => uint256) private _bankroll;
    mapping(address => Session) private _sessions;

    uint256 public immutable minDepositWei;
    uint256 public immutable minStakeWei;

    /// @notice Sum of all player bankrolls plus all active session balances — not withdrawable by recover.
    uint256 private _totalOwed;

    address public immutable owner;

    uint256 private _locked;

    error Reentrancy();
    error InvalidAmount();
    error SessionActive();
    error NoSession();
    error InsufficientBankroll();
    error Unauthorized();
    error NothingToRecover();

    modifier nonReentrant() {
        if (_locked != 0) revert Reentrancy();
        _locked = 1;
        _;
        _locked = 0;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(uint256 minDepositWei_, uint256 minStakeWei_) {
        require(minStakeWei_ > 0 && minDepositWei_ >= minStakeWei_, "MonadCoinFlip: bad minima");
        minDepositWei = minDepositWei_;
        minStakeWei = minStakeWei_;
        owner = msg.sender;
    }

    event Deposit(address indexed player, uint256 amount);
    event Withdraw(address indexed player, uint256 amount);
    event SessionOpened(
        address indexed player,
        RiskMode mode,
        uint256 stakeWei,
        bytes32 clientSeed,
        uint256 sessionBalanceWei
    );
    event TossResult(
        address indexed player,
        uint256 tossIndex,
        uint256 rawWord,
        bool heads,
        uint256 balanceAfterWei
    );
    event SessionClosed(address indexed player, uint256 payoutWei, bool bust);
    event Recovered(address indexed to, uint256 amountWei);

    receive() external payable {
        deposit();
    }

    function deposit() public payable nonReentrant {
        if (msg.value < minDepositWei) revert InvalidAmount();
        _bankroll[msg.sender] += msg.value;
        _totalOwed += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amountWei) external nonReentrant {
        if (amountWei == 0) revert InvalidAmount();
        if (_bankroll[msg.sender] < amountWei) revert InsufficientBankroll();
        _bankroll[msg.sender] -= amountWei;
        _totalOwed -= amountWei;
        (bool ok, ) = payable(msg.sender).call{value: amountWei}("");
        require(ok, "MonadCoinFlip: withdraw transfer");
        emit Withdraw(msg.sender, amountWei);
    }

    function openSession(RiskMode mode, uint256 stakeWei, bytes32 clientSeed_) external nonReentrant {
        Session storage s = _sessions[msg.sender];
        if (s.active) revert SessionActive();
        if (stakeWei < minStakeWei) revert InvalidAmount();
        if (_bankroll[msg.sender] < stakeWei) revert InsufficientBankroll();

        _bankroll[msg.sender] -= stakeWei;
        s.active = true;
        s.mode = mode;
        s.stakeAmount = stakeWei;
        s.sessionBalance = stakeWei;
        s.tossCount = 0;
        s.clientSeed = clientSeed_;
        s.winStreak = 0;
        s.lossStreak = 0;
        s.headsCount = 0;
        s.tailsCount = 0;

        emit SessionOpened(msg.sender, mode, stakeWei, clientSeed_, s.sessionBalance);
    }

    function toss() external nonReentrant {
        Session storage s = _sessions[msg.sender];
        if (!s.active) revert NoSession();

        uint256 tc = s.tossCount;
        uint256 raw = uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, block.number, msg.sender, s.clientSeed, tc)
            )
        );
        bool heads = (raw & 1) == 0;

        (uint256 wn, uint256 wd, uint256 ln, uint256 ld) = _riskParams(s.mode);
        uint256 oldBal = s.sessionBalance;
        uint256 bal = oldBal;

        if (heads) {
            bal = (bal * wn) / wd;
            s.winStreak += 1;
            s.lossStreak = 0;
            s.headsCount += 1;
        } else {
            bal = (bal * ln) / ld;
            s.winStreak = 0;
            s.lossStreak += 1;
            s.tailsCount += 1;
        }

        s.sessionBalance = bal;
        if (bal >= oldBal) {
            _totalOwed += bal - oldBal;
        } else {
            _totalOwed -= oldBal - bal;
        }

        unchecked {
            s.tossCount = uint32(tc + 1);
        }

        emit TossResult(msg.sender, tc, raw, heads, bal);

        if (bal == 0) {
            delete _sessions[msg.sender];
            emit SessionClosed(msg.sender, 0, true);
        }
    }

    function cashOut() external nonReentrant {
        Session storage s = _sessions[msg.sender];
        if (!s.active) revert NoSession();
        uint256 payout = s.sessionBalance;
        delete _sessions[msg.sender];
        _bankroll[msg.sender] += payout;
        emit SessionClosed(msg.sender, payout, false);
    }

    function balanceOf(address player) external view returns (uint256) {
        return _bankroll[player];
    }

    /// @notice Aggregate player funds (bankrolls + active session balances). `recoverExcess` cannot touch this amount.
    function totalOwed() external view returns (uint256) {
        return _totalOwed;
    }

    /// @notice Send all ETH in excess of `totalOwed` (house surplus, accidental sends, `selfdestruct`). Callable only by `owner` (deployer).
    function recoverExcess(address payable to) external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        if (bal <= _totalOwed) revert NothingToRecover();
        uint256 amount = bal - _totalOwed;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "MonadCoinFlip: recover");
        emit Recovered(to, amount);
    }

    function getSession(address player) external view returns (SessionView memory) {
        Session storage s = _sessions[player];
        return
            SessionView({
                active: s.active,
                mode: s.mode,
                stakeWei: s.stakeAmount,
                sessionBalanceWei: s.sessionBalance,
                tossCount: s.tossCount,
                clientSeed: s.clientSeed,
                winStreak: s.winStreak,
                lossStreak: s.lossStreak,
                headsCount: s.headsCount,
                tailsCount: s.tailsCount
            });
    }

    /// @notice Pure helper for off-chain verification: must use the same `prevrandao` and `block.number` as the toss tx block.
    function previewOutcome(
        uint256 prevrandaoWord,
        uint256 blockNumber_,
        address player,
        bytes32 clientSeed_,
        uint256 tossIndex
    ) external pure returns (uint256 rawWord, bool heads) {
        rawWord = uint256(
            keccak256(
                abi.encodePacked(prevrandaoWord, blockNumber_, player, clientSeed_, tossIndex)
            )
        );
        heads = (rawWord & 1) == 0;
    }

    function _riskParams(RiskMode m) internal pure returns (uint256 wn, uint256 wd, uint256 ln, uint256 ld) {
        if (m == RiskMode.SAFE) return (105, 100, 95, 100);
        if (m == RiskMode.NORMAL) return (11, 10, 9, 10);
        return (12, 10, 8, 10);
    }
}
