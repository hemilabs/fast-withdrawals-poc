import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button, type ButtonSize } from "components/button";

export const ConnectEvmWallet = function ({
  buttonSize = "xLarge",
}: {
  buttonSize?: ButtonSize;
}) {
  const { openConnectModal } = useConnectModal();

  const onClick = () => openConnectModal?.();

  return (
    <Button onClick={onClick} size={buttonSize} type="button">
      Connect Wallet
    </Button>
  );
};
