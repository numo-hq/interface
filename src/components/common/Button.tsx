import styled from "@emotion/styled";
import type { DetailedHTMLProps } from "react";
import React, { useState } from "react";
import tw from "twin.macro";

import { LoadingSpinner } from "./LoadingSpinner";

type Variant = "danger" | "primary" | "inverse";

interface AdditionalButtonProps {
  variant?: Variant;
}

export interface ButtonProps
  extends DetailedHTMLProps<
      React.ButtonHTMLAttributes<HTMLButtonElement>,
      HTMLButtonElement
    >,
    AdditionalButtonProps {
  onClick?:
    | ((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)
    | ((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<void>);
  children?: React.ReactNode;
}

/**
 * A button.
 * @returns
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  disabled,
  className,
  onClick,
  ...props
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  return (
    <StyledButton
      {...props}
      onClick={
        onClick
          ? async (e) => {
              setLoading(true);
              await onClick(e);
              setLoading(false);
            }
          : undefined
      }
      disabled={disabled || loading}
      className={className}
      style={{
        ...props.style,
      }}
    >
      {loading ? (
        <div tw="flex items-center gap-2">
          {children}
          <LoadingSpinner tw="ml-2 mb-0.5" />
        </div>
      ) : (
        children
      )}
    </StyledButton>
  );
};

export const StyledButton = styled.button<AdditionalButtonProps>(
  ({ variant = "primary" }) => [
    tw`flex flex-row items-center justify-center leading-normal`,
    tw`rounded-xl`,
    tw`text-sm font-semibold`,
    tw`text-white active:scale-98 hover:bg-opacity-90`,
    tw`transition-transform`,

    variant === "primary" && tw`bg-black`,

    variant === "inverse" && tw`text-black bg-white`,

    variant === "danger" && tw`font-bold bg-red`,

    tw`disabled:(bg-gray-200 text-secondary cursor-not-allowed)`,
  ]
);
