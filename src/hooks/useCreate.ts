import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CurrencyAmount } from "@uniswap/sdk-core";
import type { Address } from "abitype";
import { BigNumber, constants, utils } from "ethers";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import type { SendTransactionResult } from "wagmi/actions";
import {
  getContract,
  prepareWriteContract,
  writeContract,
} from "wagmi/actions";

import type { HookArg } from "./internal/types";
import { useInvalidateCall } from "./internal/useInvalidateCall";
import { getAllowanceRead } from "./useAllowance";
import { useDepositAmount } from "./useAmounts";
import { useApprove } from "./useApprove";
import { useAwaitTX } from "./useAwaitTX";
import { getBalanceRead } from "./useBalance";
import { getLendginePositionRead } from "./useLendginePosition";
import { useIsWrappedNative } from "./useTokens";
import { toaster } from "../AppWithProviders";
import { factoryABI } from "../abis/factory";
import { liquidityManagerABI } from "../abis/liquidityManager";
import type { Protocol } from "../constants";
import { useSettings } from "../contexts/settings";
import { useEnvironment } from "../contexts/useEnvironment";
import { ONE_HUNDRED_PERCENT, scale } from "../lib/constants";
import { priceToFraction } from "../lib/price";
import type { Lendgine } from "../lib/types/lendgine";
import type { BeetStage, BeetTx, TxToast } from "../utils/beet";

