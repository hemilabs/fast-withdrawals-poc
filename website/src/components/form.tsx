import { getTargetChainId } from "fast-bridge";
import { useTokenBalance } from "hooks/useBalance";
import { useBridgeState } from "hooks/useBridgeState";
import { useBridgeToken } from "hooks/useBridgeToken";
import { useNeedsApproval } from "hooks/useNeedsApproval";
import { type FormEvent, useState } from "react";
import type { PoolToken } from "types/poolToken";
import { getToken, parseTokenUnits } from "utils/token";
import { validateSubmit } from "utils/validateSubmit";

import { Button } from "./button";
import { EvmFeesSummary } from "./evmFeesSummary";
import { ExplorerLink } from "./explorerLink";
import { FeesContainer } from "./feesContainer";
import { NetworkSelectors } from "./networkSelectors";
import { SetMaxEvmBalance } from "./setMaxBalance";
import { SubmitButton } from "./submitButton";
import { TokenInput } from "./tokenInput";
import { TokenSelectorReadOnly } from "./tokenSelectorReadOnly";
import { Card } from "./card";
import { formatUnits, isAddressEqual, type Hash } from "viem";
import { TokenSelector } from "./tokenSelector";
import type { Token } from "types/token";
import { useEstimatePoolFees } from "hooks/useEstimatePoolFees";

const ResetButton = ({ onClick }: { onClick: () => void }) => (
  <Button onClick={onClick} type="button" variant="primary">
    Try another
  </Button>
);

export const Form = function ({ poolTokens }: { poolTokens: PoolToken[] }) {
  const [state, dispatch] = useBridgeState();
  const [transactionHash, setTransactionHash] = useState<Hash | undefined>(
    undefined,
  );

  const { fromInput, fromNetworkId } = state;

  const [selectedPool, setSelectedPool] = useState<PoolToken>(
    () => poolTokens[0],
  );

  const { data: poolFees, isError: isPoolFeeError } =
    useEstimatePoolFees(selectedPool);

  const [fromToken, toToken] = getToken(selectedPool);
  const amount = parseTokenUnits(fromInput, fromToken);

  const { isAllowanceError, isAllowanceLoading } = useNeedsApproval({
    address: fromToken.address,
    amount,
    spender: selectedPool.poolAddress,
  });
  const { data: walletTokenBalance } = useTokenBalance(
    fromToken.chainId,
    fromToken.address,
  );

  const handleReset = function () {
    setTransactionHash(undefined);
    dispatch({ type: "resetStateAfterOperation" });
    resetMutation();
  };

  const {
    isPending: isRunningOperation,
    isSuccess,
    mutate,
    reset: resetMutation,
  } = useBridgeToken({
    fromToken,
    on(emitter) {
      emitter.on("user-signed-bridge", (hash) => setTransactionHash(hash));
      emitter.on("bridge-failed", handleReset);
      emitter.on("user-rejected-bridge", handleReset);
      emitter.on("user-rejected-token-approval", handleReset);
      emitter.on("unexpected-error", handleReset);
    },
  });

  const updateFromInput = (payload: string) =>
    dispatch({ payload, type: "updateFromInput" });

  const handleSubmit = function (e: FormEvent) {
    e.preventDefault();
    mutate({ amount });
  };

  const {
    canSubmit,
    error: validationError,
    errorKey,
  } = validateSubmit({
    amountInput: fromInput,
    balance: walletTokenBalance ?? BigInt(0),
    token: fromToken,
  });

  const handleTokenSelection = function (selectedToken: Token) {
    setSelectedPool(
      poolTokens.find((p) =>
        isAddressEqual(p.token.address, selectedToken.address),
      )!,
    );
  };

  const calculateReceiveAmount = function () {
    if (amount === BigInt(0)) {
      return "0";
    }
    if (isPoolFeeError) {
      return "-";
    }
    if (poolFees === undefined) {
      return "...";
    }

    return formatUnits(
      amount - (amount * BigInt(poolFees)) / BigInt(10_000),
      selectedPool.token.decimals,
    );
  };

  return (
    <>
      <Card>
        <form
          className="flex flex-col gap-y-3 p-4 md:p-6"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center justify-between gap-x-2">
            <h3 className="text-xl font-medium capitalize text-neutral-950">
              Fast Bridge
            </h3>
          </div>
          <NetworkSelectors
            fromNetworkId={fromNetworkId}
            toNetworkId={getTargetChainId(fromNetworkId)}
          />
          <TokenInput
            disabled={isRunningOperation}
            errorKey={errorKey}
            label="Send"
            maxBalanceButton={
              <SetMaxEvmBalance
                disabled={isRunningOperation}
                onSetMaxBalance={(maxBalance) => updateFromInput(maxBalance)}
                token={fromToken}
              />
            }
            onChange={updateFromInput}
            token={fromToken}
            tokenSelector={
              <TokenSelector
                disabled={isRunningOperation}
                tokens={poolTokens.map((p) => p.token)}
                selectedToken={fromToken}
                onSelectToken={handleTokenSelection}
              />
            }
            value={fromInput}
          />
          <TokenInput
            disabled={isRunningOperation}
            errorKey={errorKey}
            label="Receive"
            onChange={updateFromInput}
            token={toToken}
            tokenSelector={
              <TokenSelectorReadOnly token={toToken} logoVersion="L1" />
            }
            value={calculateReceiveAmount()}
          />
          {isSuccess ? (
            <ResetButton onClick={handleReset} />
          ) : (
            <SubmitButton
              amount={amount}
              canSubmit={canSubmit}
              fromToken={fromToken}
              isAllowanceError={isAllowanceError}
              isAllowanceLoading={isAllowanceLoading}
              isRunningOperation={isRunningOperation}
              operationRunning={isRunningOperation ? "bridging" : "idle"}
              selectedPool={selectedPool}
              validationError={validationError}
            />
          )}
        </form>
      </Card>
      <FeesContainer>
        <EvmFeesSummary amount={amount} pool={selectedPool} />
      </FeesContainer>
      {transactionHash && <ExplorerLink hash={transactionHash} />}
    </>
  );
};
