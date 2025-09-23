// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Pool} from "../../src/Pool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TestablePool
 * @notice A Pool contract with additional functions for testing fee collection
 */
contract TestablePool is Pool {
  using SafeERC20 for IERC20;
  constructor(
    address _token,
    address _lzEndpoint,
    address _owner,
    address _treasury,
    uint16 _feeBasisPoints
  ) Pool(_token, _lzEndpoint, _owner, _treasury, _feeBasisPoints) {}

  /**
   * @notice Test helper function to simulate fee collection
   * @param amount The amount of fees to simulate collecting
   */
  function simulateCollectedFees(uint256 amount) external {
    // Transfer tokens to this contract to simulate fees
    innerToken.safeTransferFrom(msg.sender, address(this), amount);
    // Update collected fees
    collectedFees += amount;
    emit FeeCollected(amount);
  }

  /**
   * @notice Test helper to directly set collected fees (for edge case testing)
   * @param amount The amount to set as collected fees
   */
  function setCollectedFeesForTesting(uint256 amount) external {
    collectedFees = amount;
  }
}
