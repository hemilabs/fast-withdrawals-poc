// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {
  PoolFactory,
  PoolFactoryConstructorParams
} from "../src/PoolFactory.sol";
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
  address public receiveLib = makeAddr("receiveLib");
  address[] public dvnAddresses = [
    makeAddr("dvn1"),
    makeAddr("dvn2"),
    makeAddr("dvn3")
  ];
  address public executorAddress = makeAddr("exec");

  PoolFactoryConstructorParams public poolFactoryParams;

  function setUp() public {
    // Deploy mock endpoint first
    mockEndpoint = new MockLayerZeroEndpoint();

    poolFactoryParams = PoolFactoryConstructorParams({
      dstEid: DST_EID,
      endpoint: address(mockEndpoint),
      sendLib: sendLib,
      receiveLib: receiveLib,
      dvnAddresses: dvnAddresses,
      executorAddress: executorAddress
    });

    // Deploy factory with mock endpoint as owner
    vm.prank(owner);
    factory = new PoolFactory(poolFactoryParams);

    // Deploy test tokens
    token1 = new MockERC20("Token1", "TK1", 1000000e18);
    token2 = new MockERC20("Token2", "TK2", 1000000e18);
  }

  function test_Constructor_RevertsIfEndpointIsZeroAddress() public {
    vm.expectRevert(PoolFactory.InvalidEndpointAddress.selector);
    new PoolFactory(
      PoolFactoryConstructorParams({
        dstEid: DST_EID,
        endpoint: address(0),
        sendLib: sendLib,
        receiveLib: receiveLib,
        dvnAddresses: dvnAddresses,
        executorAddress: executorAddress
      })
    );
  }

  function test_Constructor_SetsEndpoint() public {
    MockLayerZeroEndpoint testEndpoint = new MockLayerZeroEndpoint();
    PoolFactoryConstructorParams memory params = PoolFactoryConstructorParams({
      dstEid: DST_EID,
      endpoint: address(testEndpoint),
      sendLib: sendLib,
      receiveLib: receiveLib,
      dvnAddresses: dvnAddresses,
      executorAddress: executorAddress
    });
    PoolFactory testFactory = new PoolFactory(params);
    assertEq(address(testFactory.endpoint()), address(testEndpoint));
    assertEq(testFactory.dstEid(), DST_EID);
  }

  function test_Constructor_RevertsIfSendLibIsZeroAddress() public {
    vm.expectRevert(PoolFactory.InvalidLibraryAddress.selector);
    new PoolFactory(
      PoolFactoryConstructorParams({
        dstEid: DST_EID,
        endpoint: address(mockEndpoint),
        sendLib: address(0),
        receiveLib: receiveLib,
        dvnAddresses: dvnAddresses,
        executorAddress: executorAddress
      })
    );
  }

  function test_Constructor_RevertsIfReceiveLibIsZeroAddress() public {
    vm.expectRevert(PoolFactory.InvalidLibraryAddress.selector);
    new PoolFactory(
      PoolFactoryConstructorParams({
        dstEid: DST_EID,
        endpoint: address(mockEndpoint),
        sendLib: sendLib,
        receiveLib: address(0),
        dvnAddresses: dvnAddresses,
        executorAddress: executorAddress
      })
    );
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
}
