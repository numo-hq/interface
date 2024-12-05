import type { Percent } from "@uniswap/sdk-core";

import type { Lendgine } from "../../../lib/types/lendgine";
import { formatPercent } from "../../../utils/format";

import { LoadingSpinner } from "../../common/LoadingSpinner";
import { RowBetween } from "../../common/RowBetween";

interface Props {
  lendgine: Lendgine;
  borrowRate?: Percent;
}

export const Stats: React.FC<Props> = ({ borrowRate }: Props) => {
  return (
    <div tw="flex flex-col w-full">
      {/* <RowBetween tw="p-0">
        <p tw="text-secondary">Bound</p>
        <div tw="flex items-center gap-1">
          {(isInverse ? !!nextLendgine : !!lowerLendgine) && (
            <Plus
              icon="minus"
              onClick={() => {
                const lendgine = isInverse ? nextLendgine : lowerLendgine;
                invariant(lendgine);
                setSelectedLendgine(lendgine);
              }}
            />
          )}
          {(isInverse ? !!lowerLendgine : !!nextLendgine) && (
            <Plus
              icon="plus"
              onClick={() => {
                const lendgine = isInverse ? lowerLendgine : nextLendgine;
                invariant(lendgine);
                setSelectedLendgine(lendgine);
              }}
            />
          )}
          {formatPrice(
            isInverse ? selectedLendgine.bound.invert() : selectedLendgine.bound
          )}
        </div>
      </RowBetween> */}
      <RowBetween tw="p-0">
        <p tw="text-secondary">Funding APR</p>
        <p>{borrowRate ? formatPercent(borrowRate) : <LoadingSpinner />}</p>
      </RowBetween>
      {/* <RowBetween tw="p-0">
        <p tw="text-secondary">Internal Price</p>
        <p>
          {lendgineInfo.data
            ? isInverse
              ? formatPrice(
                  invert(numoenPrice(selectedLendgine, lendgineInfo.data))
                )
              : formatPrice(numoenPrice(selectedLendgine, lendgineInfo.data))
            : "loading"}
        </p>
      </RowBetween> */}
      <RowBetween tw="p-0">
        <p tw="text-secondary">Leverage</p>
        <p>Squared</p>
      </RowBetween>
      <RowBetween tw="p-0">
        <p tw="text-secondary">Liquidation price</p>
        <p>None</p>
      </RowBetween>
      <RowBetween tw="p-0">
        <p tw="text-secondary">Fees</p>
        <p>0</p>
      </RowBetween>
    </div>
  );
};
