import type { CurrencyAmount } from "@uniswap/sdk-core";
import { Percent } from "@uniswap/sdk-core";
import { useMemo } from "react";

import type { HookArg } from "./internal/types";
import { isV3, useMostLiquidMarket } from "./useExternalExchange";
import { useLendgine } from "./useLendgine";
import type { Protocol } from "../constants";
import { useSettings } from "../contexts/settings";
import { useEnvironment } from "../contexts/useEnvironment";
import {
  calculateEstimatedBurnAmount,
  calculateEstimatedDepositAmount,
  calculateEstimatedMintAmount,
  calculateEstimatedPairBurnAmount,
  calculateEstimatedTokensOwed,
  calculateEstimatedWithdrawAmount,
} from "../lib/amounts";
import { ONE_HUNDRED_PERCENT } from "../lib/constants";
import { lendgineToMarket } from "../lib/lendgineValidity";
import { invert, priceToReserves } from "../lib/price";
import type { Lendgine, LendginePosition } from "../lib/types/lendgine";

export const useMintAmount = <L extends Lendgine>(
  lendgine: HookArg<L>,
  amountIn: HookArg<CurrencyAmount<L["token0"]>>,
  protocol: Protocol
) => {
  const environment = useEnvironment();
  const settings = useSettings();

  const lendgineInfoQuery = useLendgine(lendgine);

  const market = useMemo(
    () =>
      lendgine
        ? lendgineToMarket(
            lendgine,
            environment.interface.wrappedNative,
            environment.interface.specialtyMarkets
          )
        : undefined,
    [
      environment.interface.specialtyMarkets,
      environment.interface.wrappedNative,
      lendgine,
    ]
  );
  const currentPriceQuery = useMostLiquidMarket(market);

  return useMemo(() => {
    if (lendgineInfoQuery.isLoading || currentPriceQuery.status === "loading")
      return { status: "loading" } as const;

    if (
      !lendgine ||
      !lendgineInfoQuery.data ||
      !currentPriceQuery.data ||
      !market ||
      !amountIn
    )
      return { status: "error" } as const;

    const { liquidity, balance } = calculateEstimatedMintAmount(
      lendgine,
      lendgineInfoQuery.data,
      amountIn,
      protocol
    );
    const { amount0, amount1 } = calculateEstimatedPairBurnAmount(
      lendgine,
      lendgineInfoQuery.data,
      liquidity
    );

    const price = lendgine.token0.equals(market.quote)
      ? currentPriceQuery.data.price
      : invert(currentPriceQuery.data.price);

    const dexFee = isV3(currentPriceQuery.data.pool)
      ? new Percent(currentPriceQuery.data.pool.feeTier, "1000000")
      : new Percent("3000", "1000000");

    // token1
    const expectedSwapOutput = price
      .invert()
      .quote(amount0)
      .multiply(ONE_HUNDRED_PERCENT.subtract(dexFee))
      .multiply(ONE_HUNDRED_PERCENT.subtract(settings.maxSlippagePercent));

    const debtValue = amountIn.subtract(amount1.add(expectedSwapOutput));

    const multiple = amountIn.divide(debtValue).asFraction;

    const borrowAmount = amountIn.multiply(multiple.subtract(1));

    return {
      status: "success",
      borrowAmount,
      shares: balance.multiply(multiple),
      liquidity: liquidity.multiply(multiple),
    } as const;
  }, [
    amountIn,
    currentPriceQuery.data,
    currentPriceQuery.status,
    lendgine,
    lendgineInfoQuery.data,
    lendgineInfoQuery.isLoading,
    market,
    protocol,
    settings.maxSlippagePercent,
  ]);
};

export const useBurnAmount = <L extends Lendgine>(
  lendgine: HookArg<L>,
  shares: HookArg<CurrencyAmount<L["lendgine"]>>,
  protocol: Protocol
) => {
  const environment = useEnvironment();
  const settings = useSettings();

  const lendgineInfoQuery = useLendgine(lendgine);
  const market = useMemo(
    () =>
      lendgine
        ? lendgineToMarket(
            lendgine,
            environment.interface.wrappedNative,
            environment.interface.specialtyMarkets
          )
        : undefined,
    [
      environment.interface.specialtyMarkets,
      environment.interface.wrappedNative,
      lendgine,
    ]
  );
  const currentPriceQuery = useMostLiquidMarket(market);

  return useMemo(() => {
    if (lendgineInfoQuery.isLoading || currentPriceQuery.status === "loading")
      return { status: "loading" } as const;

    if (
      !lendgine ||
      !lendgineInfoQuery.data ||
      !currentPriceQuery.data ||
      !market ||
      !shares
    )
      return { status: "error" } as const;

    const { liquidity, collateral } = calculateEstimatedBurnAmount(
      lendgine,
      lendgineInfoQuery.data,
      shares,
      protocol
    );
    const { amount0, amount1 } = calculateEstimatedPairBurnAmount(
      lendgine,
      lendgineInfoQuery.data,
      liquidity
    );

    const price = lendgine.token0.equals(market.quote)
      ? currentPriceQuery.data.price
      : invert(currentPriceQuery.data.price);

    const dexFee = isV3(currentPriceQuery.data.pool)
      ? new Percent(currentPriceQuery.data.pool.feeTier, "1000000")
      : new Percent("3000", "1000000");

    // token1
    const expectedSwapInput = price
      .invert()
      .quote(amount0)
      .multiply(ONE_HUNDRED_PERCENT.add(dexFee))
      .multiply(ONE_HUNDRED_PERCENT.add(settings.maxSlippagePercent));

    const debtValue = amount1.add(expectedSwapInput);

    const collateralRemaining = collateral.subtract(debtValue);

    return {
      status: "success",
      collateral: collateralRemaining,
      amount0: amount0,
      amount1: amount1,
    } as const;
  }, [
    currentPriceQuery.data,
    currentPriceQuery.status,
    lendgine,
    lendgineInfoQuery.data,
    lendgineInfoQuery.isLoading,
    market,
    protocol,
    settings.maxSlippagePercent,
    shares,
  ]);
};

