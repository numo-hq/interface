import { useMutation } from "@tanstack/react-query";
import type { CurrencyAmount } from "@uniswap/sdk-core";
import type { Address } from "abitype";
import { BigNumber, constants, utils } from "ethers";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import {
  getContract,
  prepareWriteContract,
  writeContract,
} from "wagmi/actions";

import type { HookArg } from "./internal/types";
import { useInvalidateCall } from "./internal/useInvalidateCall";
import { useWithdrawAmount } from "./useAmounts";
import { useAwaitTX } from "./useAwaitTX";
import { getBalanceRead } from "./useBalance";
import { getLendginePositionRead } from "./useLendginePosition";
import { useIsWrappedNative } from "./useTokens";
import { toaster } from "../AppWithProviders";
import { liquidityManagerABI } from "../abis/liquidityManager";
import type { Protocol } from "../constants";
import { useSettings } from "../contexts/settings";
import { useEnvironment } from "../contexts/useEnvironment";
import { ONE_HUNDRED_PERCENT, scale } from "../lib/constants";
import { priceToFraction } from "../lib/price";
import type { Lendgine, LendginePosition } from "../lib/types/lendgine";
import type { BeetStage, TxToast } from "../utils/beet";

export const useWithdraw = <L extends Lendgine>(
  lendgine: HookArg<L>,
  position: HookArg<Pick<LendginePosition<L>, "size">>,
  protocol: Protocol
) => {
  const settings = useSettings();
  const environment = useEnvironment();
  const protocolConfig = environment.procotol[protocol]!;

  const { address } = useAccount();
  const awaitTX = useAwaitTX();
  const invalidate = useInvalidateCall();

  const native0 = useIsWrappedNative(lendgine?.token0);
  const native1 = useIsWrappedNative(lendgine?.token1);

  const withdrawAmount = useWithdrawAmount(lendgine, position, protocol);

  const title = `Remove ${lendgine?.token0.symbol ?? ""} / ${
    lendgine?.token1.symbol ?? ""
  } liquidty`;

  const mutation = useMutation({
    mutationFn: async ({
      lendgine,
      amount0,
      amount1,
      size,
      address,
      toast,
    }: {
      lendgine: Lendgine;
      amount0: CurrencyAmount<Lendgine["token0"]>;
      amount1: CurrencyAmount<Lendgine["token1"]>;
      size: LendginePosition<Lendgine>["size"];
      address: Address;
    } & { toast: TxToast }) => {
      const args = [
        {
          token0: utils.getAddress(lendgine.token0.address),
          token1: utils.getAddress(lendgine.token1.address),
          token0Exp: BigNumber.from(lendgine.token0.decimals),
          token1Exp: BigNumber.from(lendgine.token1.decimals),
          upperBound: BigNumber.from(
            priceToFraction(lendgine.bound).multiply(scale).quotient.toString()
          ),
          amount0Min: BigNumber.from(
            amount0
              .multiply(
                ONE_HUNDRED_PERCENT.subtract(settings.maxSlippagePercent)
              )
              .quotient.toString()
          ),
          amount1Min: BigNumber.from(
            amount1
              .multiply(
                ONE_HUNDRED_PERCENT.subtract(settings.maxSlippagePercent)
              )
              .quotient.toString()
          ),
          size: BigNumber.from(size.quotient.toString()),

          recipient: native0 || native1 ? constants.AddressZero : address,
          deadline: BigNumber.from(
            Math.round(Date.now() / 1000) + settings.timeout * 60
          ),
        },
      ] as const;
      const unwrapArgs = [BigNumber.from(0), address] as const; // safe to be zero because the withdraw estimation will fail
      const sweepArgs = [
        native0 ? lendgine.token1.address : lendgine.token0.address,
        BigNumber.from(0),
        address,
      ] as const; // safe to be zero because the withdraw estimation will fail

      const liquidityManagerContract = getContract({
        abi: liquidityManagerABI,
        address: protocolConfig.liquidityManager,
      });

      const tx =
        native0 || native1
          ? async () => {
              const config = await prepareWriteContract({
                abi: liquidityManagerABI,
                functionName: "multicall",
                address: protocolConfig.liquidityManager,
                args: [
                  [
                    liquidityManagerContract.interface.encodeFunctionData(
                      "removeLiquidity",
                      args
                    ),
                    liquidityManagerContract.interface.encodeFunctionData(
                      "unwrapWETH",
                      unwrapArgs
                    ),
                    liquidityManagerContract.interface.encodeFunctionData(
                      "sweepToken",
                      sweepArgs
                    ),
                  ] as `0x${string}`[],
                ],
              });
              const data = await writeContract(config);
              return data;
            }
          : async () => {
              const config = await prepareWriteContract({
                abi: liquidityManagerABI,
                functionName: "removeLiquidity",
                address: protocolConfig.liquidityManager,
                args,
              });
              const data = await writeContract(config);
              return data;
            };

      const transaction = await tx();
      toaster.txPending({
        ...toast,
        hash: transaction.hash,
      });

      return await awaitTX(transaction);
    },
    onMutate: ({ toast }) => toaster.txSending(toast),
    onError: (_, { toast }) => toaster.txError(toast),
    onSuccess: async (data, input) => {
      toaster.txSuccess({ ...input.toast, receipt: data });
      lendgine &&
        (await Promise.all([
          invalidate(
            getLendginePositionRead(
              lendgine,
              input.address,
              protocolConfig.liquidityManager
            )
          ),
          invalidate(getBalanceRead(input.amount0.currency, input.address)),
          invalidate(getBalanceRead(input.amount1.currency, input.address)),
        ]));
    },
  });

  return useMemo(() => {
    if (withdrawAmount.status === "loading")
      return { status: "loading" } as const;
    if (
      !address ||
      withdrawAmount.status !== "success" ||
      !lendgine ||
      !position
    )
      return { status: "error" } as const;

    return {
      status: "success",
      data: [
        {
          title,
          parallelTxs: [
            {
              title,
              description: title,
              callback: (toast: TxToast) =>
                mutation.mutateAsync({
                  lendgine,
                  ...withdrawAmount,
                  size: position.size,
                  address,
                  toast,
                }),
            },
          ],
        },
      ],
    } as const satisfies { data: readonly BeetStage[]; status: "success" };
  }, [address, lendgine, mutation, position, title, withdrawAmount]);
};
