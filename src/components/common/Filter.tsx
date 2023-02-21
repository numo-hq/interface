import { useMemo, useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { IoIosArrowDown } from "react-icons/io";
import tw, { styled } from "twin.macro";

import { useAllLendgines } from "../../hooks/useLendgine";
import type { WrappedTokenInfo } from "../../hooks/useTokens2";
import { dedupeTokens } from "../../hooks/useTokens2";
import { Modal } from "./Modal";
import { Module } from "./Module";
import { TokenIcon } from "./TokenIcon";

interface Props {
  assets: readonly WrappedTokenInfo[];
  setAssets: (val: readonly WrappedTokenInfo[]) => void;
}

export const Filter: React.FC<Props> = ({ assets, setAssets }: Props) => {
  const [show, setShow] = useState(false);

  const lendgines = useAllLendgines();
  const allDedupeTokens = useMemo(() => {
    if (!lendgines) return null;
    return dedupeTokens(lendgines.flatMap((l) => [l.token0, l.token1]));
  }, [lendgines]);

  // TODO: close drop on click
  return !allDedupeTokens ? (
    <div tw="rounded-lg animate-pulse bg-gray-200 h-[40px] w-[94px]" />
  ) : (
    <>
      <Modal onDismiss={() => setShow(false)} isOpen={show}>
        <Module tw="flex flex-col p-1 gap-1 w-full">
          <div tw="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-t-lg text-xl font-semibold w-full justify-between">
            <p>Select asset</p>
            <button onClick={() => setShow(false)}>
              <X />
            </button>
          </div>
          {allDedupeTokens.map((t) => (
            <FilterItem
              key={t.address}
              selected={assets.includes(t)}
              onClick={() => {
                assets.includes(t)
                  ? setAssets(assets.filter((a) => a !== t))
                  : setAssets(assets.concat(t));
              }}
            >
              <div tw="flex items-center gap-4">
                <TokenIcon token={t} size={32} />
                <p tw="text-lg font-semibold">{t.symbol}</p>
              </div>
              <Check show={assets.includes(t)} />
            </FilterItem>
          ))}
        </Module>
      </Modal>
      <FilterButton onClick={() => !show && setShow(true)}>
        <p>Asset{assets.length > 0 && `  (${assets.length})`}</p>
        <RotateArrow open={show} />
      </FilterButton>
    </>
  );
};

export const FilterItem = styled.button<{ selected: boolean }>(
  ({ selected }) => [
    tw`flex items-center justify-between w-full px-4 py-2 duration-300 ease-in-out transform border-2 border-transparent rounded-lg hover:bg-gray-200`,
    !selected && tw`hover:bg-gray-200`,
    selected && tw`border-gray-200`,
  ]
);

export const Check = styled(FiCheck)<{ show: boolean }>(({ show }) => [
  tw`duration-300 ease-in-out transform opacity-0`,
  show && tw`opacity-100`,
]);

export const RotateArrow = styled(IoIosArrowDown)<{ open: boolean }>(
  ({ open }) => [
    tw`transition duration-300 ease-in-out`,
    open && tw`-rotate-180`,
  ]
);

export const X = styled(FiX)(() => [
  tw`w-6 h-6 transition duration-300 ease-in-out hover:opacity-70 active:scale-90`,
]);

export const FilterButton = styled.button`
  ${tw`flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200`}
`;
