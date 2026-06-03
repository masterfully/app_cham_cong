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
            ? "border border-[#e86aa3] bg-[#b00563] text-[#fff0f6]"
            : "border border-[#7b1145] bg-[#3b0022] text-[#ffeef8]"
        }`}
      >
        {toastState.message}
      </div>
    </div>
  );
}

export default ToastPanel;
