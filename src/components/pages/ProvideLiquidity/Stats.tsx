import { useMemo } from "react";

import { useProvideLiquidity } from ".";
import { useLendgine } from "../../../hooks/useLendgine";
import {
  usePositionValue,
  useTokensOwed,
  useTotalPositionValue,
} from "../../../hooks/useValue";
import { calculateAccrual } from "../../../lib/amounts";
import { calculateSupplyRate } from "../../../lib/jumprate";
import { formatPercent } from "../../../utils/format";
import { LoadingBox } from "../../common/LoadingBox";
import { MainStats } from "../../common/MainStats";
import { TokenAmountDisplay } from "../../common/TokenAmountDisplay";

export const Stats: React.FC = () => {
  const { selectedLendgine, protocol } = useProvideLiquidity();

  const lendgineInfoQuery = useLendgine(selectedLendgine);
  const userValueQuery = usePositionValue(selectedLendgine, protocol);
  const totalValueQuery = useTotalPositionValue(selectedLendgine, protocol);
  const tokensOwedQuery = useTokensOwed(selectedLendgine, protocol);

  const apr = useMemo(() => {
    if (!lendgineInfoQuery.data) return undefined;

    const accruedInfo = calculateAccrual(
      selectedLendgine,
      lendgineInfoQuery.data,
      protocol
    );
    const supplyRate = calculateSupplyRate({
      lendgineInfo: accruedInfo,
      protocol,
    });
    // TODO: compute the interest premium
    return supplyRate;
  }, [lendgineInfoQuery.data, selectedLendgine, protocol]);

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
            item: apr ? (
              formatPercent(apr)
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
          {
            label: "Interest",
            item:
              tokensOwedQuery.status === "success" ? (
                <TokenAmountDisplay
                  amount={tokensOwedQuery.tokensOwed}
                  showSymbol
                />
              ) : (
                <LoadingBox tw="bg-gray-300 h-10 w-20" />
              ),
          },
        ] as const
      }
    />
  );
};
