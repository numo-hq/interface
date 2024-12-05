import { CurrencyAmount, Fraction } from "@uniswap/sdk-core";
import { useMemo } from "react";
import invariant from "tiny-invariant";
import type { Address } from "wagmi";

import type { HookArg } from "./internal/types";
import { useContractReads } from "./internal/useContractReads";
import { userRefectchInterval } from "./internal/utils";
import { getLendginePositionRead } from "./useLendginePosition";
import type { Protocol } from "../constants";
import { useEnvironment } from "../contexts/useEnvironment";
import { scale } from "../lib/constants";
import { fractionToPrice } from "../lib/price";
import type { Lendgine } from "../lib/types/lendgine";

export const useLendginesPositions = <L extends Lendgine>(
  lendgines: HookArg<readonly L[]>,
  address: HookArg<Address>,
  procotol: Protocol = "pmmp"
) => {
  const environment = useEnvironment();
  const protocolConfig = environment.procotol[procotol]!;
  const contracts = useMemo(
    () =>
      !!lendgines && !!address
        ? lendgines.map((l) =>
            getLendginePositionRead(l, address, protocolConfig.liquidityManager)
          )
        : undefined,
    [address, lendgines, protocolConfig.liquidityManager]
  );

  return useContractReads({
    contracts,
    staleTime: Infinity,
    allowFailure: false,
    enabled: !!contracts,
    select: (data) => {
      if (!lendgines) return undefined;
      return data.map((p, i) => {
        const lendgine = lendgines[i];
        invariant(lendgine);
        return {
          size: CurrencyAmount.fromRawAmount(
            lendgine.lendgine,
            p.size.toString()
          ),
          rewardPerPositionPaid: fractionToPrice(
            new Fraction(p.rewardPerPositionPaid.toString(), scale),
            lendgine.lendgine,
            lendgine.token1
          ),
          tokensOwed: CurrencyAmount.fromRawAmount(
            lendgine.token1,
            p.tokensOwed.toString()
          ),
        };
      });
    },
    refetchInterval: userRefectchInterval,
  });
};
