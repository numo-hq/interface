import { useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { useAccount } from "wagmi";

import { useEnvironment } from "../../../contexts/useEnvironment";
import { useBurnAmount } from "../../../hooks/useAmounts";
import { useBalance } from "../../../hooks/useBalance";
import { useBurn } from "../../../hooks/useBurn";
import { Beet } from "../../../utils/beet";
import { AssetSelection } from "../../common/AssetSelection";
import { AsyncButton } from "../../common/AsyncButton";
import { CenterSwitch } from "../../common/CenterSwitch";
import { PercentageSlider } from "../../common/inputs/PercentageSlider";

export const Burn: React.FC = () => {
  const { address } = useAccount();
  const environment = useEnvironment();

  const staking = environment.interface.liquidStaking!;
  const [withdrawPercent, setWithdrawPercent] = useState(20);

  const balanceQuery = useBalance(staking.lendgine.lendgine, address);

  const shares = useMemo(
    () =>
      balanceQuery.data
        ? balanceQuery.data.multiply(withdrawPercent).divide(100)
        : undefined,
    [balanceQuery.data, withdrawPercent]
  );
  const burnAmount = useBurnAmount(staking.lendgine, shares, "stpmmp");
  const burn = useBurn(staking.lendgine, shares, "stpmmp");

  const disableReason = useMemo(
    () =>
      withdrawPercent === 0
        ? "Slide to amount"
        : !balanceQuery.data ||
          burnAmount.status !== "success" ||
          burn.status !== "success"
        ? "Loading"
        : balanceQuery.data.equalTo(0)
        ? "Insufficient balance"
        : null,
    [balanceQuery.data, burn.status, burnAmount.status, withdrawPercent]
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
          selectedValue={staking.lendgine.token1}
          inputValue={burnAmount.collateral?.toSignificant(6, {
            groupSeparator: ",",
          })}
          inputDisabled={true}
        />
      </div>
      <AsyncButton
        variant="primary"
        tw="h-12 text-xl font-bold items-center"
        disabled={!!disableReason}
        onClick={async () => {
          invariant(burn.data);
          await Beet(burn.data);
        }}
      >
        {disableReason ?? "Withdraw"}
      </AsyncButton>
    </>
  );
};
