import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { parseContractResult } from "@wagmi/core";
import type { Contract } from "@wagmi/core/internal";
import type { Abi } from "abitype";
import * as React from "react";
import type { Address } from "wagmi";
import type { ReadContractsConfig, ReadContractsResult } from "wagmi/actions";
import { readContracts } from "wagmi/actions";

import type { DeepPartial, QueryFunctionArgs } from "./types";
import { useChain } from "../useChain";

export type UseContractReadsConfig<
  TContracts extends Contract[],
  TSelectData = ReadContractsResult<TContracts>,
  Config = ReadContractsConfig<TContracts>
> = {
  [K in keyof Config]?: K extends "contracts"
    ? DeepPartial<Config[K], 2>
    : Config[K];
} & UseQueryOptions<ReadContractsResult<TContracts>, Error, TSelectData>;

type QueryKeyArgs<TContracts extends Contract[]> =
  ReadContractsConfig<TContracts>;
type QueryKeyConfig = {
  chainId?: number;
};

function queryKey<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string,
  TContracts extends {
    abi: TAbi;
    functionName: TFunctionName;
  }[]
>({
  allowFailure,
  chainId,
  contracts,
  overrides,
}: QueryKeyArgs<TContracts> & QueryKeyConfig) {
  return [
    {
      entity: "readContracts",
      allowFailure,
      chainId,
      contracts: ((contracts ?? []) as unknown as ContractConfig[]).map(
        ({ address, args, functionName }) => ({
          address,
          args,
          functionName,
        })
      ),
      overrides,
    },
  ] as const;
}

function queryFn<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string,
  TContracts extends {
    abi: TAbi;
    functionName: TFunctionName;
  }[]
>({ abis }: { abis: (Abi | readonly unknown[])[] }) {
  return ({
    queryKey: [{ allowFailure, contracts: contracts_, overrides }],
  }: QueryFunctionArgs<typeof queryKey<TAbi, TFunctionName, TContracts>>) => {
    const contracts = (contracts_ as unknown as ContractConfig[]).map(
      (contract, i) => ({
        ...contract,
        abi: abis[i] as Abi,
      })
    );
    return readContracts({
      allowFailure,
      contracts,
      overrides,
    }) as Promise<ReadContractsResult<TContracts>>;
  };
}

type ContractConfig = {
  abi: Abi;
  address: Address;
  args: unknown[];
  chainId?: number;
  functionName: string;
};

export function useContractReads<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string,
  TContracts extends {
    abi: TAbi;
    functionName: TFunctionName;
  }[],
  TSelectData = ReadContractsResult<TContracts>
>({
  allowFailure = true,
  cacheTime,
  contracts,
  enabled: enabled_ = true,
  isDataEqual,
  keepPreviousData,
  onError,
  onSettled,
  onSuccess,
  overrides,
  select,
  staleTime,
  suspense,
  refetchInterval,
}: UseContractReadsConfig<
  TContracts,
  TSelectData
>): // Need explicit type annotation so TypeScript doesn't expand return type into recursive conditional
UseQueryResult<TSelectData, Error> {
  const chainId = useChain();

  const queryKey_ = React.useMemo(
    () =>
      queryKey({
        allowFailure,
        chainId,
        contracts: contracts as unknown as ContractConfig[],
        overrides,
      }),
    [allowFailure, chainId, contracts, overrides]
  );

  const enabled = React.useMemo(() => {
    const enabled = Boolean(
      enabled_ &&
        (contracts as unknown as ContractConfig[])?.every(
          (x) => x.abi && x.address && x.functionName
        )
    );
    return enabled;
  }, [contracts, enabled_]);

  const abis = ((contracts ?? []) as unknown as ContractConfig[]).map(
    ({ abi }) => abi
  );

  return useQuery({
    queryKey: queryKey_,
    queryFn: queryFn({ abis }),
    refetchInterval: refetchInterval as number,
    cacheTime,
    enabled,
    isDataEqual,
    keepPreviousData,
    staleTime,
    select(data) {
      const result = data.map((data, i) => {
        const { abi, functionName } = (contracts?.[i] ?? {}) as ContractConfig;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return abi && functionName
          ? parseContractResult({ abi, functionName, data })
          : data;
      }) as ReadContractsResult<TContracts>;
      return (select ? select(result) : result) as TSelectData;
    },
    suspense,
    onError,
    onSettled,
    onSuccess,
  });
}
