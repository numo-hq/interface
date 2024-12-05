import { Ether, Percent, Price, Token } from "@uniswap/sdk-core";
import { utils } from "ethers";

import type { Config } from ".";
import { Stable, WrappedNative } from "./tokens";
import { chainID } from "../lib/constants";
import { WrappedTokenInfo } from "../lib/types/wrappedTokenInfo";

const USDT = new WrappedTokenInfo({
  name: "Tether USD",
  address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  symbol: "USDT",
  decimals: 6,
  chainId: 42161,
  logoURI:
    "https://assets.coingecko.com/coins/images/325/small/Tether.png?1668148663",
  color: {
    muted: undefined,
    vibrant: undefined,
    lightMuted: undefined,
    lightVibrant: undefined,
    darkMuted: undefined,
    darkVibrant: undefined,
  },
});

const wstETH = new WrappedTokenInfo({
  name: "Wrapped liquid staked Ether 2.0",
  symbol: "wstETH",
  decimals: 18,
  address: "0x5979D7b546E38E414F7E9822514be443A4800529",
  chainId: 42161,
  logoURI:
    "https://assets.coingecko.com/coins/images/18834/small/wstETH.png?1633565443",
  color: {
    muted: "#00a3ff",
    vibrant: "#00a3ff",
    lightMuted: "#00a3ff",
    lightVibrant: "#00a3ff",
    darkMuted: "#00a3ff",
    darkVibrant: "#00a3ff",
  },
});

export const arbitrumConfig = {
  interface: {
    uniswapV2: {
      subgraph:
        "https://api.thegraph.com/subgraphs/name/sushiswap/exchange-arbitrum-backup",
      factoryAddress: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4",
      pairInitCodeHash:
        "0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303",
    },
    uniswapV3: {
      subgraph:
        "https://api.thegraph.com/subgraphs/name/ianlapham/arbitrum-dev",
      factoryAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      pairInitCodeHash:
        "0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54",
    },
    liquidStaking: {
      return: new Percent(45, 1000),
      lendgine: {
        token0: WrappedNative[chainID.arbitrum],
        token0Exp: WrappedNative[chainID.arbitrum].decimals,
        token1: wstETH,
        token1Exp: wstETH.decimals,
        bound: new Price(wstETH, WrappedNative[chainID.arbitrum], 10, 16),
        address: "0x327319fdce6fac0eb1751dc2234cBdA7F5B43E2A",
        lendgine: new Token(
          42161,
          "0x327319fdce6fac0eb1751dc2234cBdA7F5B43E2A",
          18
        ),
      },
      color: "#00a3ff",
    },
    numoenSubgraph:
      "https://api.thegraph.com/subgraphs/name/kyscott18/numoen-arbitrum",
    wrappedNative: WrappedNative[chainID.arbitrum],
    native: Ether.onChain(chainID.arbitrum),
    specialtyMarkets: [
      { base: Stable[chainID.arbitrum], quote: USDT },
      {
        base: WrappedNative[chainID.arbitrum],
        quote: Stable[chainID.arbitrum],
      },
    ],
  },
  procotol: {
    pmmp: {
      factory: utils.getAddress("0x8396a792510a402681812ece6ad3ff19261928ba"),
      lendgineRouter: utils.getAddress(
        "0x6a931466f6C79724CB5E78EaB6E493b6AF189FF0"
      ),
      liquidityManager: utils.getAddress(
        "0x6b0c66824c39766f554F07481B66ca24A54A90E0"
      ),
    },
    stpmmp: {
      factory: "0x58db4e36755699188ff21E68A11308fDEb8792b5",
      liquidityManager: "0xe964F66B143E2C4752F3F4d37bfc9e74dE4e6eEB",
      lendgineRouter: "0xC63292042D983C2196ab52F4101043F128EcEF67",
    },
  },
} as const satisfies Config;
