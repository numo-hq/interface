import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CurrencyAmount, Token } from "@uniswap/sdk-core";
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

import type { HookArg } from "./internal/types";
import { useInvalidateCall } from "./internal/useInvalidateCall";
import { getAllowanceRead } from "./useAllowance";
import { useMintAmount } from "./useAmounts";
import { useApprove } from "./useApprove";
import { useAwaitTX } from "./useAwaitTX";
import { getBalanceRead } from "./useBalance";
import { isV3, useMostLiquidMarket } from "./useExternalExchange";
import { useIsWrappedNative } from "./useTokens";
import { toaster } from "../AppWithProviders";
import { lendgineRouterABI } from "../abis/lendgineRouter";
import type { Protocol } from "../constants";
import { useSettings } from "../contexts/settings";
import { useEnvironment } from "../contexts/useEnvironment";
import { ONE_HUNDRED_PERCENT, scale } from "../lib/constants";
import { priceToFraction } from "../lib/price";
import type { Lendgine } from "../lib/types/lendgine";
import type { WrappedTokenInfo } from "../lib/types/wrappedTokenInfo";
import type { UniswapV2Pool } from "../services/graphql/uniswapV2";
import type { UniswapV3Pool } from "../services/graphql/uniswapV3";
import type { BeetStage, TxToast } from "../utils/beet";

export const useMint = <L extends Lendgine>(
  lendgine: HookArg<L>,
  amountIn: HookArg<CurrencyAmount<L["token0"]>>,
  protocol: Protocol
) => {
  const environment = useEnvironment();
  const protocolConfig = environment.procotol[protocol]!;
  const settings = useSettings();
  const { address } = useAccount();

  const invalidate = useInvalidateCall();
  const queryClient = useQueryClient();
  const awaitTX = useAwaitTX();

  const mintAmounts = useMintAmount(lendgine, amountIn, protocol);
  const mostLiquid = useMostLiquidMarket(
    lendgine ? { quote: lendgine.token0, base: lendgine.token1 } : undefined
  );

  const approve = useApprove(amountIn, protocolConfig.lendgineRouter);

  const native = useIsWrappedNative(lendgine?.token1);

  const lendgineRouterContract = getContract({
    abi: lendgineRouterABI,
    address: protocolConfig.lendgineRouter,
  });

  const title = useMemo(
    () => `Buy ${lendgine?.token1.symbol}+`,
    [lendgine?.token1.symbol]
  );

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
            lendgine.token1,
            address ?? constants.AddressZero,
            protocolConfig.lendgineRouter
          )
        ));
    },
  });

  const mintMutation = useMutation({
    mutationFn: async ({
      lendgine,
      borrowAmount,
      shares,
      address,
      amountIn,
      mostLiquidPool,
      toast,
    }: {
      lendgine: Lendgine;
      borrowAmount: CurrencyAmount<WrappedTokenInfo>;
      shares: CurrencyAmount<Token>;
      address: Address;
      amountIn: CurrencyAmount<WrappedTokenInfo>;
      mostLiquidPool: UniswapV2Pool | UniswapV3Pool;
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
          amountIn: BigNumber.from(amountIn.quotient.toString()),
          amountBorrow: BigNumber.from(borrowAmount.quotient.toString()),
          sharesMin: BigNumber.from(
            shares
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
                    fee: +mostLiquidPool.feeTier,
                  },
                ]
              ) as Address)
            : constants.AddressZero,
          recipient: address,
          deadline: BigNumber.from(
            Math.round(Date.now() / 1000) + settings.timeout * 60
          ),
        },
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
                    "mint",
                    args
                  ),
                  lendgineRouterContract.interface.encodeFunctionData(
                    "refundETH"
                  ),
                ] as `0x${string}`[],
              ],
              overrides: {
                value: args[0].amountIn,
              },
            });
            return await writeContract(config);
          }
        : async () => {
            const config = await prepareWriteContract({
              abi: lendgineRouterABI,
              functionName: "mint",
              address: protocolConfig.lendgineRouter,
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
      await Promise.all([
        invalidate(
          getAllowanceRead(
            input.amountIn.currency,
            input.address,
            protocolConfig.lendgineRouter
          )
        ),
        invalidate(getBalanceRead(input.amountIn.currency, input.address)),
        invalidate(getBalanceRead(input.shares.currency, input.address)),
        queryClient.invalidateQueries({
          queryKey: ["user trades", input.address],
        }),
      ]);
    },
  });

  return useMemo(() => {
    if (approve.status === "loading" || mintAmounts.status === "loading")
      return { status: "loading" } as const;
    if (
      mintAmounts.status !== "success" ||
      !lendgine ||
      !address ||
      !amountIn ||
      !mostLiquid.data ||
      approve.status === "error"
    )
      return { status: "error" } as const;

    return {
      status: "success",
      data: (
        [
          !native && approve.tx
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
                  mintMutation.mutateAsync({
                    lendgine,
                    borrowAmount: mintAmounts.borrowAmount,
                    shares: mintAmounts.shares,
                    address,
                    amountIn,
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
    amountIn,
    approve.status,
    approve.title,
    approve.tx,
    approveMutation,
    lendgine,
    mintAmounts.borrowAmount,
    mintAmounts.shares,
    mintAmounts.status,
    mintMutation,
    mostLiquid.data,
    native,
    title,
  ]);
};
