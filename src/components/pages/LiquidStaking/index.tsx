import { useState } from "react";

import { Burn } from "./Burn";
import { Mint } from "./Mint";
import { Stats } from "./Stats";
import { TabSelection } from "../../common/TabSelection";
import { PageMargin } from "../../layout";

export const LiquidStaking: React.FC = () => {
  const tabs = { deposit: "Deposit", withdraw: "Withdraw" };
  const [tab, setTab] = useState<keyof typeof tabs>("deposit");

  return (
    <PageMargin tw="w-full pb-6 sm:pb-0 flex flex-col gap-12 max-w-5xl">
      <div tw="w-full max-w-5xl bg-white pt-12 md:pt-20 px-6 pb-6">
        <div tw="flex flex-col lg:flex-row lg:justify-between gap-4 lg:items-center">
          <p tw="font-bold text-2xl sm:text-4xl">Liquid Staking Boost</p>
          <div tw="gap-2 grid">
            <p tw="sm:text-lg text-[#8f8f8f] max-w-md">
              Boost staking yields by speculating on staking rewards.
            </p>
          </div>
          {/* TODO: add details section */}
        </div>
      </div>
      {/* <TokenIcon
        token={environment.interface.liquidStaking!.lendgine.token1}
        size={64}
      /> */}
      <Stats />
      <div tw="flex w-full max-w-lg flex-col gap-2">
        <TabSelection
          tabs={tabs}
          selectedTab={tab}
          setSelectedTab={(val) => setTab(val)}
        />
        {tab === "deposit" && <Mint />}
        {tab === "withdraw" && <Burn />}
      </div>
    </PageMargin>
  );
};
