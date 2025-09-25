import { Modal } from "components/modal";
import { useVisualViewportSize } from "hooks/useVisualViewportSize";
import { useWindowSize } from "hooks/useWindowSize";
import { lazy, Suspense, useState } from "react";
import Skeleton from "react-loading-skeleton";
import { type Token } from "types/token";

import { Chevron } from "../icons/chevron";
import { TokenLogo } from "../tokenLogo";

const TokenListLoading = function () {
  const { width } = useWindowSize();
  const { height: viewportHeight } = useVisualViewportSize();
  return (
    <Modal verticalAlign={width < 768 ? "top" : "center"}>
      <Skeleton
        className="h-full w-screen md:h-[65dvh] md:w-[409px]"
        containerClassName="flex"
        style={{
          height: width < 768 ? `${viewportHeight - 112}px` : undefined,
        }}
      />
    </Modal>
  );
};

const TokenList = lazy(() =>
  import("./tokenList").then((mod) => ({ default: mod.TokenList })),
);

type Props = {
  disabled: boolean;
  onSelectToken: (token: Token) => void;
  selectedToken: Token;
  tokens: Token[];
};

export const TokenSelector = function ({
  disabled,
  onSelectToken,
  selectedToken,
  tokens,
}: Props) {
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  const closeModal = () => setShowTokenSelector(false);
  const openModal = () => setShowTokenSelector(true);

  const handleSelection = (token: Token) => onSelectToken(token);
  return (
    <>
      <button
        className="shadow-soft group/token-selector flex items-center gap-x-2 rounded-lg border
        border-solid border-neutral-300/55 bg-white p-2 text-sm font-medium hover:bg-neutral-100"
        disabled={disabled || tokens.length < 2}
        onClick={openModal}
        type="button"
      >
        <TokenLogo size="small" token={selectedToken} />
        <span className="text-neutral-950">{selectedToken.symbol}</span>
        {tokens.length > 1 && (
          <Chevron.Bottom className="ml-auto flex-shrink-0 [&>path]:fill-neutral-500 [&>path]:group-hover/token-selector:fill-neutral-950" />
        )}
      </button>
      {showTokenSelector && (
        <Suspense fallback={<TokenListLoading />}>
          <TokenList
            closeModal={closeModal}
            onSelectToken={handleSelection}
            tokens={tokens}
          />
        </Suspense>
      )}
    </>
  );
};
