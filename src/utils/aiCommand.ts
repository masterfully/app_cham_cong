/**
 * Structured contract for AI attendance requests. Keep this module free of UI,
 * network, and persistence behavior so both a future API route and the client
 * can validate the same command shape.
 */
export type AICommand =
  | { type: "add_row"; date: string; startTime: string; endTime: string }
  | { type: "edit_row"; rowId: string; date?: string; startTime?: string; endTime?: string }
  | { type: "delete_row"; rowId: string }
  | { type: "list_rows"; date?: string; fromDate?: string; toDate?: string }
  | { type: "clarify"; question: string };

export type AICommandResponse = {
  command: AICommand;
  confidence: number;
  explanation: string;
  confirmationRequired: boolean;
};

export type AICommandValidation =
  | { isValid: true; value: AICommandResponse }
  | { isValid: false; errors: string[] };

/** JSON Schema for enforcing the same contract at an AI provider/API boundary. */
export const AI_COMMAND_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["command", "confidence", "explanation", "confirmationRequired"],
  properties: {
    command: {
      oneOf: [
        { type: "object", additionalProperties: false, required: ["type", "date", "startTime", "endTime"], properties: { type: { const: "add_row" }, date: { type: "string", format: "date" }, startTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }, endTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" } } },
        { type: "object", additionalProperties: false, required: ["type", "rowId"], properties: { type: { const: "edit_row" }, rowId: { type: "string", minLength: 1 }, date: { type: "string", format: "date" }, startTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" }, endTime: { type: "string", pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$" } } },
        { type: "object", additionalProperties: false, required: ["type", "rowId"], properties: { type: { const: "delete_row" }, rowId: { type: "string", minLength: 1 } } },
        { type: "object", additionalProperties: false, required: ["type"], properties: { type: { const: "list_rows" }, date: { type: "string", format: "date" }, fromDate: { type: "string", format: "date" }, toDate: { type: "string", format: "date" } } },
        { type: "object", additionalProperties: false, required: ["type", "question"], properties: { type: { const: "clarify" }, question: { type: "string", minLength: 1 } } }
      ]
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    explanation: { type: "string", minLength: 1 },
    confirmationRequired: { type: "boolean" }
  }
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidRange(startTime: string, endTime: string): boolean {
  return startTime < endTime;
}

/** Validate untrusted JSON returned by a model before the app uses it. */
export function validateAICommandResponse(input: unknown): AICommandValidation {
  const errors: string[] = [];
  if (!isRecord(input) || !hasOnlyKeys(input, ["command", "confidence", "explanation", "confirmationRequired"])) {
    return { isValid: false, errors: ["Phản hồi phải là đối tượng JSON đúng cấu trúc."] };
  }

  if (typeof input.confidence !== "number" || !Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) errors.push("confidence phải nằm trong khoảng 0 đến 1.");
  if (typeof input.explanation !== "string" || !input.explanation.trim()) errors.push("explanation phải là nội dung tiếng Việt không rỗng.");
  if (typeof input.confirmationRequired !== "boolean") errors.push("confirmationRequired phải là boolean.");

  const command = input.command;
  if (!isRecord(command) || typeof command.type !== "string") {
    errors.push("command phải có type hợp lệ.");
  } else {
    switch (command.type) {
      case "add_row":
        if (!hasOnlyKeys(command, ["type", "date", "startTime", "endTime"])) errors.push("add_row có trường không được hỗ trợ.");
        if (!isValidDate(command.date)) errors.push("Ngày của add_row phải theo định dạng YYYY-MM-DD và tồn tại.");
        if (!isValidTime(command.startTime) || !isValidTime(command.endTime)) errors.push("Giờ của add_row phải theo định dạng HH:mm hợp lệ.");
        else if (!isValidRange(command.startTime, command.endTime)) errors.push("Giờ kết thúc phải sau giờ bắt đầu.");
        if (input.confirmationRequired !== false) errors.push("add_row không yêu cầu xác nhận riêng; yêu cầu chưa rõ phải dùng clarify.");
        break;
      case "edit_row": {
        if (!hasOnlyKeys(command, ["type", "rowId", "date", "startTime", "endTime"])) errors.push("edit_row có trường không được hỗ trợ.");
        if (typeof command.rowId !== "string" || !command.rowId.trim()) errors.push("edit_row cần rowId.");
        if (command.date === undefined && command.startTime === undefined && command.endTime === undefined) errors.push("edit_row cần ít nhất một thay đổi.");
        if (command.date !== undefined && !isValidDate(command.date)) errors.push("Ngày sửa phải hợp lệ theo YYYY-MM-DD.");
        if ((command.startTime === undefined) !== (command.endTime === undefined)) errors.push("Cần cung cấp đồng thời giờ bắt đầu và kết thúc khi sửa giờ.");
        if (command.startTime !== undefined && command.endTime !== undefined) {
          if (!isValidTime(command.startTime) || !isValidTime(command.endTime)) errors.push("Giờ sửa phải theo định dạng HH:mm hợp lệ.");
          else if (!isValidRange(command.startTime, command.endTime)) errors.push("Giờ kết thúc phải sau giờ bắt đầu.");
        }
        if (input.confirmationRequired !== true) errors.push("edit_row bắt buộc phải yêu cầu xác nhận.");
        break;
      }
      case "delete_row":
        if (!hasOnlyKeys(command, ["type", "rowId"])) errors.push("delete_row có trường không được hỗ trợ.");
        if (typeof command.rowId !== "string" || !command.rowId.trim()) errors.push("delete_row cần rowId.");
        if (input.confirmationRequired !== true) errors.push("delete_row bắt buộc phải yêu cầu xác nhận.");
        break;
      case "list_rows":
        if (!hasOnlyKeys(command, ["type", "date", "fromDate", "toDate"])) errors.push("list_rows có trường không được hỗ trợ.");
        if (command.date !== undefined && !isValidDate(command.date)) errors.push("Ngày lọc phải hợp lệ theo YYYY-MM-DD.");
        if (command.fromDate !== undefined && !isValidDate(command.fromDate)) errors.push("fromDate phải hợp lệ theo YYYY-MM-DD.");
        if (command.toDate !== undefined && !isValidDate(command.toDate)) errors.push("toDate phải hợp lệ theo YYYY-MM-DD.");
        if (command.date !== undefined && (command.fromDate !== undefined || command.toDate !== undefined)) errors.push("Chỉ dùng date hoặc khoảng fromDate/toDate.");
        if ((command.fromDate === undefined) !== (command.toDate === undefined)) errors.push("Khoảng ngày cần có cả fromDate và toDate.");
        if (typeof command.fromDate === "string" && typeof command.toDate === "string" && command.fromDate > command.toDate) errors.push("fromDate không được sau toDate.");
        if (input.confirmationRequired !== false) errors.push("list_rows không yêu cầu xác nhận.");
        break;
      case "clarify":
        if (!hasOnlyKeys(command, ["type", "question"])) errors.push("clarify có trường không được hỗ trợ.");
        if (typeof command.question !== "string" || !command.question.trim()) errors.push("clarify cần câu hỏi cụ thể.");
        if (input.confirmationRequired !== false) errors.push("clarify không phải thao tác cần xác nhận.");
        break;
      default:
        errors.push("Loại command không được hỗ trợ.");
    }
  }

  if (errors.length) return { isValid: false, errors };
  return { isValid: true, value: input as unknown as AICommandResponse };
}
