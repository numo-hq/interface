import { CurrencyAmount, Fraction } from "@uniswap/sdk-core";
import type { Address } from "wagmi";

import type { HookArg, ReadConfig } from "./internal/types";
import { useContractRead } from "./internal/useContractRead";
import { userRefectchInterval } from "./internal/utils";
import { liquidityManagerABI } from "../abis/liquidityManager";
import type { Protocol } from "../constants";
import { useEnvironment } from "../contexts/useEnvironment";
import { scale } from "../lib/constants";
import { fractionToPrice } from "../lib/price";
import type { Lendgine } from "../lib/types/lendgine";

export const useLendginePosition = <L extends Lendgine>(
  lendgine: HookArg<L>,
  address: HookArg<Address>,
  protocol: Protocol
) => {
  const environment = useEnvironment();
  const protocolConfig = environment.procotol[protocol]!;

  const config =
    !!lendgine && !!address
      ? getLendginePositionRead(
          lendgine,
          address,
          protocolConfig.liquidityManager
        )
      : {
          address: undefined,
          args: undefined,
          functionName: undefined,
          abi: undefined,
        };

  return useContractRead({
    ...config,
    staleTime: Infinity,
    enabled: !!lendgine && !!address,
    select: (data) => {
      if (!lendgine) return undefined;
      return {
        size: CurrencyAmount.fromRawAmount(
          lendgine.lendgine,
          data.size.toString()
        ),
        rewardPerPositionPaid: fractionToPrice(
          new Fraction(data.rewardPerPositionPaid.toString(), scale),
          lendgine.lendgine,
          lendgine.token1
        ),
        tokensOwed: CurrencyAmount.fromRawAmount(
          lendgine.token1,
          data.tokensOwed.toString()
        ),
      };
    },
    refetchInterval: userRefectchInterval,
  });
};

export const getLendginePositionRead = <L extends Lendgine>(
  lendgine: Pick<L, "address">,
  address: Address,
  liquidityManager: Address
) =>
  ({
    address: liquidityManager,
    args: [address, lendgine.address],
    abi: liquidityManagerABI,
    functionName: "positions",
  } as const satisfies ReadConfig<typeof liquidityManagerABI, "positions">);
