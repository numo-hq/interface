import { useMutation } from "@tanstack/react-query";
import type { CurrencyAmount } from "@uniswap/sdk-core";
import type { Address } from "abitype";
import { BigNumber, constants } from "ethers";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import {
  getContract,
  prepareWriteContract,
  writeContract,
} from "wagmi/actions";

import type { HookArg } from "./internal/types";
import { useInvalidateCall } from "./internal/useInvalidateCall";
import { useCollectAmount } from "./useAmounts";
import { useAwaitTX } from "./useAwaitTX";
import { getBalanceRead } from "./useBalance";
import { getLendginePositionRead } from "./useLendginePosition";
import { useIsWrappedNative } from "./useTokens";
import { toaster } from "../AppWithProviders";
import { liquidityManagerABI } from "../abis/liquidityManager";
import type { Protocol } from "../constants";
import { useEnvironment } from "../contexts/useEnvironment";
import type { Lendgine, LendginePosition } from "../lib/types/lendgine";
import type { WrappedTokenInfo } from "../lib/types/wrappedTokenInfo";
import type { BeetStage, TxToast } from "../utils/beet";

export const useCollect = <L extends Lendgine>(
  lendgine: HookArg<L>,
  position: HookArg<LendginePosition<L>>,
  protocol: Protocol
) => {
  const environment = useEnvironment();
  const protolConfig = environment.procotol[protocol]!;
  const { address } = useAccount();

  const awaitTX = useAwaitTX();
  const invalidate = useInvalidateCall();

  const native = useIsWrappedNative(lendgine?.token1);
  const title = "Collect interest";

  const collectAmount = useCollectAmount(lendgine, position, protocol);

  const mutate = useMutation({
    mutationFn: async ({
      lendgine,
      address,
      tokensOwed,
      toast,
    }: {
      lendgine: Lendgine;
      tokensOwed: CurrencyAmount<WrappedTokenInfo>;
      address: Address;
    } & {
      toast: TxToast;
    }) => {
      const args = [
        {
          lendgine: lendgine.address,
          recipient: native ? constants.AddressZero : address,
          amountRequested: BigNumber.from(tokensOwed.quotient.toString()),
        },
      ] as const;

      const unwrapArgs = [BigNumber.from(0), address] as const; // safe to be zero because the collect estimation will fail

      const liquidityManagerContract = getContract({
        abi: liquidityManagerABI,
        address: protolConfig.liquidityManager,
      });

      const tx = native
        ? async () => {
            const config = await prepareWriteContract({
              abi: liquidityManagerABI,
              address: protolConfig.liquidityManager,
              functionName: "multicall",
              args: [
                [
                  liquidityManagerContract.interface.encodeFunctionData(
                    "collect",
                    args
                  ),
                  liquidityManagerContract.interface.encodeFunctionData(
                    "unwrapWETH",
                    unwrapArgs
                  ),
                ] as `0x${string}`[],
              ],
            });
            return await writeContract(config);
          }
        : async () => {
            const config = await prepareWriteContract({
              abi: liquidityManagerABI,
              address: protolConfig.liquidityManager,
              functionName: "collect",
              args,
            });
            return await writeContract(config);
          };

      const transaction = await tx();

      toaster.txPending({ ...toast, hash: transaction.hash });

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
              protolConfig.liquidityManager
            )
          ),
          invalidate(getBalanceRead(lendgine.token1, input.address)),
        ]));
    },
  });

  return useMemo(() => {
    if (collectAmount.status === "loading")
      return { status: "loading" } as const;
    if (!address || !lendgine || collectAmount.status !== "success")
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
                mutate.mutateAsync({
                  lendgine,
                  tokensOwed: collectAmount.tokensOwed,
                  address: address,
                  toast,
                }),
            },
          ],
        },
      ],
    } as const satisfies { data: readonly BeetStage[]; status: "success" };
  }, [
    address,
    collectAmount.status,
    collectAmount.tokensOwed,
    lendgine,
    mutate,
  ]);
};
