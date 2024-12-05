import { utils } from "ethers";
import { useNavigate, useParams } from "react-router-dom";
import invariant from "tiny-invariant";
import { createContainer } from "unstated-next";

import { HedgeInner } from "./HedgeInner";
import type { Protocol } from "../../../constants";

import { useEnvironment } from "../../../contexts/useEnvironment";

import { useAllLendgines } from "../../../hooks/useAllLendgines";
import { useAddressToToken } from "../../../hooks/useTokens";
import { isValidMarket } from "../../../lib/lendgineValidity";
import type { Lendgine } from "../../../lib/types/lendgine";
import { LoadingPage } from "../../common/LoadingPage";

interface IHedge {
  lendgines: readonly Lendgine[];
  protocol: Protocol;
}

const useHedgeInternal = ({
  protocol,
  lendgines,
}: {
  protocol?: Protocol;
  lendgines?: readonly Lendgine[] | undefined;
} = {}): IHedge => {
  invariant(lendgines && protocol);

  return { lendgines, protocol };
};

export const { Provider: HedgeProvider, useContainer: useHedge } =
  createContainer(useHedgeInternal);

export const Hedge: React.FC = () => {
  const navigate = useNavigate();
  const environment = useEnvironment();
  const lendginesQuery = useAllLendgines();

  const { token0, token1 } = useParams<{
    token0: string;
    token1: string;
  }>();
  if (!token0 || !token1) navigate("/earn/");
  invariant(token0 && token1);

  // if they aren't addresses
  try {
    utils.getAddress(token0);
    utils.getAddress(token1);
  } catch (err) {
    console.error(err);
    navigate("/earn/");
  }

  const quoteToken = useAddressToToken(token0);
  const baseToken = useAddressToToken(token1);

  // if they aren't in the token list
  if (!baseToken || !quoteToken) navigate("/earn/");
  invariant(baseToken && quoteToken);

  // if the market isn't valid
  const market = { base: baseToken, quote: quoteToken };
  if (
    !isValidMarket(
      market,
      environment.interface.wrappedNative,
      environment.interface.specialtyMarkets
    )
  )
    navigate("/earn/");

  if (lendginesQuery.status !== "success") return <LoadingPage />;

  // filter lendgines
  const lendgines = lendginesQuery.lendgines.filter(
    (l) => quoteToken.equals(l.token0) && baseToken.equals(l.token1)
  );
  return lendginesQuery.status !== "success" ? (
    <LoadingPage />
  ) : (
    <HedgeProvider
      initialState={{
        lendgines,
        protocol: "pmmp",
      }}
    >
      <HedgeInner />
    </HedgeProvider>
  );
};
