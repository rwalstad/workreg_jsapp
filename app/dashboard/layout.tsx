
//app/dashboard/layout.tsx
import { AccountProvider } from "../components/AccountContext";
import { ActionsProvider } from "../../actionsContext";
//import ModularMenu from "../components/ModularMenu";

export default function DefaultLayout({ children }) {
  return (
    <AccountProvider>
      <ActionsProvider>

          {children}

      </ActionsProvider>
    </AccountProvider>
  );
}