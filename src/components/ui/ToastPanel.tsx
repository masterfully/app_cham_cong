type ToastState = { message: string; tone: "success" | "error" } | null;

type ToastPanelProps = {
  toastState: ToastState;
};

function ToastPanel({ toastState }: ToastPanelProps): JSX.Element | null {
  if (!toastState) {
    return null;
  }

  return (
    <div className="fixed right-4 top-[4.5rem] z-[100] max-w-[calc(100vw-2rem)]">
      <div
        className={`toast-panel rounded-xl px-4 py-2 text-center text-sm font-semibold shadow-lg ${
          toastState.tone === "error"
            ? "border border-[#d28b8b] bg-[#6f2d2d] text-[#fff1f1]"
            : "border border-[#2a5560] bg-[#133e48] text-[#eaf6f8]"
        }`}
      >
        {toastState.message}
      </div>
    </div>
  );
}

export default ToastPanel;
