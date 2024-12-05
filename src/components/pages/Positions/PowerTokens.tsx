import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMemo } from "react";
import { useAccount } from "wagmi";

import { usePosition } from ".";

import type { Protocol } from "../../../constants";
import { useBalances } from "../../../hooks/useBalances";
import { useLendgines } from "../../../hooks/useLendgines";
import { useValue } from "../../../hooks/useValue";
import { calculateBorrowRate } from "../../../lib/jumprate";

import type { Lendgine, LendgineInfo } from "../../../lib/types/lendgine";
import { formatPercent } from "../../../utils/format";
import { Button } from "../../common/Button";
import { LoadingBox } from "../../common/LoadingBox";
import { TokenAmountDisplay } from "../../common/TokenAmountDisplay";
import { TokenIcon } from "../../common/TokenIcon";

export const PowerTokens: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { lendgines } = usePosition();
  const lendgineInfoQuery = useLendgines(lendgines);

  const tokens = useMemo(() => lendgines.map((l) => l.lendgine), [lendgines]);
  const balanceQuery = useBalances(tokens, address);

  const validLendgines = useMemo(() => {
    if (!balanceQuery.data) return undefined;
    return balanceQuery.data.reduce(
      (acc, cur, i) => (cur.greaterThan(0) ? acc.concat(i) : acc),
      new Array<number>()
    );
  }, [balanceQuery.data]);

  return (
    <div tw="w-full border-2 border-gray-200 flex flex-col rounded-xl bg-white py-6 gap-4">
      <div tw="flex flex-col gap-4 lg:(flex-row justify-between) px-6">
        <p tw="text-xl font-semibold">Power Tokens</p>
        <p tw="text-secondary font-medium">
          Liquidation-free derivatives that can be used to speculate or hedge.
        </p>
      </div>
      <div tw="grid grid-cols-4 w-full mt-6 px-6">
        <p tw="text-secondary text-xs font-medium">Pair</p>
        <p tw="text-secondary text-xs font-medium justify-self-end">
          Funding APR
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
        <div tw="h-12  rounded-xl bg-gray-200 text-lg font-medium items-center flex justify-center mx-6">
          No positions
        </div>
      ) : (
        <div tw="flex flex-col w-full">
          {validLendgines.map((i) => (
            <PowerTokenItem
              key={lendgines[i]!.address + "pt"}
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

type PowerTokenProps<L extends Lendgine = Lendgine> = {
  lendgine: L;
  protocol: Protocol;
  lendgineInfo: LendgineInfo<L>;
};

const PowerTokenItem: React.FC<PowerTokenProps> = ({
  lendgine,
  protocol,
  lendgineInfo,
}: PowerTokenProps) => {
  const valueQuery = useValue(lendgine, protocol);

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
        {formatPercent(calculateBorrowRate({ lendgineInfo, protocol }))}
      </p>
      <p tw="font-medium justify-self-end">
        {valueQuery.status === "success" ? (
          <TokenAmountDisplay amount={valueQuery.value} />
        ) : (
          <LoadingBox />
        )}
      </p>
      <Button
        variant="danger"
        tw="text-lg font-medium justify-self-end px-2 py-1"
      >
        Close
      </Button>
    </div>
  );
};
