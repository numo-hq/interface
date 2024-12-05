import { useQuery } from "@tanstack/react-query";
import { Fraction, Token } from "@uniswap/sdk-core";
import { useCallback, useMemo } from "react";

import { userRefectchInterval } from "./internal/utils";
import { useChain } from "./useChain";
import { useClient } from "./useClient";
import { useGetAddressToToken } from "./useTokens";
import { useEnvironment } from "../contexts/useEnvironment";
import { LendginesDocument } from "../gql/numoen/graphql";
import { scale } from "../lib/constants";
import { isValidLendgine } from "../lib/lendgineValidity";
import { fractionToPrice } from "../lib/price";
import type { Lendgine } from "../lib/types/lendgine";
import { parseLendgines } from "../services/graphql/numoen";

export const useExistingLendginesQueryKey = () => {
  const chain = useChain();
  const client = useClient();

  return ["existing lendgines", chain, client.numoen] as const;
};

export const useExistingLendginesQueryFn = () => {
  const client = useClient();
  return useCallback(async () => {
    const lendginesRes = await client.numoen.request(LendginesDocument);
    return parseLendgines(lendginesRes);
  }, [client.numoen]);
};

export const useExistingLendginesQuery = () => {
  const queryKey = useExistingLendginesQueryKey();
  const queryFn = useExistingLendginesQueryFn();

  return useQuery<ReturnType<typeof parseLendgines>>({
    queryKey,
    queryFn,
    staleTime: Infinity,
    refetchInterval: userRefectchInterval,
  });
};

export const useAllLendgines = () => {
  const environment = useEnvironment();
  const addressToToken = useGetAddressToToken();
  const lendginesQuery = useExistingLendginesQuery();
  const chainID = useChain();

  return useMemo(() => {
    if (lendginesQuery.isLoading) return { status: "loading" } as const;
    if (!lendginesQuery.data) return { status: "error" } as const;

    return {
      status: "success",
      lendgines: lendginesQuery.data
        .map((ld): Lendgine | undefined => {
          const token0 = addressToToken(ld.token0);
          const token1 = addressToToken(ld.token1);

          if (!token0 || !token1) return undefined; // tokens must be in token list
          // one of the tokens must be wrapped native or specialty

          const lendgine = {
            token0,
            token1,
            token0Exp: ld.token0Exp,
            token1Exp: ld.token1Exp,
            bound: fractionToPrice(
              new Fraction(ld.upperBound, scale),
              token1,
              token0
            ),
            lendgine: new Token(chainID, ld.address, 18),
            address: ld.address,
          };

          if (
            !isValidLendgine(
              lendgine,
              environment.interface.wrappedNative,
              environment.interface.specialtyMarkets
            )
          )
            return undefined;

          return lendgine;
        })
        .filter((f): f is Lendgine => !!f),
    } as const;
  }, [
    addressToToken,
    chainID,
    environment.interface.specialtyMarkets,
    environment.interface.wrappedNative,
    lendginesQuery.data,
    lendginesQuery.isLoading,
  ]);
};
