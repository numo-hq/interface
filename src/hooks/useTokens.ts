import NumoenTokens from "@numoen/default-token-list";
import type { Token } from "@uniswap/sdk-core";
import type { TokenInfo as UniswapTokenInfo } from "@uniswap/token-lists";
import { utils } from "ethers";
import { useCallback } from "react";
import invariant from "tiny-invariant";

import type { HookArg } from "./internal/types";
import { useChain } from "./useChain";
import { useEnvironment } from "../contexts/useEnvironment";
import { WrappedTokenInfo } from "../lib/types/wrappedTokenInfo";
import { dedupe } from "../utils/dedupe";

export type color = `#${string}` | undefined;

export type TokenInfo = UniswapTokenInfo & {
  color?: Record<
    | "muted"
    | "vibrant"
    | "lightMuted"
    | "lightVibrant"
    | "darkMuted"
    | "darkVibrant",
    color
  >;
};

export const useTokens = () => {
  const chain = useChain();
  const isWrappedNative = useGetIsWrappedNative();
  const enviroment = useEnvironment();

  return dedupe(
    (NumoenTokens.tokens as TokenInfo[]).filter((t) => t.chainId === chain),
    (t) => `${t.address}_${t.chainId}`
  ).map((t) => {
    const token = new WrappedTokenInfo(t);
    if (isWrappedNative(token)) {
      invariant(enviroment.interface.native);
      return new WrappedTokenInfo({
        ...t,
        name: enviroment.interface.native.name ?? t.name,
        symbol: enviroment.interface.native.symbol ?? t.symbol,
      });
    }
    return token;
  });
};

export const useAddressToToken = (address: HookArg<string>) => {
  return useGetAddressToToken()(address);
};

export const useGetAddressToToken = () => {
  const tokens = useTokens();

  return useCallback(
    (address: HookArg<string>) => {
      if (!address) return null;
      return (
        tokens.find(
          (t) => utils.getAddress(t.address) === utils.getAddress(address)
        ) ?? null
      );
    },
    [tokens]
  );
};

export const useGetIsWrappedNative = () => {
  const enviroment = useEnvironment();
  return <T extends Token>(token: HookArg<T>) => {
    if (!token) return undefined;

    return !enviroment.interface.native
      ? false
      : enviroment.interface.native.wrapped.equals(token);
  };
};
export const useIsWrappedNative = <T extends Token>(token: HookArg<T>) =>
  useGetIsWrappedNative()(token);
