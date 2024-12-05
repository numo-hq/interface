import type { NativeCurrency, Percent } from "@uniswap/sdk-core";
import type { Address } from "wagmi";

import { arbitrumConfig } from "./arbitrum";
import { celoConfig } from "./celo";
import { polygonConfig } from "./polygon";
import type { chains } from "../AppWithProviders";
import type { Lendgine } from "../lib/types/lendgine";
import type { Market } from "../lib/types/market";
import type { WrappedTokenInfo } from "../lib/types/wrappedTokenInfo";

export type SupportedChainIDs = (typeof chains)[number]["id"];

export type NumoenBaseConfig = {
  factory: Address;
  lendgineRouter: Address;
  liquidityManager: Address;
};

export type Config = (typeof config)[keyof typeof config];

export type Protocol = keyof Config["procotol"];

type UniswapConfig = {
  subgraph: string;
  factoryAddress: Address;
  pairInitCodeHash: `0x${string}`;
};

type LiquidStakingConfig = {
  return: Percent;
  lendgine: Lendgine;
  color: `#${string}`;
};

export type NumoenInterfaceConfig = {
  uniswapV2: UniswapConfig;
  uniswapV3: UniswapConfig;
  numoenSubgraph: string;
  wrappedNative: WrappedTokenInfo;
  native?: NativeCurrency;
  liquidStaking?: LiquidStakingConfig;
  specialtyMarkets?: readonly Market[];
};

export const config: {
  [chain in SupportedChainIDs]: {
    interface: NumoenInterfaceConfig;
    procotol: { pmmp: NumoenBaseConfig; stpmmp?: NumoenBaseConfig };
  };
} = {
  42161: arbitrumConfig,
  42220: celoConfig,
  137: polygonConfig,
};
