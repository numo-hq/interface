import { objectKeys } from "ts-extras";
import tw, { css } from "twin.macro";

type Props<T extends string> = {
  tabs: { [key in T]: string };
  selectedTab: T;
  setSelectedTab: (val: T) => void;
  className?: string;
};

export const TabSelection = <T extends string>({
  tabs,
  selectedTab,
  setSelectedTab,
  className,
}: Props<T>) => {
  return (
    <div tw="w-full justify-start flex h-12" className={className}>
      <div tw="flex text-lg justify-end p-0.5 items-center rounded-xl bg-gray-200 w-full">
        {objectKeys(tabs).map((t) => {
          return (
            <div key={tabs[t as T]} tw="w-full h-full">
              <button
                css={css`
                  ${tw`grid items-center w-full h-full font-semibold border border-transparent text-secondary rounded-[10px] justify-items-center`}
                  ${tw`hover:(text-black) transform duration-300 ease-in-out`}
                ${t === selectedTab && tw`text-black bg-white `}
                `}
                onClick={() => {
                  setSelectedTab(t as T);
                }}
              >
                <span>{tabs[t as T]}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
