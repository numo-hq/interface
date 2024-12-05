import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { parseContractResult } from "@wagmi/core";
import type { Abi } from "abitype";
import * as React from "react";
import type { ReadContractConfig, ReadContractResult } from "wagmi/actions";
import { readContract } from "wagmi/actions";

import type { PartialBy, QueryFunctionArgs } from "./types";
import { useChain } from "../useChain";

export type UseContractReadConfig<
  TAbi extends Abi = Abi,
  TFunctionName extends string = string,
  TSelectData = ReadContractResult<TAbi, TFunctionName>
> = PartialBy<
  ReadContractConfig<TAbi, TFunctionName>,
  "abi" | "address" | "args" | "functionName"
> &
  UseQueryOptions<ReadContractResult<TAbi, TFunctionName>, Error, TSelectData>;

type QueryKeyArgs = Omit<ReadContractConfig, "abi">;

function queryKey({
  address,
  args,
  chainId,
  functionName,
  overrides,
}: QueryKeyArgs) {
  return [
    {
      entity: "readContract",
      contracts: [
        {
          address,
          args,
          functionName,
        },
      ],
      chainId,
      overrides,
    },
  ] as const;
}

function queryFn<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string
>({ abi }: { abi?: Abi | readonly unknown[] }) {
  return async ({
    queryKey: [
      {
        chainId,
        overrides,
        contracts: [{ address, args, functionName }],
      },
    ],
  }: QueryFunctionArgs<typeof queryKey>) => {
    if (!abi) throw new Error("abi is required");
    if (!address) throw new Error("address is required");
    return ((await readContract({
      address,
      args,
      chainId,
      // TODO: Remove cast and still support `Narrow<TAbi>`
      abi: abi as Abi,
      functionName,
      overrides,
    })) ?? null) as ReadContractResult<TAbi, TFunctionName>;
  };
}

export function useContractRead<
  TAbi extends Abi,
  TFunctionName extends string,
  TSelectData = ReadContractResult<TAbi, TFunctionName>
>({
  abi,
  address,
  args,
  cacheTime,
  enabled: enabled_ = true,
  functionName,
  isDataEqual,
  onError,
  onSettled,
  onSuccess,
  overrides,
  select,
  staleTime,
  suspense,
  refetchInterval,
}: UseContractReadConfig<TAbi, TFunctionName, TSelectData>) {
  const chainId = useChain();

  const queryKey_ = React.useMemo(
    () =>
      queryKey({
        address,
        args,
        chainId,
        functionName,
        overrides,
      } as Omit<ReadContractConfig, "abi">),
    [address, args, chainId, functionName, overrides]
  );

  const enabled = React.useMemo(() => {
    const enabled = Boolean(enabled_ && abi && address && functionName);
    return enabled;
  }, [abi, address, enabled_, functionName]);

  return useQuery({
    queryKey: queryKey_,
    queryFn: queryFn({
      // TODO: Remove cast and still support `Narrow<TAbi>`
      abi: abi as Abi,
    }),
    refetchInterval: refetchInterval as number,
    cacheTime,
    enabled,
    isDataEqual,
    select: (data) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result =
        abi && functionName
          ? parseContractResult({
              // TODO: Remove cast and still support `Narrow<TAbi>`
              abi: abi as Abi,
              data,
              functionName,
            })
          : data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument
      return select ? select(result) : result;
    },
    staleTime,
    suspense,
    onError,
    onSettled,
    onSuccess,
  });
}
