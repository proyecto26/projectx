import type React from "react";

type IconProps = {
  className?: string;
  color?: string;
};

export const MenuIcon: React.FC<IconProps> = ({
  className,
  color = "none",
}) => {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={color}
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
};

export default MenuIcon;
