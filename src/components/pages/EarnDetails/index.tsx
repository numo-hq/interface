import { utils } from "ethers";
import { useNavigate, useParams } from "react-router-dom";
import invariant from "tiny-invariant";

import { EarnDetailsInner } from "./EarnDetailsInner";
import { useEnvironment } from "../../../contexts/useEnvironment";
import { useMostLiquidMarket } from "../../../hooks/useExternalExchange";
import { useMarketToLendgines } from "../../../hooks/useMarket";
import { useAddressToToken } from "../../../hooks/useTokens";
import { isValidMarket } from "../../../lib/lendgineValidity";
import { LoadingPage } from "../../common/LoadingPage";
import { PageMargin } from "../../layout";

export const EarnDetails: React.FC = () => {
  const navigate = useNavigate();
  const environment = useEnvironment();

  const { base, quote } = useParams<{
    base: string;
    quote: string;
  }>();
  if (!base || !quote) navigate("/earn/");
  invariant(base && quote);

  // if they aren't addresses
  try {
    utils.getAddress(base);
    utils.getAddress(quote);
  } catch (err) {
    console.error(err);
    navigate("/trade/");
  }

  const baseToken = useAddressToToken(base);
  const quoteToken = useAddressToToken(quote);

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

  const lendgines = useMarketToLendgines(market);
  const priceQuery = useMostLiquidMarket(market);

  return (
    <PageMargin tw="w-full pb-12 sm:pb-0 flex flex-col gap-2">
      <div tw="w-full max-w-7xl rounded bg-white  border border-[#dfdfdf] pt-12 md:pt-20 px-6 pb-6 shadow mb-12">
        <div tw="flex flex-col lg:flex-row lg:justify-between gap-4 lg:items-center">
          <p tw="font-bold text-2xl sm:text-4xl">Provide Liquidity</p>
          <p tw="sm:text-lg text-[#8f8f8f] max-w-md">
            Provide liquidity to an automated market maker and earn interest
            from lending out your position.
          </p>
        </div>
      </div>{" "}
      {!!lendgines && !!priceQuery.data ? (
        <EarnDetailsInner
          base={baseToken}
          quote={quoteToken}
          lendgines={lendgines}
          price={priceQuery.data.price}
        />
      ) : (
        <LoadingPage />
      )}
    </PageMargin>
  );
};
