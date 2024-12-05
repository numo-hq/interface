import { CurrencyAmount, Fraction } from "@uniswap/sdk-core";
import { useMemo } from "react";

import type { HookArg, ReadConfig } from "./internal/types";
import { useContractReads } from "./internal/useContractReads";
import { externalRefetchInterval } from "./internal/utils";
import { useAllLendgines } from "./useAllLendgines";
import { lendgineABI } from "../abis/lendgine";
import { scale } from "../lib/constants";
import { fractionToPrice } from "../lib/price";
import type { Lendgine } from "../lib/types/lendgine";
import type { WrappedTokenInfo } from "../lib/types/wrappedTokenInfo";

export const useLendginesForTokens = (
  tokens: HookArg<readonly [WrappedTokenInfo, WrappedTokenInfo]>
) => {
  const lendginesQuery = useAllLendgines();

  return useMemo(() => {
    if (!tokens || lendginesQuery.status !== "success") return null;
    return lendginesQuery.lendgines.filter(
      (l) =>
        (l.token0.equals(tokens[0]) && l.token1.equals(tokens[1])) ||
        (l.token0.equals(tokens[1]) && l.token1.equals(tokens[0]))
    );
  }, [lendginesQuery.lendgines, lendginesQuery.status, tokens]);
};

export const useLendgine = <L extends Lendgine>(lendgine: HookArg<L>) => {
  const contracts = lendgine ? getLendgineRead(lendgine) : undefined;

  return useContractReads({
    contracts,
    allowFailure: false,
    staleTime: Infinity,
    enabled: !!contracts,
    select: (data) => {
      if (!lendgine) return undefined;

      return {
        totalPositionSize: CurrencyAmount.fromRawAmount(
          lendgine.lendgine,
          data[0].toString()
        ),
        totalLiquidityBorrowed: CurrencyAmount.fromRawAmount(
          lendgine.lendgine,
          data[1].toString()
        ),
        rewardPerPositionStored: fractionToPrice(
          new Fraction(data[2].toString(), scale),
          lendgine.lendgine,
          lendgine.token1
        ),
        lastUpdate: +data[3].toString(),
        totalSupply: CurrencyAmount.fromRawAmount(
          lendgine.lendgine,
          data[4].toString()
        ),
        reserve0: CurrencyAmount.fromRawAmount(
          lendgine.token0,
          data[5].toString()
        ),
        reserve1: CurrencyAmount.fromRawAmount(
          lendgine.token1,
          data[6].toString()
        ),
        totalLiquidity: CurrencyAmount.fromRawAmount(
          lendgine.lendgine,
          data[7].toString()
        ),
      };
    },
    refetchInterval: externalRefetchInterval,
  });
};

export const getLendgineRead = <L extends Lendgine>(lendgine: L) =>
  [
    {
      address: lendgine.address,
      abi: lendgineABI,
      functionName: "totalPositionSize",
    },
    {
      address: lendgine.address,
      abi: lendgineABI,
      functionName: "totalLiquidityBorrowed",
    },
    {
      address: lendgine.address,
      abi: lendgineABI,
      functionName: "rewardPerPositionStored",
    },
    {
      address: lendgine.address,
      abi: lendgineABI,
      functionName: "lastUpdate",
    },
    {
      address: lendgine.address,
      abi: lendgineABI,
      functionName: "totalSupply",
    },
    {
      address: lendgine.address,
      abi: lendgineABI,
      functionName: "reserve0",
    },
    {
      address: lendgine.address,
      abi: lendgineABI,
      functionName: "reserve1",
    },
    {
      address: lendgine.address,
      abi: lendgineABI,
      functionName: "totalLiquidity",
    },
  ] as const satisfies readonly [
    ReadConfig<typeof lendgineABI, "totalPositionSize">,
    ReadConfig<typeof lendgineABI, "totalLiquidityBorrowed">,
    ReadConfig<typeof lendgineABI, "rewardPerPositionStored">,
    ReadConfig<typeof lendgineABI, "lastUpdate">,
    ReadConfig<typeof lendgineABI, "totalSupply">,
    ReadConfig<typeof lendgineABI, "reserve0">,
    ReadConfig<typeof lendgineABI, "reserve1">,
    ReadConfig<typeof lendgineABI, "totalLiquidity">
  ];
