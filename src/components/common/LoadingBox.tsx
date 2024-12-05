interface Props {
  className?: string;
}

export const LoadingBox: React.FC<Props> = ({ className }: Props) => (
  <div
    className={className}
    tw="rounded-lg transform ease-in-out duration-300 animate-pulse bg-gray-100 h-6 w-12"
  />
);
