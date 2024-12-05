import { utils } from "ethers";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import invariant from "tiny-invariant";
import { createContainer } from "unstated-next";

import { ProvideLiquidityInner } from "./ProviderLiquidityInner";
import type { Protocol } from "../../../constants";

import { useEnvironment } from "../../../contexts/useEnvironment";

import { useAllLendgines } from "../../../hooks/useAllLendgines";
import { useAddressToToken } from "../../../hooks/useTokens";
import { isValidMarket } from "../../../lib/lendgineValidity";
import type { Lendgine } from "../../../lib/types/lendgine";
import { LoadingPage } from "../../common/LoadingPage";

interface IProvideLiquidity {
  lendgines: readonly Lendgine[];
  protocol: Protocol;

  selectedLendgine: Lendgine;
  setSelectedLendgine: (val: Lendgine) => void;
}

const useProvideLiquidityInternal = ({
  protocol,
  lendgines,
}: {
  protocol?: Protocol;
  lendgines?: readonly Lendgine[] | undefined;
} = {}): IProvideLiquidity => {
  invariant(lendgines && protocol);

  const [selectedLendgine, setSelectedLendgine] = useState(lendgines[0]!);

  return { lendgines, protocol, selectedLendgine, setSelectedLendgine };
};

export const {
  Provider: ProvideLiquidityProvider,
  useContainer: useProvideLiquidity,
} = createContainer(useProvideLiquidityInternal);

export const ProvideLiquidity: React.FC = () => {
  const navigate = useNavigate();
  const environment = useEnvironment();
  const lendginesQuery = useAllLendgines();

  const { protocol, token0, token1 } = useParams<{
    protocol: string;
    token0: string;
    token1: string;
  }>();
  if (!token0 || !token1 || !protocol) navigate("/earn/");
  invariant(token0 && token1 && protocol);

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

  if (protocol === "stpmmp") {
    if (environment.interface.liquidStaking) {
      if (
        utils.getAddress(token0) ===
          utils.getAddress(
            environment.interface.liquidStaking.lendgine.token0.address
          ) &&
        utils.getAddress(token1) ===
          utils.getAddress(
            environment.interface.liquidStaking.lendgine.token1.address
          )
      ) {
        return (
          <ProvideLiquidityProvider
            initialState={{
              lendgines: [
                environment.interface.liquidStaking.lendgine,
              ] as const,
              protocol: "stpmmp",
            }}
          >
            <ProvideLiquidityInner />
          </ProvideLiquidityProvider>
        );
      }
    } else {
      navigate("/earn");
    }
  }

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
    <ProvideLiquidityProvider
      initialState={{
        lendgines,
        protocol: protocol as Protocol,
      }}
    >
      <ProvideLiquidityInner />
    </ProvideLiquidityProvider>
  );
};
