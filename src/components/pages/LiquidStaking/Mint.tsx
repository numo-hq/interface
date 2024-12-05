import { useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { useAccount } from "wagmi";

import { useEnvironment } from "../../../contexts/useEnvironment";
import { useMintAmount } from "../../../hooks/useAmounts";
import { useBalance } from "../../../hooks/useBalance";
import { useLendgine } from "../../../hooks/useLendgine";
import { useMint } from "../../../hooks/useMint";
import { Beet } from "../../../utils/beet";
import tryParseCurrencyAmount from "../../../utils/tryParseCurrencyAmount";
import { AssetSelection } from "../../common/AssetSelection";
import { AsyncButton } from "../../common/AsyncButton";

export const Mint: React.FC = () => {
  const { address } = useAccount();
  const environment = useEnvironment();

  const staking = environment.interface.liquidStaking!;
  const [input, setInput] = useState("");

  const balanceQuery = useBalance(staking.lendgine.token1, address);

  const parsedAmount = useMemo(
    () => tryParseCurrencyAmount(input, staking.lendgine.token1),
    [input, staking.lendgine.token1]
  );

  const lendgineInfoQuery = useLendgine(staking.lendgine);
  const mintAmounts = useMintAmount(staking.lendgine, parsedAmount, "stpmmp");
  const mint = useMint(staking.lendgine, parsedAmount, "stpmmp");

  const disableReason = useMemo(
    () =>
      input === ""
        ? "Enter an amount"
        : !parsedAmount
        ? "Invalid amount"
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
    ]
  );

  return (
    <>
      <div tw="border-2 border-gray-200 bg-white rounded-xl">
        <AssetSelection
          tw="p-2"
          selectedValue={staking.lendgine.token1}
          inputValue={input}
          inputOnChange={setInput}
          currentAmount={{ allowSelect: true, amount: balanceQuery.data }}
        />
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
        {disableReason ?? "Deposit"}
      </AsyncButton>
    </>
  );
};
