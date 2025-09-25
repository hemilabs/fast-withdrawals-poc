import { Card } from "components/card";
import { CloseIcon } from "components/icons/closeIcon";
import { Modal } from "components/modal";
import { useVisualViewportSize } from "hooks/useVisualViewportSize";
import { useWindowSize } from "hooks/useWindowSize";
import { type Token as TokenType } from "types/token";

import { List } from "./list";

type Props = {
  closeModal: () => void;
  onSelectToken: (token: TokenType) => void;
  tokens: TokenType[];
};

const bySymbol = (a: TokenType, b: TokenType) =>
  a.symbol.localeCompare(b.symbol);

export const TokenList = function ({
  closeModal,
  onSelectToken,
  tokens,
}: Props) {
  const { width } = useWindowSize();
  const { height: viewportHeight } = useVisualViewportSize();

  const sortedTokens = [...tokens.sort(bySymbol)];

  function handleSelectToken(token: TokenType) {
    onSelectToken(token);
    closeModal();
  }

  const content = (
    <div
      className="flex h-screen w-screen flex-col gap-x-3 overflow-hidden bg-white pt-6 md:h-[65dvh] md:w-[409px] md:bg-transparent [&>:not(.skip-parent-padding-x)]:px-4 [&>:not(.skip-parent-padding-x)]:md:px-6"
      style={{
        // On mobile devices, when the virtual keyboard is open, the visible viewport height (visualViewport.height)
        // becomes smaller than the full window height. To ensure the modal fits within the remaining space plus the extra space,
        // we uses visualViewport to detect available height
        // On desktop (md:), fallback to Tailwind-defined height.
        height: width < 768 ? `${viewportHeight - 112}px` : undefined,
        scrollbarColor: "#d4d4d4 transparent",
        scrollbarWidth: "thin",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xl font-medium text-neutral-950">Select Token</h3>
        <CloseIcon
          className="scale-125 cursor-pointer [&>path]:hover:fill-neutral-950"
          onClick={closeModal}
        />
      </div>
      <List
        onSelectToken={(token) => handleSelectToken(token)}
        tokens={sortedTokens}
      />
    </div>
  );

  return (
    <Modal onClose={closeModal} verticalAlign={width < 768 ? "top" : "center"}>
      <Card className="overflow-hidden rounded-2xl bg-white">{content}</Card>
    </Modal>
  );
};
