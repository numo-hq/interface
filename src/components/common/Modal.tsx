import "@reach/dialog/styles.css";

import { DialogContent, DialogOverlay } from "@reach/dialog";
import { animated, useSpring, useTransition } from "@react-spring/web";
import React from "react";
import { isMobile } from "react-device-detect";
import { useGesture } from "react-use-gesture";
import tw, { css, styled } from "twin.macro";

export interface ModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onDismiss: () => void;
  topMargin?: number;
  maxHeight?: number;
  scrollBehavior?: "outside" | "inside";
  minHeight?: boolean | number;
  pinToTop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  isOpen,
  onDismiss,
  topMargin,
  pinToTop,
  scrollBehavior,
  minHeight,
  maxHeight,
}: ModalProps) => {
  const fadeTransition = useTransition(isOpen, {
    config: { duration: 150 },
    from: { opacity: 0 },
    enter: { opacity: 1 },
    leave: { opacity: 0 },
  });

  const [{ y }, set] = useSpring(() => ({
    y: 0,
    config: { mass: 1, tension: 210, friction: 20 },
  }));
  const bind = useGesture({
    onDrag: (state) => {
      set({
        y: state.down ? state.movement[1] : 0,
      });
      if (
        state.movement[1] > 300 ||
        (state.velocity > 3 && state.direction[1] > 0)
      ) {
        onDismiss();
      }
    },
  });

  return fadeTransition(
    (props, item) =>
      item && (
        <StyledDialogOverlay
          as="div"
          style={props}
          aria-label={"dialog overlay"}
          scrollBehavior={scrollBehavior}
          onDismiss={onDismiss}
        >
          <ModalWrapper
            as="div"
            maxHeight={maxHeight}
            minHeight={minHeight}
            scrollBehavior={scrollBehavior}
            pinToTop={pinToTop}
            topMargin={topMargin}
            aria-label="dialog content"
            {...(isMobile
              ? {
                  ...bind(),
                  style: {
                    transform: y.to((n) => `translateY(${n > 0 ? n : 0}px)`),
                  },
                }
              : {})}
          >
            {children}
          </ModalWrapper>
        </StyledDialogOverlay>
      )
  );
};

const ModalWrapper = styled(animated(DialogContent), {
  shouldForwardProp(key) {
    return ![
      "pinToTop",
      "scrollBehavior",
      "minHeight",
      "maxHeight",
      "topMargin",
    ].includes(key.toString());
  },
})<{
  maxHeight?: number;
  minHeight?: boolean | number;
  scrollBehavior?: "outside" | "inside";
  pinToTop?: boolean;
  topMargin?: number;
}>(({ pinToTop = true, topMargin }) => [
  tw`w-full max-w-sm rounded-lg bg-gray-100 p-0 overflow-hidden max-h-[608px]`,
  css`
    &[data-reach-dialog-content] {
      ${tw`flex p-0 m-4 rounded-xl md:m-auto`}
    }
  `,
  topMargin &&
    css`
      margin-top: ${topMargin}px;
    `,
  pinToTop &&
    css`
      margin-top: 10vh !important;
    `,
]);

const StyledDialogOverlay = styled(animated(DialogOverlay), {
  shouldForwardProp(key) {
    return !["scrollBehavior"].includes(key.toString());
  },
})<{
  scrollBehavior?: "inside" | "outside";
}>(({ scrollBehavior }) => [
  tw`flex items-center justify-center overflow-hidden`,
  scrollBehavior === "outside" && tw`items-start py-8 overflow-y-scroll`,
  css`
    &[data-reach-dialog-overlay] {
      z-index: 50;
      background: rgba(0, 0, 0, 0.7);
    }
  `,
]);
