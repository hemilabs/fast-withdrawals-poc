# RFC: Fast Bridge Network (Specification)

## Summary

Create a network of chains using OFT tokens and storing liquidity when OFT tokens can't be used, to enable seamless transfers of the $HEMI token (And for that matter, any other token) between all chains that are part of the network.

## Abstract

The $HEMI token currently lives in 3 chains: Ethereum, Hemi and BNB. The canonical token lives in Ethereum, while others are bridged/tunneled versions. Transferring from Hemi to Ethereum is slow because it relies on the OP bridge, which requires a 3-step process to bridge: A withdrawal (on Hemi), a Proving step and a Claiming Step (on Ethereum). There are waiting times between these 3 transactions, and the flow may take up to 24 hours, besides consisting of 3 transactions in 2 chains.

This is how $HEMI token is implemented in each chain:

- on Ethereum, as a base ERC20
- On BNB, as an OFT token (following LayerZero protocol)
- on Hemi, as an ERC20 that's aware of the Ethereum version through the OP Bridge. There's also an OFTAdapter that allows to interoperate with BNB's version on Hemi.

The following transfers are currently working and enabled

- Ethereum -> Hemi, using the OP bridge. This works fast, and does not require liquidity.
- Hemi -> Ethereum, using the OP bridge. This is slow (it takes 24 hours minimum) and 3 transactions.
- Hemi <-> BNB using LayerZero infrastructure. This one is very fast (3 or 4 minutes), although it charges a fee in native tokens.

Currently, there's no way to transfer $HEMI tokens between Ethereum and BNB. Users must manually transfer from BNB to Hemi, and then, in a separated step, transfer from Hemi to Ethereum.
Transfers between Hemi and BNB are seamless and take up only up to 4 or 5 minutes because they use the OFT protocol from Layer Zero (Due to $HEMI being an OFT token in BNB).

With the current state, adding a new chain (say Base or OP) using OFT would only allow transfers from/to BNB and Hemi. This makes expanding the network trickier if not all paths are enabled between chains. This causes friction to users - they can't transfer to Ethereum without going through Hemi first, and for new OFT tokens, they all should go through Hemi first. And then, from Hemi to Ethereum, transfers are slow. For a better flow of $HEMI, transfers from/to all chains should be enabled and be fast.

The solution this RFC proposes consists of expanding the usage of LZ to allow transfers between any desired path of chains and to attract Liquidity Providers (LP) to provide liquidity upfront when OFT can't be used. Particularly, as both Hemi and Ethereum do not use the OFT protocol, we propose to store liquidity upfront in both of these chains, that will allow transfers from other chains to unlock tokens for these users. The remote chains that can transfer to Ethereum and Hemi need to be aware of the liquidity available.
In order to keep track of this on chain, an implementation based on the Delta Algorithm (Based on delta transfers or snapshots) shall be used. This way, transfers to Ethereum or Hemi on the source chain are only accepted if the chains is certain there's enough liquidity in the target destination.

This document attempts to provide a solution for then $HEMI token, while making it generic enough that would work for other tokens of our choice.

## Design

Whenever possible, it should be preferred to deploy the token as an OFT in any chain in which is still not available. For those cases where the token already exists, the opportunity arise for LP to provide liquidity in the destination chain.
This liquidity balance will be split (using, in the initial implementation, static weights), so each allocation works as a credit system that caps the transfer that can be accepted from a given chain. This balance will be mirrored on the other chains, so the source chain will be able to reject transfers whose amount is larger than the allocated split in the destination chain.
The chains will keep these balances by sharing snapshots (or delta variations) of the balances by piggybacking on messages sent when doing a transfer. This way, the liquidity balance can be updated and replicated in both chains without extra off-chain mechanisms.

For the cases where the destination of a transfer is an OFT token, there's no limit in the amount that can be transferred; as long as the tokens are provided and locked in the source chain (if it is an ERC20) or burned (if it is an OFT), meaning the user owns those tokens, the destination OFT will just mint them.

We could explore the possibility of charging a fee for these transfers, although in general, they are 1:1.

In this initial design, it's assumed the liquidity is available, but a fee mechanism shall be implemented to attract liquidity - as well as some initial liquidity that needs to be provided for bootstrapping.

## Contract Architecture

Based on the token type (ERC20 or OFT), the contract chain shall use a different contract implementation:

### For ERC20 tokens

This applies to $HEMI on Ethereum, and Hemi chain.

These contracts should track their own liquidity available ($HEMI tokens locked), as well as how much of these are allocated to each destination chain. When a transfer is executed to a chain, the allocated part is decremented. If the allocation does not cover the transfer, the operation is rejected. This Pool will lock for outbound transfers, and unlock for inbound transfers. Additionally, they should track remote balances for chains they can transfer to if these target chains require liquidity. That means Ethereum should persist a copy of the Hemi Balance, and Hemi should persist a copy of the Ethereum balance.
We can call this contract Pool, if we assume it will pool liquidity from users.

### For OFT Tokens

This applies to $HEMI on BNB and other chains.

The OFT token does not need liquidity. However, the chain will need to track the liquidity available in destination chains where the token is not an OFT and there is liquidity (Ethereum and Hemi). Based on this copy, they can allow or reject outbound transfers to these chains. When the destination is an OFT chain, all transfers are allowed, as long as the user burns the amount of tokens he expects to send. When the source is an OFT but the destination is not, the same rules apply, in which the transfer is allowed as long as the remote destination has enough liquidity.

