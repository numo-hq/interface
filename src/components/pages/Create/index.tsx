import { Fraction, Token } from "@uniswap/sdk-core";
import { constants } from "ethers";
import { useCallback, useMemo, useState } from "react";
import invariant from "tiny-invariant";
import type { Address } from "wagmi";
import { useAccount } from "wagmi";

import { useEnvironment } from "../../../contexts/useEnvironment";
import { useAllLendgines } from "../../../hooks/useAllLendgines";
import { useDepositAmount } from "../../../hooks/useAmounts";
import { useBalance } from "../../../hooks/useBalance";
import { useChain } from "../../../hooks/useChain";
import { useCreate } from "../../../hooks/useCreate";
import { useMostLiquidMarket } from "../../../hooks/useExternalExchange";
import { useTokens } from "../../../hooks/useTokens";
import { isValidLendgine } from "../../../lib/lendgineValidity";
import { fractionToPrice, priceToFraction } from "../../../lib/price";
import type { WrappedTokenInfo } from "../../../lib/types/wrappedTokenInfo";
import { Beet } from "../../../utils/beet";
import {
  formatDisplayWithSoftLimit,
  formatPrice,
  fractionToFloat,
} from "../../../utils/format";
import tryParseCurrencyAmount from "../../../utils/tryParseCurrencyAmount";
import { AssetSelection } from "../../common/AssetSelection";
import { AsyncButton } from "../../common/AsyncButton";
import { CenterSwitch } from "../../common/CenterSwitch";
import { Plus } from "../../common/Plus";
import { RowBetween } from "../../common/RowBetween";
import { PageMargin } from "../../layout";

