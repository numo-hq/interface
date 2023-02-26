import type { Price } from "@uniswap/sdk-core";
import { useMemo, useState } from "react";
import invariant from "tiny-invariant";
import { createContainer } from "unstated-next";

import type { Lendgine } from "../../../constants/types";
import type { WrappedTokenInfo } from "../../../hooks/useTokens2";
import {
  isLongLendgine,
  pickLongLendgines,
  pickShortLendgines,
} from "../../../utils/lendgines";
import {
  nextHighestLendgine,
  nextLowestLendgine,
} from "../../../utils/Numoen/price";
import { Button } from "../../common/Button";
import { PageMargin } from "../../layout";
import { Times } from "./Chart/TimeSelector";
import { MainView } from "./MainView";
import { TradeColumn, TradeType } from "./TradeColumn/TradeColumn";

interface Props {
  base: WrappedTokenInfo;
  quote: WrappedTokenInfo;
  lendgines: Lendgine[];
  price: Price<WrappedTokenInfo, WrappedTokenInfo>;
}

interface ITradeDetails {
  base: WrappedTokenInfo;
  quote: WrappedTokenInfo;

  timeframe: Times;
  setTimeframe: (val: Times) => void;

  trade: TradeType;
  setTrade: (val: TradeType) => void;

  selectedLendgine: Lendgine;
  setSelectedLendgine: (val: Lendgine) => void;

  close: boolean;
  setClose: (val: boolean) => void;

  lendgines: readonly Lendgine[];
  price: Price<WrappedTokenInfo, WrappedTokenInfo>;

  modalOpen: boolean;
  setModalOpen: (val: boolean) => void;
}

const useTradeDetailsInternal = ({
  base,
  quote,
  lendgines,
  price,
}: Partial<Props> = {}): ITradeDetails => {
  invariant(base && quote && lendgines && price);
  const [timeframe, setTimeframe] = useState<Times>(Times.ONE_DAY);
  const [trade, setTrade] = useState<TradeType>(TradeType.Long);
  const [close, setClose] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const longLendgines = pickLongLendgines(lendgines, base);
  const shortLendgines = pickShortLendgines(lendgines, base);
  const nextLongLendgine = nextHighestLendgine({
    price,
    lendgines: longLendgines,
  });
  const nextShortLendgine = nextHighestLendgine({
    price: price.invert(),
    lendgines: shortLendgines,
  });
  const secondLongLendgine = nextLowestLendgine({
    price,
    lendgines: longLendgines,
  });
  const secondShortLendgine = nextLowestLendgine({
    price: price.invert(),
    lendgines: shortLendgines,
  });

  const lendgine =
    nextLongLendgine ??
    secondLongLendgine ??
    nextShortLendgine ??
    secondShortLendgine;
  invariant(lendgine);

  const [selectedLendgine, setSelectedLendgine] = useState<Lendgine>(lendgine);

  return {
    base,
    quote,

    timeframe,
    setTimeframe,

    selectedLendgine,
    setSelectedLendgine,

    trade,
    setTrade,

    close,
    setClose,

    lendgines,
    price,

    modalOpen,
    setModalOpen,
  };
};

export const useNextLendgines = () => {
  const { lendgines, base, price } = useTradeDetails();
  return useMemo(() => {
    const longLendgines = pickLongLendgines(lendgines, base);
    const shortLendgines = pickShortLendgines(lendgines, base);
    const nextLongLendgine = nextHighestLendgine({
      price,
      lendgines: longLendgines,
    });
    const nextShortLendgine = nextHighestLendgine({
      price: price.invert(),
      lendgines: shortLendgines,
    });
    const secondLongLendgine = nextLowestLendgine({
      price,
      lendgines: longLendgines,
    });
    const secondShortLendgine = nextLowestLendgine({
      price: price.invert(),
      lendgines: shortLendgines,
    });

    return {
      longLendgine: nextLongLendgine ?? secondLongLendgine,
      shortLendgine: nextShortLendgine ?? secondShortLendgine,
    };
  }, [base, lendgines, price]);
};

export const { Provider: TradeDetailsProvider, useContainer: useTradeDetails } =
  createContainer(useTradeDetailsInternal);

export const TradeDetailsInner: React.FC<Props> = ({
  base,
  quote,
  lendgines,
  price,
}: Props) => {
  return (
    <TradeDetailsProvider initialState={{ base, quote, lendgines, price }}>
      <TradeDetailsInnerInner />
    </TradeDetailsProvider>
  );
};

const TradeDetailsInnerInner: React.FC = () => {
  const { base, setSelectedLendgine, setModalOpen } = useTradeDetails();
  const { longLendgine, shortLendgine } = useNextLendgines();

  const Buttons = (
    <div tw="gap-2 items-center flex sm:hidden ">
      {[longLendgine, shortLendgine].map((s) => {
        if (!s) return null;
        const isLong = isLongLendgine(s, base);

        return (
          <div key={s.address}>
            <Button
              variant="primary"
              tw="h-8 text-xl font-semibold"
              onClick={() => {
                setSelectedLendgine(s);
                setModalOpen(true);
              }}
            >
              {isLong ? "Long" : "Short"}
            </Button>
          </div>
        );
      })}
    </div>
  );
  return (
    <>
      <PageMargin tw="w-full  pb-12 sm:pb-0">
        <div tw="w-full flex justify-center xl:(grid grid-cols-3)">
          <MainView />
          <div tw="flex max-w-sm justify-self-end">
            <div tw="border-l-2 border-stroke sticky h-[75vh] min-h-[50rem] mt-[-44px] hidden xl:flex" />
            <TradeColumn tw="" />
          </div>
        </div>
      </PageMargin>
      <div tw="z-10 sticky bottom-16 border-t-2 border-stroke  bg-background  sm:(hidden) w-full flex items-center px-4 py-2 pb-3 justify-end">
        {Buttons}
      </div>
    </>
  );
};
