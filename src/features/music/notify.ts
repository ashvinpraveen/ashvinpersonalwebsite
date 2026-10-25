import { toast, type ExternalToast } from "sonner";

// Toasts go up top so they never cover the transport bar's play button.
const top = (options?: ExternalToast): ExternalToast => ({ position: "top-center", ...options });

export const notify = {
  success: (message: string, options?: ExternalToast) => toast.success(message, top(options)),
  message: (message: string, options?: ExternalToast) => toast.message(message, top(options)),
  error: (message: string, options?: ExternalToast) => toast.error(message, top(options)),
};
