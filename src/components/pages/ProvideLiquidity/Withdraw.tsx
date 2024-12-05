import { useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { useAccount } from "wagmi";

import { useProvideLiquidity } from ".";
import { useWithdrawAmount } from "../../../hooks/useAmounts";
import { useLendgine } from "../../../hooks/useLendgine";
import { useLendginePosition } from "../../../hooks/useLendginePosition";
import { useWithdraw } from "../../../hooks/useWithdraw";
import { Beet } from "../../../utils/beet";
import { formatDisplayWithSoftLimit } from "../../../utils/format";
import { AssetSelection } from "../../common/AssetSelection";
import { AsyncButton } from "../../common/AsyncButton";
import { CenterSwitch } from "../../common/CenterSwitch";
import { PercentageSlider } from "../../common/inputs/PercentageSlider";

export const Withdraw: React.FC = () => {
  const { address } = useAccount();
  const { selectedLendgine, protocol } = useProvideLiquidity();

  const [withdrawPercent, setWithdrawPercent] = useState(20);

  const lendgineInfoQuery = useLendgine(selectedLendgine);
  const positionQuery = useLendginePosition(
    selectedLendgine,
    address,
    protocol
  );

  const size = useMemo(
    () =>
      positionQuery.data
        ? positionQuery.data.size.multiply(withdrawPercent).divide(100)
        : undefined,
    [positionQuery.data, withdrawPercent]
  );
  const withdrawAmount = useWithdrawAmount(
    selectedLendgine,
    size ? { size: size } : undefined,
    protocol
  );
  const withdraw = useWithdraw(
    selectedLendgine,
    size ? { size: size } : undefined,
    protocol
  );

  const disableReason = useMemo(
    () =>
      withdrawPercent === 0
        ? "Slide to amount"
        : !positionQuery.data || !size
        ? "Loading"
        : positionQuery.data.size.equalTo(0)
        ? "Insufficient balance"
        : size.equalTo(0)
        ? "Invalid amount"
        : withdrawAmount.status !== "success" ||
          withdraw.status !== "success" ||
          !lendgineInfoQuery.data
        ? "Loading"
        : withdrawAmount.liquidity.greaterThan(
            lendgineInfoQuery.data.totalLiquidity
          )
        ? "Insufficent liquidity"
        : null,
    [
      lendgineInfoQuery.data,
      positionQuery.data,
      size,
      withdraw.status,
      withdrawAmount.liquidity,
      withdrawAmount.status,
      withdrawPercent,
    ]
  );

  return (
    <>
      <div tw="flex flex-col rounded-xl border-2 border-gray-200 bg-white">
        <div tw=" px-6 h-20 justify-center py-2 gap-2 flex flex-col w-full">
          <PercentageSlider
            disabled={false}
            input={withdrawPercent}
            onChange={setWithdrawPercent}
          />
        </div>
        <div tw=" border-b-2 w-full border-gray-200" />
        <CenterSwitch icon="arrow" />
        <AssetSelection
          tw="justify-center"
          selectedValue={selectedLendgine.token0}
          inputValue={
            withdrawAmount.status === "success" &&
            withdrawAmount.amount0.greaterThan(0)
              ? formatDisplayWithSoftLimit(
                  Number(withdrawAmount.amount0.toFixed(6)),
                  4,
                  10
                )
              : ""
          }
          inputDisabled={true}
        />
        <div tw=" border-b-2 w-full border-gray-200" />
        <CenterSwitch icon="plus" />
        <AssetSelection
          tw="justify-center"
          selectedValue={selectedLendgine.token1}
          inputValue={
            withdrawAmount.status === "success" &&
            withdrawAmount.amount1.greaterThan(0)
              ? formatDisplayWithSoftLimit(
                  Number(withdrawAmount.amount1.toFixed(6)),
                  4,
                  10
                )
              : ""
          }
          inputDisabled={true}
        />
      </div>
      <AsyncButton
        variant="primary"
        tw="h-12 text-xl font-bold items-center"
        disabled={!!disableReason}
        onClick={async () => {
          invariant(withdraw.data);
          await Beet(withdraw.data);
        }}
      >
        {disableReason ?? "Withdraw"}
      </AsyncButton>
    </>
  );
};
