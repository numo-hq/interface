import { useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { useAccount } from "wagmi";

import { useTrade } from ".";
import { Returns } from "./Returns";
import { Stats } from "./Stats";
import { useMintAmount } from "../../../hooks/useAmounts";

import { useBalance } from "../../../hooks/useBalance";
import { useMostLiquidMarket } from "../../../hooks/useExternalExchange";
import { useLendgine } from "../../../hooks/useLendgine";
import { useMint } from "../../../hooks/useMint";

import { nextHighestLendgine, nextLowestLendgine } from "../../../lib/price";
import { Beet } from "../../../utils/beet";

import { dedupe } from "../../../utils/dedupe";
import tryParseCurrencyAmount from "../../../utils/tryParseCurrencyAmount";
import { AssetSelection } from "../../common/AssetSelection";
import { AsyncButton } from "../../common/AsyncButton";
import { BigNumericInput } from "../../common/inputs/BigNumericInput";
import { PageMargin } from "../../layout";

export const TradeInner: React.FC = () => {
  const { address } = useAccount();
  const { token0, setToken0, token1, setToken1, lendgines } = useTrade();
  const [input, setInput] = useState("");

  const balanceQuery = useBalance(token1, address);
  const priceQuery = useMostLiquidMarket(
    token0 && token1 ? { quote: token0, base: token1 } : undefined
  );

  const tokens = useMemo(
    () =>
      dedupe(
        lendgines.flatMap((l) => [l.token0, l.token1]),
        (t) => `${t.address}_${t.chainId}`
      ),
    [lendgines]
  );

  const tokens0 = useMemo(
    () =>
      !token1
        ? tokens
        : dedupe(
            lendgines
              .filter((l) => l.token1.equals(token1))
              .map((l) => l.token0),
            (t) => `${t.address}_${t.chainId}`
          ),
    [lendgines, token1, tokens]
  );
  const tokens1 = useMemo(
    () =>
      !token0
        ? tokens
        : dedupe(
            lendgines
              .filter((l) => l.token0.equals(token0))
              .map((l) => l.token1),
            (t) => `${t.address}_${t.chainId}`
          ),
    [lendgines, token0, tokens]
  );

  const selectedLendgine = useMemo(() => {
    if (priceQuery.status !== "success" || !token0 || !token1) return undefined;
    const similarLendgines = lendgines.filter(
      (l) => l.token0.equals(token0) && l.token1.equals(token1)
    );
    const nextLongLendgine = nextHighestLendgine({
      price: priceQuery.data.price,
      lendgines: similarLendgines,
    });

    const secondLongLendgine = nextLowestLendgine({
      price: priceQuery.data.price,
      lendgines: similarLendgines,
    });

    return nextLongLendgine ?? secondLongLendgine;
  }, [lendgines, priceQuery.data?.price, priceQuery.status, token0, token1]);

  const parsedAmount = useMemo(
    () => tryParseCurrencyAmount(input, token1),
    [input, token1]
  );

  const lendgineInfoQuery = useLendgine(selectedLendgine);
  const mintAmounts = useMintAmount(selectedLendgine, parsedAmount, "pmmp");
  const mint = useMint(selectedLendgine, parsedAmount, "pmmp");

  const disableReason = useMemo(
    () =>
      !token0 || !token1
        ? "Select a token"
        : input === ""
        ? "Enter an amount"
        : !parsedAmount
        ? "Invalid amount"
        : !priceQuery.data
        ? "Loading"
        : !selectedLendgine
        ? "No route found"
        : !balanceQuery.data
        ? "Loading"
        : parsedAmount.greaterThan(balanceQuery.data)
        ? "Insufficient balance"
        : mintAmounts.status !== "success" ||
          !lendgineInfoQuery.data ||
          !mint.data
        ? "Loading"
        : mintAmounts.liquidity.greaterThan(
            lendgineInfoQuery.data?.totalLiquidity
          )
        ? "Insufficient liqudity"
        : null,
    [
      balanceQuery.data,
      input,
      lendgineInfoQuery.data,
      mint.data,
      mintAmounts.liquidity,
      mintAmounts.status,
      parsedAmount,
      priceQuery.data,
      selectedLendgine,
      token0,
      token1,
    ]
  );
  return (
    <PageMargin tw="w-full pb-12 sm:pb-0 flex flex-col gap-2">
      <div tw="w-full max-w-5xl rounded bg-white  border border-gray-200 items-center pt-12 md:pt-20 px-6 pb-6 shadow mb-12">
        <div tw="flex flex-col lg:flex-row lg:justify-between gap-4 lg:items-center">
          <p tw="font-bold text-2xl sm:text-4xl">Trade Power Tokens</p>
          <p tw=" sm:text-lg text-[#8f8f8f] max-w-md">
            Power tokens maintain constant leverage, through a novel mechanism
            of borrowing AMM shares.
          </p>
        </div>
      </div>
      <div tw="flex border border-gray-200 rounded-xl overflow-hidden p-2 flex-col bg-white gap-6 max-w-lg">
        <div tw="flex border border-gray-200 rounded-xl overflow-hidden bg-white w-full">
          <div tw="flex flex-col">
            <AssetSelection
              tw="p-2"
              label="Long"
              hideInput={true}
              selectedValue={token1}
              onSelect={setToken1}
              tokens={tokens1}
            />
            <div tw="border-b border-gray-200 w-full" />
            {/* TODO: add switch */}
            <AssetSelection
              tw="p-2"
              label="Short"
              hideInput={true}
              selectedValue={token0}
              onSelect={setToken0}
              tokens={tokens0}
            />
          </div>
          <div tw="bg-gray-100 p-2 w-full">
            <p tw="text-secondary text-sm z-20 fixed">
              Amount{token1 && ` (${token1.symbol})`}
            </p>
            {/* TODO: add balance */}
            <BigNumericInput
              tw="text-right text-5xl text-black w-full overflow-hidden bg-gray-100 h-full"
              disabled={!token1}
              value={input}
              onChange={setInput}
              placeholder="0"
            />
          </div>
        </div>
        <AsyncButton
          variant="primary"
          tw="h-12 text-xl font-bold items-center"
          disabled={!!disableReason}
          onClick={async () => {
            invariant(mint.data);
            await Beet(mint.data);

            setInput("");
          }}
        >
          {disableReason ?? "Trade"}
        </AsyncButton>
        {/* TODO: add borrow rate */}
        {selectedLendgine && <Stats lendgine={selectedLendgine} />}
        {selectedLendgine && <Returns lendgine={selectedLendgine} />}
      </div>
    </PageMargin>
  );
};
