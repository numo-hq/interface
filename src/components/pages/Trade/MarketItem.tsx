import type { Token } from "@dahlia-labs/token-utils";
import { Percent } from "@dahlia-labs/token-utils";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import invariant from "tiny-invariant";

import {
  useCurrentPrice,
  useMostLiquidMarket,
  usePriceHistory,
} from "../../../hooks/useExternalExchange";
import { sortTokens } from "../../../hooks/useUniswapPair";
import { TokenIcon } from "../../common/TokenIcon";
import { Times } from "../TradeDetails/TimeSelector";
import { MiniChart } from "./MiniChart";

interface Props {
  tokens: { denom: Token; other: Token };
}

export const MarketItem: React.FC<Props> = ({ tokens }: Props) => {
  const referenceMarketQuery = useMostLiquidMarket([
    tokens.denom,
    tokens.other,
  ]);

  const invertPriceQuery =
    sortTokens([tokens.denom, tokens.other])[0] === tokens.other;

  const priceHistoryQuery = usePriceHistory(
    referenceMarketQuery.data,
    Times.ONE_DAY
  );

  const priceHistory = useMemo(() => {
    if (!priceHistoryQuery.data) return null;
    return invertPriceQuery
      ? priceHistoryQuery.data.map((p) => ({
          ...p,
          price: p.price.invert(),
        }))
      : priceHistoryQuery.data;
  }, [invertPriceQuery, priceHistoryQuery.data]);

  const currentPriceQuery = useCurrentPrice(referenceMarketQuery.data);

  const currentPrice = useMemo(() => {
    if (!currentPriceQuery.data) return null;
    return invertPriceQuery
      ? currentPriceQuery.data.invert()
      : currentPriceQuery.data;
  }, [currentPriceQuery.data, invertPriceQuery]);

  const priceChange = useMemo(() => {
    if (!currentPrice || !priceHistory) return null;

    const oneDayOldPrice = priceHistory[priceHistory.length - 1]?.price;
    invariant(oneDayOldPrice, "no prices returned");

    console.log(oneDayOldPrice.asNumber, currentPrice.asNumber);

    return Percent.fromFraction(
      currentPrice.subtract(oneDayOldPrice).divide(oneDayOldPrice)
    );
  }, [currentPrice, priceHistory]);

  // return null;
  const loading = !priceHistory || !currentPrice || !priceChange;

  return loading ? (
    <div tw="w-full h-14 duration-300 animate-pulse bg-gray-300 rounded-xl" />
  ) : (
    <NavLink
      tw=""
      to={`/trade/details/${tokens.denom.address}/${tokens.other.address}`}
    >
      <div tw="w-full rounded-xl hover:bg-gray-200 transform ease-in-out duration-1000 grid grid-cols-5 px-6 h-14 items-center justify-between">
        <div tw="flex items-center gap-3 col-span-2">
          <div tw="flex items-center space-x-[-0.5rem] rounded-lg bg-gray-200 px-2 py-1">
            <TokenIcon token={tokens.other} size={32} />
            <TokenIcon token={tokens.denom} size={32} />
          </div>
          <div tw="grid gap-0.5">
            <span tw="font-semibold text-lg text-default leading-tight">
              {tokens.other.symbol} / {tokens.denom.symbol}
            </span>
          </div>
        </div>

        <MiniChart priceHistory={priceHistory} currentPrice={currentPrice} />

        <div tw="text-lg font-semibold justify-self-end">
          {priceChange.greaterThan(0) ? (
            <p tw="text-green-500 ">+{priceChange.toFixed(2)}%</p>
          ) : (
            <p tw="text-red">{priceChange.toFixed(2)}%</p>
          )}
        </div>
      </div>
    </NavLink>
  );
};
