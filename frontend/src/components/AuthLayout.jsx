import React from "react";
import Logo from "./Logo.jsx";
import PageTransition from "./PageTransition.jsx";

const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10">
    <PageTransition className="w-full max-w-sm">
      <div className="mb-8 flex justify-center"><Logo /></div>
      <div className="panel p-6 sm:p-7">
        <h1 className="text-lg font-semibold text-fg">{title}</h1>
        <p className="text-sm text-muted mt-1 mb-6">{subtitle}</p>
        {children}
      </div>
      <p className="text-sm text-muted text-center mt-5">{footer}</p>
    </PageTransition>
  </div>
);

export default AuthLayout;
