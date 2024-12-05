import { useState } from "react";
import { css } from "twin.macro";

import { useHedge } from ".";
import { Stats } from "./Stats";
import { TabSelection } from "../../common/TabSelection";
import { TokenIcon } from "../../common/TokenIcon";

import { PageMargin } from "../../layout";

export const HedgeInner: React.FC = () => {
  const { lendgines } = useHedge();
  const token0 = lendgines[0]!.token0;
  const token1 = lendgines[0]!.token1;

  const tabs = { mint: "Buy protection", burn: "Sell protection" };
  const [tab, setTab] = useState<keyof typeof tabs>("mint");
  return (
    <PageMargin tw="w-full pb-12 sm:pb-0 flex flex-col gap-12 max-w-5xl">
      <div tw="w-full bg-white">
        <div
          tw="w-full h-36 p-4 flex flex-col justify-end"
          css={css`
            background-image: linear-gradient(to top right, #fff, #ff007a);
          `}
        >
          <div tw="flex w-full justify-between items-end">
            <p tw="p-2 mb-8 rounded-lg bg-white w-fit bg-opacity-50 font-medium h-fit">
              Hedge Uniswap V3
            </p>
            <img
              src="/uniswap.svg"
              height={150}
              width={150}
              tw="relative top-[30px]"
            />
          </div>
        </div>
        <div tw="flex items-center relative top-[-32px] left-[16px] rounded-lg bg-white w-fit p-2">
          <TokenIcon token={token0} size={48} />
          <TokenIcon token={token1} size={48} />
        </div>

        <div tw="flex flex-col lg:flex-row lg:justify-between gap-4 -mt-8 p-6">
          <p tw="font-bold text-2xl sm:text-4xl">
            {token0.symbol} + {token1.symbol}
          </p>
          <div tw="gap-2 grid">
            <p tw="sm:text-lg text-[#8f8f8f] max-w-md">
              Hedge impermanent loss risk and earn from Uniswap trading fees.
            </p>
            <p tw="text-sm font-normal underline ">View details</p>
          </div>
        </div>
      </div>
      <Stats />
      <div tw="flex w-full max-w-lg flex-col gap-2">
        <TabSelection
          tabs={tabs}
          selectedTab={tab}
          setSelectedTab={(val) => setTab(val)}
        />
        {/* {tab === "deposit" && <Deposit />}
        {tab === "withdraw" && <Withdraw />} */}
      </div>
    </PageMargin>
  );
};
