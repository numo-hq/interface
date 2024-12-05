import invariant from "tiny-invariant";
import { createContainer } from "unstated-next";

import { EarnInner } from "./EarnInner";
import { useAllLendgines } from "../../../hooks/useAllLendgines";
import type { Lendgine } from "../../../lib/types/lendgine";
import { LoadingPage } from "../../common/LoadingPage";

interface IEarn {
  lendgines: readonly Lendgine[];
}

const useEarnInternal = ({
  lendgines,
}: {
  lendgines?: readonly Lendgine[] | undefined;
} = {}): IEarn => {
  invariant(lendgines);
  return { lendgines };
};

export const { Provider: EarnProvider, useContainer: useEarn } =
  createContainer(useEarnInternal);

export const Earn: React.FC = () => {
  const lendginesQuery = useAllLendgines();

  return lendginesQuery.status !== "success" ? (
    <LoadingPage />
  ) : (
    <EarnProvider initialState={{ lendgines: lendginesQuery.lendgines }}>
      <EarnInner />
    </EarnProvider>
  );
};