export const Create: React.FC = () => {
  const environment = useEnvironment();
  const { address } = useAccount();
  const chainID = useChain();

  const tokens = useTokens();
  const lendginesQuery = useAllLendgines();

  const [token0, setToken0] = useState<WrappedTokenInfo | undefined>(undefined);
  const [token1, setToken1] = useState<WrappedTokenInfo | undefined>(undefined);

  const [token0Input, setToken0Input] = useState("");
  const [token1Input, setToken1Input] = useState("");
  const [bound, setBound] = useState(new Fraction(1));

  const token0Balance = useBalance(token0, address);
  const token1Balance = useBalance(token1, address);

  const priceQuery = useMostLiquidMarket(
    !!token0 && !!token1 ? { quote: token0, base: token1 } : null
  );

  const lendgine = useMemo(
    () =>
      !!token0 && !!token1
        ? {
            token0,
            token1,
            token0Exp: token0.decimals,
            token1Exp: token1.decimals,
            bound: fractionToPrice(bound, token1, token0),
            address: constants.AddressZero as Address,
            lendgine: new Token(chainID, constants.AddressZero, 18),
          }
        : undefined,
    [bound, chainID, token0, token1]
  );

  const depositAmount = useDepositAmount(
    lendgine,
    tryParseCurrencyAmount(token0Input, token0) ??
      tryParseCurrencyAmount(token1Input, token1),
    "pmmp"
  );
  const create = useCreate(
    lendgine,
    tryParseCurrencyAmount(token0Input, token0) ??
      tryParseCurrencyAmount(token1Input, token1),
    "pmmp"
  );

  const onInput = useCallback((value: string, field: "token0" | "token1") => {
    field === "token0" ? setToken0Input(value) : setToken1Input(value);
    field === "token0" ? setToken1Input("") : setToken0Input("");
  }, []);

  const removeToken0 = useMemo(
    () => tokens.filter((t) => t !== token0),
    [token0, tokens]
  );

  const removeToken1 = useMemo(
    () => tokens.filter((t) => t !== token1),
    [token1, tokens]
  );

  const disableReason = useMemo(
    () =>
      !token0 || !token1
        ? "Select a token"
        : !priceQuery.data
        ? "Loading"
        : priceToFraction(priceQuery.data.price).greaterThan(bound)
        ? "Bound can't be below current price"
        : !lendgine ||
          !isValidLendgine(
            lendgine,
            environment.interface.wrappedNative,
            environment.interface.specialtyMarkets
          )
        ? "Does not conform to the rules of valid markets"
        : !token0Input && !token1Input
        ? "Enter an amount"
        : !tryParseCurrencyAmount(token0Input, token0) ??
          !tryParseCurrencyAmount(token1Input, token1)
        ? "Invalid amount"
        : lendginesQuery.status !== "success"
        ? "Loading"
        : lendginesQuery.lendgines.find(
            (l) =>
              l.token0.equals(token0) &&
              l.token1.equals(token1) &&
              l.bound.equalTo(fractionToPrice(bound, token1, token0))
          )
        ? " Market already exists"
        : depositAmount.status !== "success" ||
          create.status !== "success" ||
          !token0Balance.data ||
          !token1Balance.data
        ? "Loading"
        : depositAmount.amount0.greaterThan(token0Balance.data) ||
          depositAmount.amount1.greaterThan(token1Balance.data)
        ? "Insufficient amount"
        : null,
    [
      bound,
      create.status,
      depositAmount.amount0,
      depositAmount.amount1,
      depositAmount.status,
      environment.interface.specialtyMarkets,
      environment.interface.wrappedNative,
      lendgine,
      lendginesQuery.lendgines,
      lendginesQuery.status,
      priceQuery.data,
      token0,
      token0Balance.data,
      token0Input,
      token1,
      token1Balance.data,
      token1Input,
    ]
  );

  return (
    <PageMargin tw="w-full pb-12 sm:pb-0 flex flex-col  gap-2">
      <div tw="w-full max-w-5xl bg-white pt-12 md:pt-20 px-6 pb-6 mb-12">
        <div tw="flex flex-col lg:flex-row lg:justify-between gap-4 lg:items-center">
          <p tw="font-bold text-4xl">Create a new market</p>

          <p tw=" text-lg text-[#8f8f8f] max-w-md">
            Numoen allows for the permissionless creation of markets. Read{" "}
            <span tw="underline">
              <a
                href="https://numoen.gitbook.io/numoen/"
                target="_blank"
                rel="noreferrer"
              >
                here
              </a>
            </span>{" "}
            to learn more about the structure of a Numoen market.
          </p>
        </div>
      </div>
      <div tw="flex flex-col gap-2 w-full max-w-lg">
        <div tw="border-2 border-gray-200 bg-white rounded-xl">
          <AssetSelection
            tw="p-2"
            onSelect={setToken1}
            tokens={removeToken0}
            selectedValue={token1}
            label="Long"
            inputValue={
              token1Input === ""
                ? depositAmount.amount1?.toSignificant(5) ?? "" // TODO: use smart currency formatter
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
          <div tw=" border-b-2 w-full border-gray-200" />
          <CenterSwitch icon="plus" />
          <AssetSelection
            tw="p-2"
            onSelect={setToken0}
            tokens={removeToken1}
            selectedValue={token0}
            label="Short"
            inputValue={
              token0Input === ""
                ? depositAmount.amount0?.toSignificant(5) ?? ""
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

        <div tw="border-2 border-gray-200 bg-white gap-4 rounded-xl h-12 justify-center flex flex-col p-2">
          <RowBetween tw="p-0">
            <p tw="text-lg font-medium ">
              Bound{" "}
              {priceQuery.data && (
                <span tw="text-xs text-secondary font-medium">
                  (Price: {formatPrice(priceQuery.data.price)} {token0?.symbol}{" "}
                  / {token1?.symbol})
                </span>
              )}
            </p>
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
        </div>

        <AsyncButton
          variant="primary"
          tw="h-12 text-lg"
          disabled={!!disableReason}
          onClick={async () => {
            invariant(token0 && token1, "token invariant");
            invariant(create.data, "create invariant");
            await Beet(create.data);

            setToken0(undefined);
            setToken1(undefined);
            setToken0Input("");
            setToken1Input("");
            setBound(new Fraction(1));
          }}
        >
          {disableReason ?? "Create new market"}
        </AsyncButton>
      </div>
    </PageMargin>
  );
};
