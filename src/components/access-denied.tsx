import { GuestShell } from "./site-shell";
import { SignOut } from "./sign-out";
import { GuestPanel } from "./ui/guest-panel";
import { PageHeader } from "./ui/page-header";

export function AccessDenied() {
  return <GuestShell><GuestPanel>
    <PageHeader title="Доступ не назначен" description="Доступ ещё не назначен или отключён администратором." />
    <SignOut/>
  </GuestPanel></GuestShell>;
}
