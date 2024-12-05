import { Percent } from "@uniswap/sdk-core";
import { curveNatural } from "@visx/curve";
import { localPoint } from "@visx/event";
import type { EventType } from "@visx/event/lib/types";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { Line, LinePath } from "@visx/shape";
import { Threshold } from "@visx/threshold";
import { bisect } from "d3-array";
import { useCallback, useMemo, useState } from "react";
import invariant from "tiny-invariant";

import type { Lendgine } from "../../../lib/types/lendgine";

import { formatPercent } from "../../../utils/format";

interface Props {
  lendgine: Lendgine;
}

export const Returns: React.FC<Props> = ({ lendgine }: Props) => {
  const min = -0.75;
  const max = 1.5;
  const points = 300;

  // const selectedLendgineInfo = useLendgine(selectedLendgine);

  // useMemo(() => {
  //   const price = selectedLendgineInfo.data
  //     ? numoenPrice(selectedLendgine, selectedLendgineInfo.data)
  //     : null;
  //   // const kink = price ? selectedLendgine.bound.divide(price) : null;
  //   // return { kink };
  // }, [selectedLendgine, selectedLendgineInfo.data]);

  // console.log(kink?.toSignificant(4));
  // TODO: account for kink in the charts

  const baseReturns = new Array(points)
    .fill(null)
    .map((_, i) => ((max - min) * i) / points + min);
  // TODO: account for bounds
  const optionReturns = (r: number) => r * r + 2 * r;

  const data: [number, number][] = baseReturns.map((b) => [
    b,
    optionReturns(b),
  ]);

  const getX = useMemo(() => (p: [number, number]) => p[0], []);
  const getY = useMemo(() => (p: [number, number]) => p[1], []);

  const xScale = scaleLinear<number>({
    domain: [min, max],
  });
  const yScale = scaleLinear<number>({
    domain: [
      Math.min(optionReturns(min), optionReturns(max)),
      Math.max(optionReturns(min), optionReturns(max)),
    ],
  });

  const [displayPoint, setDisplayPoint] = useState<[number, number]>([0, 0]);
  const resetDisplay = useCallback(() => {
    setDisplayPoint([0, 0]);
  }, []);
  const handleHover = useCallback(
    (event: Element | EventType) => {
      // pixels
      const { x } = localPoint(event) || { x: 0 };
      const x0 = xScale.invert(x);
      const index = bisect(
        data.map((d) => d[0]),
        x0,
        1
      );

      const d0 = data[index - 1];
      invariant(d0); // TODO: why does Uniswap not need this
      const d1 = data[index]; // next data in terms of timestamp
      let point = d0;

      const hasNextData = d1;
      if (hasNextData) {
        point = x0 - d0[0] > d1[0] - x0 ? d1 : d0;
      }

      if (point) {
        setDisplayPoint(point);
      }
    },
    [data, xScale]
  );

  const underlyingReturns = new Percent(Math.round(displayPoint[0] * 100), 100);
  const derivReturns = new Percent(Math.round(displayPoint[1] * 100), 100);

  return (
    <div tw="w-full flex flex-col gap-1">
      <p tw="text-xl font-semibold">Expected Profit and Loss</p>
      {derivReturns.lessThan(0) ? (
        <p tw="font-semibold text-red text-lg">{formatPercent(derivReturns)}</p>
      ) : (
        <p tw="font-semibold text-green text-lg">
          +{formatPercent(derivReturns)}
        </p>
      )}

      {/* height being set to 100% */}
      <ParentSize style={{}} tw="pt-4">
        {(parent) => {
          xScale.range([0, parent.width]);
          const height = 150;
          yScale.range([height - 10, 0]);
          return (
            <svg
              width={parent.width}
              height={height}
              tw="justify-self-center col-span-2"
            >
              <Group top={7}>
                <Threshold<[number, number]>
                  id={`${Math.random()}`}
                  data={data}
                  x={(d) => xScale(getX(d)) ?? 0}
                  y0={(d) => yScale(getY(d)) ?? 0}
                  y1={(_d) => yScale(0)}
                  clipAboveTo={0}
                  clipBelowTo={yScale(min)}
                  curve={curveNatural}
                  belowAreaProps={{
                    fill: "red",
                    fillOpacity: 0.4,
                  }}
                  aboveAreaProps={{
                    fill: "green",
                    fillOpacity: 0.4,
                  }}
                />

                <LinePath<[number, number]>
                  curve={curveNatural}
                  data={data}
                  x={(d) => xScale(getX(d)) ?? 0}
                  y={(d) => yScale(getY(d)) ?? 0}
                  stroke={"#000000"}
                  strokeWidth={2}
                  strokeOpacity={1}
                />
                <Line
                  from={{ x: xScale(min), y: yScale(0) }}
                  to={{ x: xScale(max), y: yScale(0) }}
                  stroke={"#8f8f8f"}
                  strokeWidth={1}
                  pointerEvents="none"
                  strokeDasharray="4,4"
                />
              </Group>

              <Line
                from={{ x: xScale(displayPoint[0]), y: 0 }}
                to={{ x: xScale(displayPoint[0]), y: 192 }}
                stroke={"#8f8f8f"}
                strokeWidth={1}
                pointerEvents="none"
                strokeDasharray="4,4"
              />
              <rect
                x={0}
                y={0}
                width={parent.width}
                height={192}
                fill="transparent"
                onTouchStart={handleHover}
                onTouchMove={handleHover}
                onMouseMove={handleHover}
                onMouseLeave={resetDisplay}
              />
            </svg>
          );
        }}
      </ParentSize>
      <p tw="pt-4">
        {lendgine.token0.symbol} / {lendgine.token1.symbol} price
      </p>
      {underlyingReturns.lessThan(0) ? (
        <p tw="text-secondary text-sm">{formatPercent(underlyingReturns)}</p>
      ) : (
        <p tw="text-secondary text-sm">+{formatPercent(underlyingReturns)}</p>
      )}
    </div>
  );
};
