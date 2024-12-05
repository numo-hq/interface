/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { BsLightningChargeFill } from "react-icons/bs";
import { styled } from "twin.macro";

import { EarnCard } from "./ProvideLiquidity";
import { useEnvironment } from "../../../contexts/useEnvironment";
import { formatPercent } from "../../../utils/format";
import { LoadingSpinner } from "../../common/LoadingSpinner";
import { TokenIcon } from "../../common/TokenIcon";
import { useLongReturns } from "../LiquidStaking/useReturns";

export const LiquidStaking: React.FC = () => {
  const environment = useEnvironment();
  const longAPRQuery = useLongReturns();

  return (
    <Background
      to="liquid-staking"
      tw="justify-between p-6 items-center"
      color={environment.interface.liquidStaking!.color}
    >
      <p tw="text-xl font-bold">Liquid Staking Boost</p>
      <TokenIcon
        token={environment.interface.liquidStaking!.lendgine.token1}
        size={48}
      />
      <Shake tw="flex gap-1 items-center">
        <p tw="text-xl font-bold text-secondary">
          {longAPRQuery.status === "success" ? (
            formatPercent(longAPRQuery.data.totalAPR)
          ) : (
            <LoadingSpinner />
          )}
        </p>
        <BsLightningChargeFill tw="fill-yellow-300 text-xl" />
      </Shake>
      <p tw="text-secondary text-xs font-medium text-center ">
        Boost your {environment.interface.liquidStaking?.lendgine.token1.symbol}{" "}
        yield by speculating on staking rewards
      </p>
    </Background>
  );
};

const Background = styled(EarnCard)<{ color: `#${string}` }>`
  background-image: linear-gradient(
    to top right,
    white,
    85%,
    ${({ color }) => color}
  );
`;

const Shake = styled.span`
  animation: shake 0.5s;
  animation-iteration-count: infinite;
  animation-direction: alternate;

  @keyframes shake {
    0% {
      transform: translate(0.5px, 0.5px) rotate(0deg);
    }
    10% {
      transform: translate(-0.5px, -1px) rotate(-1deg);
    }
    20% {
      transform: translate(-1.5px, 0px) rotate(1deg);
    }
    30% {
      transform: translate(1.5px, 1px) rotate(0deg);
    }
    40% {
      transform: translate(0.5px, -0.5px) rotate(1deg);
    }
    50% {
      transform: translate(-0.5px, 1px) rotate(-1deg);
    }
    60% {
      transform: translate(-1.5px, 0.5px) rotate(0deg);
    }
    70% {
      transform: translate(1.5px, 0.5px) rotate(-1deg);
    }
    80% {
      transform: translate(-0.5px, -0.5px) rotate(1deg);
    }
    90% {
      transform: translate(0.5px, 1px) rotate(0deg);
    }
    100% {
      transform: translate(0.5px, -1px) rotate(-1deg);
    }
  }
`;
