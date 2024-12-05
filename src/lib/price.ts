import type { CurrencyAmount, Fraction, Token } from "@uniswap/sdk-core";
import { Price } from "@uniswap/sdk-core";
import JSBI from "jsbi";

import type { Lendgine, LendgineInfo } from "./types/lendgine";
import type { WrappedTokenInfo } from "./types/wrappedTokenInfo";

// returns price in token0 / token1
export const numoenPrice = <L extends Lendgine>(
  lendgine: L,
  lendgineInfo: Pick<
    LendgineInfo<L>,
    "reserve0" | "reserve1" | "totalLiquidity"
  >
) => {
  if (lendgineInfo.totalLiquidity.equalTo(0))
    return new Price(lendgine.token1, lendgine.token0, 1, 0);

  const scale1 = tokenToFraction(lendgineInfo.reserve1).divide(
    lendgineInfo.totalLiquidity
  );

  const priceFraction = priceToFraction(lendgine.bound).subtract(
    scale1.divide(2)
  );

  return fractionToPrice(priceFraction, lendgine.token1, lendgine.token0);
};

export const nextHighestLendgine = <L extends Lendgine>(
  props: (
    | {
        price: Price<WrappedTokenInfo, WrappedTokenInfo>;
      }
    | {
        lendgine: L;
      }
  ) & {
    lendgines: Lendgine[];
  }
) => {
  const sortedLendgines = props.lendgines.sort((a, b) =>
    a.bound.greaterThan(b.bound) ? 1 : -1
  );

  const price = "price" in props ? props.price : props.lendgine.bound;

  return sortedLendgines.reduce(
    (acc: Lendgine | null, cur) =>
      acc === null && cur.bound.greaterThan(price) ? cur : acc,
    null
  );
};

export const nextLowestLendgine = <L extends Lendgine>(
  props: (
    | {
        price: Price<WrappedTokenInfo, WrappedTokenInfo>;
      }
    | {
        lendgine: L;
      }
  ) & {
    lendgines: Lendgine[];
  }
) => {
  const sortedLendgines = props.lendgines.sort((a, b) =>
    a.bound.greaterThan(b.bound) ? -1 : 1
  );

  const price = "lendgine" in props ? props.lendgine.bound : props.price;

  return sortedLendgines.reduce(
    (acc: Lendgine | null, cur) =>
      acc === null && cur.bound.lessThan(price) ? cur : acc,
    null
  );
};

export const priceToReserves = <L extends Lendgine>(
  lendgine: L,
  price: Price<L["token1"], L["token0"]>
): {
  token0Amount: Price<L["lendgine"], L["token0"]>;
  token1Amount: Price<L["lendgine"], L["token1"]>;
} => {
  const p = price.greaterThan(lendgine.bound) ? lendgine.bound : price;
  const token0AmountFraction = priceToFraction(p).multiply(priceToFraction(p));
  const token0Amount = fractionToPrice(
    token0AmountFraction,
    lendgine.lendgine,
    lendgine.token0
  );

  const token1AmountFraction = priceToFraction(lendgine.bound)
    .subtract(priceToFraction(p))
    .multiply(2);
  const token1Amount = fractionToPrice(
    token1AmountFraction,
    lendgine.lendgine,
    lendgine.token1
  );

  return { token0Amount, token1Amount };
};

export const fractionToPrice = <TBase extends Token, TQuote extends Token>(
  price: Fraction,
  base: TBase,
  quote: TQuote
) => {
  return new Price(
    base,
    quote,
    JSBI.multiply(
      price.denominator,
      JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(base.decimals))
    ),
    JSBI.multiply(
      price.numerator,
      JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(quote.decimals))
    )
  );
};

export const priceToFraction = <TBase extends Token, TQuote extends Token>(
  price: Price<TBase, TQuote>
) => {
  return price.asFraction
    .multiply(
      JSBI.exponentiate(
        JSBI.BigInt(10),
        JSBI.BigInt(price.baseCurrency.decimals)
      )
    )
    .divide(
      JSBI.exponentiate(
        JSBI.BigInt(10),
        JSBI.BigInt(price.quoteCurrency.decimals)
      )
    );
};

export const tokenToFraction = <T extends Token>(
  tokenAmount: CurrencyAmount<T>
) =>
  tokenAmount.asFraction.multiply(
    JSBI.exponentiate(
      JSBI.BigInt(10),
      JSBI.BigInt(18 - tokenAmount.currency.decimals)
    )
  );

export const invert = <TBase extends Token, TQuote extends Token>(
  price: Price<TBase, TQuote>
) => {
  if (price.equalTo(0))
    return new Price(price.quoteCurrency, price.baseCurrency, 1, 0);
  return price.invert();
};
