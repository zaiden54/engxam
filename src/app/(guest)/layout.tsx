import { GuestShell } from "@/components/site-shell";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return <GuestShell>{children}</GuestShell>;
}
