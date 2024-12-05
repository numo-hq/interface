interface ItemProps {
  label: string;
  item: React.ReactNode;
}

const Item: React.FC<ItemProps> = ({ label, item }: ItemProps) => {
  return (
    <div tw="flex flex-col gap-1 sm:items-center">
      <p tw="text-secondary text-sm">{label}</p>
      <div tw="text-2xl font-semibold">{item}</div>
    </div>
  );
};

interface Props {
  items:
    | readonly [ItemProps, ItemProps]
    | readonly [ItemProps, ItemProps, ItemProps]
    | readonly [ItemProps, ItemProps, ItemProps, ItemProps];
}

export const MainStats: React.FC<Props> = ({ items }: Props) => {
  return (
    <div tw="w-full flex justify-around sm:(flex-row gap-4) flex-col gap-2 flex-wrap">
      {items.map((i) => (
        <Item key={i.label} label={i.label} item={i.item} />
      ))}
    </div>
  );
};
