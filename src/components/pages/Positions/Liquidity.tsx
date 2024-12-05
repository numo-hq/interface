import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useAccount } from "wagmi";

import { usePosition } from ".";

import type { Protocol } from "../../../constants";
import { useLendgines } from "../../../hooks/useLendgines";
import { useLendginesPositions } from "../../../hooks/useLendginesPositions";
import { usePositionValue } from "../../../hooks/useValue";
import { calculateSupplyRate } from "../../../lib/jumprate";

import type { Lendgine, LendgineInfo } from "../../../lib/types/lendgine";
import { formatPercent } from "../../../utils/format";
import { Button } from "../../common/Button";
import { LoadingBox } from "../../common/LoadingBox";
import { TokenAmountDisplay } from "../../common/TokenAmountDisplay";
import { TokenIcon } from "../../common/TokenIcon";

export const Liquidity: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { lendgines } = usePosition();
  const lendgineInfoQuery = useLendgines(lendgines);

  const positionQuery = useLendginesPositions(lendgines, address);

  const validLendgines = useMemo(() => {
    if (!positionQuery.data) return undefined;
    return positionQuery.data.reduce(
      (acc, cur, i) =>
        cur.size.greaterThan(0) || cur.tokensOwed.greaterThan(0)
          ? acc.concat(i)
          : acc,
      new Array<number>()
    );
  }, [positionQuery.data]);

  return (
    <div tw="w-full border-2 border-gray-200 flex flex-col rounded-xl bg-white py-6 gap-4">
      <div tw="flex flex-col gap-4 lg:(flex-row justify-between) px-6">
        <p tw="text-xl font-semibold">Liquidity Positions</p>
        <p tw="text-secondary font-medium">
          Provide liquidity to an AMM and earn from lending the position out.
        </p>
      </div>
      <div tw="grid grid-cols-4 w-full mt-6 px-6">
        <p tw="text-secondary text-xs font-medium">Pair</p>
        <p tw="text-secondary text-xs font-medium justify-self-end">
          Reward APR
        </p>
        <p tw="text-secondary text-xs font-medium justify-self-end">Value</p>
        <p tw="text-secondary text-xs font-medium justify-self-end">Action</p>
      </div>
      {!isConnected ? (
        <Button
          variant="primary"
          tw="text-xl font-semibold h-12 mx-6"
          onClick={openConnectModal}
        >
          Connect Wallet
        </Button>
      ) : !validLendgines ? (
        <div tw="flex flex-col w-full gap-2 mx-6">
          {[...Array(5).keys()].map((i) => (
            <LoadingBox tw="h-12 w-full" key={i + "load"} />
          ))}
        </div>
      ) : validLendgines.length === 0 ? (
        <div tw="h-12 rounded-xl bg-gray-200 text-lg font-medium items-center flex justify-center mx-6">
          No positions
        </div>
      ) : (
        <div tw="flex flex-col w-full">
          {validLendgines.map((i) => (
            <LiquidityItem
              key={lendgines[i]!.address + "liq"}
              lendgine={lendgines[i]!}
              protocol={"pmmp"}
              lendgineInfo={lendgineInfoQuery.data![i]!}
            />
          ))}
        </div>
      )}
    </div>
  );
};

type LiquidityProps<L extends Lendgine = Lendgine> = {
  lendgine: L;
  protocol: Protocol;
  lendgineInfo: LendgineInfo<L>;
};

const LiquidityItem: React.FC<LiquidityProps> = ({
  lendgine,
  protocol,
  lendgineInfo,
}: LiquidityProps) => {
  const valueQuery = usePositionValue(lendgine, protocol);

  return (
    <div tw="grid grid-cols-4 w-full h-[72px] items-center transform duration-300 ease-in-out hover:bg-gray-200 px-6">
      <div tw="items-center flex">
        <TokenIcon token={lendgine.token0} />
        <TokenIcon token={lendgine.token1} />

        <p tw="font-medium ml-2">
          {lendgine.token0.symbol} + {lendgine.token1.symbol}
        </p>
      </div>
      <p tw="font-medium justify-self-end">
        {formatPercent(calculateSupplyRate({ lendgineInfo, protocol }))}
      </p>
      <p tw="font-medium justify-self-end">
        {valueQuery.status === "success" ? (
          <TokenAmountDisplay amount={valueQuery.value} />
        ) : (
          <LoadingBox />
        )}
      </p>
      <NavLink
        tw="justify-self-end"
        to={`/earn/provide-liquidity/${protocol}/${lendgine.token0.address}/${lendgine.token1.address}`}
      >
        <Button variant="primary" tw="text-lg font-medium px-2 py-1">
          View
        </Button>
      </NavLink>
    </div>
  );
};
