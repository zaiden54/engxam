import { GuestShell } from "./site-shell";
import { SignOut } from "./sign-out";

export function AccessDenied() {
  return <GuestShell><section className="card login-card">
    <h1>Доступ не назначен</h1>
    <p>Доступ ещё не назначен или отключён администратором.</p>
    <SignOut/>
  </section></GuestShell>;
}
