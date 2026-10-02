import { FormEvent, useEffect, useRef, useState } from "react";
import { auth } from "../../firebase";
import type { AICommandResponse } from "../../utils/aiCommand";

type AIChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

type SpeechRecognitionEventLike = Event & {
  results: { [index: number]: { [index: number]: { transcript: string } } };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeech = Window & typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function AIChatModal({ isOpen, onClose }: AIChatModalProps): JSX.Element | null {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Xin chào! Bạn có thể nói hoặc nhập yêu cầu thêm, sửa, xóa dòng chấm công bằng tiếng Việt."
    }
  ]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const nextMessageId = useRef(2);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const speechConstructor = (window as WindowWithSpeech).SpeechRecognition ?? (window as WindowWithSpeech).webkitSpeechRecognition;
  const voiceSupported = Boolean(speechConstructor);

  function toggleVoice(): void {
    if (!speechConstructor) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new speechConstructor();
    recognition.lang = "vi-VN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) {
      return;
    }

    const userMessageId = nextMessageId.current++;
    setMessages((current) => [...current, { id: userMessageId, role: "user", text }]);
    setInput("");
    setIsSending(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      const idToken = await user.getIdToken();
      const result = await fetch("/api/ai-command", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ message: text })
      });
      const payload = await result.json() as { proposal?: AICommandResponse; error?: string };
      if (!result.ok || !payload.proposal) throw new Error(payload.error || "Không thể xử lý yêu cầu AI.");

      const { proposal } = payload;
      const commandSummary = proposal.command.type === "clarify"
        ? proposal.command.question
        : proposal.command.type === "add_row"
          ? `Đề xuất thêm ca ngày ${proposal.command.date}, ${proposal.command.startTime}–${proposal.command.endTime}.`
          : proposal.command.type === "edit_row"
            ? `Đề xuất sửa dòng ${proposal.command.rowId}.`
            : proposal.command.type === "delete_row"
              ? `Đề xuất xóa dòng ${proposal.command.rowId}.`
              : "Đề xuất xem các dòng chấm công phù hợp.";
      const confirmation = proposal.confirmationRequired ? " Cần bạn xác nhận trước khi thay đổi." : " Chưa có dữ liệu nào được thay đổi.";
      setMessages((current) => [...current, {
        id: nextMessageId.current++,
        role: "assistant",
        text: `${proposal.explanation}\n${commandSummary}${confirmation}`
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        id: nextMessageId.current++,
        role: "assistant",
        text: error instanceof Error ? error.message : "Đã xảy ra lỗi khi xử lý yêu cầu."
      }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-on-surface/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal-panel flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-[2rem] border-t border-white/20 bg-surface shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-outline-variant/20 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-primary">Trợ lý AI</h2>
            <p className="text-xs text-on-surface-variant">Yêu cầu và dữ liệu chấm công được gửi tới AI để tạo đề xuất</p>
          </div>
          <button className="btn btn-ghost btn-icon !h-10 !min-h-10 !w-10" type="button" aria-label="Đóng trợ lý AI" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((message) => (
            <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`} key={message.id}>
              <p className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface"}`}>
                {message.text}
              </p>
            </div>
          ))}
          {isSending ? <p className="text-xs font-semibold text-on-surface-variant">AI đang xử lý...</p> : null}
        </div>

        <form className="border-t border-outline-variant/20 p-4" onSubmit={handleSubmit}>
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-12 flex-1 resize-none rounded-2xl border-none bg-surface-container-highest px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/20"
              placeholder="Ví dụ: Thêm ca ngày 12/09 từ 08:00 đến 12:00"
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              className={`btn btn-ghost !h-12 !min-h-12 !w-12 !min-w-12 !rounded-2xl ${isListening ? "border-primary bg-primary/10 text-primary" : ""}`}
              type="button"
              aria-label={voiceSupported ? "Nhập bằng giọng nói" : "Trình duyệt không hỗ trợ nhập giọng nói"}
              title={voiceSupported ? "Nhập bằng giọng nói" : "Trình duyệt không hỗ trợ nhập giọng nói"}
              disabled={!voiceSupported}
              onClick={toggleVoice}
            >
              <span className="material-symbols-outlined">{isListening ? "mic" : "mic_none"}</span>
            </button>
            <button className="btn btn-primary !h-12 !min-h-12 !w-12 !min-w-12 !rounded-2xl" type="submit" aria-label="Gửi yêu cầu AI">
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
          {!voiceSupported ? <p className="mt-2 text-[11px] text-on-surface-variant">Trình duyệt này chưa hỗ trợ nhập bằng giọng nói.</p> : null}
        </form>
      </section>
    </div>
  );
}

export default AIChatModal;
