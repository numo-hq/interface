import { getAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { AddressZero } from "@ethersproject/constants";
import { useQueryClient } from "@tanstack/react-query";
import { Fraction, Token } from "@uniswap/sdk-core";
import { useCallback, useMemo, useState } from "react";
import invariant from "tiny-invariant";
import type { usePrepareContractWrite } from "wagmi";
import { useAccount } from "wagmi";

import type { Lendgine } from "../../../constants/types";
import { useEnvironment } from "../../../contexts/environment2";
import {
  useFactoryCreateLendgine,
  usePrepareFactoryCreateLendgine,
} from "../../../generated";
import { useBalance } from "../../../hooks/useBalance";
import { useChain } from "../../../hooks/useChain";
import { useMostLiquidMarket } from "../../../hooks/useExternalExchange";
import { useAllLendgines } from "../../../hooks/useLendgine";
import type { WrappedTokenInfo } from "../../../hooks/useTokens2";
import { useDefaultTokenList } from "../../../hooks/useTokens2";
import { useBeet } from "../../../utils/beet";
import {
  formatDisplayWithSoftLimit,
  formatPrice,
  fractionToFloat,
} from "../../../utils/format";
import {
  fractionToPrice,
  priceToFraction,
  priceToReserves,
} from "../../../utils/Numoen/price";
import { scale } from "../../../utils/Numoen/trade";
import tryParseCurrencyAmount from "../../../utils/tryParseCurrencyAmount";
import { AssetSelection } from "../../common/AssetSelection";
import { AsyncButton } from "../../common/AsyncButton";
import { CenterSwitch } from "../../common/CenterSwitch";
import { Plus } from "../../common/Plus";
import { RowBetween } from "../../common/RowBetween";
import { PageMargin } from "../../layout";

export const Create: React.FC = () => {
  const Beet = useBeet();
  const queryClient = useQueryClient();
  const environment = useEnvironment();
  const { address } = useAccount();
  const chainID = useChain();

  const tokens = useDefaultTokenList();
  const lendgines = useAllLendgines();

  const [token0, setToken0] = useState<WrappedTokenInfo | undefined>(undefined);
  const [token1, setToken1] = useState<WrappedTokenInfo | undefined>(undefined);
  const [token0Input, setToken0Input] = useState("");
  const [token1Input, setToken1Input] = useState("");
  const [bound, setBound] = useState(new Fraction(1));

  const token0Balance = useBalance(token0, address);
  const token1Balance = useBalance(token1, address);

  // price is in terms of quote / base

  const mostLiquidQuery = useMostLiquidMarket(
    !!token0 && !!token1 ? ([token0, token1] as const) : null
  );

  const currentPrice = useMemo(() => {
    const invertPriceQuery =
      token0 && token1 ? token1.sortsBefore(token0) : null;

    if (!mostLiquidQuery.data) return null;
    return invertPriceQuery
      ? mostLiquidQuery.data.price.invert()
      : mostLiquidQuery.data.price;
  }, [mostLiquidQuery.data, token0, token1]);

  const { token0InputAmount, token1InputAmount } = useMemo(() => {
    const parsedAmount =
      tryParseCurrencyAmount(token0Input, token0) ??
      tryParseCurrencyAmount(token1Input, token1);
    if (!parsedAmount || !token0 || !token1 || !currentPrice) return {};

    const lendgine: Lendgine = {
      token0,
      token0Exp: token0.decimals,
      token1,
      token1Exp: token1.decimals,
      lendgine: new Token(chainID, AddressZero, 18),
      address: AddressZero,
      bound: fractionToPrice(bound, token1, token0),
    };

    const { token0Amount, token1Amount } = priceToReserves(
      lendgine,
      currentPrice
    );

    const liquidity = parsedAmount.currency.equals(lendgine.token0)
      ? token0Amount.invert().quote(parsedAmount)
      : token1Amount.invert().quote(parsedAmount);

    const positionSize = liquidity;

    const token0InputAmount = token0Amount.quote(liquidity);
    const token1InputAmount = token1Amount.quote(liquidity);

    return {
      liquidity,
      positionSize,
      token0InputAmount,
      token1InputAmount,
    };
  }, [bound, chainID, currentPrice, token0, token0Input, token1, token1Input]);

  const onInput = useCallback((value: string, field: "token0" | "token1") => {
    field === "token0" ? setToken0Input(value) : setToken1Input(value);
    field === "token0" ? setToken1Input("") : setToken0Input("");
  }, []);

  const removeToken0 = useMemo(
    () => (tokens.data ? tokens.data.filter((t) => t !== token0) : undefined),
    [token0, tokens.data]
  );

  const removeToken1 = useMemo(
    () => (tokens.data ? tokens.data.filter((t) => t !== token1) : undefined),
    [token1, tokens.data]
  );

  const prepare = usePrepareFactoryCreateLendgine({
    args:
      token0 && token1
        ? [
            getAddress(token0.address),
            getAddress(token1.address),
            token0.decimals,
            token1.decimals,
            BigNumber.from(bound.multiply(scale).quotient.toString()),
          ]
        : undefined,
    address: environment.base.factory,
    enabled: !!token0 && !!token1,
  });
  const write = useFactoryCreateLendgine(prepare.data);

  const disableReason = useMemo(
    () =>
      !token0 || !token1
        ? "Select a token"
        : !tokens || !currentPrice || lendgines === null || !prepare.config
        ? "Loading"
        : !token0.equals(environment.interface.wrappedNative) &&
          !token0.equals(environment.interface.stablecoin) &&
          !token1.equals(environment.interface.wrappedNative) &&
          !token1.equals(environment.interface.stablecoin)
        ? `One token must be ${
            environment.interface.wrappedNative.symbol ?? ""
          } or ${environment.interface.stablecoin.symbol ?? ""}`
        : priceToFraction(currentPrice).greaterThan(bound)
        ? "Bound can't be below current price"
        : lendgines.find(
            (l) =>
              l.token0.equals(token0) &&
              l.token1.equals(token1) &&
              l.bound.equalTo(fractionToPrice(bound, token1, token0))
          )
        ? " Market already exists"
        : null,
    [
      bound,
      currentPrice,
      environment.interface.stablecoin,
      environment.interface.wrappedNative,
      lendgines,
      prepare.config,
      token0,
      token1,
      tokens,
    ]
  );

  return (
    <PageMargin tw="w-full pt-8 max-w-lg">
      <div tw="flex flex-col lg:pt-12  gap-4">
        <h1 tw="text-xl font-semibold">Create a new market</h1>
        <p>
          Numoen allows for the permissionless creation of markets. Read here to
          learn more about the structure of a Numoen market.
        </p>
        <div tw="flex flex-col rounded-lg border-2 border-stroke">
          <AssetSelection
            onSelect={setToken1}
            tokens={removeToken0}
            selectedValue={token1 ?? null}
            label="Long"
            inputValue={
              token1Input === ""
                ? token1InputAmount?.toSignificant(5) ?? "" // TODO: use smart currency formatter
                : token1Input
            }
            inputOnChange={(value) => {
              onInput(value, "token1");
            }}
            currentAmount={{
              amount: token1Balance.data,
              allowSelect: true,
            }}
          />
          <div tw=" border-b-2 w-full border-stroke" />

          <CenterSwitch icon="plus" />
          <AssetSelection
            onSelect={setToken0}
            tokens={removeToken1}
            selectedValue={token0 ?? null}
            label="Short"
            inputValue={
              token0Input === ""
                ? token0InputAmount?.toSignificant(5) ?? ""
                : token0Input
            }
            inputOnChange={(value) => {
              onInput(value, "token0");
            }}
            currentAmount={{
              amount: token0Balance.data,
              allowSelect: true,
            }}
          />
        </div>

        <RowBetween tw="items-center p-0">
          <p>Bound</p>
          <div tw="flex items-center gap-1">
            <p tw="text-end">
              {formatDisplayWithSoftLimit(fractionToFloat(bound), 4, 6, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 4,
              })}
            </p>
            <Plus icon="minus" onClick={() => setBound(bound.divide(2))} />
            <Plus icon="plus" onClick={() => setBound(bound.multiply(2))} />
          </div>
        </RowBetween>
        {currentPrice && (
          <div tw="w-full justify-end flex mt-[-1rem]">
            <p tw="text-xs">
              <span tw="text-secondary">Current price: </span>
              {formatPrice(currentPrice)} {token0?.symbol} / {token1?.symbol}
            </p>
          </div>
        )}

        <AsyncButton
          variant="primary"
          tw="h-12 text-lg"
          disabled={!!disableReason}
          onClick={async () => {
            invariant(token0 && token1);
            await Beet([
              {
                stageTitle: `New ${token1.symbol ?? ""} + ${
                  token0.symbol ?? ""
                } market`,
                parallelTransactions: [
                  {
                    title: `New ${token1.symbol ?? ""} + ${
                      token0.symbol ?? ""
                    } market`,
                    tx: {
                      prepare: prepare as ReturnType<
                        typeof usePrepareContractWrite
                      >,
                      send: write,
                    },
                  },
                ],
              },
            ]);

            setToken0(undefined);
            setToken1(undefined);
            setToken0Input("");
            setToken1Input("");
            setBound(new Fraction(1));
            await queryClient.invalidateQueries(["exisiting lendgines"]); // lendgines will be refetched, hopefully with our new one
          }}
        >
          {disableReason ?? "Create new market"}
        </AsyncButton>
      </div>
    </PageMargin>
  );
};
