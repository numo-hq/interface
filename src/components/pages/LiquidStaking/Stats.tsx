import { useLongReturns } from "./useReturns";
import { useEnvironment } from "../../../contexts/useEnvironment";
import { useTotalValue, useValue } from "../../../hooks/useValue";
import { formatPercent } from "../../../utils/format";
import { LoadingBox } from "../../common/LoadingBox";
import { MainStats } from "../../common/MainStats";
import { TokenAmountDisplay } from "../../common/TokenAmountDisplay";

export const Stats: React.FC = () => {
  const environment = useEnvironment();
  const staking = environment.interface.liquidStaking!;

  const userValueQuery = useValue(staking.lendgine, "stpmmp");
  const totalValueQuery = useTotalValue(staking.lendgine, "stpmmp");

  const longAPRQuery = useLongReturns();

  return (
    <MainStats
      items={
        [
          {
            label: "Total deposited",
            item: totalValueQuery.value ? (
              <TokenAmountDisplay amount={totalValueQuery.value} showSymbol />
            ) : (
              <LoadingBox tw="bg-gray-300 h-10 w-20" />
            ),
          },
          {
            label: "APR",
            item:
              longAPRQuery.status === "success" ? (
                formatPercent(longAPRQuery.data.totalAPR)
              ) : (
                <LoadingBox tw="bg-gray-300 h-10 w-20" />
              ),
          },
          {
            label: "Balance",
            item:
              userValueQuery.status === "success" ? (
                <TokenAmountDisplay amount={userValueQuery.value} showSymbol />
              ) : (
                <LoadingBox tw="bg-gray-300 h-10 w-20" />
              ),
          },
        ] as const
      }
    />
  );
};
