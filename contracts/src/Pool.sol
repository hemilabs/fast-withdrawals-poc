// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {OFTAdapter} from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import {ILayerZeroEndpointV2} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice Struct to hold constructor parameters for Pool
 */
struct PoolConstructorParams {
  address token;
  address lzEndpoint;
  address owner;
  address treasury;
  uint16 feeBasisPoints;
  uint32 dstEid;
  address sendLib;
  uint32 srcEid;
  address receiveLib;
}

/**
 * @title Pool
 * @notice A liquidity pool for a specific ERC20 token that manages deposits and withdrawals
 * @dev Uses OpenZeppelin's Ownable for access control and ReentrancyGuard for security
 */
contract Pool is OFTAdapter, ReentrancyGuard {
  using SafeERC20 for IERC20;

  /// @notice Maximum fee in basis points (10000 = 100%)
  uint16 public constant MAX_FEE_BASIS_POINTS = 1000; // 10%

  /// @notice Fee in basis points (10000 = 100%)
  uint16 public feeBasisPoints;

  /// @notice Total fees collected
  uint256 public collectedFees;

  /// @notice Treasury address that can withdraw fees
  address public treasury;

  /// @notice Mapping of addresses allowed to provide liquidity
  mapping(address => bool) public liquidityAllowList;

  // Events
  event LiquidityProviderAdded(address indexed provider);
  event LiquidityProviderRemoved(address indexed provider);
  event LiquidityAdded(address indexed provider, uint256 amount);
  event LiquidityRemoved(address indexed provider, uint256 amount);
  event FeeUpdated(uint256 oldFee, uint256 newFee);
  event TreasuryUpdated(
    address indexed oldTreasury,
    address indexed newTreasury
  );
  event FeesWithdrawn(address indexed treasury, uint256 amount);
  event FeeCollected(uint256 amount);

  // Errors
  error NotAllowedLiquidityProvider();
  error InsufficientBalance();
  error InvalidAmount();
  error TransferFailed();
  error ProviderNotInAllowlist();
  error InvalidEndpointAddress();
  error InvalidFee();
  error InvalidTreasuryAddress();
  error SameTreasuryAddress();
  error OnlyTreasury();
  error InsufficientCollectedFees();

  /**
   * @notice Constructor to initialize the pool with a struct to avoid stack too deep
   * @param params PoolConstructorParams struct
   */
  constructor(
    PoolConstructorParams memory params
  )
    OFTAdapter(params.token, params.lzEndpoint, params.owner)
    Ownable(params.owner)
  {
    require(params.token != address(0), "Token address cannot be zero");
    require(params.owner != address(0), "Owner address cannot be zero");
    if (params.lzEndpoint == address(0)) {
      revert InvalidEndpointAddress();
    }
    if (params.treasury == address(0)) {
      revert InvalidTreasuryAddress();
    }
    if (params.feeBasisPoints > MAX_FEE_BASIS_POINTS) {
      revert InvalidFee();
    }

    treasury = params.treasury;
    feeBasisPoints = params.feeBasisPoints;
    collectedFees = 0;

    // Automatically add the owner to the liquidity allow list
    liquidityAllowList[params.owner] = true;
    emit LiquidityProviderAdded(params.owner);

    // Configure LayerZero libraries during initialization
    _configureLayerZeroLibraries(
      params.dstEid,
      params.sendLib,
      params.srcEid,
      params.receiveLib
    );
  }

  /**
   * @notice Modifier to check if the caller is the treasury
   */
  modifier onlyTreasury() {
    if (msg.sender != treasury) {
      revert OnlyTreasury();
    }
    _;
  }

  /**
   * @notice Modifier to check if the caller is in the liquidity allow list
   */
  modifier onlyAllowedProvider() {
    if (!liquidityAllowList[msg.sender]) {
      revert NotAllowedLiquidityProvider();
    }
    _;
  }

  /**
   * @notice Override _debit function to apply fees during token transfer
   * @param _from The address to debit tokens from
   * @param _amountLD The amount to send in local decimals
   * @param _minAmountLD The minimum amount to send in local decimals
   * @param _dstEid The destination chain ID
   * @return amountSentLD The amount sent in local decimals (what user actually pays)
   * @return amountReceivedLD The amount received in local decimals on remote (after fee deduction)
   */
  function _debit(
    address _from,
    uint256 _amountLD,
    uint256 _minAmountLD,
    uint32 _dstEid
  ) internal override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
    // First call the parent implementation to handle slippage and validation
    // as well as transferring the amount
    (uint256 parentAmountSentLD, uint256 parentAmountReceivedLD) = super._debit(
      _from,
      _amountLD,
      _minAmountLD,
      _dstEid
    );

    // Calculate fee from the amount the user is sending
    uint256 feeAmount = (_amountLD * feeBasisPoints) / 10000;

    // Collect fees if any
    if (feeAmount > 0) {
      collectedFees += feeAmount;
      emit FeeCollected(feeAmount);
    }

    // Return values:
    // - amountSentLD: What the user actually paid (unchanged from parent)
    // - amountReceivedLD: What will be received on remote chain (reduced by fee)
    amountSentLD = parentAmountSentLD;
    amountReceivedLD = parentAmountReceivedLD - feeAmount;

    // Ensure the amount after fee still meets minimum requirements
    if (amountReceivedLD < _minAmountLD) {
      revert SlippageExceeded(amountReceivedLD, _minAmountLD);
    }
  }

  /**
   * @notice Set the fee in basis points
   * @param _feeBasisPoints The new fee in basis points
   */
  function setFee(uint16 _feeBasisPoints) external onlyOwner {
    if (_feeBasisPoints > MAX_FEE_BASIS_POINTS) {
      revert InvalidFee();
    }

    uint16 oldFee = feeBasisPoints;
    feeBasisPoints = _feeBasisPoints;
    emit FeeUpdated(oldFee, _feeBasisPoints);
  }

  /**
   * @notice Set the treasury address
   * @param _treasury The new treasury address
   */
  function setTreasury(address _treasury) external onlyOwner {
    if (_treasury == address(0)) {
      revert InvalidTreasuryAddress();
    }
    if (_treasury == treasury) {
      revert SameTreasuryAddress();
    }

    address oldTreasury = treasury;
    treasury = _treasury;
    emit TreasuryUpdated(oldTreasury, _treasury);
  }

  /**
   * @notice Withdraw collected fees to treasury
   * @param amount The amount to withdraw
   */
  function withdrawFees(uint256 amount) external onlyTreasury nonReentrant {
    if (amount == 0) {
      revert InvalidAmount();
    }
    if (amount > collectedFees) {
      revert InsufficientCollectedFees();
    }

    collectedFees -= amount;
    innerToken.safeTransfer(treasury, amount);

    emit FeesWithdrawn(treasury, amount);
  }

  /**
   * @notice Add an address to the liquidity allow list
   * @param provider The address to add to the allow list
   */
  function addLiquidityProvider(address provider) external onlyOwner {
    require(provider != address(0), "Provider address cannot be zero");
    liquidityAllowList[provider] = true;
    emit LiquidityProviderAdded(provider);
  }

  /**
   * @notice Remove an address from the liquidity allow list
   * @param provider The address to remove from the allow list
   */
  function removeLiquidityProvider(address provider) external onlyOwner {
    if (!liquidityAllowList[provider]) {
      revert ProviderNotInAllowlist();
    }
    liquidityAllowList[provider] = false;
    emit LiquidityProviderRemoved(provider);
  }

  /**
   * @notice Transfer ownership and automatically add new owner to liquidity allow list
   * @param newOwner The address to transfer ownership to
   */
  function transferOwnership(address newOwner) public override onlyOwner {
    require(newOwner != address(0), "New owner cannot be zero address");

    // Add new owner to liquidity allow list
    liquidityAllowList[newOwner] = true;
    emit LiquidityProviderAdded(newOwner);

    // Transfer ownership
    super.transferOwnership(newOwner);
  }

  /**
   * @notice Add liquidity to the pool
   * @param amount The amount of tokens to deposit
   */
  function addLiquidity(
    uint256 amount
  ) external onlyAllowedProvider nonReentrant {
    if (amount == 0) {
      revert InvalidAmount();
    }

    // Transfer tokens from user to pool
    innerToken.safeTransferFrom(msg.sender, address(this), amount);

    emit LiquidityAdded(msg.sender, amount);
  }

  /**
   * @notice Remove liquidity from the pool
   * @param amount The amount of tokens to withdraw
   * @dev LPs are trusted parties and can withdraw from the full available liquidity pool.
   *      Available liquidity = total token balance - collected fees.
   *      This allows LPs to withdraw tokens that arrived from cross-chain transfers,
   *      enabling flexible liquidity management for the fast withdrawal system.
   */
  function removeLiquidity(
    uint256 amount
  ) external onlyAllowedProvider nonReentrant {
    if (amount == 0) {
      revert InvalidAmount();
    }

    // Calculate available liquidity (total balance minus collected fees)
    uint256 availableLiquidity = innerToken.balanceOf(address(this)) -
      collectedFees;

    if (amount > availableLiquidity) {
      revert InsufficientBalance();
    }

    // Transfer tokens from pool to user
    innerToken.safeTransfer(msg.sender, amount);

    emit LiquidityRemoved(msg.sender, amount);
  }

  /**
   * @notice Get the total balance of tokens in the pool
   * @return The total token balance
   */
  function getPoolBalance() external view returns (uint256) {
    return innerToken.balanceOf(address(this));
  }

  /**
   * @notice Returns the available liquidity in the pool (total balance minus collected fees)
   * @return The available liquidity
   */
  function getLiquidityAvailable() external view returns (uint256) {
    return this.getPoolBalance() - collectedFees;
  }

  /**
   * @notice Check if an address is in the liquidity allow list
   * @param provider The address to check
   * @return True if the address is allowed, false otherwise
   */
  function isAllowedProvider(address provider) external view returns (bool) {
    return liquidityAllowList[provider];
  }

  /**
   * @notice Configure LayerZero libraries for this pool
   * @dev Internal function called during construction to set up LayerZero libraries
   * @param _dstEid Destination endpoint ID for outbound messages
   * @param _sendLib Send library address for outbound messages
   * @param _srcEid Source endpoint ID for inbound messages
   * @param _receiveLib Receive library address for inbound messages
   */
  function _configureLayerZeroLibraries(
    uint32 _dstEid,
    address _sendLib,
    uint32 _srcEid,
    address _receiveLib
  ) internal {
    // Get the LayerZero endpoint from the parent OFTAdapter
    address endpointAddress = address(endpoint);

    // Configure send library
    if (_sendLib != address(0)) {
      ILayerZeroEndpointV2(endpointAddress).setSendLibrary(
        address(this),
        _dstEid,
        _sendLib
      );
    }

    // Configure receive library
    if (_receiveLib != address(0)) {
      ILayerZeroEndpointV2(endpointAddress).setReceiveLibrary(
        address(this),
        _srcEid,
        _receiveLib,
        0
      );
    }
  }
}
