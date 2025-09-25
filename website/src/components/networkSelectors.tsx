import { networks } from "utils/networks";
import { type Chain } from "viem";

import { NetworkSelector } from "./networkSelector";

type Props = {
  fromNetworkId: Chain["id"];
  toNetworkId: Chain["id"];
};

export const NetworkSelectors = ({ fromNetworkId, toNetworkId }: Props) => (
  <div className="flex items-end justify-between gap-x-3">
    <div className="w-[calc(50%-38px-0.75rem)] flex-grow">
      <NetworkSelector
        label="From network"
        networkId={fromNetworkId}
        networks={networks.filter((chain) => chain.id !== toNetworkId)}
      />
    </div>
    <div className="w-[calc(50%-38px-0.75rem)] flex-grow">
      <NetworkSelector
        label="To Network"
        networkId={toNetworkId}
        networks={networks.filter((chain) => chain.id !== fromNetworkId)}
      />
    </div>
  </div>
);
