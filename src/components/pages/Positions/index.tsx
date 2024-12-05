import invariant from "tiny-invariant";
import { createContainer } from "unstated-next";

import { PositionInner } from "./PositionInner";
import { useAllLendgines } from "../../../hooks/useAllLendgines";
import type { Lendgine } from "../../../lib/types/lendgine";
import { LoadingPage } from "../../common/LoadingPage";

interface IPosition {
  lendgines: readonly Lendgine[];
}

const usePositionInternal = ({
  lendgines,
}: {
  lendgines?: readonly Lendgine[] | undefined;
} = {}): IPosition => {
  invariant(lendgines);
  return { lendgines };
};

export const { Provider: PositionProvider, useContainer: usePosition } =
  createContainer(usePositionInternal);

export const Position: React.FC = () => {
  const lendginesQuery = useAllLendgines();

  return lendginesQuery.status !== "success" ? (
    <LoadingPage />
  ) : (
    <PositionProvider initialState={{ lendgines: lendginesQuery.lendgines }}>
      <PositionInner />
    </PositionProvider>
  );
};
