import React from "react";
import { NavLink } from "react-router-dom";

import { ConnectButton } from "./ConnectButton";
import { More } from "./More";
import { MoreInfo } from "./MoreInfo";
import { Settings } from "./Settings";

export const Header: React.FC = () => {
  return (
    <div tw="fixed z-10 flex justify-center w-full top-4 px-6">
      <div tw="justify-between bg-[#303030] rounded-2xl max-w-xl  w-full flex items-center p-1">
        <NumoenIcon />

        <NavLink tw="text-white hover:opacity-80 hidden md:flex" to="/earn/">
          <p>Earn</p>
        </NavLink>
        <NavLink
          tw="text-white hover:opacity-80 hidden md:flex"
          to="/positions/"
        >
          <p>Positions</p>
        </NavLink>

        <Settings tw="hidden md:flex" />
        <MoreInfo tw="hidden md:flex" />
        <div tw="gap-1 flex items-center">
          <ConnectButton tw="" />
          <More />
        </div>
      </div>
    </div>
  );
};

const NumoenIcon: React.FC = () => {
  return (
    <div tw="p-1.5 bg-white rounded-xl">
      <img src="/numoen.svg" alt="Numoen Logo" width={30} height={30} />
    </div>
  );
};
