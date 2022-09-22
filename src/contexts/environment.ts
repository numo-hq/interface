import { ChainId } from "@dahlia-labs/celo-contrib";
import { CELO, CUSD } from "@dahlia-labs/celo-tokens";
import type { TokenAmount } from "@dahlia-labs/token-utils";
import { Price, Token } from "@dahlia-labs/token-utils";
import { createContainer } from "unstated-next";

export interface IMarket {
  token: Token;

  address: string;

  pair: IPair;
}

export interface IPair {
  speculativeToken: Token;
  baseToken: Token;

  lp: Token;

  bound: Price;

  address: string;
}

export interface IPairInfo {
  speculativeAmount: TokenAmount;
  baseAmount: TokenAmount;

  totalLPSupply: TokenAmount;
}

interface Environment {
  markets: readonly IMarket[];
}

const testPair: IPair = {
  speculativeToken: CELO[ChainId.Mainnet],
  baseToken: CUSD[ChainId.Mainnet],

  lp: new Token({
    name: "Numoen LP",
    symbol: "NLP",
    decimals: 18,
    chainId: ChainId.Mainnet,
    address: "0xE2eeEBAf210502aA815008618C89CA9d98d97924",
  }),

  bound: new Price(CUSD[ChainId.Mainnet], CELO[ChainId.Mainnet], 2, 5),

  address: "0xE2eeEBAf210502aA815008618C89CA9d98d97924",
};

const testMarket: IMarket = {
  token: new Token({
    name: "Numoen Lendgine",
    symbol: "NLDG",
    decimals: 18,
    chainId: ChainId.Mainnet,
    address: "0xE2eeEBAf210502aA815008618C89CA9d98d97924",
  }),

  address: "0xE2eeEBAf210502aA815008618C89CA9d98d97924",

  pair: testPair,
};

export const useIsMarket = (address: string | null): boolean => {
  const environment = useEnvironment();
  if (address === null) return false;
  return environment.markets.map((m) => m.address).includes(address);
};

const useEnvironmentInternal = (): Environment => {
  return {
    markets: [testMarket] as const,
  };
};

export const { Provider: EnvironmentProvider, useContainer: useEnvironment } =
  createContainer(useEnvironmentInternal);