export const useCreate = <L extends Lendgine>(
  lendgine: HookArg<L>,
  amount:
    | HookArg<CurrencyAmount<L["token0"]>>
    | HookArg<CurrencyAmount<L["token1"]>>,
  protocol: Protocol
) => {
  const environment = useEnvironment();
  const protocolConfig = environment.procotol[protocol]!;

  const settings = useSettings();
  const { address } = useAccount();

  const awaitTX = useAwaitTX();
  const invalidate = useInvalidateCall();
  const queryClient = useQueryClient();

  const native0 = useIsWrappedNative(lendgine?.token0);
  const native1 = useIsWrappedNative(lendgine?.token1);

  const depositAmount = useDepositAmount(lendgine, amount, protocol);

  const approve0 = useApprove(
    depositAmount.amount0,
    protocolConfig.liquidityManager
  );
  const approve1 = useApprove(
    depositAmount.amount1,
    protocolConfig.liquidityManager
  );

  const liquidityManagerContract = getContract({
    abi: liquidityManagerABI,
    address: protocolConfig.liquidityManager,
  });

  const createTitle = `New ${lendgine?.token0.symbol ?? ""} + ${
    lendgine?.token1.symbol ?? ""
  } market`;

  const title = `Add ${lendgine?.token0.symbol ?? ""} / ${
    lendgine?.token1.symbol ?? ""
  } liquidty`;

  const approve0Mutation = useMutation({
    mutationFn: async ({
      approveTx,
      toast,
    }: { approveTx: () => Promise<SendTransactionResult> } & {
      toast: TxToast;
    }) => {
      const transaction = await approveTx();

      toaster.txPending({ ...toast, hash: transaction.hash });

      return await awaitTX(transaction);
    },
    onMutate: ({ toast }) => toaster.txSending(toast),
    onError: (_, { toast }) => toaster.txError(toast),
    onSuccess: async (data, input) => {
      toaster.txSuccess({ ...input.toast, receipt: data });
      lendgine &&
        (await invalidate(
          getAllowanceRead(
            lendgine.token0,
            address ?? constants.AddressZero,
            protocolConfig.liquidityManager
          )
        ));
    },
  });

  const approve1Mutation = useMutation({
    mutationFn: async ({
      approveTx,
      toast,
    }: { approveTx: () => Promise<SendTransactionResult> } & {
      toast: TxToast;
    }) => {
      const transaction = await approveTx();

      toaster.txPending({ ...toast, hash: transaction.hash });

      return await awaitTX(transaction);
    },
    onMutate: ({ toast }) => toaster.txSending(toast),
    onError: (_, { toast }) => toaster.txError(toast),
    onSuccess: async (data, input) => {
      toaster.txSuccess({ ...input.toast, receipt: data });
      lendgine &&
        (await invalidate(
          getAllowanceRead(
            lendgine.token1,
            address ?? constants.AddressZero,
            protocolConfig.liquidityManager
          )
        ));
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({
      lendgine,
      toast,
    }: { lendgine: Lendgine } & { toast: TxToast }) => {
      const createArgs = [
        utils.getAddress(lendgine.token0.address),
        utils.getAddress(lendgine.token1.address),
        lendgine.token0.decimals,
        lendgine.token1.decimals,
        BigNumber.from(
          priceToFraction(lendgine.bound).multiply(scale).quotient.toString()
        ),
      ] as const;

      const config = await prepareWriteContract({
        abi: factoryABI,
        functionName: "createLendgine",
        address: protocolConfig.factory,
        args: createArgs,
      });
      const transaction = await writeContract(config);

      toaster.txPending({ ...toast, hash: transaction.hash });

      return await awaitTX(transaction);
    },
    onMutate: ({ toast }) => toaster.txSending(toast),
    onError: (_, { toast }) => toaster.txError(toast),
    onSuccess: async (data, input) => {
      toaster.txSuccess({ ...input.toast, receipt: data });
      await queryClient.invalidateQueries({ queryKey: ["existing lendgines"] });
    },
  });

  const depositMutation = useMutation({
    mutationFn: async ({
      lendgine,
      amount0,
      amount1,
      liquidity,
      size,

      address,

      toast,
    }: {
      lendgine: Lendgine;
      amount0: CurrencyAmount<L["token0"]>;
      amount1: CurrencyAmount<L["token1"]>;
      liquidity: CurrencyAmount<L["lendgine"]>;
      size: CurrencyAmount<L["lendgine"]>;

      address: Address;
    } & {
      toast: TxToast;
    }) => {
      const args = [
        {
          token0: utils.getAddress(lendgine.token0.address),
          token1: utils.getAddress(lendgine.token1.address),
          token0Exp: BigNumber.from(lendgine.token0.decimals),
          token1Exp: BigNumber.from(lendgine.token1.decimals),
          upperBound: BigNumber.from(
            priceToFraction(lendgine.bound).multiply(scale).quotient.toString()
          ),
          liquidity: BigNumber.from(
            liquidity.multiply(999990).divide(1000000).quotient.toString()
          ),
          amount0Min: BigNumber.from(amount0.quotient.toString()),
          amount1Min: BigNumber.from(amount1.quotient.toString()),
          sizeMin: BigNumber.from(
            size
              .multiply(
                ONE_HUNDRED_PERCENT.subtract(settings.maxSlippagePercent)
              )
              .quotient.toString()
          ),
          recipient: address,
          deadline: BigNumber.from(
            Math.round(Date.now() / 1000) + settings.timeout * 60
          ),
        },
      ] as const;

      const tx =
        native0 || native0
          ? async () => {
              const config = await prepareWriteContract({
                abi: liquidityManagerABI,
                functionName: "multicall",
                address: protocolConfig.liquidityManager,
                args: [
                  [
                    liquidityManagerContract.interface.encodeFunctionData(
                      "addLiquidity",
                      args
                    ),
                    liquidityManagerContract.interface.encodeFunctionData(
                      "refundETH"
                    ),
                  ] as `0x${string}`[],
                ],
                overrides: {
                  value: native0
                    ? BigNumber.from(amount0.quotient.toString() ?? 0)
                    : BigNumber.from(amount1.quotient.toString() ?? 0),
                },
              });
              const data = await writeContract(config);
              return data;
            }
          : async () => {
              const config = await prepareWriteContract({
                abi: liquidityManagerABI,
                functionName: "addLiquidity",
                address: protocolConfig.liquidityManager,
                args,
              });
              const data = await writeContract(config);
              return data;
            };

      const transaction = await tx();

      toaster.txPending({ ...toast, hash: transaction.hash });

      return awaitTX(transaction);
    },
    onMutate: ({ toast }) => toaster.txSending(toast),
    onError: (_, { toast }) => toaster.txError(toast),
    onSuccess: async (data, input) => {
      toaster.txSuccess({ ...input.toast, receipt: data });
      await Promise.all([
        invalidate(
          getLendginePositionRead(
            input.lendgine,
            input.address,
            protocolConfig.liquidityManager
          )
        ),
        invalidate(
          getAllowanceRead(
            input.amount0.currency,
            input.address,
            protocolConfig.liquidityManager
          )
        ),
        invalidate(
          getAllowanceRead(
            input.amount1.currency,
            input.address,
            protocolConfig.liquidityManager
          )
        ),
        invalidate(getBalanceRead(input.amount0.currency, input.address)),
        invalidate(getBalanceRead(input.amount1.currency, input.address)),
      ]);
    },
  });

  return useMemo(() => {
    if (
      approve0.status === "loading" ||
      approve1.status === "loading" ||
      depositAmount.status === "loading"
    )
      return { status: "loading" } as const;
    if (
      !lendgine ||
      depositAmount.status === "error" ||
      !address ||
      approve0.status === "error" ||
      approve1.status === "error"
    )
      return { status: "error" } as const;

    return {
      status: "success",
      data: (
        [
          {
            title: "Approve tokens and create market",
            parallelTxs: [
              !native0 && approve0.tx
                ? {
                    title: approve0.title,
                    description: approve0.title,
                    callback: (toast: TxToast) =>
                      approve0Mutation.mutateAsync({
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        approveTx: approve0.tx!,
                        toast,
                      }),
                  }
                : undefined,
              !native1 && approve1.tx
                ? {
                    title: approve1.title,
                    description: approve1.title,
                    callback: (toast: TxToast) =>
                      approve1Mutation.mutateAsync({
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        approveTx: approve1.tx!,
                        toast,
                      }),
                  }
                : undefined,
              {
                title: createTitle,
                description: createTitle,
                callback: (toast: TxToast) =>
                  createMutation.mutateAsync({ lendgine, toast }),
              },
            ].filter((btx): btx is BeetTx => !!btx),
          },
          {
            title,
            parallelTxs: [
              {
                title,
                description: title,
                callback: (toast: TxToast) =>
                  depositMutation.mutateAsync({
                    ...depositAmount,
                    address,
                    lendgine,
                    toast,
                  }),
              },
            ],
          },
        ] as readonly (BeetStage | undefined)[]
      ).filter((s): s is BeetStage => !!s),
    } as const satisfies { data: readonly BeetStage[]; status: "success" };
  }, [
    address,
    approve0.status,
    approve0.title,
    approve0.tx,
    approve0Mutation,
    approve1.status,
    approve1.title,
    approve1.tx,
    approve1Mutation,
    createMutation,
    createTitle,
    depositAmount,
    depositMutation,
    lendgine,
    native0,
    native1,
    title,
  ]);
};
