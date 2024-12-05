import { Liquidity } from "./Liquidity";
import { PowerTokens } from "./PowerTokens";
import { PageMargin } from "../../layout";

export const PositionInner: React.FC = () => {
  return (
    <PageMargin tw="w-full flex flex-col gap-12 max-w-5xl">
      <div tw="w-full bg-white pt-12 md:pt-20 px-6 pb-6 mb-12">
        <div tw="flex flex-col lg:flex-row lg:justify-between gap-4 lg:items-center">
          <p tw="font-bold text-2xl sm:text-4xl">Your Positions</p>
        </div>
      </div>
      <PowerTokens />
      <Liquidity />
    </PageMargin>
  );
};
