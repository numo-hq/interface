import { CurrencyAmount, Percent } from "@uniswap/sdk-core";
import { useMemo } from "react";
import { css } from "twin.macro";

import { EarnCard } from "./ProvideLiquidity";
import { useMostLiquidMarket } from "../../../hooks/useExternalExchange";

import { useLendgines } from "../../../hooks/useLendgines";
import {
  calculateEstimatedBurnAmount,
  calculateEstimatedPairBurnAmount,
} from "../../../lib/amounts";

import { invert } from "../../../lib/price";
import type { Lendgine } from "../../../lib/types/lendgine";
import type { Market } from "../../../lib/types/market";
import { formatPercent } from "../../../utils/format";
import { LoadingBox } from "../../common/LoadingBox";
import { TokenAmountDisplay } from "../../common/TokenAmountDisplay";
import { TokenIcon } from "../../common/TokenIcon";

interface Props {
  lendgines: readonly Lendgine[];
  market: Market;
}

export const HedgeUniswap: React.FC<Props> = ({ lendgines, market }: Props) => {
  const lendginesQuery = useLendgines(lendgines);
  const priceQuery = useMostLiquidMarket(market);

  const tvl = useMemo(() => {
    if (!priceQuery.data || !lendginesQuery.data) return undefined;
    return lendgines.reduce((acc, cur, i) => {
      const inverse = !cur.token0.equals(market.quote);
      const { collateral, liquidity } = calculateEstimatedBurnAmount(
        cur,
        lendginesQuery.data![i]!,
        lendginesQuery.data![i]!.totalSupply,
        "pmmp"
      );
      const { amount0, amount1 } = calculateEstimatedPairBurnAmount(
        cur,
        lendginesQuery.data![i]!,
        liquidity
      );

      // token0 / token1
      const price = inverse
        ? invert(priceQuery.data.price)
        : priceQuery.data.price;

      // token0
      const value = price
        .quote(collateral)
        .subtract(amount0.add(price.quote(amount1)));

      return acc.add(inverse ? priceQuery.data.price.quote(value) : value);
    }, CurrencyAmount.fromRawAmount(market.quote, 0));
  }, [lendgines, lendginesQuery.data, market.quote, priceQuery.data]);

  return (
    <EarnCard
      to={`hedge-uniswap/${market.quote.address}/${market.base.address}`}
    >
      <div
        tw="w-full h-24 p-2 overflow-clip grid"
        css={css`
          background-image: linear-gradient(to top right, #fff, #ff007a);
        `}
      >
        <p tw="p-2 rounded-lg bg-white w-fit bg-opacity-50 font-medium ">
          Hedge Uniswap V3
        </p>
        <div tw="w-full justify-end">
          <img
            src="/uniswap.svg"
            height={100}
            width={100}
            tw="relative -right-2/3 top-[-38px]"
          />
        </div>
      </div>
      <div tw="flex items-center relative top-[-32px] left-[8px] rounded-lg bg-white w-fit p-2">
        <TokenIcon token={market.quote} size={48} />
        <TokenIcon token={market.base} size={48} />
      </div>

      <div tw="p-4 flex flex-col gap-4  -mt-8">
        <p tw="font-bold text-xl">
          {market.quote.symbol} + {market.base.symbol}
        </p>
        <div tw="flex flex-col ">
          <p tw="text-xs text-secondary font-medium">Est. APR</p>
          <p tw=" font-bold text-xl text-green">
            {formatPercent(new Percent(34, 200))}
          </p>
        </div>
        <div tw="flex flex-col ">
          <p tw="text-xs text-secondary font-medium">TVL</p>
          <p tw="text-default font-semibold text-lg">
            {tvl ? <TokenAmountDisplay amount={tvl} /> : <LoadingBox />}
          </p>
        </div>
      </div>
    </EarnCard>
  );
};
