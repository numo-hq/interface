import { useMemo } from "react";
import { NavLink } from "react-router-dom";

import { useEarn } from ".";
import { HedgeUniswap } from "./HedgeUniswap";
import { LiquidStaking } from "./LiquidStaking";
import { ProvideLiquidity } from "./ProvideLiquidity";
import { useEnvironment } from "../../../contexts/useEnvironment";
import { lendgineToMarket } from "../../../lib/lendgineValidity";
import type { Lendgine } from "../../../lib/types/lendgine";
import type { Market } from "../../../lib/types/market";
import { Button } from "../../common/Button";
import { PageMargin } from "../../layout";

export const EarnInner: React.FC = () => {
  const environment = useEnvironment();
  const { lendgines } = useEarn();

  const partitionedLendgines = useMemo(
    () =>
      Object.values(
        lendgines.reduce((acc: Record<string, Lendgine[]>, cur) => {
          const key = `${cur.token0.address}_${cur.token1.address}`;
          const value = acc[key];
          return {
            ...acc,
            [key]: value ? value.concat(cur) : [cur],
          };
        }, {})
      ),
    [lendgines]
  );

  const partitionedMarkets = useMemo(
    () =>
      Object.values(
        lendgines.reduce(
          (
            acc: Record<string, { market: Market; lendgines: Lendgine[] }>,
            cur
          ) => {
            const market = lendgineToMarket(
              cur,
              environment.interface.wrappedNative,
              environment.interface.specialtyMarkets
            );
            const key = `${market.quote.address}_${market.base.address}`;
            const value = acc[key];
            return {
              ...acc,
              [key]: value
                ? { market: market, lendgines: value.lendgines.concat(cur) }
                : { market, lendgines: [cur] },
            };
          },
          {}
        )
      ),
    [
      environment.interface.specialtyMarkets,
      environment.interface.wrappedNative,
      lendgines,
    ]
  );

  return (
    <PageMargin tw="w-full pb-12 sm:pb-0 flex flex-col  gap-2">
      <div tw="w-full max-w-5xl bg-white pt-12 md:pt-20 px-6 pb-6 mb-12">
        <div tw="flex flex-col lg:flex-row lg:justify-between gap-4 lg:items-center">
          <p tw="font-bold text-2xl sm:text-4xl">Earn on your assets</p>
          <div tw="gap-2 grid">
            <p tw="sm:text-lg text-[#8f8f8f] max-w-md">
              Numoen has created several strategies using our underlying PMMP.
              All strategies maintain maximum trustlessness and
              decentralization.
            </p>
            <NavLink to="/create" tw="">
              <Button variant="primary" tw="px-2 py-1 text-lg rounded-none">
                Create new market
              </Button>
            </NavLink>
          </div>
        </div>
      </div>
      <div tw="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-5xl w-full">
        {environment.interface.liquidStaking && <LiquidStaking />}
        {environment.interface.liquidStaking && (
          <ProvideLiquidity
            lendgines={[environment.interface.liquidStaking.lendgine] as const}
            protocol="stpmmp"
          />
        )}
        {partitionedLendgines.map((pl) => (
          <ProvideLiquidity
            key={"pl" + pl[0]!.address}
            lendgines={pl}
            protocol="pmmp"
          />
        ))}
        {partitionedMarkets.map((pm) => (
          <HedgeUniswap
            key={"pm" + pm.market.quote.address + pm.market.base.address}
            lendgines={pm.lendgines}
            market={pm.market}
          />
        ))}
      </div>
    </PageMargin>
  );
};
