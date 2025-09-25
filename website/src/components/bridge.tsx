import { usePoolTokens } from "hooks/usePoolTokens";
import Skeleton from "react-loading-skeleton";

import { Form } from "./form";

export const Bridge = function () {
  const { data: poolTokens } = usePoolTokens();

  return (
    <div className="relative mx-auto max-w-[536px] [&>.card-container]:first:relative [&>.card-container]:first:z-10">
      {poolTokens === undefined ? (
        <Skeleton />
      ) : (
        <Form poolTokens={poolTokens} />
      )}
    </div>
  );
};
