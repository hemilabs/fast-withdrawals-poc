// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SetConfigParam} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLibManager.sol";

/**
 * @title MockLayerZeroEndpoint
 * @notice A minimal mock LayerZero endpoint for testing purposes
 */
contract MockLayerZeroEndpoint {
  mapping(address => mapping(uint32 => bytes32)) public peers;

  // Track library configuration calls
  struct LibraryCall {
    address oapp;
    uint32 eid;
    address lib;
    uint256 gracePeriod; // Only used for receive library
  }

  LibraryCall[] public sendLibraryCalls;
  LibraryCall[] public receiveLibraryCalls;

  // Minimal implementation just to satisfy contract deployment
  function nativeToken() external pure returns (address) {
    return address(0);
  }

  function eid() external pure returns (uint32) {
    return 1;
  }

  // Add any other minimal functions that OFTAdapter might call during construction
  function setDelegate(address _delegate) external {
    // Empty implementation for testing
  }

  function setPeer(uint32 _eid, bytes32 _peer) external {
    peers[msg.sender][_eid] = _peer;
  }

  function setConfig(
    address _oapp,
    address _sendLib,
    SetConfigParam[] calldata _configParams
  ) external {
    // Empty implementation for testing
  }

  function send(
    uint32 /*_dstEid*/,
    bytes calldata /*_message*/,
    bytes calldata /*_options*/,
    address /*_refundAddress*/
  ) external payable returns (bytes32, uint64) {
    // Mock implementation
    return (bytes32(0), 0);
  }

  function quote(
    uint32 /*_dstEid*/,
    bytes calldata /*_message*/,
    bytes calldata /*_options*/,
    bool /*_payInLzToken*/
  ) external pure returns (uint256, uint256) {
    // Mock implementation
    return (0, 0);
  }

  function setSendLibrary(
    address _oapp,
    uint32 _eid,
    address _newLib
  ) external {
    sendLibraryCalls.push(
      LibraryCall({oapp: _oapp, eid: _eid, lib: _newLib, gracePeriod: 0})
    );
  }

  function setReceiveLibrary(
    address _oapp,
    uint32 _eid,
    address _newLib,
    uint256 _gracePeriod
  ) external {
    receiveLibraryCalls.push(
      LibraryCall({
        oapp: _oapp,
        eid: _eid,
        lib: _newLib,
        gracePeriod: _gracePeriod
      })
    );
  }

  // Getter functions for testing
  function getSendLibraryCallsCount() external view returns (uint256) {
    return sendLibraryCalls.length;
  }

  function getReceiveLibraryCallsCount() external view returns (uint256) {
    return receiveLibraryCalls.length;
  }

  function getSendLibraryCall(
    uint256 index
  ) external view returns (LibraryCall memory) {
    return sendLibraryCalls[index];
  }

  function getReceiveLibraryCall(
    uint256 index
  ) external view returns (LibraryCall memory) {
    return receiveLibraryCalls[index];
  }
}
