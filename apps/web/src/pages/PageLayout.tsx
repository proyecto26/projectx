import { Layout, type LayoutProps } from "@projectx/ui";
import type React from "react";

import { useAuth } from "@/providers";

type PageLayoutProps = LayoutProps;

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  ...props
}) => {
  const { user, isAuthenticated } = useAuth();
  return (
    <Layout isAuthenticated={isAuthenticated} email={user?.email} {...props}>
      {children}
    </Layout>
  );
};

export default PageLayout;
