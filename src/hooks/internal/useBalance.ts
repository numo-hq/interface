import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { utils } from "ethers";
import * as React from "react";
import type { FetchBalanceArgs, FetchBalanceResult } from "wagmi/actions";
import { fetchBalance } from "wagmi/actions";

import type { QueryFunctionArgs } from "./types";
import { useEnvironment } from "../../contexts/useEnvironment";
import { useChain } from "../useChain";

export type UseBalanceArgs = Partial<FetchBalanceArgs>;

export type UseBalanceConfig<TSelectData = FetchBalanceResult> =
  UseQueryOptions<FetchBalanceResult, Error, TSelectData>;

type QueryKeyArgs = Partial<FetchBalanceArgs>;

function queryKey({ address, chainId, formatUnits, token }: QueryKeyArgs) {
  return [
    {
      entity: "balance",
      chainId,
      formatUnits,
      contracts: [
        {
          address: token,
          args: [address],
          functionName: "balanceOf",
        },
      ],
    },
  ] as const;
}

function queryFn({
  queryKey: [
    {
      chainId,
      formatUnits,

      contracts: [
        {
          args: [address],
        },
      ],
    },
  ],
}: QueryFunctionArgs<typeof queryKey>) {
  if (!address) throw new Error("address is required");
  return fetchBalance({ address, chainId, formatUnits });
}

export function useBalance<TSelectData = FetchBalanceResult>({
  address,
  cacheTime,
  enabled = true,
  formatUnits,
  staleTime,
  suspense,

  select,
  onError,
  onSettled,
  onSuccess,
}: UseBalanceArgs & UseBalanceConfig<TSelectData> = {}) {
  const chainId = useChain();
  const environment = useEnvironment();
  const queryKey_ = React.useMemo(
    () =>
      queryKey({
        token: utils.getAddress(environment.interface.wrappedNative.address),
        address,
        chainId,
        formatUnits,
      }),
    [address, chainId, environment.interface.wrappedNative.address, formatUnits]
  );
  const balanceQuery = useQuery({
    queryKey: queryKey_,
    queryFn,
    cacheTime,
    enabled: Boolean(enabled && address),
    staleTime,
    suspense,
    select: (data) => select!(data),
    onError,
    onSettled,
    onSuccess,
  });

  return balanceQuery;
}
