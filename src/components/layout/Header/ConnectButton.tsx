import { ConnectButton as ConnectButtonRainbow } from "@rainbow-me/rainbowkit";

import { Button } from "../../common/Button";

export const ConnectButton: React.FC = () => {
  return (
    <ConnectButtonRainbow.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <Button
                    variant="inverse"
                    tw=" px-1 text-lg rounded-xl h-10"
                    onClick={openConnectModal}
                  >
                    Connect Wallet
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    variant="danger"
                    tw=" px-1 text-lg rounded-xl h-10"
                    onClick={openChainModal}
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <>
                  <button onClick={openAccountModal}>
                    <div tw="px-4 h-10  rounded-xl flex flex-col bg-[#4f4f4f]">
                      <p tw="font-bold items-center text-white flex h-full">
                        {account.displayName}
                      </p>
                    </div>
                  </button>
                  <button onClick={openChainModal}>
                    <div tw="h-10 px-1.5 items-center justify-center flex flex-col rounded-xl bg-[#4f4f4f]">
                      <img
                        alt={chain.name ?? "Chain icon"}
                        src={
                          chain.iconUrl ??
                          "https://assets.coingecko.com/coins/images/11090/small/InjXBNx9_400x400.jpg?1674707499"
                        }
                        tw="rounded-full"
                        width={30}
                        height={30}
                      />
                    </div>
                  </button>
                </>
              );
            })()}
          </>
        );
      }}
    </ConnectButtonRainbow.Custom>
  );
};
