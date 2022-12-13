import { liquidityManagerInterface } from "@dahlia-labs/numoen-utils";
import { TokenAmount } from "@dahlia-labs/token-utils";
import { SliderInput as ReachSlider } from "@reach/slider";
import { useMemo } from "react";
import invariant from "tiny-invariant";
import tw, { css, styled } from "twin.macro";
import { useAccount } from "wagmi";

import { useSettings } from "../../../../contexts/settings";
import { useLiquidityManager } from "../../../../hooks/useContract";
import {
  useClaimableTokens,
  useUserLendgine,
} from "../../../../hooks/useLendgine";
import { usePair } from "../../../../hooks/usePair";
import { useGetIsWrappedNative } from "../../../../hooks/useTokens";
import { useBeet } from "../../../../utils/beet";
import { AsyncButton } from "../../../common/AsyncButton";
import { Module } from "../../../common/Module";
import { TokenIcon } from "../../../common/TokenIcon";
import { useManage } from ".";

export const Position: React.FC = () => {
  const { market, tokenID } = useManage();
  const { address } = useAccount();
  const Beet = useBeet();
  const liquidityManagerContract = useLiquidityManager(true);
  const isNative = useGetIsWrappedNative();
  invariant(tokenID, "tokenID missing");
  const userLendgineInfo = useUserLendgine(tokenID, market);
  const claimableTokens = useClaimableTokens(tokenID, market);
  const settings = useSettings();

  const pairInfo = usePair(market.pair);

  const { userBaseAmount, userSpeculativeAmount } = useMemo(() => {
    if (pairInfo && pairInfo.totalLPSupply.equalTo(0))
      return {
        userBaseAmount: new TokenAmount(market.pair.baseToken, 0),
        userSpeculativeAmount: new TokenAmount(market.pair.speculativeToken, 0),
      };
    const userBaseAmount =
      userLendgineInfo && pairInfo
        ? pairInfo.baseAmount
            .multiply(userLendgineInfo.liquidity)
            .divide(pairInfo.totalLPSupply)
        : null;
    const userSpeculativeAmount =
      userLendgineInfo && pairInfo
        ? pairInfo.speculativeAmount
            .multiply(userLendgineInfo.liquidity)
            .divide(pairInfo.totalLPSupply)
        : null;
    return { userBaseAmount, userSpeculativeAmount };
  }, [
    market.pair.baseToken,
    market.pair.speculativeToken,
    pairInfo,
    userLendgineInfo,
  ]);

  return (
    <Module tw="">
      <p tw="font-bold text-default text-xl">Your Deposits</p>
      <div tw="flex justify-between text-default font-bold text-lg py-4">
        <span tw="flex items-center gap-1">
          {userBaseAmount
            ? userBaseAmount.toSignificant(3, { groupSeparator: "," })
            : "--"}{" "}
          <TokenIcon tw="ml-1" token={market.pair.baseToken} size={20} />
          {market.pair.baseToken.symbol.toString()}
        </span>
        <span tw="flex items-center gap-1">
          {userSpeculativeAmount
            ? userSpeculativeAmount.toSignificant(3, { groupSeparator: "," })
            : "--"}{" "}
          <TokenIcon tw="ml-1" token={market.pair.speculativeToken} size={20} />
          {market.pair.speculativeToken.symbol.toString()}
        </span>
      </div>
      <hr tw="border-[#AEAEB2] rounded " />
      <div tw="flex justify-between pt-4">
        <p tw="text-default">Collectable Interest</p>
        <div tw="flex gap-2 items-center">
          <p tw="text-default font-bold">
            {claimableTokens?.toSignificant(3, { groupSeparator: "," } ?? "--")}{" "}
            {market.pair.speculativeToken.symbol}
          </p>
          <AsyncButton
            tw="px-2 py-1"
            disabled={!claimableTokens || !claimableTokens.greaterThan(0)}
            variant="primary"
            onClick={async () => {
              invariant(liquidityManagerContract && address && claimableTokens);
              await Beet("Collect Interest", [
                {
                  stageTitle: "Collect Interest",
                  parallelTransactions: [
                    {
                      title: "Collect Interest",
                      description: `Collect ${claimableTokens.toFixed(2, {
                        groupSeparator: ",",
                      })} ${market.pair.speculativeToken.symbol}`,
                      txEnvelope: () =>
                        isNative(market.pair.speculativeToken)
                          ? liquidityManagerContract.multicall([
                              liquidityManagerInterface.encodeFunctionData(
                                "collect",
                                [
                                  {
                                    tokenID,
                                    recipient: liquidityManagerContract.address,
                                    amountRequested:
                                      claimableTokens.raw.toString(),
                                  },
                                ]
                              ),
                              liquidityManagerInterface.encodeFunctionData(
                                "unwrapWETH9",
                                [
                                  claimableTokens
                                    .reduceBy(settings.maxSlippagePercent)
                                    .raw.toString(),
                                  address,
                                ]
                              ),
                            ])
                          : liquidityManagerContract.collect({
                              tokenID,
                              recipient: address,
                              amountRequested: claimableTokens.raw.toString(),
                            }),
                    },
                  ],
                },
              ]);
            }}
          >
            Collect
          </AsyncButton>
        </div>
      </div>
    </Module>
  );
};

const styledSlider = styled(ReachSlider);

export const SliderInput = styledSlider(
  () => css`
    background: none;

    [data-reach-slider-range] {
      ${tw`h-1 bg-black rounded-r`}
    }

    [data-reach-slider-track] {
      ${tw`h-1 bg-gray-300 rounded`}
    }
  `
);
