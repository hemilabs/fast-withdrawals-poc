// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Pool} from "../src/Pool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockLayerZeroEndpoint} from "./mocks/MockLayerZeroEndpoint.sol";
import {TestablePool} from "./mocks/TestablePool.sol";

contract PoolTest is Test {
  Pool public pool;
  MockERC20 public token;
  MockLayerZeroEndpoint public mockEndpoint;

  address public owner = makeAddr("owner");
  address public treasury = makeAddr("treasury");
  address public lp1 = makeAddr("lp1");
  address public lp2 = makeAddr("lp2");
  address public nonLP = makeAddr("nonLP");

  uint256 public constant INITIAL_SUPPLY = 1000000e18;
  uint16 public constant FEE_BASIS_POINTS = 100; // 1%

  function setUp() public {
    // Deploy test token
    token = new MockERC20("TestToken", "TEST", INITIAL_SUPPLY);

    // Deploy mock LayerZero endpoint
    mockEndpoint = new MockLayerZeroEndpoint();

    // Deploy pool with owner, treasury, fee, and mock endpoint
    vm.prank(owner);
    pool = new Pool(
      address(token),
      address(mockEndpoint),
      owner,
      treasury,
      FEE_BASIS_POINTS
    );

    // Mint tokens to test addresses
    token.mint(lp1, 10000e18);
    token.mint(lp2, 10000e18);
    token.mint(nonLP, 10000e18);

    // Approve pool to spend tokens
    vm.prank(lp1);
    token.approve(address(pool), type(uint256).max);

    vm.prank(lp2);
    token.approve(address(pool), type(uint256).max);

    vm.prank(nonLP);
    token.approve(address(pool), type(uint256).max);
  }

  function test_Constructor_Success() public {
    // Check token is set correctly
    assertEq(pool.token(), address(token));

    // Check owner is set correctly
    assertEq(pool.owner(), owner);

    // Check endpoint is set correctly
    assertEq(address(pool.endpoint()), address(mockEndpoint));

    // Check owner is automatically added to LP allowlist
    assertTrue(pool.isAllowedProvider(owner));

    // Check initial balances
    assertEq(pool.getPoolBalance(), 0);
  }

  function test_Constructor_RevertsOnZeroTokenAddress() public {
    vm.expectRevert();
    new Pool(
      address(0),
      address(mockEndpoint),
      owner,
      treasury,
      FEE_BASIS_POINTS
    );
  }

  function test_Constructor_RevertsOnZeroOwnerAddress() public {
    vm.expectRevert(); // OpenZeppelin v5 Ownable throws OwnableInvalidOwner
    new Pool(
      address(token),
      address(mockEndpoint),
      address(0),
      treasury,
      FEE_BASIS_POINTS
    );
  }

  function test_Constructor_RevertsOnZeroEndpointAddress() public {
    vm.expectRevert(); // OFTCore will revert when trying to call the zero address
    new Pool(address(token), address(0), owner, treasury, FEE_BASIS_POINTS);
  }

  function test_OnlyOwnerCanAddLPs() public {
    // Owner can add LP
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);
    assertTrue(pool.isAllowedProvider(lp1));

    // Non-owner cannot add LP
    vm.prank(lp1);
    vm.expectRevert();
    pool.addLiquidityProvider(lp2);
  }

  function test_AddLiquidityProvider_RevertsOnZeroAddress() public {
    vm.prank(owner);
    vm.expectRevert("Provider address cannot be zero");
    pool.addLiquidityProvider(address(0));
  }

  function test_OnlyOwnerCanRemoveLPs() public {
    // Add LP first
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);
    assertTrue(pool.isAllowedProvider(lp1));

    // Owner can remove LP
    vm.prank(owner);
    pool.removeLiquidityProvider(lp1);
    assertFalse(pool.isAllowedProvider(lp1));

    // Non-owner cannot remove LP
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    vm.prank(lp1);
    vm.expectRevert();
    pool.removeLiquidityProvider(lp1);
  }

  function test_AddLiquidityProvider_EmitsEvent() public {
    vm.prank(owner);
    vm.expectEmit(true, false, false, false);
    emit Pool.LiquidityProviderAdded(lp1);
    pool.addLiquidityProvider(lp1);
  }

  function test_RemoveLiquidityProvider_EmitsEvent() public {
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    vm.prank(owner);
    vm.expectEmit(true, false, false, false);
    emit Pool.LiquidityProviderRemoved(lp1);
    pool.removeLiquidityProvider(lp1);
  }

  function test_RemoveLiquidityProvider_RevertsIfProviderNotInAllowlist()
    public
  {
    // Try to remove a provider that was never added to the allowlist
    vm.prank(owner);
    vm.expectRevert(Pool.ProviderNotInAllowlist.selector);
    pool.removeLiquidityProvider(lp1);

    // Add and then remove provider successfully
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    vm.prank(owner);
    pool.removeLiquidityProvider(lp1);

    // Try to remove the same provider again (should revert)
    vm.prank(owner);
    vm.expectRevert(Pool.ProviderNotInAllowlist.selector);
    pool.removeLiquidityProvider(lp1);
  }

  function test_OnlyAllowedProvidersCanDeposit() public {
    // Add LP1 to allowlist
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    // LP1 can deposit
    vm.prank(lp1);
    pool.addLiquidity(1000e18);

    // Non-LP cannot deposit
    vm.prank(nonLP);
    vm.expectRevert(Pool.NotAllowedLiquidityProvider.selector);
    pool.addLiquidity(1000e18);
  }

  function test_AddLiquidity_RevertsOnZeroAmount() public {
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    vm.prank(lp1);
    vm.expectRevert(Pool.InvalidAmount.selector);
    pool.addLiquidity(0);
  }

  function test_RemoveLiquidity_RevertsOnZeroAmount() public {
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    vm.prank(lp1);
    vm.expectRevert(Pool.InvalidAmount.selector);
    pool.removeLiquidity(0);
  }

  function test_RemoveLiquidity_RevertsOnInsufficientAvailableLiquidity()
    public
  {
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    // Try to withdraw when no liquidity is available
    vm.prank(lp1);
    vm.expectRevert(Pool.InsufficientBalance.selector);
    pool.removeLiquidity(1000e18);
  }

  function test_TransferOwnership_AddsNewOwnerToAllowlist() public {
    // Transfer ownership
    vm.prank(owner);
    pool.transferOwnership(lp1);

    // Check new owner is in allowlist
    assertTrue(pool.isAllowedProvider(lp1));
    assertEq(pool.owner(), lp1);
  }

  // Fuzzing test for deposits
  function testFuzz_AddLiquidity_UpdatesBalancesCorrectly(
    uint256 amount
  ) public {
    // Bound amount to reasonable range
    amount = bound(amount, 1, 10000e18);

    // Add LP to allowlist
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    // Get initial balances
    uint256 initialLPBalance = token.balanceOf(lp1);
    uint256 initialPoolBalance = pool.getPoolBalance();

    // Add liquidity
    vm.prank(lp1);
    pool.addLiquidity(amount);

    // Check balances updated correctly
    assertEq(token.balanceOf(lp1), initialLPBalance - amount);
    assertEq(pool.getPoolBalance(), initialPoolBalance + amount);
  }

  // Fuzzing test for withdrawals
  function testFuzz_RemoveLiquidity_UpdatesBalancesCorrectly(
    uint256 depositAmount,
    uint256 withdrawAmount
  ) public {
    // Bound amounts to reasonable range
    depositAmount = bound(depositAmount, 1000, 10000e18);
    withdrawAmount = bound(withdrawAmount, 1, depositAmount);

    // Add LP to allowlist
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    // Add liquidity first
    vm.prank(lp1);
    pool.addLiquidity(depositAmount);

    // Get balances before withdrawal
    uint256 balanceBeforeWithdraw = token.balanceOf(lp1);
    uint256 poolBalanceBeforeWithdraw = pool.getPoolBalance();

    // Remove liquidity
    vm.prank(lp1);
    pool.removeLiquidity(withdrawAmount);

    // Check balances updated correctly
    assertEq(token.balanceOf(lp1), balanceBeforeWithdraw + withdrawAmount);
    assertEq(pool.getPoolBalance(), poolBalanceBeforeWithdraw - withdrawAmount);
  }

  function test_MultipleLPs_CanDepositAndWithdraw() public {
    // Add both LPs to allowlist
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    vm.prank(owner);
    pool.addLiquidityProvider(lp2);

    // LP1 deposits
    vm.prank(lp1);
    pool.addLiquidity(2000e18);

    // LP2 deposits
    vm.prank(lp2);
    pool.addLiquidity(3000e18);

    // Check pool balance
    assertEq(pool.getPoolBalance(), 5000e18);

    // LP1 withdraws partially
    vm.prank(lp1);
    pool.removeLiquidity(1000e18);

    // Check pool balance after LP1 withdrawal
    assertEq(pool.getPoolBalance(), 4000e18);

    // LP2 withdraws all
    vm.prank(lp2);
    pool.removeLiquidity(3000e18);

    // Check final pool balance
    assertEq(pool.getPoolBalance(), 1000e18);
  }

  function test_RemoveLiquidity_CanWithdrawAvailableLiquidity() public {
    // Add LP to allowlist
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    // Add liquidity
    vm.prank(lp1);
    pool.addLiquidity(1000e18);

    // Manually send tokens to pool to simulate cross-chain token arrival
    token.transfer(address(pool), 500e18);

    // LP can now withdraw from available liquidity (including extra tokens)
    // They can withdraw up to 1500e18 (1000 deposited + 500 extra)
    vm.prank(lp1);
    pool.removeLiquidity(1500e18);

    // Pool balance should be 0 now (all withdrawn)
    assertEq(pool.getPoolBalance(), 0);
  }

  function test_AddLiquidity_EmitsEvent() public {
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    vm.prank(lp1);
    vm.expectEmit(true, false, false, true);
    emit Pool.LiquidityAdded(lp1, 1000e18);
    pool.addLiquidity(1000e18);
  }

  function test_RemoveLiquidity_EmitsEvent() public {
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    vm.prank(lp1);
    pool.addLiquidity(1000e18);

    vm.prank(lp1);
    vm.expectEmit(true, false, false, true);
    emit Pool.LiquidityRemoved(lp1, 500e18);
    pool.removeLiquidity(500e18);
  }

  // =============================================================================
  // setFee Tests
  // =============================================================================

  function test_SetFee_OnlyOwnerCanCall() public {
    // Non-owner cannot set fee
    vm.prank(lp1);
    vm.expectRevert();
    pool.setFee(300);
  }

  function test_SetFee_RevertsOnInvalidFee() public {
    vm.prank(owner);
    vm.expectRevert(Pool.InvalidFee.selector);
    pool.setFee(1001); // Above MAX_FEE_BASIS_POINTS (1000)
  }

  function test_SetFee_Success() public {
    uint16 oldFee = pool.feeBasisPoints();
    uint16 newFee = 250; // 2.5%

    vm.prank(owner);
    vm.expectEmit(false, false, false, true);
    emit Pool.FeeUpdated(oldFee, newFee);
    pool.setFee(newFee);

    assertEq(pool.feeBasisPoints(), newFee);
  }

  function test_SetFee_AllowsMaxFee() public {
    vm.prank(owner);
    pool.setFee(1000); // MAX_FEE_BASIS_POINTS

    assertEq(pool.feeBasisPoints(), 1000);
  }

  function test_SetFee_AllowsZeroFee() public {
    vm.prank(owner);
    pool.setFee(0);

    assertEq(pool.feeBasisPoints(), 0);
  }

  // =============================================================================
  // setTreasury Tests
  // =============================================================================

  function test_SetTreasury_OnlyOwnerCanCall() public {
    address newTreasury = makeAddr("newTreasury");

    // Owner can set treasury
    vm.prank(owner);
    pool.setTreasury(newTreasury);

    assertEq(pool.treasury(), newTreasury);

    // Non-owner cannot set treasury
    vm.prank(lp1);
    vm.expectRevert();
    pool.setTreasury(treasury);
  }

  function test_SetTreasury_RevertsOnZeroAddress() public {
    vm.prank(owner);
    vm.expectRevert(Pool.InvalidTreasuryAddress.selector);
    pool.setTreasury(address(0));
  }

  function test_SetTreasury_Success() public {
    address oldTreasury = pool.treasury();
    address newTreasury = makeAddr("newTreasury");

    vm.prank(owner);
    vm.expectEmit(true, true, false, false);
    emit Pool.TreasuryUpdated(oldTreasury, newTreasury);
    pool.setTreasury(newTreasury);

    assertEq(pool.treasury(), newTreasury);
  }

  function test_SetTreasury_RevertsOnSameTreasuryAddress() public {
    address currentTreasury = pool.treasury();

    vm.prank(owner);
    vm.expectRevert(Pool.SameTreasuryAddress.selector);
    pool.setTreasury(currentTreasury);
  }

  // =============================================================================
  // withdrawFees Tests
  // =============================================================================

  function test_WithdrawFees_RevertsOnZeroAmount() public {
    vm.prank(treasury);
    vm.expectRevert(Pool.InvalidAmount.selector);
    pool.withdrawFees(0);
  }

  function test_WithdrawFees_RevertsOnInsufficientFees() public {
    // Try to withdraw more than collected (collectedFees starts at 0)
    vm.prank(treasury);
    vm.expectRevert(Pool.InsufficientCollectedFees.selector);
    pool.withdrawFees(1e18);
  }

  function test_WithdrawFees_AccessControl() public {
    // Test that non-treasury addresses cannot call withdrawFees
    vm.prank(owner);
    vm.expectRevert(Pool.OnlyTreasury.selector);
    pool.withdrawFees(1);

    vm.prank(lp1);
    vm.expectRevert(Pool.OnlyTreasury.selector);
    pool.withdrawFees(1);
  }

  // Additional withdrawFees tests using TestablePool for full functionality testing
  function test_WithdrawFees_FullFunctionality() public {
    // Deploy a TestablePool for testing fee collection and withdrawal
    TestablePool testPool = new TestablePool(
      address(token),
      address(mockEndpoint),
      owner,
      treasury,
      FEE_BASIS_POINTS
    );

    // Give tokens to lp1 and approve the test pool
    vm.startPrank(lp1);
    token.approve(address(testPool), type(uint256).max);

    // Simulate collecting fees (this transfers tokens to pool and updates collectedFees)
    testPool.simulateCollectedFees(100e18);
    vm.stopPrank();

    assertEq(testPool.collectedFees(), 100e18);

    uint256 treasuryBalanceBefore = token.balanceOf(treasury);
    uint256 withdrawAmount = 60e18;

    // Treasury can withdraw fees
    vm.prank(treasury);
    vm.expectEmit(true, false, false, true);
    emit Pool.FeesWithdrawn(treasury, withdrawAmount);
    testPool.withdrawFees(withdrawAmount);

    // Check balances updated correctly
    assertEq(token.balanceOf(treasury), treasuryBalanceBefore + withdrawAmount);
    assertEq(testPool.collectedFees(), 100e18 - withdrawAmount);
  }

  function test_WithdrawFees_CanWithdrawAllFees() public {
    // Deploy a TestablePool for testing
    TestablePool testPool = new TestablePool(
      address(token),
      address(mockEndpoint),
      owner,
      treasury,
      FEE_BASIS_POINTS
    );

    // Simulate collected fees
    uint256 collectedAmount = 100e18;
    vm.startPrank(lp1);
    token.approve(address(testPool), type(uint256).max);
    testPool.simulateCollectedFees(collectedAmount);
    vm.stopPrank();

    uint256 treasuryBalanceBefore = token.balanceOf(treasury);

    vm.prank(treasury);
    testPool.withdrawFees(collectedAmount);

    // Check all fees withdrawn
    assertEq(
      token.balanceOf(treasury),
      treasuryBalanceBefore + collectedAmount
    );
    assertEq(testPool.collectedFees(), 0);
  }

  function test_WithdrawFees_MultipleWithdrawals() public {
    // Deploy a TestablePool for testing
    TestablePool testPool = new TestablePool(
      address(token),
      address(mockEndpoint),
      owner,
      treasury,
      FEE_BASIS_POINTS
    );

    // Simulate collected fees
    uint256 collectedAmount = 100e18;
    vm.startPrank(lp1);
    token.approve(address(testPool), type(uint256).max);
    testPool.simulateCollectedFees(collectedAmount);
    vm.stopPrank();

    uint256 treasuryBalanceBefore = token.balanceOf(treasury);

    // First withdrawal
    vm.prank(treasury);
    testPool.withdrawFees(30e18);

    assertEq(token.balanceOf(treasury), treasuryBalanceBefore + 30e18);
    assertEq(testPool.collectedFees(), 70e18);

    // Second withdrawal
    vm.prank(treasury);
    testPool.withdrawFees(40e18);

    assertEq(token.balanceOf(treasury), treasuryBalanceBefore + 70e18);
    assertEq(testPool.collectedFees(), 30e18);

    // Final withdrawal
    vm.prank(treasury);
    testPool.withdrawFees(30e18);

    assertEq(token.balanceOf(treasury), treasuryBalanceBefore + 100e18);
    assertEq(testPool.collectedFees(), 0);
  }

  function test_RemoveLiquidity_CanWithdrawMoreThanDeposited() public {
    // Add LP to allowlist
    vm.prank(owner);
    pool.addLiquidityProvider(lp1);

    // LP deposits 1000 tokens
    vm.prank(lp1);
    pool.addLiquidity(1000e18);

    // Simulate cross-chain tokens arriving (e.g., from LayerZero transfers)
    token.transfer(address(pool), 2000e18);

    // LP can now withdraw more than they deposited (up to available liquidity)
    vm.prank(lp1);
    pool.removeLiquidity(2500e18); // More than their 1000 deposit

    // Pool still has some tokens left
    assertEq(pool.getPoolBalance(), 500e18);
  }

  function test_RemoveLiquidity_CannotWithdrawCollectedFees() public {
    // Deploy a TestablePool to simulate collected fees
    TestablePool testPool = new TestablePool(
      address(token),
      address(mockEndpoint),
      owner,
      treasury,
      FEE_BASIS_POINTS
    );

    // Add LP to allowlist
    vm.prank(owner);
    testPool.addLiquidityProvider(lp1);

    vm.startPrank(lp1);
    token.approve(address(testPool), type(uint256).max);

    // LP deposits liquidity
    testPool.addLiquidity(1000e18);

    // Simulate collected fees
    testPool.simulateCollectedFees(100e18);
    vm.stopPrank();

    // Pool has 1100 tokens total, but 100 are collected fees
    assertEq(testPool.getPoolBalance(), 1100e18);
    assertEq(testPool.collectedFees(), 100e18);

    // LP can only withdraw available liquidity (total - fees = 1000)
    vm.prank(lp1);
    testPool.removeLiquidity(1000e18);

    // Pool balance should be exactly the collected fees
    assertEq(testPool.getPoolBalance(), 100e18);
    assertEq(testPool.collectedFees(), 100e18);

    // LP cannot withdraw more (would try to touch collected fees)
    vm.prank(lp1);
    vm.expectRevert(Pool.InsufficientBalance.selector);
    testPool.removeLiquidity(1e18);
  }
}
