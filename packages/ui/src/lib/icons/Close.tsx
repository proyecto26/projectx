import type React from "react";

type IconProps = {
  className?: string;
  color?: string;
};

export const CloseIcon: React.FC<IconProps> = ({
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
      <path d="M5 5l14 14M19 5l-14 14" />
    </svg>
  );
};

export default CloseIcon;
