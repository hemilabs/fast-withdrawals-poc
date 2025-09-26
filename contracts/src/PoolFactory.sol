// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Pool, PoolConstructorParams} from "./Pool.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PoolFactory
 * @notice Factory contract for creating Pool instances for different ERC20 tokens
 * @dev Ensures only one pool per token and tracks all created pools
 */
contract PoolFactory is Ownable {
  /// @notice LayerZero endpoint for cross-chain messaging
  address public immutable endpoint;

  /// @notice Destination endpoint ID for outbound messages
  uint32 public immutable dstEid;

  /// @notice Send library address for outbound messages
  address public immutable sendLib;

  /// @notice Source endpoint ID for inbound messages
  uint32 public immutable srcEid;

  /// @notice Receive library address for inbound messages
  address public immutable receiveLib;

  /// @notice Mapping from token address to pool address
  mapping(address => address) public tokenPools;

  /// @notice Array of all created pool addresses
  address[] public allPools;

  // Events
  event PoolCreated(
    address indexed token,
    address indexed pool,
    address indexed creator,
    address treasury,
    uint16 feeBasisPoints,
    uint256 poolIndex
  );

  // Errors
  error PoolAlreadyExists();
  error InvalidEndpointAddress();
  error InvalidLibraryAddress();

  /// @notice Maximum fee in basis points (10000 = 100%)
  uint16 public constant MAX_FEE_BASIS_POINTS = 1000; // 10%

  /**
   * @notice Constructor to initialize the factory with LayerZero endpoint and library configurations
   * @param _endpoint The LayerZero endpoint address for cross-chain messaging
   * @param _dstEid Destination endpoint ID for outbound messages
   * @param _sendLib Send library address for outbound messages
   * @param _srcEid Source endpoint ID for inbound messages
   * @param _receiveLib Receive library address for inbound messages
   */
  constructor(
    address _endpoint,
    uint32 _dstEid,
    address _sendLib,
    uint32 _srcEid,
    address _receiveLib
  ) Ownable(msg.sender) {
    if (_endpoint == address(0)) {
      revert InvalidEndpointAddress();
    }
    if (_sendLib == address(0) || _receiveLib == address(0)) {
      revert InvalidLibraryAddress();
    }

    endpoint = _endpoint;
    dstEid = _dstEid;
    sendLib = _sendLib;
    srcEid = _srcEid;
    receiveLib = _receiveLib;
  }

  /**
   * @notice Create a new pool for a specific ERC20 token
   * @param token The ERC20 token address to create a pool for
   * @param treasury The treasury address that can withdraw fees
   * @param feeBasisPoints The fee in basis points (10000 = 100%)
   * @return poolAddress The address of the newly created pool
   */
  function createPool(
    address token,
    address treasury,
    uint16 feeBasisPoints
  ) external onlyOwner returns (address poolAddress) {
    if (tokenPools[token] != address(0)) {
      revert PoolAlreadyExists();
    }

    // Create PoolConstructorParams struct
    PoolConstructorParams memory params = PoolConstructorParams({
      token: token,
      lzEndpoint: endpoint,
      owner: msg.sender,
      treasury: treasury,
      feeBasisPoints: feeBasisPoints,
      dstEid: dstEid,
      sendLib: sendLib,
      srcEid: srcEid,
      receiveLib: receiveLib
    });

    Pool pool = new Pool(params);
    poolAddress = address(pool);

    // Store pool information
    tokenPools[token] = poolAddress;
    allPools.push(poolAddress);

    emit PoolCreated(
      token,
      poolAddress,
      msg.sender,
      treasury,
      feeBasisPoints,
      allPools.length - 1
    );

    return poolAddress;
  }

  /**
   * @notice Get the pool address for a specific token
   * @param token The token address
   * @return The pool address (address(0) if no pool exists)
   */
  function getPool(address token) external view returns (address) {
    return tokenPools[token];
  }

  /**
   * @notice Get the total number of pools created
   * @return The number of pools
   */
  function getPoolsCount() external view returns (uint256) {
    return allPools.length;
  }

  /**
   * @notice Get pool address by index
   * @param index The index in the allPools array
   * @return The pool address
   */
  function getPoolByIndex(uint256 index) external view returns (address) {
    require(index < allPools.length, "Index out of bounds");
    return allPools[index];
  }

  /**
   * @notice Get all pool addresses
   * @return Array of all pool addresses
   */
  function getAllPools() external view returns (address[] memory) {
    return allPools;
  }
}
