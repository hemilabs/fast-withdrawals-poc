// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PoolFactory} from "../src/PoolFactory.sol";
import {Pool} from "../src/Pool.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockLayerZeroEndpoint} from "./mocks/MockLayerZeroEndpoint.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract PoolFactoryTest is Test {
  using Strings for uint256;
  PoolFactory public factory;
  MockERC20 public token1;
  MockERC20 public token2;
  MockLayerZeroEndpoint public mockEndpoint;

  address public owner = makeAddr("owner");
  address public user1 = makeAddr("user1");
  address public treasury = makeAddr("treasury");
  uint16 public constant FEE_BASIS_POINTS = 100; // 1%

  // LayerZero parameters
  uint32 public constant DST_EID = 40161; // Example destination endpoint ID
  address public sendLib = makeAddr("sendLib");
  uint32 public constant SRC_EID = 40217; // Example source endpoint ID
  address public receiveLib = makeAddr("receiveLib");

  function setUp() public {
    // Deploy mock endpoint first
    mockEndpoint = new MockLayerZeroEndpoint();

    // Deploy factory with mock endpoint as owner
    vm.prank(owner);
    factory = new PoolFactory(
      address(mockEndpoint),
      DST_EID,
      sendLib,
      SRC_EID,
      receiveLib
    );

    // Deploy test tokens
    token1 = new MockERC20("Token1", "TK1", 1000000e18);
    token2 = new MockERC20("Token2", "TK2", 1000000e18);
  }

  function test_Constructor_RevertsIfEndpointIsZeroAddress() public {
    vm.expectRevert(PoolFactory.InvalidEndpointAddress.selector);
    new PoolFactory(address(0), DST_EID, sendLib, SRC_EID, receiveLib);
  }

  function test_Constructor_SetsEndpoint() public {
    MockLayerZeroEndpoint testEndpoint = new MockLayerZeroEndpoint();
    PoolFactory testFactory = new PoolFactory(
      address(testEndpoint),
      DST_EID,
      sendLib,
      SRC_EID,
      receiveLib
    );
    assertEq(address(testFactory.endpoint()), address(testEndpoint));
    assertEq(testFactory.dstEid(), DST_EID);
    assertEq(testFactory.sendLib(), sendLib);
    assertEq(testFactory.srcEid(), SRC_EID);
    assertEq(testFactory.receiveLib(), receiveLib);
  }

  function test_Constructor_RevertsIfSendLibIsZeroAddress() public {
    vm.expectRevert(PoolFactory.InvalidLibraryAddress.selector);
    new PoolFactory(
      address(mockEndpoint),
      DST_EID,
      address(0),
      SRC_EID,
      receiveLib
    );
  }

  function test_Constructor_RevertsIfReceiveLibIsZeroAddress() public {
    vm.expectRevert(PoolFactory.InvalidLibraryAddress.selector);
    new PoolFactory(
      address(mockEndpoint),
      DST_EID,
      sendLib,
      SRC_EID,
      address(0)
    );
  }

  function test_CreatePool_RevertsIfTokenIsZeroAddress() public {
    vm.prank(owner);
    vm.expectRevert(PoolFactory.InvalidTokenAddress.selector);
    factory.createPool(address(0), treasury, FEE_BASIS_POINTS);
  }

  function test_CreatePool_RevertsIfTreasuryIsZeroAddress() public {
    vm.prank(owner);
    vm.expectRevert(PoolFactory.InvalidTreasuryAddress.selector);
    factory.createPool(address(token1), address(0), FEE_BASIS_POINTS);
  }

  function test_CreatePool_RevertsIfFeeExceedsMaximum() public {
    vm.prank(owner);
    vm.expectRevert(PoolFactory.InvalidFee.selector);
    factory.createPool(address(token1), treasury, 1001); // Max is 1000
  }

  function test_CreatePool_RevertsIfNotOwner() public {
    vm.prank(user1);
    vm.expectRevert(
      abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user1)
    );
    factory.createPool(address(token1), treasury, FEE_BASIS_POINTS);
  }

  function test_CreatePool_RevertsIfPoolAlreadyExists() public {
    // Create first pool
    vm.prank(owner);
    factory.createPool(address(token1), treasury, FEE_BASIS_POINTS);

    // Try to create duplicate pool
    vm.prank(owner);
    vm.expectRevert(PoolFactory.PoolAlreadyExists.selector);
    factory.createPool(address(token1), treasury, FEE_BASIS_POINTS);
  }

  function test_CreatePool_Success() public {
    vm.prank(owner);

    // We need to expect the event before the call since we don't know the pool address yet
    // The pool address will be generated, so we use expectEmit with partial matching
    vm.expectEmit(true, false, true, true);
    emit PoolFactory.PoolCreated(
      address(token1),
      address(0),
      owner,
      treasury,
      FEE_BASIS_POINTS,
      0
    );

    // Create pool
    address poolAddress = factory.createPool(
      address(token1),
      treasury,
      FEE_BASIS_POINTS
    );

    // Verify pool was created
    assertNotEq(poolAddress, address(0));
    assertEq(factory.getPool(address(token1)), poolAddress);

    // Verify pool owner is correct
    Pool pool = Pool(poolAddress);
    assertEq(pool.owner(), owner);

    // Verify owner is automatically added to LP allowlist
    assertTrue(pool.isAllowedProvider(owner));
  }

  function test_CreatePool_CallsLibraryConfiguration() public {
    // Verify initial state - no library calls yet
    assertEq(mockEndpoint.getSendLibraryCallsCount(), 0);
    assertEq(mockEndpoint.getReceiveLibraryCallsCount(), 0);

    // Create pool - this should trigger the library configuration calls
    vm.prank(owner);
    address poolAddress = factory.createPool(
      address(token1),
      treasury,
      FEE_BASIS_POINTS
    );

    // Verify the library configuration calls were made
    assertEq(mockEndpoint.getSendLibraryCallsCount(), 1);
    assertEq(mockEndpoint.getReceiveLibraryCallsCount(), 1);

    // Verify setSendLibrary call details
    MockLayerZeroEndpoint.LibraryCall memory sendCall = mockEndpoint
      .getSendLibraryCall(0);
    assertEq(sendCall.oapp, poolAddress);
    assertEq(sendCall.eid, DST_EID);
    assertEq(sendCall.lib, sendLib);

    // Verify setReceiveLibrary call details
    MockLayerZeroEndpoint.LibraryCall memory receiveCall = mockEndpoint
      .getReceiveLibraryCall(0);
    assertEq(receiveCall.oapp, poolAddress);
    assertEq(receiveCall.eid, SRC_EID);
    assertEq(receiveCall.lib, receiveLib);
    assertEq(receiveCall.gracePeriod, 0);
  }

  function test_GetPoolsCount_WorksCorrectly(uint8 poolCount) public {
    // Bound the input to a reasonable range to avoid gas issues and ensure we have valid tokens
    poolCount = uint8(bound(poolCount, 0, 5));

    // Initially no pools
    assertEq(factory.getPoolsCount(), 0);

    // Create N pools with different mock token contracts
    MockERC20[] memory tokens = new MockERC20[](poolCount);
    for (uint256 i = 0; i < poolCount; i++) {
      // Deploy a unique mock token for each pool
      tokens[i] = new MockERC20(
        string(abi.encodePacked("Token", i.toString())),
        string(abi.encodePacked("TK", i.toString())),
        1000000e18
      );
      vm.prank(owner);
      factory.createPool(address(tokens[i]), treasury, FEE_BASIS_POINTS);
    }

    // Verify the pool count matches the expected number
    assertEq(factory.getPoolsCount(), poolCount);
  }

  function test_GetPool_ReturnsCorrectAddress() public {
    // Initially returns zero address
    assertEq(factory.getPool(address(token1)), address(0));

    // Create pool
    vm.prank(owner);
    address poolAddress = factory.createPool(
      address(token1),
      treasury,
      FEE_BASIS_POINTS
    );

    // Should return correct pool address
    assertEq(factory.getPool(address(token1)), poolAddress);
  }

  function test_GetPoolByIndex_WorksCorrectly() public {
    // Create pools
    vm.prank(owner);
    address pool1 = factory.createPool(
      address(token1),
      treasury,
      FEE_BASIS_POINTS
    );
    vm.prank(owner);
    address pool2 = factory.createPool(
      address(token2),
      treasury,
      FEE_BASIS_POINTS
    );

    // Check getPoolByIndex
    assertEq(factory.getPoolByIndex(0), pool1);
    assertEq(factory.getPoolByIndex(1), pool2);
  }

  function test_GetPoolByIndex_RevertsOnOutOfBounds() public {
    vm.expectRevert("Index out of bounds");
    factory.getPoolByIndex(0);

    // Create one pool
    vm.prank(owner);
    factory.createPool(address(token1), treasury, FEE_BASIS_POINTS);

    // Index 1 should revert
    vm.expectRevert("Index out of bounds");
    factory.getPoolByIndex(1);
  }

  function test_GetAllPools_WorksCorrectly() public {
    // Initially empty
    address[] memory pools = factory.getAllPools();
    assertEq(pools.length, 0);

    // Create pools
    vm.prank(owner);
    address pool1 = factory.createPool(
      address(token1),
      treasury,
      FEE_BASIS_POINTS
    );
    vm.prank(owner);
    address pool2 = factory.createPool(
      address(token2),
      treasury,
      FEE_BASIS_POINTS
    );

    // Check getAllPools
    pools = factory.getAllPools();
    assertEq(pools.length, 2);
    assertEq(pools[0], pool1);
    assertEq(pools[1], pool2);
  }
}
