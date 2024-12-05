import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CurrencyAmount } from "@uniswap/sdk-core";
import { BigNumber, constants, utils } from "ethers";
import { useMemo } from "react";
import type { Address } from "wagmi";
import { useAccount } from "wagmi";
import type { SendTransactionResult } from "wagmi/actions";
import {
  getContract,
  prepareWriteContract,
  writeContract,
} from "wagmi/actions";

import { useBurnAmount } from "./useAmounts";
import { toaster } from "../AppWithProviders";
import { lendgineRouterABI } from "../abis/lendgineRouter";
import type { Protocol } from "../constants";
import { useSettings } from "../contexts/settings";
import { useEnvironment } from "../contexts/useEnvironment";
import type { HookArg } from "../hooks/internal/types";
import { useInvalidateCall } from "../hooks/internal/useInvalidateCall";
import { getAllowanceRead } from "../hooks/useAllowance";
import { useApprove } from "../hooks/useApprove";
import { useAwaitTX } from "../hooks/useAwaitTX";
import { getBalanceRead } from "../hooks/useBalance";
import { isV3, useMostLiquidMarket } from "../hooks/useExternalExchange";
import { useIsWrappedNative } from "../hooks/useTokens";
import { ONE_HUNDRED_PERCENT, scale } from "../lib/constants";

import { priceToFraction } from "../lib/price";
import type { Lendgine } from "../lib/types/lendgine";
import type { WrappedTokenInfo } from "../lib/types/wrappedTokenInfo";
import type { UniswapV2Pool } from "../services/graphql/uniswapV2";
import type { UniswapV3Pool } from "../services/graphql/uniswapV3";
import type { BeetStage, TxToast } from "../utils/beet";

export const useBurn = <L extends Lendgine>(
  lendgine: HookArg<L>,
  shares: HookArg<CurrencyAmount<L["lendgine"]>>,
  protocol: Protocol
) => {
  const { address } = useAccount();
  const environment = useEnvironment();
  const protocolConfig = environment.procotol[protocol]!;

  const settings = useSettings();

  const awaitTX = useAwaitTX();
  const invalidate = useInvalidateCall();
  const queryClient = useQueryClient();

  const burnAmounts = useBurnAmount(lendgine, shares, protocol);
  const mostLiquid = useMostLiquidMarket(
    lendgine ? { quote: lendgine.token0, base: lendgine.token1 } : undefined
  );

  const native = useIsWrappedNative(lendgine?.token1);
  const approve = useApprove(shares, protocolConfig.lendgineRouter);

  const approveMutation = useMutation({
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
            lendgine.lendgine,
            address ?? constants.AddressZero,
            protocolConfig.lendgineRouter
          )
        ));
    },
  });

  const lendgineRouterContract = getContract({
    abi: lendgineRouterABI,
    address: protocolConfig.lendgineRouter,
  });

  const title = `Sell ${lendgine?.token1.symbol}+`;

  const burnMutation = useMutation({
    mutationFn: async ({
      lendgine,
      shares,
      amount0,
      amount1,
      amountOut,
      mostLiquidPool,
      address,
      toast,
    }: {
      lendgine: Lendgine;
      shares: CurrencyAmount<Lendgine["lendgine"]>;
      amount0: CurrencyAmount<WrappedTokenInfo>;
      amount1: CurrencyAmount<WrappedTokenInfo>;
      amountOut: CurrencyAmount<WrappedTokenInfo>;
      mostLiquidPool: UniswapV2Pool | UniswapV3Pool;
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
          shares: BigNumber.from(shares.quotient.toString()),
          collateralMin: BigNumber.from(
            amountOut
              .multiply(
                ONE_HUNDRED_PERCENT.subtract(settings.maxSlippagePercent)
              )
              .quotient.toString()
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
          swapType: isV3(mostLiquidPool) ? 1 : 0,
          swapExtraData: isV3(mostLiquidPool)
            ? (utils.defaultAbiCoder.encode(
                ["tuple(uint24 fee)"],
                [
                  {
                    fee: mostLiquidPool.feeTier,
                  },
                ]
              ) as Address)
            : constants.AddressZero,
          recipient: native ? constants.AddressZero : address,
          deadline: BigNumber.from(
            Math.round(Date.now() / 1000) + settings.timeout * 60
          ),
        },
      ] as const;

      const unwrapArgs = [
        BigNumber.from(
          amountOut
            .multiply(ONE_HUNDRED_PERCENT.subtract(settings.maxSlippagePercent))
            .quotient.toString()
        ),
        address,
      ] as const;

      const tx = native
        ? async () => {
            const config = await prepareWriteContract({
              abi: lendgineRouterABI,
              functionName: "multicall",
              address: protocolConfig.lendgineRouter,
              args: [
                [
                  lendgineRouterContract.interface.encodeFunctionData(
                    "burn",
                    args
                  ),
                  lendgineRouterContract.interface.encodeFunctionData(
                    "unwrapWETH",
                    unwrapArgs
                  ),
                ] as `0x${string}`[],
              ],
            });

            const data = await writeContract(config);
            return data;
          }
        : async () => {
            const config = await prepareWriteContract({
              abi: lendgineRouterABI,
              functionName: "burn",
              address: protocolConfig.lendgineRouter,
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
          getAllowanceRead(
            input.shares.currency,
            input.address,
            protocolConfig.lendgineRouter
          )
        ),
        invalidate(getBalanceRead(input.amountOut.currency, input.address)),
        invalidate(getBalanceRead(input.shares.currency, input.address)),
        queryClient.invalidateQueries({
          queryKey: ["user trades", input.address],
        }),
      ]);
    },
  });

  return useMemo(() => {
    if (approve.status === "loading" || burnAmounts.status === "loading")
      return { status: "loading" } as const;

    if (
      !shares ||
      burnAmounts.status !== "success" ||
      !mostLiquid.data ||
      !address ||
      !lendgine
    )
      return { status: "error" } as const;

    return {
      status: "success",
      data: (
        [
          approve.tx
            ? {
                title: approve.title,
                parallelTxs: [
                  {
                    title: approve.title,
                    description: approve.title,
                    callback: (toast: TxToast) =>
                      approveMutation.mutateAsync({
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        approveTx: approve.tx!,
                        toast,
                      }),
                  },
                ],
              }
            : undefined,
          {
            title,
            parallelTxs: [
              {
                title,
                description: title,
                callback: (toast: TxToast) =>
                  burnMutation.mutateAsync({
                    lendgine,
                    shares,
                    amount0: burnAmounts.amount0,
                    amount1: burnAmounts.amount1,
                    amountOut: burnAmounts.collateral,
                    address,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    mostLiquidPool: mostLiquid.data.pool,
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
    approve.status,
    approve.title,
    approve.tx,
    approveMutation,
    burnAmounts.amount0,
    burnAmounts.amount1,
    burnAmounts.collateral,
    burnAmounts.status,
    burnMutation,
    lendgine,
    mostLiquid.data,
    shares,
    title,
  ]);
};
