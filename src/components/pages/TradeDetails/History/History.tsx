import { useState } from "react";
import { objectKeys } from "ts-extras";
import tw, { css } from "twin.macro";

import { PersonalHistory } from "./PersonalHistory/PersonalHistory";
import { Positions } from "./Positions/Positions";
import { TotalHistory } from "./TotalHistory/TotalHistory";

const Histories = {
  position: "Positions",
  personalHistory: "Trades",
  totalHistory: "Total trades",
} as const;

export const History: React.FC = () => {
  const [history, setHistory] = useState<keyof typeof Histories>("position");

  return (
    <div tw="w-full flex flex-col gap-4 bg-white border rounded-xl border-gray-200 p-6 pb-3 shadow ">
      <div tw="w-full justify-start flex">
        <div tw="flex sm:text-lg justify-end p-0.5 items-center rounded-xl bg-gray-100">
          {objectKeys(Histories).map((h) => {
            return (
              <div key={Histories[h]}>
                <button
                  css={css`
                    ${tw`grid px-2 py-1 font-semibold text-gray-500 border border-transparent rounded-xl justify-items-center`}
                    ${tw`hover:(text-gray-700) transform duration-300 ease-in-out`}
                ${h === history &&
                    tw`text-black bg-white rounded-[10px] border-gray-300/50`}
                  `}
                  onClick={() => {
                    setHistory(h);
                  }}
                >
                  <span>{Histories[h]}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {history === "position" && <Positions />}
      {history === "personalHistory" && <PersonalHistory />}
      {history === "totalHistory" && <TotalHistory />}
    </div>
  );
};
