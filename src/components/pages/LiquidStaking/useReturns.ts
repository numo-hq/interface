import { useMemo } from "react";

import { useEnvironment } from "../../../contexts/useEnvironment";
import { useLendgine } from "../../../hooks/useLendgine";
import { calculateBorrowRate } from "../../../lib/jumprate";

export const useLongReturns = () => {
  const environment = useEnvironment();
  const staking = environment.interface.liquidStaking!;

  const lendgineQuery = useLendgine(staking.lendgine);

  return useMemo(() => {
    if (lendgineQuery.isLoading) return { status: "loading" } as const;
    if (!lendgineQuery.data) return { status: "error" } as const;

    const baseReturn = staking.return;
    const boostedReturn = baseReturn
      .multiply(2)
      .add(baseReturn.multiply(baseReturn));

    const funding = calculateBorrowRate({
      lendgineInfo: lendgineQuery.data,
      protocol: "stpmmp",
    });

    const totalAPR = boostedReturn.subtract(funding);

    return {
      status: "success",
      data: { baseReturn, boostedReturn, totalAPR, funding },
    } as const;
  }, [lendgineQuery.data, lendgineQuery.isLoading, staking.return]);
};
