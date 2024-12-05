import { faArrowDown, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  onClick?: () => void;
  icon: "arrow" | "plus";
}

export const CenterSwitch: React.FC<Props> = ({ onClick, icon }: Props) => {
  return (
    <div tw="w-full flex justify-center items-center ">
      <button
        onClick={onClick}
        tw="flex items-center justify-center self-center absolute bg-white border-gray-200  border-2 rounded-lg h-6 w-6"
      >
        <div tw="text-secondary justify-center items-center flex text-sm">
          <FontAwesomeIcon
            icon={icon === "arrow" ? faArrowDown : faPlus}
            fixedWidth
          />
        </div>
      </button>
    </div>
  );
};
