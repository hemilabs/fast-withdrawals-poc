import { Button } from "components/button";
import { Spinner } from "components/spinner";
import { SubmitWhenConnectedToChain } from "components/submitWhenConnectedToChain";
import { useLiquidityAvailable } from "hooks/useLiquidityAvailable";
import type { PoolToken } from "types/poolToken";
import { type Token } from "types/token";

type Props = {
  amount: bigint;
  canSubmit: boolean;
  fromToken: Token;
  isAllowanceError: boolean;
  isAllowanceLoading: boolean;
  isRunningOperation: boolean;
  operationRunning: string;
  selectedPool: PoolToken;
  validationError: string | undefined;
};
export const SubmitButton = function ({
  amount,
  canSubmit,
  fromToken,
  isAllowanceError,
  isAllowanceLoading,
  isRunningOperation,
  operationRunning,
  selectedPool,
  validationError,
}: Props) {
  const { data: liquidityAvailable, isError: isLiquidityError } =
    useLiquidityAvailable(selectedPool);

  const notEnoughLiquidity =
    liquidityAvailable !== undefined && amount > liquidityAvailable;

  const getOperationButtonText = function () {
    if (isAllowanceLoading || liquidityAvailable === undefined) {
      return <Spinner size={"small"} />;
    }
    if (isAllowanceError) {
      return "Failed to load allowance";
    }
    if (isLiquidityError) {
      return "Failed to load liquidity";
    }
    if (notEnoughLiquidity) {
      return "Not enough liquidity to bridge";
    }
    if (operationRunning === "bridging") {
      return "Bridging...";
    }
    if (validationError) {
      return validationError;
    }
    return "Bridge";
  };

  return (
    <SubmitWhenConnectedToChain
      chainId={fromToken.chainId}
      submitButton={
        <Button
          disabled={
            !canSubmit ||
            isRunningOperation ||
            isAllowanceLoading ||
            notEnoughLiquidity
          }
          size="xLarge"
          type="submit"
        >
          {getOperationButtonText()}
        </Button>
      }
    />
  );
};
