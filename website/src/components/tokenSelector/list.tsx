import { type Token as TokenType } from "types/token";

import { Token } from "./token";

type Props = {
  onSelectToken: (token: TokenType) => void;
  tokens: TokenType[];
};

const TokenRow = ({
  onSelect,
  token,
}: {
  token: TokenType;
  onSelect: (t: TokenType) => void;
}) => (
  <li
    className="px-4 cursor-pointer rounded-lg hover:bg-neutral-100 md:left-3 md:right-3 h-14"
    onClick={() => onSelect(token)}
  >
    <Token token={token} />
  </li>
);

export const List = function ({ onSelectToken, tokens }: Props) {
  return (
    <div className="skip-parent-padding-x flex-1 overflow-y-auto bg-white transition-shadow duration-200">
      <ul>
        {tokens.map((token) => (
          <TokenRow
            key={token.address}
            onSelect={onSelectToken}
            token={token}
          />
        ))}
      </ul>
    </div>
  );
};
