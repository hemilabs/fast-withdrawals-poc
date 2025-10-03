import { useBridgeState } from "hooks/useBridgeState";
import { usePoolTokens } from "hooks/usePoolTokens";
import Skeleton from "react-loading-skeleton";

import { Form } from "./form";
import { getChainById } from "utils/networks";

export const Bridge = function () {
  const [state, dispatch] = useBridgeState();

  const { data: poolTokens } = usePoolTokens(
    getChainById(state.fromNetworkId)!,
  );

  return (
    <main className="my-auto justify-self-center">
      <div className="relative mx-auto max-w-[536px] [&>.card-container]:first:relative [&>.card-container]:first:z-10">
        {poolTokens === undefined ? (
          <Skeleton />
        ) : (
          <Form dispatch={dispatch} poolTokens={poolTokens} state={state} />
        )}
      </div>
    </main>
  );
};
