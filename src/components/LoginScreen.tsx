import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

type LoginScreenProps = {
};

function LoginScreen(_props: LoginScreenProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setErrorMessage("Email hoặc mật khẩu không đúng.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-sm rounded-3xl border border-primary/20 bg-surface p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-lg">
            <span className="material-symbols-outlined text-3xl">schedule</span>
          </div>
          <h1 className="text-2xl font-black text-primary">Đăng nhập</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Quản lý giờ làm của bạn</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="ml-1 text-xs font-bold uppercase text-on-surface-variant">Email</span>
            <input
              autoComplete="email"
              className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="ml-1 text-xs font-bold uppercase text-on-surface-variant">Mật khẩu</span>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border-none bg-surface-container-highest px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary/20"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? <p className="text-sm font-semibold text-error">{errorMessage}</p> : null}

          <button className="btn btn-primary w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginScreen;