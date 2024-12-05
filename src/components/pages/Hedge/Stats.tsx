import { useHedge } from ".";

import { LoadingBox } from "../../common/LoadingBox";
import { MainStats } from "../../common/MainStats";

export const Stats: React.FC = () => {
  const { lendgines } = useHedge();

  return (
    <MainStats
      items={
        [
          {
            label: "Total deposited",
            item: <LoadingBox tw="bg-gray-300 h-10 w-20" />,
          },
          {
            label: "Est. APR",
            item: <LoadingBox tw="bg-gray-300 h-10 w-20" />,
          },
          {
            label: "Balance",
            item: <LoadingBox tw="bg-gray-300 h-10 w-20" />,
          },
          {
            label: "IL hedge",
            item: <LoadingBox tw="bg-gray-300 h-10 w-20" />,
          },
        ] as const
      }
    />
  );
};
