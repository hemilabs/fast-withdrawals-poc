import { type Token as TokenType } from "types/token";

import { Balance } from "../cryptoBalance";
import { TokenLogo } from "../tokenLogo";

export const Token = ({ token }: { token: TokenType }) => (
  <div className="flex items-center gap-x-3 p-3 text-sm font-medium text-neutral-950">
    <div className="flex-shrink-0 flex-grow-0">
      <TokenLogo size="medium" token={token} />
    </div>
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between">
        <span>{token.name}</span>
        <Balance token={token} />
      </div>
      <div className="flex items-center justify-between text-neutral-500">
        <span>{token.symbol}</span>
      </div>
    </div>
  </div>
);