export const useDepositAmount = <L extends Lendgine>(
  lendgine: HookArg<L>,
  amount:
    | HookArg<CurrencyAmount<L["token0"]>>
    | HookArg<CurrencyAmount<L["token1"]>>,
  protocol: Protocol
) => {
  const environment = useEnvironment();
  const lendgineInfoQuery = useLendgine(lendgine);

  const market = useMemo(
    () =>
      lendgine
        ? lendgineToMarket(
            lendgine,
            environment.interface.wrappedNative,
            environment.interface.specialtyMarkets
          )
        : undefined,
    [
      environment.interface.specialtyMarkets,
      environment.interface.wrappedNative,
      lendgine,
    ]
  );
  const currentPriceQuery = useMostLiquidMarket(market);

  return useMemo(() => {
    if (lendgineInfoQuery.isLoading) return { status: "loading" } as const;

    if (!lendgine || !lendgineInfoQuery.data || !amount || !market)
      return { status: "error" } as const;

    if (lendgineInfoQuery.data.totalLiquidity.equalTo(0)) {
      if (currentPriceQuery.status === "loading")
        return { status: "loading" } as const;
      if (!currentPriceQuery.data) return { status: "error" } as const;

      const price = lendgine.token0.equals(market.quote)
        ? currentPriceQuery.data.price
        : invert(currentPriceQuery.data.price);
      const { token0Amount, token1Amount } = priceToReserves(lendgine, price);

      const liquidity = amount.currency.equals(lendgine.token0)
        ? token0Amount.invert().quote(amount)
        : token1Amount.invert().quote(amount);

      const { size } = calculateEstimatedDepositAmount(
        lendgine,
        lendgineInfoQuery.data,
        liquidity,
        protocol
      );
      const { amount0, amount1 } = calculateEstimatedPairBurnAmount(
        lendgine,
        lendgineInfoQuery.data,
        liquidity
      );

      return {
        status: "success",
        amount0,
        amount1,
        liquidity,
        size,
      } as const;
    }

    const liquidity = amount.currency.equals(lendgine.token0)
      ? lendgineInfoQuery.data.totalLiquidity
          .multiply(lendgineInfoQuery.data.reserve0)
          .divide(amount)
      : lendgineInfoQuery.data.totalLiquidity
          .multiply(lendgineInfoQuery.data.reserve1)
          .divide(amount);

    const { size } = calculateEstimatedDepositAmount(
      lendgine,
      lendgineInfoQuery.data,
      liquidity,
      protocol
    );
    const { amount0, amount1 } = calculateEstimatedPairBurnAmount(
      lendgine,
      lendgineInfoQuery.data,
      liquidity
    );

    return {
      status: "success",
      amount0,
      amount1,
      liquidity,
      size,
    } as const;
  }, [
    amount,
    currentPriceQuery.data,
    currentPriceQuery.status,
    lendgine,
    lendgineInfoQuery.data,
    lendgineInfoQuery.isLoading,
    market,
    protocol,
  ]);
};

export const useWithdrawAmount = <L extends Lendgine>(
  lendgine: HookArg<L>,
  position: HookArg<Pick<LendginePosition<L>, "size">>,
  protocol: Protocol
) => {
  const lendgineInfoQuery = useLendgine(lendgine);

  return useMemo(() => {
    if (lendgineInfoQuery.isLoading) return { status: "loading" } as const;

    if (!lendgine || !lendgineInfoQuery.data || !position)
      return { status: "error" } as const;

    const { liquidity } = calculateEstimatedWithdrawAmount(
      lendgine,
      lendgineInfoQuery.data,
      position,
      protocol
    );
    const { amount0, amount1 } = calculateEstimatedPairBurnAmount(
      lendgine,
      lendgineInfoQuery.data,
      liquidity
    );

    return {
      status: "success",
      amount0,
      amount1,
      liquidity,
    } as const;
  }, [
    lendgine,
    lendgineInfoQuery.data,
    lendgineInfoQuery.isLoading,
    position,
    protocol,
  ]);
};

export const useCollectAmount = <L extends Lendgine>(
  lendgine: HookArg<L>,
  position: HookArg<LendginePosition<L>>,
  protocol: Protocol
) => {
  const environment = useEnvironment();

  const lendgineInfoQuery = useLendgine(lendgine);

  const market = useMemo(
    () =>
      lendgine
        ? lendgineToMarket(
            lendgine,
            environment.interface.wrappedNative,
            environment.interface.specialtyMarkets
          )
        : undefined,
    [
      environment.interface.specialtyMarkets,
      environment.interface.wrappedNative,
      lendgine,
    ]
  );

  return useMemo(() => {
    if (lendgineInfoQuery.isLoading) return { status: "loading" } as const;

    if (!lendgine || !lendgineInfoQuery.data || !position || !market)
      return { status: "error" } as const;

    const tokensOwed = calculateEstimatedTokensOwed(
      lendgine,
      lendgineInfoQuery.data,
      position,
      protocol
    );

    return {
      status: "success",
      tokensOwed,
    } as const;
  }, [
    lendgine,
    lendgineInfoQuery.data,
    lendgineInfoQuery.isLoading,
    market,
    position,
    protocol,
  ]);
};
