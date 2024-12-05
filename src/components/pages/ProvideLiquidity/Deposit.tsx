import { useCallback, useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { useAccount } from "wagmi";

import { useProvideLiquidity } from ".";
import { useDepositAmount } from "../../../hooks/useAmounts";
import { useBalance } from "../../../hooks/useBalance";
import { useDeposit } from "../../../hooks/useDeposit";
import { useLendgine } from "../../../hooks/useLendgine";
import { Beet } from "../../../utils/beet";
import { formatDisplayWithSoftLimit } from "../../../utils/format";
import tryParseCurrencyAmount from "../../../utils/tryParseCurrencyAmount";
import { AssetSelection } from "../../common/AssetSelection";
import { AsyncButton } from "../../common/AsyncButton";
import { CenterSwitch } from "../../common/CenterSwitch";

export const Deposit: React.FC = () => {
  const { address } = useAccount();

  const { selectedLendgine, protocol } = useProvideLiquidity();
  const token0 = selectedLendgine.token0;
  const token1 = selectedLendgine.token1;

  const lendgineInfoQuery = useLendgine(selectedLendgine);

  const token0Query = useBalance(token0, address);
  const token1Query = useBalance(token1, address);

  const [token0String, setToken0String] = useState("");
  const [token1String, setToken1String] = useState("");

  const { amount0, amount1 } = useDepositAmount(
    selectedLendgine,
    tryParseCurrencyAmount(token0String, token0) ??
      tryParseCurrencyAmount(token1String, token1),
    protocol
  );
  const deposit = useDeposit(
    selectedLendgine,
    tryParseCurrencyAmount(token0String, token0) ??
      tryParseCurrencyAmount(token1String, token1),
    protocol
  );

  const onInput = useCallback(
    (value: string, field: "token0" | "token1") => {
      if (!lendgineInfoQuery.data) {
        field === "token0" ? setToken0String(value) : setToken1String(value);
        return;
      }

      field === "token0" ? setToken0String(value) : setToken1String(value);
      field === "token0" ? setToken1String("") : setToken0String("");
    },
    [lendgineInfoQuery.data]
  );

  const disableReason = useMemo(
    () =>
      token0String === "" && token1String === ""
        ? "Enter an amount"
        : !amount0 || !amount1
        ? "Loading"
        : amount0.equalTo(0) && amount1.equalTo(0)
        ? "Enter an amount"
        : !token0Query.data || !token1Query.data
        ? "Loading"
        : amount0.greaterThan(token0Query.data) ||
          amount1.greaterThan(token1Query.data)
        ? "Insufficient amount"
        : deposit.status !== "success"
        ? "Loading"
        : null,
    [
      amount0,
      amount1,
      deposit.status,
      token0Query.data,
      token0String,
      token1Query.data,
      token1String,
    ]
  );

  return (
    <>
      <div tw="flex flex-col rounded-xl border-2 border-gray-200 bg-white">
        <AssetSelection
          tw="p-2"
          selectedValue={token0}
          inputValue={
            token0String === ""
              ? token1String === ""
                ? ""
                : formatDisplayWithSoftLimit(
                    Number(amount0?.toFixed(6) ?? 0),
                    4,
                    10
                  )
              : token0String
          }
          inputOnChange={(val) => onInput(val, "token0")}
          currentAmount={{ allowSelect: true, amount: token0Query.data }}
        />
        <div tw=" border-b-2 w-full border-gray-200" />

        <CenterSwitch icon="plus" />
        <AssetSelection
          tw="p-2"
          selectedValue={token1}
          inputValue={
            token1String === ""
              ? token0String === ""
                ? ""
                : formatDisplayWithSoftLimit(
                    Number(amount1?.toFixed(6) ?? 0),
                    4,
                    10
                  )
              : token1String
          }
          inputOnChange={(val) => onInput(val, "token1")}
          currentAmount={{ allowSelect: true, amount: token1Query.data }}
        />
      </div>
      <AsyncButton
        variant="primary"
        tw="h-12 text-xl font-bold items-center"
        disabled={!!disableReason}
        onClick={async () => {
          invariant(deposit.data);
          await Beet(deposit.data);

          setToken0String("");
          setToken1String("");
        }}
      >
        {disableReason ?? "Deposit"}
      </AsyncButton>
    </>
  );
};