Note that currently, $HEMI from BNB can be transferred only to Hemi, and the system works without tracking liquidity because all the minted $HEMI on BNB comes from locked $HEMI on Hemi. These locked tokens can only be unlocked by incoming transfers from BNB. As more chains (and paths) are added, liquidity will need to be tracked.

In the particular case of BNB, where the OFT token already exists, the Pool should be implemented separated from the OFT. Using LZ composer, we should be able to send messages to this Pool when a transfer is sent to BNB from other chain - allowing to track liquidity.

## Liquidity and Credit Model

### Credit Vector

Each pool (canonical or non-canonical) maintains a credit vector allocating available liquidity from ERC20 chains.
These values define how much each source can consume when sending tokens toward that pool.

Example: Let's assume Ethereum Pool holds 100 $HEMI tokens (its assets). For enabling the Path Hemi -> Ethereum and BNB -> Ethereum, we can consider that the following distribution

```
Assets = 100 $HEMI
Weight(Hemi) = 0,6
Weight(BNB) = 0,4
# Calculated as Credit(X) = Tokens(X) * Weight(X)
Credit(Hemi) = 60
Credit(BNB) = 40
```

(A reserve could also be considered, but it's out of the scope).

This means that out of its 100 assets, Ethereum allocates up to 60 for allowing transfers from Hemi, and up to 40 for allowing transfers from BNB.

The Pools on Hemi and BNB should also track a copy of the Credit it has on Ethereum. For simplicity, we'll only show the Hemi chain. Let's also assume the pool has 20 $HEMI provided of liquidity.

```
Assets = 20 $HEMI
CreditOnEthereum = 60
```

Note that each Pool maintains one credit vector per inbound direction (how much amount of tokens will accept from other chains as part of a transfer) and a mirrored copy of its outbound credit vectors for chains it can send to. In order to enable other paths (like the other way around - Ethereum -> Hemi), this structure also needs to be added for each path.

If a user wants to transfer 50 $HEMI from Hemi to Ethereum, then:

1. The assets are locked on Hemi, and the local copy of credits are deducted.
2. The transfer is sent through LZ
3. Credits are updated on Ethereum.

After a transfer, this is how it would look for the Hemi Pool:

```
Assets = 70 $HEMI (20 + the locked 50)
CreditOnEthereum = 10
```

and on Ethereum

```
Assets = 50 $HEMI (100 - 50, as 50 tokens were transferred to the user)
Credit(Hemi) = 10
Credit(BNB) = 40
```

This means that only up to 10 $HEMI can now be transferred from Hemi to Ethereum. BNB allocation is still the same.

In order to allow transferring more than 10 $HEMI tokens from Hemi to Ethereum, we need more liquidity in Ethereum.
For that, a fee may attract more LP, or users transferring from Ethereum to Hemi may enable it. If a user transfers from Ethereum to Hemi, liquidity will be locked up, increasing the credits. These newly credits are transferred as part of the message sent to Hemi, to update their local copy.

### Adding liquidity

If liquidity was added (by an LP - no transfer), the assets are increased in the Pool, and distributed to each allocations given the weights.
We could either wait for a user transferring to a remote chain to update the remote credits (thus allowing future inbound transfers with a higher cap), or, as part of the addition of liquidity, send a message through LZ just to update the remote copy.

### Removing Liquidity

A mechanism needs to be defined for this. The difficulty here lies in that remote copies should be updated first so there isn't an scenario where a transfer could be sent but there's no liquidity to accept it.

## Liquidity Relationships

Not all chains track every other chain.
Only chains that can send to ERC20 destinations must cache that destination’s credit data.

| Source \ Destination | Ethereum (ERC20) | Hemi (ERC20) | BNB (OFT) | Base (OFT) |
| -------------------- | ---------------- | ------------ | --------- | ---------- |
| Ethereum             | —                | yes          | no        | no         |
| Hemi                 | yes              | —            | no        | no         |
| BNB                  | yes              | yes          | —         | no         |
| Base                 | yes              | yes          | no        | —          |

Rules:

- OFT chains (BNB, Base) must track liquidity for ERC20 destinations.
- ERC20↔ERC20 pairs track each other.
- OFT↔OFT pairs do not require tracking.

## UI considerations

This architecture will offer a method as an entry point to initiate a transfer. From the UI perspective, a UI similar (if not equal) to the Hemi's tunnel can be used to enable these transfers to take place. It could even be integrated directly in the portal as an alternative to the OP bridge using the same UI.

## Security considerations

1. Trusted remotes: Each Pool validates that incoming messages originate from approved peers.
2. Replay protection: Every message includes a unique requestId.
3. Monotonic epochs: Only snapshots with equal or higher epochs are applied.
4. Atomicity: Liquidity updates and token release/mint occur in one transaction.
5. Credit consistency: The sum of all credits never exceeds the total available liquidity.

## Future Extensions

- Dynamic fee adjustments tied to route utilization and depth.
- On-chain rebalancing algorithms for adaptive weights.
- Event-based monitoring and analytics for liquidity health and flow visualization.

## Alternatives

- Some paths are still disabled, which requires multiple cross-chain steps (Status quo)
- We get a 3rd party to enable the paths missing, relying the implementation of their desired (it could be similar to ours, but handled by them)
