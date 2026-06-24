import { useState, useRef, useEffect } from "react";
import { chatWithAI } from "@/lib/chat.functions";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await chatWithAI({
        data: {
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (response instanceof Response) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let aiContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            aiContent += decoder.decode(value, { stream: true });
          }
        }

        setMessages((prev) => [...prev, { role: "assistant", content: aiContent || "Sin respuesta." }]);
      } else {
        // Fallback: non-streaming response
        setMessages((prev) => [...prev, { role: "assistant", content: String(response ?? "Sin respuesta.") }]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 size-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl flex items-center justify-center hover:scale-110 transition-transform animate-bounce"
          title="Asistente IA"
        >
          <Sparkles className="size-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-2rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="size-5" />
              <span className="font-bold text-sm">Asistente IA · La Parroquia</span>
            </div>
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition">
              <X className="size-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm mt-10 px-4">
                <Bot className="size-10 mx-auto mb-3 text-amber-500 opacity-50" />
                <p className="font-medium mb-1">¡Hola! Soy tu asistente 🤖</p>
                <p className="text-xs">
                  Puedo consultar el inventario, ventas del día, productos más vendidos, y calcular descuentos.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  {["¿Cuánto llevamos vendido hoy?", "Stock de esquite grande", "Productos más vendidos", "Descuento del 10% sobre $150"].map((sug) => (
                    <button
                      key={sug}
                      onClick={() => { setInput(sug); }}
                      className="text-[11px] px-2 py-1 rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-amber-600 text-white rounded-br-md"
                      : "bg-card border border-border rounded-bl-md shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <Loader2 className="size-4 animate-spin text-amber-600" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card shrink-0">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntame algo..."
                rows={2}
                className="min-h-0 resize-none text-sm"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={send}
                disabled={loading || !input.trim()}
                className="shrink-0 bg-amber-600 hover:bg-amber-700 size-10"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
